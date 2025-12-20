// Duplicates `randomId()` from packages/lesswrong/lib/random.ts
// Excludes 0O1lIUV
const unmistakableChars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTWXYZ23456789";
/**
 * A random integer in [0,max). Not cryptographically secure.
 */
export const randInt = (max) => {
  return Math.floor(Math.random() * max);
};
export const ID_LENGTH = 17;
/**
 * A random 17-digit string, using characters that are hard to confuse with each
 * other. If run on the server and not supplying a custom RNG then it's
 * cryptographically secure, otherwise it's not.
 */
export const randomId = (length = ID_LENGTH, randIntCallback, allowedChars) => {
  const chars =
    allowedChars !== null && allowedChars !== void 0
      ? allowedChars
      : unmistakableChars;
  const rand =
    randIntCallback !== null && randIntCallback !== void 0
      ? randIntCallback
      : randInt;
  const result = [];
  for (let i = 0; i < length; i++) {
    result.push(chars[rand(chars.length)]);
  }
  return result.join("");
};
//# sourceMappingURL=random.js.map
