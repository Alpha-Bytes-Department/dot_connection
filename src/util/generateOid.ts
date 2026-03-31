import { randomBytes } from "crypto";

/**
 * Generates a Mongo ObjectId-like 24-char hex string.
 * Format: 8 hex timestamp + 16 hex random bytes.
 */
const generateOid = (): string => {
  const timestampHex = Math.floor(Date.now() / 1000)
    .toString(16)
    .padStart(8, "0");
  const randomHex = randomBytes(8).toString("hex");
  return `${timestampHex}${randomHex}`;
};

export default generateOid;
