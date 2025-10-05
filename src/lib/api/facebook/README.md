# Facebook Ads Campaign Import

This module provides functionality to import campaigns from Facebook Ads into PivotPulse.

## Features

- **OAuth Authentication**: Secure connection to Facebook Ads API
- **Ad Account Selection**: Choose which Facebook Ad Account to import from
- **Campaign Selection**: Preview and select specific campaigns to import
- **Data Transformation**: Automatically maps Facebook campaign data to PivotPulse structure
- **Validation**: Validates imported data before creating campaigns
- **Error Handling**: Comprehensive error handling with user-friendly messages

## Architecture

### Components

1. **FacebookAdsClient** (`client.ts`)
   - Handles API communication with Facebook Ads
   - Manages authentication and token refresh
   - Provides methods to fetch campaigns, ad accounts, and insights

2. **Data Transformer** (`transformer.ts`)
   - Transforms Facebook campaign data to PivotPulse format
   - Maps objectives to campaign categories
   - Extracts targeting information into audience segments
   - Generates KPIs based on campaign objectives
   - Validates transformed data

3. **React Hook** (`use-facebook-import.ts`)
   - Manages the import workflow state
   - Handles API calls and data transformation
   - Provides methods for each step of the import process

4. **UI Component** (`facebook-campaign-import.tsx`)
   - Multi-step wizard interface
   - Connection status display
   - Campaign selection with preview
   - Import progress and completion feedback

## Usage

### Basic Import Flow

```tsx
import { CampaignImport } from '@/components/campaigns/import';

function MyComponent() {
  return (
    <CampaignImport
      organizationId={organizationId}
      onComplete={(campaignIds) => {
        console.log('Imported campaigns:', campaignIds);
      }}
      onCancel={() => {
        console.log('Import cancelled');
      }}
    />
  );
}
```

### Direct Facebook Import

```tsx
import { FacebookCampaignImport } from '@/components/campaigns/import';

function MyComponent() {
  return (
    <FacebookCampaignImport
      organizationId={organizationId}
      onComplete={(campaignIds) => {
        // Handle completion
      }}
    />
  );
}
```

## Data Mapping

### Campaign Objectives to Categories

| Facebook Objective | PivotPulse Category |
|-------------------|---------------------|
| BRAND_AWARENESS, REACH | pr |
| ENGAGEMENT, VIDEO_VIEWS | social |
| CONVERSIONS, SALES | paid |
| Others | mixed |

### Targeting to Audiences

Facebook targeting data is transformed into PivotPulse audience segments:

- **Age Range**: Extracted from `age_min` and `age_max`
- **Gender**: Mapped from Facebook gender codes (1=male, 2=female)
- **Location**: Combines countries, cities, and regions
- **Interests**: Extracted from interests and flexible_spec

### KPI Generation

KPIs are automatically generated based on campaign objectives:

- **Awareness campaigns**: Reach and Brand Awareness KPIs
- **Engagement campaigns**: Engagement KPIs
- **Conversion campaigns**: Conversions and ROI KPIs

## Validation

The transformer validates:

- Campaign name is not empty
- Budget is greater than 0
- End date is after start date
- Budget allocation matches total budget

Warnings are issued for:

- Missing audience targeting data
- No KPIs defined

## Error Handling

The system handles various error scenarios:

- **Authentication errors**: Token expired, invalid credentials
- **API errors**: Rate limiting, network issues
- **Validation errors**: Incomplete or invalid data
- **Import errors**: Duplicate campaigns, database errors

## Environment Variables

Required environment variables:

```env
NEXT_PUBLIC_FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret
```

## API Endpoints Used

- `/me` - Get user information
- `/me/adaccounts` - List ad accounts
- `/{ad_account_id}/campaigns` - List campaigns
- `/{campaign_id}` - Get campaign details
- `/{campaign_id}/adsets` - Get targeting information
- `/{campaign_id}/insights` - Get performance metrics

## Limitations

- Only imports campaign-level data (not ad sets or ads)
- Historical performance data is used for KPI suggestions only
- Some Facebook-specific settings may not have direct equivalents
- Budget is estimated for campaigns with daily budgets (30-day projection)

## Future Enhancements

- [ ] Import ad sets and ads
- [ ] Sync ongoing campaigns with Facebook
- [ ] Import historical performance data
- [ ] Support for more campaign objectives
- [ ] Bulk import optimization
- [ ] Import scheduling and automation
