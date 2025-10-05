# Encryption Setup Quick Start

This guide will help you set up token encryption for the external API integration.

## Prerequisites

- Node.js installed
- Access to your project's environment variables

## Step-by-Step Setup

### 1. Generate Encryption Key

Run the key generation script:

```bash
node scripts/generate-encryption-key.js
```

You'll see output like this:

```
======================================================================
Token Encryption Key Generator
======================================================================

Generated encryption key (256-bit AES):

xK8vN2mP9qR5sT7uW1yZ3aB4cD6eF8gH0iJ2kL4mN6oP8qR0sT2u=

Add this to your .env.local file:

TOKEN_ENCRYPTION_KEY=xK8vN2mP9qR5sT7uW1yZ3aB4cD6eF8gH0iJ2kL4mN6oP8qR0sT2u=

======================================================================
IMPORTANT SECURITY NOTES:
======================================================================
1. Keep this key SECRET - never commit it to version control
2. Store it securely in your environment variables
3. Use different keys for development, staging, and production
4. If the key is compromised, rotate it immediately
5. Back up the key securely - losing it means losing access to encrypted data
======================================================================
```

### 2. Add to Environment Variables

#### Local Development

Add the key to your `.env.local` file:

```bash
TOKEN_ENCRYPTION_KEY=xK8vN2mP9qR5sT7uW1yZ3aB4cD6eF8gH0iJ2kL4mN6oP8qR0sT2u=
```

#### Production/Staging

Add the environment variable through your hosting platform:

**Vercel:**
```bash
vercel env add TOKEN_ENCRYPTION_KEY
```

**Netlify:**
```bash
netlify env:set TOKEN_ENCRYPTION_KEY "your_key_here"
```

**AWS/Heroku/Other:**
Use your platform's environment variable management interface.

### 3. Verify Setup

Start your development server:

```bash
npm run dev
```

If the encryption key is missing or invalid, you'll see an error message. Otherwise, the system is ready to use.

### 4. Test Encryption (Optional)

You can test the encryption in the Node.js REPL:

```bash
node
```

```javascript
const crypto = require('crypto');

// Your encryption key
const key = Buffer.from('xK8vN2mP9qR5sT7uW1yZ3aB4cD6eF8gH0iJ2kL4mN6oP8qR0sT2u=', 'base64');

// Test data
const testToken = 'test_access_token_12345';

// Encrypt
const iv = crypto.randomBytes(12);
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
let encrypted = cipher.update(testToken, 'utf8', 'base64');
encrypted += cipher.final('base64');
const authTag = cipher.getAuthTag();

console.log('Encrypted:', encrypted);

// Decrypt
const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
decipher.setAuthTag(authTag);
let decrypted = decipher.update(encrypted, 'base64', 'utf8');
decrypted += decipher.final('utf8');

console.log('Decrypted:', decrypted);
console.log('Match:', testToken === decrypted);
```

## Security Checklist

Before going to production, ensure:

- [ ] Unique encryption key generated for production
- [ ] Key stored securely (not in code or version control)
- [ ] Different keys used for dev/staging/production
- [ ] Key backed up in secure location
- [ ] Access to key restricted to authorized personnel only
- [ ] Monitoring set up for encryption failures
- [ ] Incident response plan in place for key compromise

## Troubleshooting

### Error: "TOKEN_ENCRYPTION_KEY environment variable is not set"

**Solution:** Generate a key and add it to your `.env.local` file.

### Error: "TOKEN_ENCRYPTION_KEY must be 32 bytes"

**Solution:** The key must be exactly 32 bytes when base64 decoded. Generate a new key using the provided script.

### Error: "Token decryption failed"

**Possible causes:**
1. Wrong encryption key being used
2. Corrupted encrypted data
3. Key was changed after tokens were encrypted

**Solution:** 
- Verify the correct key is set
- If key was changed, users need to reconnect their accounts
- Check database for data corruption

### Tokens not working after key rotation

**Solution:** After rotating the encryption key, all existing encrypted tokens become invalid. Users must:
1. Disconnect their platform connections
2. Reconnect to re-authenticate

## Key Rotation

When you need to rotate the encryption key:

1. **Generate new key:**
   ```bash
   node scripts/generate-encryption-key.js
   ```

2. **Update environment variable** with the new key

3. **Clear existing connections** (users will need to reconnect):
   ```sql
   -- In Convex dashboard
   DELETE FROM platformConnections;
   ```

4. **Notify users** to reconnect their accounts

5. **Remove old key** from all environments

## Best Practices

### DO ✅

- Generate unique keys for each environment
- Store keys in secure environment variable management
- Rotate keys periodically (e.g., every 90 days)
- Back up keys in a secure password manager
- Monitor for encryption/decryption failures
- Use key management services (AWS KMS, Azure Key Vault) in production

### DON'T ❌

- Commit keys to version control
- Share keys via email or chat
- Use the same key across environments
- Store keys in code or configuration files
- Ignore encryption errors
- Forget to back up keys

## Additional Resources

- [Full Security Documentation](./SECURITY.md)
- [Encryption Implementation](../convex/lib/encryption.ts)
- [NIST Cryptographic Standards](https://csrc.nist.gov/projects/cryptographic-standards-and-guidelines)

## Support

If you encounter issues:
1. Check this guide
2. Review error messages carefully
3. Verify environment variables are set correctly
4. Consult the security documentation
5. Contact your security team for sensitive issues
