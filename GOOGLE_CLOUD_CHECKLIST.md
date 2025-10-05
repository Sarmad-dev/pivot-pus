# Google Cloud Console Configuration Checklist

## Your Configuration Details

**OAuth 2.0 Client ID:**
```
982754879145-02vl6fflvkogp1mehol8v77etuj054e8.apps.googleusercontent.com
```

**Required Redirect URI (EXACT MATCH):**
```
https://7e08ab553447.ngrok-free.app/api/oauth/google/callback
```

## Step-by-Step Checklist

### ☐ Step 1: Go to Google Cloud Console
Visit: https://console.cloud.google.com/apis/credentials

### ☐ Step 2: Find Your OAuth 2.0 Client
Look for: `982754879145-02vl6fflvkogp1mehol8v77etuj054e8.apps.googleusercontent.com`

### ☐ Step 3: Verify Application Type
- Click on the OAuth 2.0 Client ID
- Check "Application type"
- **Must be:** `Web application`
- **NOT:** Desktop app, iOS app, Android app, etc.

If it's wrong, you need to create a new OAuth 2.0 Client ID with the correct type.

### ☐ Step 4: Check Authorized Redirect URIs
In the OAuth client settings, find "Authorized redirect URIs"

**Must include EXACTLY:**
```
https://7e08ab553447.ngrok-free.app/api/oauth/google/callback
```

**Common mistakes to avoid:**
- ❌ `https://7e08ab553447.ngrok-free.app/api/oauth/google/callback/` (trailing slash)
- ❌ `http://7e08ab553447.ngrok-free.app/api/oauth/google/callback` (http instead of https)
- ❌ Extra spaces before or after
- ❌ Different ngrok URL

### ☐ Step 5: Configure OAuth Consent Screen
Go to: "OAuth consent screen" in the left menu

**Publishing status:**
- If "Testing": Continue to next step
- If "In production": Make sure it's verified

**User type:**
- Internal (if using Google Workspace)
- External (for general use)

### ☐ Step 6: Add Test Users (if in Testing mode)
If your OAuth consent screen is in "Testing" mode:
1. Scroll down to "Test users"
2. Click "Add Users"
3. Add the Google account email you'll use to test
4. Save

### ☐ Step 7: Configure Scopes
In OAuth consent screen, go to "Scopes" section

**Must include these scopes:**
- `https://www.googleapis.com/auth/adwords`
- `https://www.googleapis.com/auth/userinfo.email`
- `https://www.googleapis.com/auth/userinfo.profile`

If not present:
1. Click "Add or Remove Scopes"
2. Search for and add each scope
3. Save

### ☐ Step 8: Enable Required APIs
Go to: "APIs & Services" → "Library"

**Enable these APIs:**
1. Search "Google Ads API" → Click → Enable
2. Search "Google OAuth2 API" → Click → Enable

### ☐ Step 9: Wait for Propagation
After making changes in Google Cloud Console:
- Wait 1-2 minutes for changes to propagate
- Google's systems need time to update

### ☐ Step 10: Restart Your Development Server
After making changes:
1. Stop your Next.js dev server (Ctrl+C)
2. Restart it: `npm run dev` or `yarn dev`
3. This ensures environment variables are reloaded

## Verification

### Test the Configuration:
1. Run the test script:
   ```bash
   node test-oauth-config.js
   ```

2. This will show you:
   - Your current configuration
   - The exact redirect URI to add
   - Common mistakes to avoid

### Test the OAuth Flow:
1. Open browser console (F12)
2. Navigate to `/campaign/create`
3. Click "Import Campaign" → "Google Ads" → "Connect Google Ads"
4. Check console logs for:
   ```
   [generateAuthUrl] Redirect URI in URL: https://7e08ab553447.ngrok-free.app/api/oauth/google/callback
   ```
5. Complete Google authorization
6. Check server terminal for:
   ```
   [Google OAuth Callback] Received parameters: { code: 'present', ... }
   ```

## If Still Not Working

### Double-Check Everything:
- [ ] Application type is "Web application"
- [ ] Redirect URI matches EXACTLY (no trailing slash, https not http)
- [ ] Your Google account is in test users list
- [ ] Google Ads API is enabled
- [ ] OAuth consent screen is configured
- [ ] Waited 1-2 minutes after making changes
- [ ] Restarted Next.js dev server

### Try Creating a New OAuth Client:
Sometimes the existing OAuth client gets corrupted:
1. In Google Cloud Console, create a NEW OAuth 2.0 Client ID
2. Choose "Web application"
3. Add the redirect URI
4. Copy the new Client ID and Secret
5. Update `.env.local`:
   ```
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=<new-client-id>
   GOOGLE_CLIENT_SECRET=<new-client-secret>
   ```
6. Restart Next.js dev server

### Check Ngrok:
- [ ] Ngrok is running
- [ ] Visit `https://7e08ab553447.ngrok-free.app` in browser - should show your app
- [ ] If ngrok URL changed, update everywhere:
  - `.env.local` → `NEXT_PUBLIC_APP_URL`
  - Google Cloud Console → Redirect URI
  - Restart Next.js dev server

## Success Indicators

When everything is configured correctly, you'll see:

**Browser Console:**
```
[usePlatformConnection] Redirecting to OAuth URL: https://accounts.google.com/...
[CampaignImport] URL params: { hasCode: true, hasState: true, platform: 'google' }
[CampaignImport] Processing OAuth callback
[CampaignImport] OAuth callback successful
```

**Server Terminal:**
```
[Google OAuth Callback] Received parameters: {
  code: 'present',
  state: 'present',
  error: null
}
[Google OAuth Callback] Success - redirecting to frontend
```

**Result:**
- Platform connection saved to database
- Google Ads import UI appears
- No errors

## Need Help?

If you've completed this entire checklist and it still doesn't work:
1. Share screenshots of:
   - Google Cloud Console OAuth client settings
   - Google Cloud Console OAuth consent screen
   - Browser console logs
   - Server terminal logs
2. Share the exact error message (if any)
3. Confirm you've waited 2+ minutes after making changes
