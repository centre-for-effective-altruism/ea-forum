import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  hkdfSync,
  randomBytes,
} from "node:crypto";
import { randomLowercaseId } from "../utils/random";
import { constantTimeCompare } from "../utils/constantTimeCompare";

const TOTP_ISSUER = "EA Forum";
const TOTP_SECRET_BYTES = 20;
const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;
const TOTP_ALLOWED_DRIFT_STEPS = 1;
const RECOVERY_CODE_COUNT = 10;
const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export const PENDING_TWO_FACTOR_LOGIN_COOKIE_NAME = "pendingTwoFactorLogin";
export const PENDING_TWO_FACTOR_LOGIN_TTL_SECONDS = 10 * 60;

const deriveKey = (purpose: "secretEncryption" | "pendingLoginSigning") => {
  const masterKey = process.env.TWO_FACTOR_SECRET_KEY;
  if (!masterKey) {
    throw new Error("Missing two-factor auth secret key");
  }
  return Buffer.from(hkdfSync("sha256", masterKey, "", purpose, 32));
};

export const encodeBase32 = (buffer: Buffer) => {
  let output = "";
  let value = 0;
  let bits = 0;
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
};

export const generateTotpSecret = () => randomBytes(TOTP_SECRET_BYTES);

export const getTotpUri = (secret: Buffer, accountName: string) => {
  const label = encodeURIComponent(`${TOTP_ISSUER}:${accountName}`);
  const params = new URLSearchParams({
    secret: encodeBase32(secret),
    issuer: TOTP_ISSUER,
    algorithm: "SHA1",
    digits: String(TOTP_DIGITS),
    period: String(TOTP_STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params}`;
};

export const getTotpTimeStep = (timestampMs: number) =>
  Math.floor(timestampMs / 1000 / TOTP_STEP_SECONDS);

export const generateTotp = (secret: Buffer, timeStep: number) => {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(timeStep));
  const hmac = createHmac("sha1", secret).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binary = hmac.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
};

/**
 * Returns the time step that the code is valid for (allowing for a small
 * amount of clock drift), or null if the code is invalid.
 */
export const findTotpTimeStep = (
  secret: Buffer,
  code: string,
  timestampMs: number,
): number | null => {
  const currentTimeStep = getTotpTimeStep(timestampMs);
  for (
    let timeStep = currentTimeStep - TOTP_ALLOWED_DRIFT_STEPS;
    timeStep <= currentTimeStep + TOTP_ALLOWED_DRIFT_STEPS;
    timeStep++
  ) {
    if (
      constantTimeCompare({
        correctValue: generateTotp(secret, timeStep),
        unknownValue: code,
      })
    ) {
      return timeStep;
    }
  }
  return null;
};

export const encryptTotpSecret = (secret: Buffer) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv(
    ENCRYPTION_ALGORITHM,
    deriveKey("secretEncryption"),
    iv,
  );
  const ciphertext = Buffer.concat([cipher.update(secret), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext]
    .map((part) => part.toString("base64url"))
    .join(".");
};

export const decryptTotpSecret = (encryptedSecret: string) => {
  const [iv, authTag, ciphertext] = encryptedSecret
    .split(".")
    .map((part) => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv(
    ENCRYPTION_ALGORITHM,
    deriveKey("secretEncryption"),
    iv,
  );
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
};

export const parseTwoFactorCode = (
  input: string,
): { type: "totp" | "recoveryCode"; code: string } => {
  const normalized = input.toLowerCase().replace(/[^a-z0-9]/g, "");
  return /^\d{6}$/.test(normalized)
    ? { type: "totp", code: normalized }
    : { type: "recoveryCode", code: normalized };
};

export const generateRecoveryCodes = () =>
  Array.from(
    { length: RECOVERY_CODE_COUNT },
    () => `${randomLowercaseId(5)}-${randomLowercaseId(5)}`,
  );

export const hashRecoveryCode = (code: string) =>
  createHash("sha256").update(parseTwoFactorCode(code).code).digest("base64");

const signPendingLoginPayload = (payload: string) =>
  createHmac("sha256", deriveKey("pendingLoginSigning"))
    .update(payload)
    .digest("base64url");

export const createPendingTwoFactorLoginToken = (
  userId: string,
  timestampMs = Date.now(),
) => {
  const expiresAt = timestampMs + PENDING_TWO_FACTOR_LOGIN_TTL_SECONDS * 1000;
  const payload = `${userId}.${expiresAt}`;
  return `${payload}.${signPendingLoginPayload(payload)}`;
};

/**
 * Returns the user ID from a pending login token, or null if the token is
 * invalid or expired.
 */
export const verifyPendingTwoFactorLoginToken = (
  token: string,
  timestampMs = Date.now(),
): string | null => {
  const [userId, expiresAt, signature] = token.split(".");
  if (!userId || !expiresAt || !signature) {
    return null;
  }
  const expectedSignature = signPendingLoginPayload(`${userId}.${expiresAt}`);
  if (
    !constantTimeCompare({
      correctValue: expectedSignature,
      unknownValue: signature,
    })
  ) {
    return null;
  }
  return Number(expiresAt) > timestampMs ? userId : null;
};
