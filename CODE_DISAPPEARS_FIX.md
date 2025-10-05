# Code Disappears & Logout Issue - Complete Analysis

## What's Happening

You reported two issues:
1. **Code disappears** when hitting `/api/oauth/google/callback`
2. **User gets logged out** automatically

## Root Cause Analysis

### The OAuth Flow:
```
1. User on: https://your-app/campaign/create (authenticated ✓)
2. Click "Connect" → Redirect to Google
3. Google: https://accounts.google.com/... (leaves your domain)
4. User authorizes
5. Google redirects: https://your-app/api/oauth/google/callback?code=...&state=...
6. Your callback redirects: https://your-app/campaign/create?platform=google&code=...&state=...
7. User should be: authenticated ✓, with code ✓
```

### Why Code Might Disappear:

**Possibility 1: URL Encoding Issue**
- The code contains special characters
- Not properly encoded during redirect
- Gets truncated or corrupted

**Possibility 2: Redirect Chain Issue**
- Multiple redirects in sequence
- Parameters get lost between redirects
- Browser or server drops parameters

**Possibility 3: Browser Security**
- Browser blocks parameters for security
- URL too long (unlikely, but possible)

### Why User Gets Logged Out:

**Possibility 1: Cookie Domain Mismatch**
- Cookies set for different domain
- Ngrok URL changed
- Cookies not sent with redirect

**Possibility 2: SameSite Cookie Policy**
- Cookies have `SameSite=Strict`
- Not sent during cross-site redirect
- OAuth redirect from Google counts as cross-site

**Possibility 3: Session Timeout**
- OAuth flow takes too long
- Session expires during authorization
- User logged out when returning

## What I've Added for Debugging

### Enhanced Logging in Callback Route:

```typescript
console.log("[Google OAuth Callback] ========================================");
console.log("[Google OAuth Callback] Incoming request URL:", request.url);
console.log("[Google OAuth Callback] Received parameters:", {
  code: code ? `present (length: ${code.length}, start: ${code.substring(0, 20)}...)` : "missing",
  state: state ? `present (length: ${state.length})` : "missing",
  ...
});
console.log("[Google OAuth Callback] Request headers:", {
  cookie: request.headers.get("cookie") ? "present" : "missing",
  referer: request.headers.get("referer"),
});
```

This will show you:
- If code is reaching the callback
- The length of the code
- If cookies are present in the request
- Where the request came from

### What to Check:

1. **Server Terminal** - Look for the logs above
2. **Browser Network Tab** - Watch the redirect chain
3. **Browser Console** - Check for frontend logs
4. **Browser Cookies** - Check if auth cookies are present

## Immediate Actions

### Action 1: Check Server Logs

After OAuth redirect, your terminal should show:

```
[Google OAuth Callback] ========================================
[Google OAuth Callback] Incoming request URL: https://7e08ab553447.ngrok-free.app/api/oauth/google/callback?code=4/0AY0e-g7...&state=eyJ...
[Google OAuth Callback] Received parameters: {
  code: 'present (length: 156, start: 4/0AY0e-g7...)',
  state: 'present (length: 128)',
  error: null,
  errorDescription: null,
  allParams: { code: '...', state: '...', scope: '...', ... }
}
[Google OAuth Callback] Request headers: {
  cookie: 'present',
  referer: 'https://accounts.google.com/...'
}
[Google OAuth Callback] Success - preparing redirect
[Google OAuth Callback] Redirect URL: /campaign/create?platform=google&code=...&state=...
[Google OAuth Callback] Full redirect URL: https://7e08ab553447.ngrok-free.app/campaign/create?...
[Google OAuth Callback] Code length: 156
[Google OAuth Callback] State length: 128
[Google OAuth Callback] ========================================
```

**Key Questions:**
- Is `code` present? → If NO, Google isn't sending it (Google Cloud Console issue)
- Is `code` length reasonable (100-200 chars)? → If NO, it's corrupted
- Is `cookie` present? → If NO, auth cookies aren't being sent
- Does redirect URL look correct? → If NO, URL construction issue

### Action 2: Check Browser Network Tab

1. Open DevTools (F12) → Network tab
2. Click "Connect Google Ads"
3. Watch for these requests:

**Request 1: Initial redirect to Google**
```
URL: https://accounts.google.com/o/oauth2/v2/auth?...
Status: 302 (redirect)
```

**Request 2: Google callback**
```
URL: https://your-app/api/oauth/google/callback?code=...&state=...
Status: 307 (redirect)
Headers → Location: /campaign/create?platform=google&code=...&state=...
```

**Request 3: Final page**
```
URL: https://your-app/campaign/create?platform=google&code=...&state=...
Status: 200
```

**Check:**
- Are all three requests present?
- Does Request 2 have `code` in URL?
- Does Request 3 have `code` in URL?
- Are cookies sent with each request?

### Action 3: Check Browser Console

After OAuth redirect, you should see:

```
[CampaignCreation] URL params detected: {
  platform: 'google',
  hasCode: true,  // ← Should be true!
  error: undefined
}
[CampaignCreation] OAuth callback detected, switching to import tab
[CampaignImport] URL params: {
  hasCode: true,  // ← Should be true!
  hasState: true,
  platform: 'google',
  allParams: [['platform', 'google'], ['code', '...'], ['state', '...']]
}
```

**If `hasCode: false`:**
- Code was lost during redirect
- Check server logs to see if it reached the callback
- Check network tab to see where it was lost

### Action 4: Check Authentication

**Before OAuth:**
```javascript
// In browser console
document.cookie // Should show auth cookies
```

**After OAuth redirect:**
```javascript
// In browser console
document.cookie // Should still show auth cookies
```

**If cookies are missing after redirect:**
- Cookie domain issue
- SameSite policy issue
- Session expired

## Potential Fixes

### Fix 1: Update Cookie Configuration

If cookies are being blocked, update `src/middleware.ts`:

```typescript
export default convexAuthNextjsMiddleware(
  async (request, { convexAuth }) => {
    // ... existing code
  },
  {
    cookieConfig: { 
      maxAge: 60 * 60 * 24 * 30,
      sameSite: 'lax', // Allow cookies during OAuth redirects
      secure: true, // Required for SameSite=None
    },
  }
);
```

### Fix 2: Preserve Code in Session

If URL parameters are being lost, use sessionStorage:

**In callback route:**
```typescript
// Instead of redirecting with code in URL
// Return HTML that stores code and redirects
return new Response(`
  <html>
    <script>
      sessionStorage.setItem('oauth_code', '${code}');
      sessionStorage.setItem('oauth_state', '${state}');
      window.location.href = '/campaign/create?platform=google&oauth=callback';
    </script>
  </html>
`, {
  headers: { 'Content-Type': 'text/html' }
});
```

**In frontend:**
```typescript
const code = searchParams.get('code') || sessionStorage.getItem('oauth_code');
const state = searchParams.get('state') || sessionStorage.getItem('oauth_state');
```

### Fix 3: Use POST Instead of GET

If URL length is an issue, use POST:

**In callback route:**
```typescript
// Return HTML form that POSTs to frontend
return new Response(`
  <html>
    <body>
      <form id="oauth-form" method="POST" action="/api/oauth/process">
        <input type="hidden" name="code" value="${code}" />
        <input type="hidden" name="state" value="${state}" />
        <input type="hidden" name="platform" value="google" />
      </form>
      <script>document.getElementById('oauth-form').submit();</script>
    </body>
  </html>
`, {
  headers: { 'Content-Type': 'text/html' }
});
```

## What to Share

To help debug further, please share:

1. **Complete server terminal output** from the OAuth flow
2. **Browser Network tab screenshot** showing all three requests
3. **Browser console logs** showing the URL params
4. **Cookie information** from DevTools → Application → Cookies
5. **Answer these questions:**
   - Does code appear in server logs?
   - Does code appear in Network tab Request 2?
   - Does code appear in Network tab Request 3?
   - Are cookies present before OAuth?
   - Are cookies present after OAuth?

This will help identify exactly where the code is being lost and why the user is being logged out.
