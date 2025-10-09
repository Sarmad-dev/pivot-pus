# AI Simulation UI Components

This directory contains the React components for the AI Trajectory Simulation Engine UI, implementing task 9 from the AI trajectory simulation specification.

## Components

### SimulationRequestForm
A comprehensive form component for initiating AI simulations.

**Features:**
- Campaign selection with status and category badges
- Timeframe configuration with date pickers and granularity selection
- Metrics selection with weight configuration
- Scenario selection (optimistic, realistic, pessimistic)
- External data source integration
- Form validation using Zod and react-hook-form
- Real-time weight normalization

**Props:**
- `campaigns`: Array of available campaigns
- `externalDataSources`: Array of configured external data sources
- `onSubmit`: Callback function for form submission
- `isSubmitting`: Boolean to show loading state

### SimulationResults
A comprehensive results display component with Chart.js integration.

**Features:**
- Interactive trajectory visualization with confidence intervals
- Scenario comparison charts
- Risk alerts with severity indicators
- Pivot recommendations with impact estimates
- Tabbed interface for organized content
- Model metadata display
- Action buttons for recommendations

**Props:**
- `simulation`: Simulation result data
- `onRecommendationAction`: Callback for recommendation actions
- `onRetrySimulation`: Callback for retry functionality

### SimulationStatus
A real-time status tracking component with Convex subscriptions.

**Features:**
- Real-time status updates
- Progress indicators with time estimates
- Queue metadata display
- Error handling and retry mechanisms
- Compact and detailed view modes
- Automatic progress calculation

**Props:**
- `simulationId`: ID of the simulation to track
- `onRetry`: Callback for retry action
- `onCancel`: Callback for cancel action
- `showDetails`: Boolean to show detailed information
- `compact`: Boolean for compact display mode

### SimulationDemo
A demonstration component showing all simulation components in action.

**Features:**
- Interactive tabs for different component views
- Mock data for testing and demonstration
- Example integration patterns
- Action handlers for testing

## Usage

```tsx
import { 
  SimulationRequestForm, 
  SimulationResults, 
  SimulationStatus 
} from "@/components/simulations";

// Request Form
<SimulationRequestForm
  campaigns={campaigns}
  externalDataSources={dataSources}
  onSubmit={handleSubmit}
  isSubmitting={loading}
/>

// Status Tracking
<SimulationStatus
  simulationId={simulationId}
  onRetry={handleRetry}
  onCancel={handleCancel}
  showDetails={true}
/>

// Results Display
<SimulationResults
  simulation={simulationData}
  onRecommendationAction={handleRecommendationAction}
  onRetrySimulation={handleRetry}
/>
```

## Dependencies

- React Hook Form for form management
- Zod for validation
- Chart.js and react-chartjs-2 for data visualization
- Radix UI components via shadcn/ui
- Convex for real-time data subscriptions
- date-fns for date formatting
- Lucide React for icons

## Requirements Fulfilled

This implementation fulfills the following requirements from the specification:

- **Requirement 1.1**: Campaign selection and simulation initiation
- **Requirement 1.3**: Trajectory visualization with confidence intervals
- **Requirement 2.4**: Scenario comparison views
- **Requirement 3.3**: Risk alert displays
- **Requirement 5.1**: Form for selecting campaigns and timeframes
- **Requirement 5.2**: Scenario configuration interface
- **Requirement 8.3**: Real-time status updates
- **Requirement 8.4**: Progress indicators and completion tracking

## Integration Notes

- Components use the existing Convex schema and API functions
- Follows the established UI patterns from shadcn/ui
- Integrates with the existing campaign management system
- Supports real-time updates through Convex subscriptions
- Handles error states and loading states appropriately