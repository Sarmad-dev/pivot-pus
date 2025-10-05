# External API Integration

This directory contains the infrastructure for integrating with external advertising platforms (Facebook Ads and Google Ads).

## Architecture

### Components

1. **Base Client** (`base-client.ts`)
   - Abstract base class for all API clients
   - Handles authentication, token refresh, and error handling
   - Implements retry logic with exponential backoff

2. **Platform Clients**
   - `facebook/client.ts` - Facebook Ads API integration
   - `google/client.ts` - Google Ads API integration

3. **OAuth Flow** (`oauth/`)
   - `config.ts` - OAuth configuration for each platform
   - `token-exchange.ts` - Token exchange and refresh utilities

4. **Error Handling** (`errors.ts`)
   - Custom error classes for different failure scenarios
   - Distinguishes between retryable and non-retryable errors

5. **Retry Logic** (`retry.ts`)
   - Exponential backoff with jitter
   - Configurable retry attempts and delays
   - Respects rate limit headers

## Setup

### Environment Variables

Add the following to your `.env.local`:

```bash
# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Facebook Ads
NEXT_PUBLIC_FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret

# Google Ads
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_ADS_DEVELOPER_TOKEN=your_google_ads_developer_token
```

### OAuth Setup

#### Facebook Ads

1. Create a Facebook App at https://developers.facebook.com/
2. Add "Marketing API" product
3. Configure OAuth redirect URI: `http://localhost:3000/api/oauth/facebook/callback`
4. Request permissions: `ads_read`, `ads_management`, `business_management`, `read_insights`

#### Google Ads

1. Create a project in Google Cloud Console
2. Enable Google Ads API
3. Create OAuth 2.0 credentials
4. Configure redirect URI: `http://localhost:3000/api/oauth/google/callback`
5. Request scopes: `https://www.googleapis.com/auth/adwords`

## Usage

### Connecting a Platform

```typescript
import { usePlatformConnection } from '@/hooks/usePlatformConnection';

function ConnectButton() {
  const { connect, isConnected } = usePlatformConnection('facebook', organizationId);

  return (
    <button onClick={connect} disabled={isConnected}>
      {isConnected ? 'Connected' : 'Connect Facebook'}
    </button>
  );
}
```

### Using API Clients

```typescript
import { FacebookAdsClient } from '@/lib/api';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

async function fetchCampaigns() {
  // Get tokens from Convex
  const tokens = await convex.query(api.platformConnections.getPlatformTokens, {
    platform: 'facebook',
  });

  if (!tokens) {
    throw new Error('Not connected to Facebook');
  }

  // Create client and set tokens
  const client = new FacebookAdsClient();
  client.setTokens(tokens);

  // Fetch ad accounts
  const accounts = await client.getAdAccounts();

  // Fetch campaigns for first account
  const campaigns = await client.getCampaigns(accounts[0].id);

  return campaigns;
}
```

### Error Handling

```typescript
import { PlatformAPIError, TokenExpiredError, RateLimitError } from '@/lib/api';

try {
  const campaigns = await client.getCampaigns(accountId);
} catch (error) {
  if (error instanceof TokenExpiredError) {
    // Token expired - trigger re-authentication
    console.error('Please reconnect your account');
  } else if (error instanceof RateLimitError) {
    // Rate limited - wait and retry
    console.error(`Rate limited. Retry after ${error.retryAfter} seconds`);
  } else if (error instanceof PlatformAPIError) {
    // Other API error
    console.error(`API Error: ${error.message}`);
  }
}
```

## Security

### Token Storage

- Tokens are stored encrypted in Convex database
- Access tokens are never exposed to the client
- Refresh tokens are used to obtain new access tokens automatically

### CSRF Protection

- OAuth state parameter is used to prevent CSRF attacks
- State is stored in session storage and verified on callback

### Token Encryption

✅ **Production-Ready Encryption Implemented**

The system uses AES-256-GCM authenticated encryption for token storage:

- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Size**: 256 bits (32 bytes)
- **IV Size**: 96 bits (12 bytes, recommended for GCM)
- **Authentication**: 128-bit authentication tag
- **Format**: `base64(iv):base64(ciphertext+tag)`

**Generate Encryption Key:**

```bash
node scripts/generate-encryption-key.js
```

Or manually with OpenSSL:

```bash
openssl rand -base64 32
```

**Add to .env.local:**

```bash
TOKEN_ENCRYPTION_KEY=your_generated_key_here
```

**Security Features:**
- Authenticated encryption prevents tampering
- Random IV for each encryption operation
- Constant-time operations to prevent timing attacks
- Secure key derivation from environment variable

## Testing

### Mock API Responses

For testing, you can mock API responses:

```typescript
import { FacebookAdsClient } from '@/lib/api';

// Mock the fetch function
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ data: mockCampaigns }),
  })
);

const client = new FacebookAdsClient();
client.setTokens(mockTokens);
const campaigns = await client.getCampaigns('act_123');
```

## Rate Limits

### Facebook Ads API
- Rate limits vary by app and user
- Respect `X-Business-Use-Case-Usage` header
- Implement exponential backoff on 429 responses

### Google Ads API
- 15,000 operations per day (default)
- Rate limits per developer token
- Use batch operations when possible

## Troubleshooting

### Token Refresh Failures
- Verify client secrets are correct
- Check if refresh token is still valid
- Ensure OAuth scopes haven't changed

### API Errors
- Check platform status pages
- Verify API versions are supported
- Review error details in `lastError` field

### Connection Issues
- Verify redirect URIs match exactly
- Check CORS settings for API routes
- Ensure environment variables are set
