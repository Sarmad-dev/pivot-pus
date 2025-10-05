# Tab Mounting Issue Fix

## The Problem You Discovered! 🎯

Great catch! The OAuth callback wasn't working because of a **React component mounting issue**.

### What Was Happening:

1. User clicks "Connect Google Ads" from the **Import tab**
2. User authorizes on Google
3. Google redirects back to: `/campaign/create?platform=google&code=...&state=...`
4. Page loads with **default tab = "wizard"**
5. `CampaignImport` component is in the **"import" tab**
6. Since the import tab is not active, `CampaignImport` **never mounts**
7. The `useEffect` in `CampaignImport` **never runs**
8. OAuth callback parameters are **never processed**
9. Platform connection is **never saved**

### The Root Cause:

```typescript
// In campaign/create/page.tsx
const [activeTab, setActiveTab] = useState("wizard"); // ← Always starts on wizard tab

// In CampaignImport component
useEffect(() => {
  // This code never runs if the component isn't mounted!
  const code = searchParams.get("code");
  // ...
}, [searchParams]);
```

React's `TabsContent` only renders the active tab's content. If the tab isn't active, the component inside doesn't mount, and its `useEffect` hooks don't run.

## The Solution

Detect OAuth callback parameters at the **PAGE level** (which always mounts) and automatically switch to the import tab:

### What I Changed:

**File:** `src/app/(main)/campaign/create/page.tsx`

```typescript
// Check for URL params (draftId or OAuth callback)
useEffect(() => {
  const draftId = searchParams.get("draftId");
  const platform = searchParams.get("platform");
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  // If OAuth callback parameters are present, switch to import tab
  if (platform && (code || error)) {
    console.log("[CampaignCreation] OAuth callback detected, switching to import tab");
    setActiveTab("import"); // ← This makes CampaignImport mount!
  } else if (draftId) {
    setSelectedDraftId(draftId);
    setActiveTab("wizard");
  }
}, [searchParams]);
```

### How It Works Now:

1. User clicks "Connect Google Ads" from Import tab
2. User authorizes on Google
3. Google redirects to: `/campaign/create?platform=google&code=...&state=...`
4. Page loads, `useEffect` in page component runs
5. Detects `platform` and `code` parameters
6. **Automatically switches to "import" tab** ✅
7. `CampaignImport` component mounts ✅
8. `useEffect` in `CampaignImport` runs ✅
9. OAuth callback is processed ✅
10. Tokens are exchanged and saved ✅
11. Import UI appears ✅

## Why This Was Hard to Spot

This is a classic React gotcha:
- Components in inactive tabs don't mount
- Their hooks don't run
- URL parameters are present but never processed
- No error messages (because the code never runs!)

The clue was that you were getting redirected back with the correct URL parameters, but nothing was happening.

## Testing the Fix

### Before the fix:
1. Click "Import Campaign" tab
2. Click "Connect Google Ads"
3. Authorize on Google
4. Redirected back to `/campaign/create?platform=google&code=...`
5. **Wizard tab is active** ❌
6. Nothing happens ❌

### After the fix:
1. Click "Import Campaign" tab
2. Click "Connect Google Ads"
3. Authorize on Google
4. Redirected back to `/campaign/create?platform=google&code=...`
5. **Import tab automatically becomes active** ✅
6. OAuth callback is processed ✅
7. Platform connection is saved ✅
8. Import UI appears ✅

## Console Logs to Verify

After the fix, you should see:

**Browser Console:**
```
[CampaignCreation] URL params detected: { platform: 'google', hasCode: true, ... }
[CampaignCreation] OAuth callback detected, switching to import tab
[CampaignImport] URL params: { hasCode: true, hasState: true, platform: 'google' }
[CampaignImport] Processing OAuth callback
[CampaignImport] OAuth callback successful
```

**Server Terminal:**
```
[Google OAuth Callback] Received parameters: { code: 'present', state: 'present' }
[Google OAuth Callback] Success - redirecting to frontend
```

## Similar Issues to Watch For

This same pattern can cause issues with:
- Deep linking to specific tabs
- Processing URL parameters in nested components
- Handling redirects to tabbed interfaces
- Any component that needs to run on mount but is in an inactive tab

**General Rule:** If you need to process URL parameters, do it at the highest level component that's always mounted, not in a component that might be hidden in a tab.

## Files Modified

- ✅ `src/app/(main)/campaign/create/page.tsx` - Added OAuth callback detection and auto-tab switching

## Combined with Previous Fixes

This fix works together with the previous fixes:
1. ✅ OAuth callback route passes code to frontend
2. ✅ Encryption module works in Convex runtime
3. ✅ Frontend has OAuth callback processing logic
4. ✅ **Page automatically switches to import tab** ← NEW!
5. ✅ CampaignImport component mounts and processes callback

Now the complete OAuth flow should work end-to-end! 🎉
