# External API Integration - Quick Reference

## Setup (First Time)

```bash
# 1. Generate encryption key
node scripts/generate-encryption-key.js

# 2. Add to .env.local
echo "TOKEN_ENCRYPTION_KEY=<your_key>" >> .env.local

# 3. Add OAuth credentials
# NEXT_PUBLIC_FACEBOOK_APP_ID=...
# FACEBOOK_APP_SECRET=...
# NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
# GOOGLE_CLIENT_SECRET=...
# GOOGLE_ADS_DEVELOPER_TOKEN=...

# 4. Start Convex
npx convex dev
```

## Common Tasks

### Connect a Platform

```typescript
import { usePlatformConnection } from '@/hooks/usePlatformConnection';

const { connect, disconnect, isConnected } = usePlatformConnection(
  'facebook',
  organizationId
);

// Connect
<button onClick={connect}>Connect</button>

// Disconnect
<button onClick={disconnect}>Disconnect</button>
```

### Fetch Campaigns

```typescript
import { FacebookAdsClient } from "@/lib/api";
import { api } from "../../../convex/_generated/api";

// Get tokens
const tokens = await convex.query(api.platformConnections.getPlatformTokens, {
  platform: "facebook",
});

// Create client
const client = new FacebookAdsClient();
client.setTokens(tokens);

// Fetch campaigns
const accounts = await client.getAdAccounts();
const campaigns = await client.getCampaigns(accounts[0].id);
```

### Handle Errors

```typescript
import { TokenExpiredError, RateLimitError, PlatformAPIError } from "@/lib/api";

try {
  await client.getCampaigns(accountId);
} catch (error) {
  if (error instanceof TokenExpiredError) {
    // Reconnect needed
  } else if (error instanceof RateLimitError) {
    // Wait and retry
  } else if (error instanceof PlatformAPIError) {
    // Handle API error
  }
}
```

## API Methods

### Facebook Ads

```typescript
const client = new FacebookAdsClient();

// User info
await client.getMe();

// Ad accounts
await client.getAdAccounts();

// Campaigns
await client.getCampaigns(accountId);
await client.getCampaign(campaignId);

// Insights
await client.getCampaignInsights(campaignId, "lifetime");

// Targeting
await client.getCampaignTargeting(campaignId);
```

### Google Ads

```typescript
const client = new GoogleAdsClient();

// Customers
await client.getCustomers();

// Campaigns
await client.getCampaigns(customerId);
await client.getCampaign(customerId, campaignId);

// Metrics
await client.getCampaignMetrics(
  customerId,
  campaignId,
  "2024-01-01",
  "2024-12-31"
);

// Targeting
await client.getCampaignTargeting(customerId, campaignId);
```

## Convex Functions

```typescript
import { api } from "../../../convex/_generated/api";

// Store connection
await convex.mutation(api.platformConnections.storePlatformConnection, {
  platform: "facebook",
  organizationId,
  accessToken,
  refreshToken,
  expiresAt,
});

// Get connection
await convex.query(api.platformConnections.getPlatformConnection, {
  platform: "facebook",
});

// Get tokens (server-side)
await convex.query(api.platformConnections.getPlatformTokens, {
  platform: "facebook",
});

// Disconnect
await convex.mutation(api.platformConnections.disconnectPlatform, {
  platform: "facebook",
});
```

## Environment Variables

```bash
# Required
TOKEN_ENCRYPTION_KEY=<32-byte base64 key>
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Facebook
NEXT_PUBLIC_FACEBOOK_APP_ID=<app_id>
FACEBOOK_APP_SECRET=<app_secret>

# Google
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<client_id>
GOOGLE_CLIENT_SECRET=<client_secret>
GOOGLE_ADS_DEVELOPER_TOKEN=<dev_token>
```

## OAuth Redirect URIs

```
Facebook: {APP_URL}/api/oauth/facebook/callback
Google:   {APP_URL}/api/oauth/google/callback
```

## Error Codes

| Error           | Retryable | Action             |
| --------------- | --------- | ------------------ |
| `AUTH_ERROR`    | No        | Reconnect account  |
| `TOKEN_EXPIRED` | Yes       | Auto-refresh       |
| `RATE_LIMIT`    | Yes       | Wait and retry     |
| `NETWORK_ERROR` | Yes       | Retry with backoff |
| `HTTP_4xx`      | No        | Check request      |
| `HTTP_5xx`      | Yes       | Retry              |

## Retry Configuration

```typescript
import { withRetry, DEFAULT_RETRY_CONFIG } from "@/lib/api";

// Use defaults
await withRetry(() => client.getCampaigns(accountId));

// Custom config
await withRetry(() => client.getCampaigns(accountId), {
  maxRetries: 5,
  initialDelayMs: 2000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
});
```

## Security Checklist

- [ ] Unique encryption key per environment
- [ ] Keys stored in environment variables
- [ ] Keys never in code or version control
- [ ] OAuth redirect URIs configured
- [ ] HTTPS in production
- [ ] Monitoring enabled
- [ ] Incident response plan ready

## Troubleshooting

### "TOKEN_ENCRYPTION_KEY not set"

```bash
node scripts/generate-encryption-key.js
# Add output to .env.local
```

### "Token decryption failed"

- Wrong encryption key
- Key changed after encryption
- Users need to reconnect

### "OAuth callback error"

- Check redirect URI matches exactly
- Verify OAuth credentials
- Check state parameter

### "Rate limit exceeded"

- Wait for retry-after period
- Reduce request frequency
- Use batch operations

## File Locations

```
API Clients:     src/lib/api/
React Hooks:     src/hooks/usePlatformConnection.ts
Convex:          convex/platformConnections.ts
Encryption:      convex/lib/encryption.ts
OAuth Routes:    src/app/api/oauth/
Documentation:   docs/
```

## Resources

- [Full Documentation](./API_INTEGRATION_COMPLETE.md)
- [Security Guide](./SECURITY.md)
- [Setup Guide](./ENCRYPTION_SETUP.md)
- [API README](../src/lib/api/README.md)
