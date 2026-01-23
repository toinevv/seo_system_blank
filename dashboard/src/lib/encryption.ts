import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is not set");
  }
  return Buffer.from(key, "base64");
}

/**
 * Encrypts a string using AES-256-GCM
 * Returns base64 encoded string containing: IV + Auth Tag + Ciphertext
 */
export function encrypt(text: string): string {
  if (!text) return "";

  const key = getKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  // Combine IV + Tag + Encrypted data
  const combined = Buffer.concat([iv, tag, encrypted]);
  return combined.toString("base64");
}

/**
 * Decrypts a string that was encrypted with the encrypt function
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return "";

  const key = getKey();
  const buffer = Buffer.from(encryptedText, "base64");

  // Extract IV (16 bytes), Auth Tag (16 bytes), and Ciphertext
  const iv = buffer.subarray(0, 16);
  const tag = buffer.subarray(16, 32);
  const encrypted = buffer.subarray(32);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/**
 * Generates a new encryption key (for initial setup)
 * Run: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 */
export function generateKey(): string {
  return randomBytes(32).toString("base64");
}

/**
 * Masks an API key for display (shows first 4 and last 4 chars)
 */
export function maskApiKey(key: string): string {
  if (!key || key.length < 12) return "••••••••";
  return `${key.slice(0, 4)}••••••••${key.slice(-4)}`;
}
