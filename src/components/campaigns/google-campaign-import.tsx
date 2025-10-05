/**
 * Google Ads Campaign Import Component
 */

'use client';

import { useGoogleImport } from '@/hooks/use-google-import';
import { usePlatformConnection } from '@/hooks/usePlatformConnection';
import { Id } from '../../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';

interface GoogleCampaignImportProps {
  organizationId: Id<'organizations'>;
  onComplete?: (campaignIds: Id<'campaigns'>[]) => void;
  onCancel?: () => void;
}

export function GoogleCampaignImport({
  organizationId,
  onComplete,
  onCancel,
}: GoogleCampaignImportProps) {
  const { isConnected, connect } = usePlatformConnection('google', organizationId);
  const {
    state,
    isLoading,
    loadCustomers,
    selectCustomer,
    toggleCampaignSelection,
    previewCampaigns,
    importSelectedCampaigns,
    reset,
    goBack,
  } = useGoogleImport(organizationId);

  // Connection step
  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Connect to Google Ads
          </CardTitle>
          <CardDescription>
            Connect your Google Ads account to import campaigns
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You'll be redirected to Google to authorize access to your Google Ads accounts and campaigns.
          </p>
          <div className="flex gap-2">
            <Button onClick={connect} className="flex items-center gap-2">
              Connect Google Ads
            </Button>
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Select customer step
  if (state.step === 'connect' || state.step === 'select-customer') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Select Google Ads Account</CardTitle>
          <CardDescription>
            Choose the Google Ads customer account to import campaigns from
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {state.step === 'connect' && (
            <Button onClick={loadCustomers} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Load Customer Accounts
            </Button>
          )}

          {state.step === 'select-customer' && (
            <div className="space-y-2">
              {state.customers.map((customer) => (
                <Card
                  key={customer.id}
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => selectCustomer(customer.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{customer.descriptiveName}</h4>
                        <p className="text-sm text-muted-foreground">ID: {customer.id}</p>
                      </div>
                      <Badge variant="outline">
                        {customer.currencyCode} • {customer.timeZone}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Select campaigns step
  if (state.step === 'select-campaigns') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Select Campaigns to Import</CardTitle>
          <CardDescription>
            Choose which campaigns you want to import into PivotPulse
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {state.campaigns.length === 0 ? (
            <Alert>
              <AlertDescription>No campaigns found in this customer account.</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {state.campaigns.map((campaignData) => {
                const campaign = campaignData.campaign;
                const transformed = state.transformedCampaigns.get(campaign.id);
                const isSelected = state.selectedCampaigns.has(campaign.id);
                const hasErrors = transformed && !transformed.validation.isValid;

                return (
                  <Card
                    key={campaign.id}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'border-primary' : ''
                    } ${hasErrors ? 'border-destructive' : ''}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleCampaignSelection(campaign.id)}
                          disabled={hasErrors}
                        />
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{campaign.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {campaign.advertisingChannelType}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Badge
                                variant={campaign.status === 'ENABLED' ? 'default' : 'secondary'}
                              >
                                {campaign.status}
                              </Badge>
                              {transformed && transformed.data.budget > 0 && (
                                <Badge variant="outline">
                                  {transformed.data.currency}{' '}
                                  {transformed.data.budget.toLocaleString()}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {hasErrors && (
                            <Alert variant="destructive" className="mt-2">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription className="text-xs">
                                {transformed.validation.errors.join(', ')}
                              </AlertDescription>
                            </Alert>
                          )}

                          {transformed && transformed.validation.warnings.length > 0 && (
                            <Alert className="mt-2">
                              <AlertDescription className="text-xs">
                                {transformed.validation.warnings.join(', ')}
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {state.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button onClick={goBack} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={previewCampaigns}
              disabled={state.selectedCampaigns.size === 0 || isLoading}
            >
              Preview Selected ({state.selectedCampaigns.size})
            </Button>
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Preview step
  if (state.step === 'preview') {
    const selectedTransformed = Array.from(state.selectedCampaigns)
      .map((id) => state.transformedCampaigns.get(id))
      .filter(Boolean);

    return (
      <Card>
        <CardHeader>
          <CardTitle>Preview Import</CardTitle>
          <CardDescription>Review the campaigns before importing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {selectedTransformed.map((transformed) => {
              if (!transformed) return null;
              const { data } = transformed;

              return (
                <Card key={data.importSource.externalId}>
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <h4 className="font-medium">{data.name}</h4>
                      <p className="text-sm text-muted-foreground">{data.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Budget:</span>{' '}
                        <span className="font-medium">
                          {data.currency} {data.budget.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Category:</span>{' '}
                        <Badge variant="outline">{data.category}</Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Priority:</span>{' '}
                        <Badge variant="outline">{data.priority}</Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Duration:</span>{' '}
                        <span className="font-medium">
                          {new Date(data.startDate).toLocaleDateString()} -{' '}
                          {new Date(data.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-medium">Channels:</p>
                      <div className="flex gap-2">
                        {data.channels.map((channel, idx) => (
                          <Badge key={idx} variant="secondary">
                            {channel.type}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-medium">KPIs:</p>
                      <div className="flex gap-2 flex-wrap">
                        {data.kpis.map((kpi, idx) => (
                          <Badge key={idx} variant="outline">
                            {kpi.type}: {kpi.target}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex gap-2">
            <Button onClick={goBack} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={importSelectedCampaigns} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import {selectedTransformed.length} Campaign
              {selectedTransformed.length !== 1 ? 's' : ''}
            </Button>
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Importing step
  if (state.step === 'importing') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Importing Campaigns</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Importing your campaigns, please wait...</p>
        </CardContent>
      </Card>
    );
  }

  // Complete step
  if (state.step === 'complete') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Import Complete
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Successfully imported {state.importedCampaignIds.length} campaign
              {state.importedCampaignIds.length !== 1 ? 's' : ''}.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button onClick={() => onComplete?.(state.importedCampaignIds)}>
              View Campaigns
            </Button>
            <Button variant="outline" onClick={reset}>
              Import More
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error step
  if (state.step === 'error') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Import Error
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="whitespace-pre-wrap">{state.error}</AlertDescription>
          </Alert>

          {state.importedCampaignIds.length > 0 && (
            <Alert>
              <AlertDescription>
                {state.importedCampaignIds.length} campaign
                {state.importedCampaignIds.length !== 1 ? 's' : ''} were successfully imported
                before the error occurred.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button onClick={reset} variant="outline">
              Try Again
            </Button>
            {state.importedCampaignIds.length > 0 && onComplete && (
              <Button onClick={() => onComplete(state.importedCampaignIds)}>
                View Imported Campaigns
              </Button>
            )}
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
