# OAuth Callback Logout Issue - Debugging Guide

## The Problem

You're experiencing two issues:
1. **Code disappears** after hitting `/api/oauth/google/callback`
2. **User gets logged out** automatically

## Possible Causes

### 1. Cookie Domain Mismatch
If your cookies are set for a different domain than your ngrok URL, they won't be sent with the redirect.

### 2. SameSite Cookie Policy
Modern browsers have strict SameSite cookie policies that can block cookies during OAuth redirects.

### 3. Convex Auth Session Issues
The Convex auth session might not be persisting across the OAuth redirect.

### 4. URL Encoding Issues
The code parameter might be getting corrupted during URL encoding/decoding.

## Debugging Steps

### Step 1: Check Server Logs

After clicking "Connect Google Ads" and authorizing, check your Next.js terminal for:

```
[Google OAuth Callback] ========================================
[Google OAuth Callback] Incoming request URL: https://...
[Google OAuth Callback] Received parameters: {
  code: 'present (length: 123, start: 4/0AY0e-g7...)',
  state: 'present (length: 456)',
  ...
}
[Google OAuth Callback] Request headers: {
  cookie: 'present',
  referer: 'https://accounts.google.com/...'
}
[Google OAuth Callback] Success - preparing redirect
[Google OAuth Callback] Redirect URL: /campaign/create?platform=google&code=...
[Google OAuth Callback] Full redirect URL: https://your-app/campaign/create?...
[Google OAuth Callback] Code length: 123
[Google OAuth Callback] State length: 456
[Google OAuth Callback] ========================================
```

**Key things to check:**
- Is `code` present and has a reasonable length (usually 100-200 characters)?
- Is `cookie` present in headers?
- Does the redirect URL look correct?

### Step 2: Check Browser Network Tab

1. Open browser DevTools (F12)
2. Go to Network tab
3. Click "Connect Google Ads"
4. Watch the network requests

**Look for:**
1. Redirect to Google: `https://accounts.google.com/o/oauth2/v2/auth?...`
2. Redirect back: `https://your-app/api/oauth/google/callback?code=...&state=...`
3. Final redirect: `https://your-app/campaign/create?platform=google&code=...&state=...`

**Check each request:**
- Status code (should be 302 or 307 for redirects)
- Response headers (Location header)
- Request cookies (should be present)
- Response cookies (should be preserved)

### Step 3: Check Browser Console

Look for these logs:

```
[CampaignCreation] URL params detected: { platform: 'google', hasCode: true/false }
```

If `hasCode: false`, the code was lost during redirect.

### Step 4: Check Authentication State

Add this to your browser console after the redirect:

```javascript
// Check if cookies are present
document.cookie

// Check sessionStorage
sessionStorage.getItem('oauth_state')

// Check if you're authenticated
// (This depends on your auth implementation)
```

## Common Issues and Fixes

### Issue 1: Code is Too Long for URL

**Symptom:** Code disappears or gets truncated
**Cause:** Some servers have URL length limits
**Solution:** The code should be fine in the URL (OAuth codes are designed for this)

### Issue 2: Cookie SameSite Policy

**Symptom:** User gets logged out after OAuth redirect
**Cause:** Cookies with `SameSite=Strict` or `SameSite=Lax` might not be sent
**Solution:** Check your Convex auth cookie configuration

In `src/middleware.ts`, you have:
```typescript
{
  cookieConfig: { maxAge: 60 * 60 * 24 * 30 },
}
```

This might need `sameSite` configuration. Try:
```typescript
{
  cookieConfig: { 
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax', // or 'none' with secure: true
  },
}
```

### Issue 3: Ngrok Cookie Issues

**Symptom:** Cookies work locally but not with ngrok
**Cause:** Ngrok URL changes, or cookies are set for wrong domain
**Solution:** 
1. Make sure `NEXT_PUBLIC_APP_URL` matches your ngrok URL exactly
2. Restart your dev server after changing ngrok URL
3. Clear browser cookies for the old ngrok domain

### Issue 4: Multiple Redirects Losing State

**Symptom:** Code is present in callback but disappears after redirect
**Cause:** The redirect chain is losing parameters
**Solution:** Check the network tab to see if all redirects preserve the parameters

## Testing the Fix

### Test 1: Check if Code Reaches the Callback

1. Click "Connect Google Ads"
2. Authorize on Google
3. Check server terminal for:
   ```
   [Google OAuth Callback] Received parameters: { code: 'present (length: 123, ...' }
   ```

If you see this, the code IS reaching your callback.

### Test 2: Check if Code Reaches the Frontend

1. After OAuth redirect, check browser console for:
   ```
   [CampaignCreation] URL params detected: { hasCode: true, ... }
   ```

If `hasCode: false`, the code was lost during the redirect from callback to frontend.

### Test 3: Check Authentication Persistence

1. Before OAuth: Check if you're logged in
2. Click "Connect Google Ads"
3. After redirect back: Check if you're still logged in

If you're logged out, it's a cookie/session issue.

## Temporary Workaround

If the issue persists, we can try a different approach:

### Option 1: Store Code in Session Storage

Instead of passing code via URL, store it temporarily:

```typescript
// In callback route
sessionStorage.setItem('oauth_code', code);
sessionStorage.setItem('oauth_state', state);
// Redirect without parameters
return NextResponse.redirect('/campaign/create?platform=google&oauth=callback');

// In frontend
const code = sessionStorage.getItem('oauth_code');
const state = sessionStorage.getItem('oauth_state');
```

### Option 2: Use Server-Side Session

Store the code server-side with a temporary token:

```typescript
// In callback route
const tempToken = generateRandomToken();
await storeInDatabase({ tempToken, code, state, expiresAt: Date.now() + 60000 });
return NextResponse.redirect(`/campaign/create?platform=google&token=${tempToken}`);

// In frontend
const tempToken = searchParams.get('token');
const { code, state } = await fetchFromDatabase(tempToken);
```

## What to Share for Further Debugging

If the issue persists, please share:

1. **Server terminal logs** - The complete output from `[Google OAuth Callback]`
2. **Browser console logs** - All logs from the OAuth flow
3. **Network tab screenshot** - Showing the redirect chain
4. **Cookie information** - From browser DevTools → Application → Cookies
5. **Exact error message** - If any appears

## Next Steps

1. Run through the debugging steps above
2. Check the server logs to see if code is reaching the callback
3. Check browser console to see if code is reaching the frontend
4. Check if authentication state is preserved
5. Share the logs if issue persists
