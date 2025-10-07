/**
 * Production-ready encryption utilities for sensitive data
 * Uses AES-256-GCM for authenticated encryption
 * Compatible with Convex runtime (Web Crypto API)
 */

// Use global crypto (available in Convex runtime)
const crypto = globalThis.crypto;

// Encryption configuration
const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits recommended for GCM
const TAG_LENGTH = 128; // 128 bits authentication tag

/**
 * Base64 decode helper (works in Convex runtime)
 */
function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Base64 encode helper (works in Convex runtime)
 */
function bytesToBase64(bytes: Uint8Array): string {
  let binaryString = "";
  for (let i = 0; i < bytes.length; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }
  return btoa(binaryString);
}

/**
 * Get or generate encryption key from environment
 * In production, this should be stored in a secure key management service
 */
function getEncryptionKey(): string {
  const key = process.env.TOKEN_ENCRYPTION_KEY;

  console.log("TOKEN ENCRYPTION KEY: ", key)

  if (!key) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY environment variable is not set. " +
        "Generate a secure key with: openssl rand -base64 32"
    );
  }

  // Validate key length (should be 32 bytes when base64 decoded)
  const keyBuffer = base64ToBytes(key);
  if (keyBuffer.length !== 32) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY must be 32 bytes (256 bits) when base64 decoded. " +
        "Generate with: openssl rand -base64 32"
    );
  }

  return key;
}

/**
 * Import the encryption key for use with Web Crypto API
 */
async function importKey(): Promise<CryptoKey> {
  const keyString = getEncryptionKey();
  const keyBuffer = base64ToBytes(keyString);

  return await crypto.subtle.importKey(
    "raw",
    keyBuffer as BufferSource,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt a token using AES-256-GCM
 * Returns: base64(iv):base64(ciphertext+tag)
 */
export async function encryptToken(token: string): Promise<string> {
  try {
    // Import encryption key
    const key = await importKey();

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Encode the token
    const encoder = new TextEncoder();
    const data = encoder.encode(token);

    // Encrypt the data
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv: iv,
        tagLength: TAG_LENGTH,
      },
      key,
      data
    );

    // Convert to base64 for storage
    const encryptedArray = new Uint8Array(encryptedBuffer);
    const ivBase64 = bytesToBase64(iv);
    const encryptedBase64 = bytesToBase64(encryptedArray);

    // Return format: iv:ciphertext
    return `${ivBase64}:${encryptedBase64}`;
  } catch (error) {
    throw new Error(
      `Token encryption failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Decrypt a token using AES-256-GCM
 * Input format: base64(iv):base64(ciphertext+tag)
 */
export async function decryptToken(encryptedToken: string): Promise<string> {
  try {
    // Parse the encrypted token
    const parts = encryptedToken.split(":");
    if (parts.length !== 2) {
      throw new Error("Invalid encrypted token format");
    }

    const [ivBase64, encryptedBase64] = parts;

    // Convert from base64
    const iv = base64ToBytes(ivBase64);
    const encryptedData = base64ToBytes(encryptedBase64);

    // Validate IV length
    if (iv.length !== IV_LENGTH) {
      throw new Error("Invalid IV length");
    }

    // Import encryption key
    const key = await importKey();

    // Decrypt the data
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv as BufferSource,
        tagLength: TAG_LENGTH,
      },
      key,
      encryptedData as BufferSource
    );

    // Decode the decrypted data
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    // Don't expose detailed decryption errors for security
    throw new Error(
      "Token decryption failed - token may be corrupted or tampered with"
    );
  }
}

/**
 * Validate that encryption is properly configured
 * Call this on application startup
 */
export function validateEncryptionSetup(): void {
  try {
    getEncryptionKey();
  } catch (error) {
    console.error("Encryption setup validation failed:", error);
    throw error;
  }
}

/**
 * Generate a new encryption key (for setup/rotation)
 * This should be run manually and the output stored securely
 */
export function generateEncryptionKey(): string {
  const key = crypto.getRandomValues(new Uint8Array(32));
  return bytesToBase64(key);
}
