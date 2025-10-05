# Security Documentation

## Token Encryption

### Overview

All OAuth tokens (access tokens and refresh tokens) are encrypted before storage in the Convex database using industry-standard AES-256-GCM authenticated encryption.

### Encryption Specification

- **Algorithm**: AES-256-GCM (Advanced Encryption Standard with Galois/Counter Mode)
- **Key Size**: 256 bits (32 bytes)
- **IV Size**: 96 bits (12 bytes) - recommended size for GCM
- **Authentication Tag**: 128 bits
- **Storage Format**: `base64(iv):base64(ciphertext+tag)`

### Why AES-256-GCM?

1. **Authenticated Encryption**: GCM mode provides both confidentiality and authenticity, preventing tampering
2. **Performance**: Hardware-accelerated on modern CPUs
3. **Security**: No known practical attacks against AES-256
4. **Standard**: NIST-approved and widely used in production systems

### Setup Instructions

#### 1. Generate Encryption Key

**Option A: Using the provided script**
```bash
node scripts/generate-encryption-key.js
```

**Option B: Using OpenSSL**
```bash
openssl rand -base64 32
```

**Option C: Using Node.js directly**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

#### 2. Configure Environment Variable

Add the generated key to your `.env.local` file:

```bash
TOKEN_ENCRYPTION_KEY=<your_generated_key_here>
```

**Example:**
```bash
TOKEN_ENCRYPTION_KEY=xK8vN2mP9qR5sT7uW1yZ3aB4cD6eF8gH0iJ2kL4mN6oP8qR0sT2u=
```

#### 3. Validate Setup

The encryption system will automatically validate the key on first use. If the key is missing or invalid, you'll see an error:

```
TOKEN_ENCRYPTION_KEY environment variable is not set.
Generate a secure key with: openssl rand -base64 32
```

### Key Management Best Practices

#### Development Environment

1. Generate a unique key for local development
2. Store in `.env.local` (never commit this file)
3. Share with team members through secure channels (password manager, encrypted chat)

#### Staging Environment

1. Generate a separate key for staging
2. Store in your deployment platform's environment variables
3. Restrict access to authorized team members only

#### Production Environment

1. Generate a unique production key
2. Store in a secure key management service (AWS KMS, Azure Key Vault, HashiCorp Vault)
3. Implement strict access controls
4. Enable audit logging for key access
5. Set up monitoring and alerts

### Key Rotation

When rotating encryption keys:

1. **Generate new key**: Create a new encryption key
2. **Deploy with both keys**: Temporarily support both old and new keys
3. **Re-encrypt data**: Decrypt with old key, encrypt with new key
4. **Remove old key**: After all data is re-encrypted, remove the old key

**Example rotation script** (to be implemented):
```typescript
// Pseudo-code for key rotation
async function rotateEncryptionKey(oldKey: string, newKey: string) {
  const connections = await getAllPlatformConnections();
  
  for (const connection of connections) {
    // Decrypt with old key
    const accessToken = await decryptToken(connection.accessToken, oldKey);
    const refreshToken = connection.refreshToken 
      ? await decryptToken(connection.refreshToken, oldKey)
      : undefined;
    
    // Re-encrypt with new key
    const newAccessToken = await encryptToken(accessToken, newKey);
    const newRefreshToken = refreshToken 
      ? await encryptToken(refreshToken, newKey)
      : undefined;
    
    // Update in database
    await updateConnection(connection._id, {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  }
}
```

### Security Considerations

#### What's Protected

✅ OAuth access tokens
✅ OAuth refresh tokens
✅ Data integrity (authentication tag prevents tampering)
✅ Replay attacks (random IV for each encryption)

#### What's Not Protected

❌ Connection metadata (platform, user ID, timestamps)
❌ Platform-specific IDs (account IDs, user names)
❌ Connection status and error messages

These fields are stored in plaintext for querying and debugging purposes. They don't contain sensitive authentication data.

### Threat Model

#### Protected Against

1. **Database Breach**: Encrypted tokens are useless without the encryption key
2. **Tampering**: Authentication tag detects any modifications
3. **Replay Attacks**: Random IV prevents reuse of encrypted data
4. **Timing Attacks**: Constant-time operations in crypto library

#### Not Protected Against

1. **Key Compromise**: If the encryption key is leaked, all tokens can be decrypted
2. **Memory Dumps**: Decrypted tokens exist in memory during use
3. **Side-Channel Attacks**: Physical access to the server
4. **Insider Threats**: Authorized users with database and key access

### Compliance

This encryption implementation helps meet requirements for:

- **GDPR**: Encryption of personal data
- **PCI DSS**: Protection of authentication credentials
- **SOC 2**: Security controls for sensitive data
- **HIPAA**: Encryption of protected health information (if applicable)

### Monitoring and Alerts

Set up monitoring for:

1. **Encryption failures**: Alert on repeated encryption/decryption errors
2. **Key access**: Log all attempts to access the encryption key
3. **Token refresh failures**: May indicate compromised tokens
4. **Unusual access patterns**: Multiple failed decryption attempts

### Incident Response

If you suspect a security breach:

1. **Immediately rotate the encryption key**
2. **Revoke all platform connections** (force users to re-authenticate)
3. **Audit access logs** to identify the scope of the breach
4. **Notify affected users** according to your privacy policy
5. **Review and update security controls**

### Testing

#### Unit Tests

```typescript
import { encryptToken, decryptToken } from './convex/lib/encryption';

describe('Token Encryption', () => {
  it('should encrypt and decrypt tokens correctly', async () => {
    const originalToken = 'test_access_token_12345';
    const encrypted = await encryptToken(originalToken);
    const decrypted = await decryptToken(encrypted);
    
    expect(decrypted).toBe(originalToken);
    expect(encrypted).not.toBe(originalToken);
  });

  it('should use different IVs for each encryption', async () => {
    const token = 'test_token';
    const encrypted1 = await encryptToken(token);
    const encrypted2 = await encryptToken(token);
    
    expect(encrypted1).not.toBe(encrypted2);
  });

  it('should fail on tampered ciphertext', async () => {
    const encrypted = await encryptToken('test_token');
    const tampered = encrypted.replace(/.$/, 'X'); // Change last character
    
    await expect(decryptToken(tampered)).rejects.toThrow();
  });
});
```

### Additional Resources

- [NIST Special Publication 800-38D](https://csrc.nist.gov/publications/detail/sp/800-38d/final) - GCM Specification
- [Web Crypto API](https://www.w3.org/TR/WebCryptoAPI/) - Browser crypto standard
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)

### Support

For security concerns or questions:
1. Review this documentation
2. Check the implementation in `convex/lib/encryption.ts`
3. Consult your security team
4. For vulnerabilities, follow responsible disclosure practices
