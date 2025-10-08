/**
 * Enhanced OAuth Error Display Component with recovery suggestions
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Shield,
  Wifi,
  Clock,
  HelpCircle,
} from 'lucide-react';
import { OAuthError } from '@/lib/import/oauth-error-handler';

interface OAuthErrorDisplayProps {
  error: OAuthError;
  onRetry?: () => void;
  onReconnect?: () => void;
  onCancel?: () => void;
  showDetails?: boolean;
  className?: string;
}

export function OAuthErrorDisplay({
  error,
  onRetry,
  onReconnect,
  onCancel,
  showDetails = true,
  className,
}: OAuthErrorDisplayProps) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [showRecoverySteps, setShowRecoverySteps] = useState(false);

  const getErrorIcon = () => {
    switch (error.type) {
      case 'auth_error':
        return <Shield className="h-5 w-5 text-red-500" />;
      case 'token_expired':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'permission_denied':
        return <Shield className="h-5 w-5 text-orange-500" />;
      case 'rate_limit':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'network_error':
        return <Wifi className="h-5 w-5 text-purple-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getErrorTypeLabel = () => {
    switch (error.type) {
      case 'auth_error':
        return 'Authentication Error';
      case 'token_expired':
        return 'Session Expired';
      case 'permission_denied':
        return 'Permission Denied';
      case 'rate_limit':
        return 'Rate Limited';
      case 'network_error':
        return 'Network Error';
      default:
        return 'Connection Error';
    }
  };

  const getErrorTypeColor = () => {
    switch (error.type) {
      case 'auth_error':
        return 'destructive';
      case 'token_expired':
        return 'default';
      case 'permission_denied':
        return 'secondary';
      case 'rate_limit':
        return 'outline';
      case 'network_error':
        return 'outline';
      default:
        return 'destructive';
    }
  };

  const getRecoveryInstructions = (): string[] => {
    const instructions: Record<OAuthError['type'], string[]> = {
      auth_error: [
        'Verify your account credentials are correct',
        'Check that your account is active and in good standing',
        'Ensure you have the necessary permissions',
        'Try clearing your browser cache and cookies',
        'Disable browser extensions that might interfere',
      ],
      token_expired: [
        'Click "Reconnect Account" to refresh your session',
        'You may need to re-authorize the application',
        'Ensure your account is still active',
      ],
      permission_denied: [
        'Grant all requested permissions during authorization',
        'Check your account settings for any restrictions',
        'If using a business account, contact your administrator',
        'Ensure the app has the necessary permissions in your account settings',
      ],
      rate_limit: [
        'Wait a few minutes before trying again',
        'Reduce the number of simultaneous operations',
        'Try importing fewer campaigns at once',
        'Check if there are other applications using your account',
      ],
      network_error: [
        'Check your internet connection',
        'Try refreshing the page',
        'Disable VPN or proxy if active',
        'Check if your firewall is blocking the connection',
        'Try using a different network or device',
      ],
      unknown: [
        'Try refreshing the page and attempting again',
        'Clear your browser cache and cookies',
        'Try using a different browser',
        'Check the platform status page for known issues',
        'Contact support if the problem persists',
      ],
    };

    return instructions[error.type] || instructions.unknown;
  };

  const getPlatformStatusUrl = () => {
    switch (error.platform) {
      case 'facebook':
        return 'https://developers.facebook.com/status/';
      case 'google':
        return 'https://status.cloud.google.com/';
      default:
        return null;
    }
  };

  const getPlatformSupportUrl = () => {
    switch (error.platform) {
      case 'facebook':
        return 'https://developers.facebook.com/support/';
      case 'google':
        return 'https://support.google.com/googleapi/';
      default:
        return null;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getErrorIcon()}
          Connection Failed
        </CardTitle>
        <CardDescription>
          Unable to connect to {error.platform === 'facebook' ? 'Facebook Ads' : 'Google Ads'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Error Type Badge */}
        <div className="flex items-center gap-2">
          <Badge variant={getErrorTypeColor() as any}>
            {getErrorTypeLabel()}
          </Badge>
          {error.retryable && (
            <Badge variant="outline" className="text-green-600">
              Retryable
            </Badge>
          )}
          {error.recoverable && (
            <Badge variant="outline" className="text-blue-600">
              Recoverable
            </Badge>
          )}
        </div>

        {/* Main Error Message */}
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="font-medium">
            {error.userMessage}
          </AlertDescription>
        </Alert>

        {/* Suggested Action */}
        {error.suggestedAction && (
          <Alert>
            <HelpCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Suggested action:</strong> {error.suggestedAction}
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {error.retryable && onRetry && (
            <Button onClick={onRetry} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          )}
          
          {(error.type === 'token_expired' || error.type === 'auth_error') && onReconnect && (
            <Button onClick={onReconnect} variant="outline" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Reconnect Account
            </Button>
          )}

          {onCancel && (
            <Button onClick={onCancel} variant="ghost">
              Cancel
            </Button>
          )}
        </div>

        {showDetails && (
          <>
            {/* Recovery Steps */}
            <Collapsible open={showRecoverySteps} onOpenChange={setShowRecoverySteps}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                  <span className="font-medium">Recovery Steps</span>
                  {showRecoverySteps ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                <div className="bg-muted p-3 rounded-md">
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    {getRecoveryInstructions().map((instruction, index) => (
                      <li key={index} className="text-muted-foreground">
                        {instruction}
                      </li>
                    ))}
                  </ol>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* External Links */}
            <div className="flex flex-wrap gap-2">
              {getPlatformStatusUrl() && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="flex items-center gap-2"
                >
                  <a
                    href={getPlatformStatusUrl()!}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Platform Status
                  </a>
                </Button>
              )}
              
              {getPlatformSupportUrl() && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="flex items-center gap-2"
                >
                  <a
                    href={getPlatformSupportUrl()!}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Get Support
                  </a>
                </Button>
              )}
            </div>

            {/* Technical Details */}
            <Collapsible open={showTechnicalDetails} onOpenChange={setShowTechnicalDetails}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                  <span className="font-medium text-sm">Technical Details</span>
                  {showTechnicalDetails ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                <div className="bg-muted p-3 rounded-md">
                  <div className="space-y-2 text-xs font-mono">
                    <div>
                      <span className="text-muted-foreground">Platform:</span>{' '}
                      <span>{error.platform}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Error Type:</span>{' '}
                      <span>{error.type}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Message:</span>{' '}
                      <span className="break-all">{error.message}</span>
                    </div>
                    {error.details && (
                      <div>
                        <span className="text-muted-foreground">Details:</span>{' '}
                        <pre className="mt-1 text-xs bg-background p-2 rounded border overflow-auto">
                          {JSON.stringify(error.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </CardContent>
    </Card>
  );
}