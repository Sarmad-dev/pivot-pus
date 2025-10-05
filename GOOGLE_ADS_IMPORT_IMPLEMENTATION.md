# Google Ads Campaign Import Implementation

## Overview

This document describes the implementation of Google Ads campaign import functionality for PivotPulse, completing task 14 from the campaign-creation spec.

## Implementation Summary

### 1. Google Ads API Client Extension (`src/lib/api/google/client.ts`)

Extended the existing `GoogleAdsClient` class with the following methods:

- `getCampaignBudget()` - Fetches detailed budget information for a campaign
- `getCampaignForImport()` - Retrieves comprehensive campaign data including budget, targeting, and metrics
- `getCampaignsForImport()` - Batch fetches multiple campaigns with all import-ready data

Added new interfaces:
- `GoogleAdsBudget` - Budget details structure
- `GoogleCampaignImportData` - Complete campaign import data structure

### 2. Google Ads Data Transformer (`src/lib/api/google/transformer.ts`)

Created a comprehensive transformer module that:

- **Maps Google Ads data to PivotPulse format:**
  - Channel types (Search, Display, Video, Shopping) → PivotPulse categories
  - Campaign targeting → Audience demographics
  - Campaign metrics → KPI targets
  - Budget (micros format) → Standard currency amounts

- **Key transformation functions:**
  - `transformGoogleCampaign()` - Main transformation function
  - `transformGoogleCampaigns()` - Batch transformation
  - `validateCampaignData()` - Data validation with errors and warnings
  - `mapChannelTypeToCategory()` - Channel type mapping
  - `transformTargeting()` - Targeting criteria transformation
  - `generateKPIs()` - Automatic KPI generation based on campaign type

- **Validation features:**
  - Required field validation
  - Budget consistency checks
  - Date range validation
  - Warning system for missing optional data

### 3. Google Import Hook (`src/hooks/use-google-import.ts`)

Created a React hook that manages the entire import workflow:

**State management:**
- Multi-step wizard flow (connect → select-customer → select-campaigns → preview → importing → complete/error)
- Customer account selection
- Campaign selection with validation
- Transformed campaign preview
- Error handling and recovery

**Key functions:**
- `loadCustomers()` - Loads Google Ads customer accounts
- `selectCustomer()` - Selects account and loads campaigns
- `toggleCampaignSelection()` - Manages campaign selection
- `previewCampaigns()` - Shows preview before import
- `importSelectedCampaigns()` - Executes the import
- `reset()` / `goBack()` - Navigation controls

### 4. Google Campaign Import Component (`src/components/campaigns/google-campaign-import.tsx`)

Created a comprehensive UI component with:

**Multi-step wizard interface:**
1. **Connection step** - OAuth connection to Google Ads
2. **Customer selection** - Choose Google Ads account
3. **Campaign selection** - Select campaigns with validation indicators
4. **Preview** - Review all campaign details before import
5. **Importing** - Loading state during import
6. **Complete/Error** - Success or error handling with recovery options

**Features:**
- Real-time validation feedback
- Error and warning displays
- Campaign metadata preview (budget, dates, channels, KPIs)
- Batch import support
- Partial success handling (some campaigns succeed, others fail)

### 5. Integration Updates

**Updated `src/components/campaigns/import/index.tsx`:**
- Added Google Ads as an available import platform
- Integrated GoogleCampaignImport component
- Updated platform selection UI

**Updated `src/lib/api/index.ts`:**
- Exported Google transformer functions
- Exported new Google types

## Architecture

```
User Interface (google-campaign-import.tsx)
    ↓
React Hook (use-google-import.ts)
    ↓
API Client (google/client.ts) ←→ Google Ads API
    ↓
Transformer (google/transformer.ts)
    ↓
Convex Mutation (importCampaignFromPlatform)
    ↓
Database (campaigns table)
```

## Data Flow

1. **Authentication:** User connects via OAuth (handled by usePlatformConnection)
2. **Customer Selection:** Fetch and display Google Ads customer accounts
3. **Campaign Retrieval:** Load campaigns with budget, targeting, and metrics
4. **Transformation:** Convert Google Ads format to PivotPulse structure
5. **Validation:** Check data integrity and completeness
6. **Preview:** Display transformed data for user review
7. **Import:** Save validated campaigns to Convex database

## Error Handling

### API Errors
- Authentication failures → Redirect to connection step
- Rate limiting → Retry with exponential backoff (handled by BaseAPIClient)
- Network errors → User-friendly error messages with retry option

### Data Validation Errors
- Missing required fields → Campaign marked as invalid, cannot import
- Budget inconsistencies → Error message displayed
- Invalid date ranges → Error message displayed

### Partial Import Failures
- Some campaigns succeed, others fail → Show both success count and error details
- User can view successfully imported campaigns or retry failed ones

## Testing Recommendations

### Unit Tests
1. **Transformer tests:**
   - Test channel type mapping
   - Test targeting transformation
   - Test KPI generation
   - Test validation logic
   - Test edge cases (missing data, invalid formats)

2. **Hook tests:**
   - Test state transitions
   - Test error handling
   - Test campaign selection logic

### Integration Tests
1. **API integration:**
   - Mock Google Ads API responses
   - Test data fetching
   - Test error scenarios

2. **End-to-end:**
   - Complete import workflow
   - OAuth flow
   - Database persistence

### Manual Testing Checklist
- [ ] Connect to Google Ads account
- [ ] Load customer accounts
- [ ] Select customer and load campaigns
- [ ] Select multiple campaigns
- [ ] Preview campaign data
- [ ] Import campaigns successfully
- [ ] Handle API errors gracefully
- [ ] Handle validation errors
- [ ] Test partial import failures
- [ ] Test navigation (back buttons)
- [ ] Test cancel functionality

## Environment Variables Required

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_ADS_DEVELOPER_TOKEN=your_developer_token
```

## API Permissions Required

The Google OAuth scope must include:
- `https://www.googleapis.com/auth/adwords` - Access to Google Ads API

## Known Limitations

1. **Budget Data:** Some campaigns may not have budget data available if using shared budgets
2. **Targeting Data:** Complex targeting criteria may not map perfectly to PivotPulse audience format
3. **Metrics:** Historical metrics are only available for campaigns with past performance
4. **Rate Limits:** Google Ads API has rate limits that may affect bulk imports

## Future Enhancements

1. **Sync functionality:** Keep imported campaigns in sync with Google Ads
2. **Advanced targeting:** Better mapping of complex targeting criteria
3. **Performance data:** Import historical performance metrics
4. **Bulk operations:** Optimize for importing large numbers of campaigns
5. **Campaign updates:** Support updating existing imported campaigns

## Requirements Coverage

This implementation satisfies all requirements from task 14:

✅ **Create Google Ads API integration with authentication and campaign retrieval**
- Extended GoogleAdsClient with import-specific methods
- Integrated with existing OAuth authentication system

✅ **Build Google Ads campaign selection and preview interface**
- Multi-step wizard with customer and campaign selection
- Comprehensive preview showing all campaign details

✅ **Implement data transformation and mapping from Google Ads format**
- Complete transformer module with intelligent mapping
- Automatic KPI generation based on campaign type
- Audience targeting transformation

✅ **Add comprehensive error handling for API failures and data inconsistencies**
- API error handling with retry logic
- Data validation with errors and warnings
- Partial import failure handling
- User-friendly error messages

## Related Files

- `src/lib/api/google/client.ts` - API client
- `src/lib/api/google/transformer.ts` - Data transformer
- `src/hooks/use-google-import.ts` - React hook
- `src/components/campaigns/google-campaign-import.tsx` - UI component
- `src/components/campaigns/import/index.tsx` - Platform selector
- `src/lib/api/index.ts` - API exports
- `convex/platformConnections.ts` - OAuth token management
- `convex/campaigns/mutations.ts` - Import mutation
