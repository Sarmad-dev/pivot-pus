# Auto-Save Infinite Loop Fix

## Problem Description

The CampaignWizard component was experiencing an infinite loop issue with its auto-save functionality. The problem manifested as:

1. **Continuous Save Attempts**: Auto-save was triggering repeatedly even when no meaningful data changes occurred
2. **Performance Issues**: Excessive API calls and state updates causing UI lag
3. **User Experience Problems**: Constant "saving" indicators and potential data corruption

## Root Causes Identified

### 1. Data Change Detection Issues
- **Problem**: Using `JSON.stringify()` on React Hook Form's `watch()` output, which returns new object references on every render
- **Impact**: Every form re-render was detected as a data change, triggering auto-save

### 2. Missing Memoization
- **Problem**: Auto-save data object was recreated on every render without proper memoization
- **Impact**: `useAutoSave` hook received new data references constantly, causing infinite loops

### 3. Inadequate Rate Limiting
- **Problem**: No minimum interval between save attempts
- **Impact**: Multiple saves could be triggered in rapid succession

### 4. Poor Initial State Handling
- **Problem**: Auto-save was enabled immediately on component mount
- **Impact**: Initial form setup and draft loading triggered unnecessary saves

## Solution Implementation

### 1. Enhanced Data Change Detection

```typescript
// Before: Simple JSON.stringify comparison
const hasChanged = JSON.stringify(newData) !== JSON.stringify(lastData);

// After: Normalized data comparison with stable serialization
const normalizeData = (obj: any): any => {
  if (obj instanceof Date) return obj.getTime();
  if (Array.isArray(obj)) return obj.map(normalizeData);
  if (obj && typeof obj === 'object') {
    const normalized: any = {};
    Object.keys(obj).sort().forEach(key => {
      normalized[key] = normalizeData(obj[key]);
    });
    return normalized;
  }
  return obj;
};
```

### 2. Proper Memoization

```typescript
// Memoized auto-save data with dependency tracking
const autoSaveData = useMemo(() => {
  if (!hasUserInteracted || !autoSaveEnabled) {
    return { data: {}, step: currentStep };
  }
  
  const currentData = getValues();
  if (!hasMeaningfulData(currentData)) {
    return { data: {}, step: currentStep };
  }
  
  return { data: currentData, step: currentStep };
}, [currentStep, hasUserInteracted, autoSaveEnabled, formState.isDirty, getValues, hasMeaningfulData]);
```

### 3. Rate Limiting Implementation

```typescript
// Minimum interval between save attempts
const minSaveInterval = 5000; // 5 seconds

// Rate limiting check in save function
const now = Date.now();
if (!isRetry && now - lastSaveAttemptRef.current < minSaveInterval) {
  console.log('Auto-save rate limited, skipping save attempt');
  return;
}
```

### 4. User Interaction Tracking

```typescript
// Enable auto-save only after user interaction
const handleUserInteraction = useCallback(() => {
  if (!hasUserInteracted) {
    setHasUserInteracted(true);
    setAutoSaveEnabled(true);
  }
}, [hasUserInteracted]);

// Wrap form content with interaction handlers
<div onClick={handleUserInteraction} onKeyDown={handleUserInteraction}>
  {/* Form content */}
</div>
```

### 5. Meaningful Data Validation

```typescript
const hasMeaningfulData = useCallback((data: any) => {
  return (
    (data.basics?.name && data.basics.name.trim().length > 0) ||
    (Array.isArray(data.audienceChannels?.audiences) && data.audienceChannels.audiences.length > 0) ||
    (Array.isArray(data.kpisMetrics?.primaryKPIs) && data.kpisMetrics.primaryKPIs.length > 0) ||
    (Array.isArray(data.teamAccess?.teamMembers) && data.teamAccess.teamMembers.length > 0)
  );
}, []);
```

## Configuration Changes

### Auto-Save Timing
```typescript
const AUTO_SAVE_CONFIG = {
  INITIAL_DELAY: 30000,      // 30 seconds for first save
  SUBSEQUENT_DELAY: 180000,  // 3 minutes between subsequent saves
  NOTIFICATION_DURATION: 2000, // 2 seconds for notifications
} as const;
```

### Error Handling Improvements
- **Validation Errors**: No retry attempts for validation errors (e.g., "No meaningful data")
- **Rate Limiting Errors**: Silent handling to prevent spam
- **Network Errors**: Exponential backoff retry with maximum attempts

## Testing Strategy

### Manual Testing
1. **Empty Data Test**: Verify no saves occur with empty forms
2. **Data Change Test**: Confirm saves trigger only on meaningful changes
3. **Rate Limiting Test**: Verify multiple rapid save attempts are limited
4. **Draft Loading Test**: Ensure loading drafts doesn't trigger immediate saves

### Automated Testing
- Unit tests for data change detection logic
- Integration tests for auto-save hook behavior
- Mock testing for rate limiting and error handling

## Performance Improvements

### Before Fix
- ❌ Continuous save attempts (every few seconds)
- ❌ Excessive API calls
- ❌ UI lag from constant state updates
- ❌ Poor user experience with constant "saving" indicators

### After Fix
- ✅ Saves only on meaningful data changes
- ✅ Proper rate limiting (minimum 5 seconds between attempts)
- ✅ Efficient data change detection
- ✅ Clean user experience with appropriate feedback

## Monitoring and Debugging

### Console Logging
- Data change detection results
- Rate limiting decisions
- Save attempt tracking
- Error categorization

### User Feedback
- Clear distinction between validation errors and system errors
- Appropriate toast notifications for different scenarios
- Save status indicators with accurate states

## Future Considerations

1. **Offline Support**: Consider implementing offline draft storage
2. **Conflict Resolution**: Handle concurrent editing scenarios
3. **Performance Monitoring**: Add metrics for save success rates and timing
4. **User Preferences**: Allow users to configure auto-save intervals

## Migration Notes

This fix is backward compatible and doesn't require any database schema changes. Existing drafts will continue to work normally, and the improved auto-save behavior will apply immediately to new wizard sessions.