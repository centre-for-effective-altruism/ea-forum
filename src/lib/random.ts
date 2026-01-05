import { randomBytes } from "node:crypto";
import { isServer } from "./environment";

// Excludes 0O1lIUV
const unmistakableChars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTWXYZ23456789";

export type RandIntCallback = (max: number) => number;

/**
 * A random integer in [0,max). Not cryptographically secure.
 */
export const randInt: RandIntCallback = (max: number) => {
  return Math.floor(Math.random() * max);
};

export const ID_LENGTH = 17;

/**
 * A random 17-digit string, using characters that are hard to confuse with each
 * other. If run on the server and not supplying a custom RNG then it's
 * cryptographically secure, otherwise it's not.
 */
export const randomId = (
  length = ID_LENGTH,
  randIntCallback?: RandIntCallback,
  allowedChars?: string,
) => {
  const chars = allowedChars ?? unmistakableChars;
  if (isServer && !randIntCallback) {
    const bytes = randomBytes(length);
    const result: string[] = [];
    for (const byte of bytes) {
      // Discards part of each byte and has modulo bias. Doesn't matter in
      // this context.
      result.push(chars[byte % chars.length]);
    }
    return result.join("");
  } else {
    const rand = randIntCallback ?? randInt;
    const result: string[] = [];
    for (let i = 0; i < length; i++) {
      result.push(chars[rand(chars.length)]);
    }
    return result.join("");
  }
};
