# Implementation Plan

- [x] 1. Set up Convex schema and data models
  - Extend the existing Convex schema with campaigns, campaignDrafts, and organizations tables
  - Create proper indexes for efficient querying by organization, user, and status
  - Add validation functions for campaign data integrity
  - _Requirements: 1.3, 2.2, 3.2, 5.2, 6.1_

- [x] 2. Create core campaign validation schemas
  - Implement Zod schemas for all campaign data structures (basics, audience, channels, KPIs)
  - Create cross-field validation rules for budget allocation and date ranges
  - Add custom validation functions for business logic (e.g., budget totals, KPI targets)
  - _Requirements: 1.5, 2.5, 3.4_

- [x] 3. Implement Convex functions for campaign operations
  - Create mutation functions for campaign creation, updates, and deletion
  - Implement query functions for fetching campaigns by organization and user permissions
  - Add draft management functions (create, update, delete, list drafts)
  - Create team assignment and permission management functions
  - _Requirements: 1.3, 5.4, 6.2, 6.3_

- [x] 4. Build campaign wizard foundation components
  - Create the main CampaignWizard component with step navigation logic
  - Implement wizard progress indicator and step validation
  - Build reusable form components using React Hook Form and Shadcn/ui
  - Add wizard state management with proper form persistence
  - _Requirements: 1.1, 1.4, 7.3_

- [x] 5. Implement Step 1: Campaign Basics form
  - Create CampaignBasicsStep component with name, description, dates, budget fields
  - Add campaign category and priority selection with proper UI components
  - Implement real-time validation with error display
  - Add currency selection with proper formatting
  - _Requirements: 1.2, 1.3, 1.5_

- [x] 6. Implement Step 2: Audience & Channels configuration
  - Create AudienceChannelsStep component with audience segment builder
  - Build channel selection interface with budget allocation controls
  - Implement dynamic audience targeting fields (demographics, interests, location)
  - Add budget allocation validation to ensure totals match campaign budget
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 7. Implement Step 3: KPIs & Metrics setup
  - Create KPIsStep component with predefined KPI selection
  - Build custom metrics creation interface with validation
  - Implement KPI target setting with realistic validation based on budget/audience
  - Add metric weighting and timeframe selection controls
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 8. Implement Step 4: Team & Access management

  - Create TeamAccessStep component with team member selection
  - Build role assignment interface (owner, editor, viewer)
  - Implement client assignment with automatic view-only permissions
  - Add notification preferences for team members
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 9. Build auto-save functionality
  - Create useAutoSave hook with debounced saving logic
  - Implement draft creation and update functions in Convex
  - Add save status indicators and error handling for failed saves
  - Create draft restoration logic when returning to wizard
  - _Requirements: 6.1, 6.4_

- [x] 10. Implement draft management system
  - Create DraftManager component to list and manage saved drafts
  - Build draft selection interface with metadata display (creation date, completion status)
  - Implement draft deletion with confirmation dialogs
  - Add draft expiration and cleanup functionality
  - _Requirements: 6.2, 6.3, 6.4_

- [x] 11. Create campaign preview and finalization
  - Build CampaignPreview component displaying all configured settings
  - Implement organized preview layout matching wizard step structure
  - Add edit navigation from preview back to specific wizard steps
  - Create final campaign creation with validation and error handling
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 12. Set up external API integration foundation
  - Create API client utilities for Facebook Ads and Google Ads
  - Implement OAuth authentication flows for external platforms
  - Build secure token storage and refresh mechanisms
  - Add API error handling and retry logic with proper user feedback
  - _Requirements: 4.1, 4.5_

- [x] 13. Implement Facebook Ads campaign import
  - Create Facebook Ads API integration with campaign fetching
  - Build campaign selection interface with preview of external campaign data
  - Implement data transformation from Facebook format to PivotPulse structure
  - Add mapping validation and error handling for incomplete data
  - _Requirements: 4.2, 4.4_

- [x] 14. Implement Google Ads campaign import
  - Create Google Ads API integration with authentication and campaign retrieval
  - Build Google Ads campaign selection and preview interface
  - Implement data transformation and mapping from Google Ads format
  - Add comprehensive error handling for API failures and data inconsistencies
  - _Requirements: 4.3, 4.4, 4.5_

- [x] 15. Build platform selector and import workflow

  - Create PlatformSelector component showing available import options
  - Implement import workflow orchestration with progress tracking
  - Add platform connection status indicators and re-authentication flows
  - Build import completion handling with success/error feedback
  - _Requirements: 4.1, 4.4_

- [x] 16. Create campaign creation page and routing


  - Build main campaign creation page with wizard integration
  - Implement proper routing for create/edit/import modes
  - Add navigation guards for unsaved changes
  - Create breadcrumb navigation and page title management
  - _Requirements: 1.1, 6.2_

- [ ] 17. Fix auto-save infinite loop issue
  - Debug and resolve the auto-save infinite loop in CampaignWizard
  - Implement proper data change detection to prevent unnecessary saves
  - Add rate limiting and debouncing to auto-save functionality
  - Test auto-save with different wizard steps and data changes
  - _Requirements: 6.1, 6.4_

- [ ] 18. Complete Step 2 and Step 3 wizard components
  - Finish implementing AudienceChannelsStep component with full functionality
  - Complete KPIsStep component with all KPI selection and validation features
  - Add proper form validation and error handling for both steps
  - Integrate with the wizard navigation and validation system
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 19. Enhance team member and client management
  - Improve user search functionality in TeamAccessStep
  - Add proper user profile display with avatars and role indicators
  - Implement team member invitation system with email notifications
  - Add bulk team member operations (add multiple, remove multiple)
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 20. Add comprehensive form validation and error handling
  - Implement cross-step validation to ensure data consistency
  - Add real-time validation feedback with clear error messages
  - Create validation summary in preview step showing all issues
  - Add form submission error handling with retry mechanisms
  - _Requirements: 1.5, 2.5, 3.4, 3.5, 7.5_

- [ ] 21. Implement team notifications and permissions integration
  - Create notification system for team member assignments
  - Add email notifications for campaign creation and team assignments
  - Implement permission checks throughout the campaign creation workflow
  - Build role-based access control for campaign editing and viewing
  - _Requirements: 5.4, 5.5_

- [ ] 22. Add campaign list and management pages
  - Create campaign list page showing all campaigns for an organization
  - Implement campaign filtering, sorting, and search functionality
  - Add campaign status management (draft, active, paused, completed)
  - Create campaign detail view with edit capabilities
  - _Requirements: 1.1, 5.1, 6.2_

- [ ] 23. Enhance import workflow with better error handling
  - Improve OAuth error handling and user feedback
  - Add retry mechanisms for failed API calls during import
  - Implement partial import support for when some campaigns fail
  - Add import progress tracking and cancellation support
  - _Requirements: 4.1, 4.4, 4.5_

- [ ] 24. Create comprehensive test suite
  - Write unit tests for all Zod validation schemas and form logic
  - Create integration tests for Convex functions and API operations
  - Build end-to-end tests for complete wizard workflows
  - Add tests for import functionality with mocked API responses
  - _Requirements: All requirements - testing coverage_

- [ ] 25. Performance optimization and polish
  - Optimize component re-renders and form performance
  - Add loading states and skeleton screens for better UX
  - Implement proper error boundaries for graceful error handling
  - Add accessibility improvements and keyboard navigation
  - _Requirements: 1.4, 7.3_
