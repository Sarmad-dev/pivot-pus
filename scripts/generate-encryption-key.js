#!/usr/bin/env node

/**
 * Generate a secure encryption key for token storage
 * 
 * Usage:
 *   node scripts/generate-encryption-key.js
 * 
 * This will generate a 256-bit (32 byte) encryption key encoded in base64.
 * Add the output to your .env.local file as TOKEN_ENCRYPTION_KEY
 */

const crypto = require('crypto');

function generateEncryptionKey() {
  // Generate 32 random bytes (256 bits)
  const key = crypto.randomBytes(32);
  
  // Encode as base64 for easy storage
  const keyBase64 = key.toString('base64');
  
  return keyBase64;
}

function main() {
  console.log('='.repeat(70));
  console.log('Token Encryption Key Generator');
  console.log('='.repeat(70));
  console.log();
  
  const key = generateEncryptionKey();
  
  console.log('Generated encryption key (256-bit AES):');
  console.log();
  console.log(key);
  console.log();
  console.log('Add this to your .env.local file:');
  console.log();
  console.log(`TOKEN_ENCRYPTION_KEY=${key}`);
  console.log();
  console.log('='.repeat(70));
  console.log('IMPORTANT SECURITY NOTES:');
  console.log('='.repeat(70));
  console.log('1. Keep this key SECRET - never commit it to version control');
  console.log('2. Store it securely in your environment variables');
  console.log('3. Use different keys for development, staging, and production');
  console.log('4. If the key is compromised, rotate it immediately');
  console.log('5. Back up the key securely - losing it means losing access to encrypted data');
  console.log('='.repeat(70));
  console.log();
}

main();
