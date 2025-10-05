# OAuth Callback Fix

## Problem
The OAuth callback flow was incomplete, causing two issues:
1. **Missing code error**: The callback route was redirecting to `/campaigns/import` but the frontend wasn't processing the OAuth callback parameters (`code` and `state`)
2. **Platform connection not saving**: The OAuth tokens were never being exchanged and stored in the database because the frontend callback handler was never invoked

## Root Cause
The OAuth flow had these steps:
1. ✅ User clicks "Connect Google Ads"
2. ✅ Frontend redirects to Google OAuth
3. ✅ Google redirects back to `/api/oauth/google/callback`
4. ✅ Backend callback route receives `code` and `state`
5. ✅ Backend redirects to frontend with parameters
6. ❌ **Frontend never processed the callback parameters**
7. ❌ **Tokens were never exchanged or stored**

The `useOAuthCallback` hook existed but was never used in any component.

## Solution

### 1. Updated OAuth Callback Routes
Changed the redirect URL from `/campaigns/import` to `/campaign/create` (the actual route that exists):

**Files Modified:**
- `src/app/api/oauth/google/callback/route.ts`
- `src/app/api/oauth/facebook/callback/route.ts`

### 2. Added OAuth Callback Processing to Frontend
Updated the `CampaignImport` component to:
- Import and use the `useOAuthCallback` hook
- Detect OAuth callback parameters in the URL (`code`, `state`, `platform`)
- Process the callback by:
  - Exchanging the authorization code for tokens
  - Storing the tokens in the database via Convex
  - Automatically selecting the platform after successful connection
  - Cleaning up URL parameters
- Show appropriate loading and error states

**File Modified:**
- `src/components/campaigns/import/index.tsx`

## How It Works Now

### Complete OAuth Flow:
1. User clicks "Connect Google Ads" → `usePlatformConnection.connect()`
2. Frontend generates state parameter and stores it in sessionStorage
3. Frontend redirects to Google OAuth authorization URL
4. User authorizes the app on Google
5. Google redirects to `/api/oauth/google/callback?code=...&state=...`
6. Backend validates parameters and redirects to `/campaign/create?platform=google&code=...&state=...`
7. **Frontend detects callback parameters** → `useOAuthCallback.handleCallback()`
8. **Frontend exchanges code for tokens** → `exchangeCodeForTokens()`
9. **Frontend stores tokens in database** → `storePlatformConnection()` mutation
10. Frontend shows the Google Ads import UI
11. User can now import campaigns

### Key Changes:
- OAuth callback parameters are now processed automatically when present in URL
- Tokens are properly exchanged and encrypted before storage
- Platform connection status is updated in real-time
- Error handling for OAuth failures
- Loading states during token exchange
- URL cleanup after successful connection

## Testing
To test the fix:
1. Navigate to `/campaign/create`
2. Click "Import Campaign" tab
3. Select "Google Ads"
4. Click "Connect Google Ads"
5. Authorize on Google
6. You should be redirected back and see:
   - Loading spinner while processing
   - Google Ads import UI after successful connection
   - Platform connection saved in database
   - No "missing code" error

## Files Changed
- `src/app/api/oauth/google/callback/route.ts` - Updated redirect URL, added code parameter
- `src/app/api/oauth/facebook/callback/route.ts` - Updated redirect URL
- `src/components/campaigns/import/index.tsx` - Added OAuth callback processing with debugging
- `src/hooks/usePlatformConnection.ts` - Added debugging logs

## Debugging Added
Console logs have been added to help diagnose OAuth flow issues:
- When initiating OAuth connection
- When receiving callback parameters
- When processing the callback
- When errors occur

Check browser console for detailed flow information.

## Important: Google Cloud Console Configuration
Make sure your Google Cloud Console OAuth 2.0 Client has the correct redirect URI:
```
https://7e08ab553447.ngrok-free.app/api/oauth/google/callback
```

If you change your ngrok URL, you MUST update it in Google Cloud Console.
