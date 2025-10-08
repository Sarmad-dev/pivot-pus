/**
 * Enhanced Import Progress Component with cancellation support and detailed feedback
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Pause,
  Play,
  X,
  RefreshCw,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { ImportProgress, ImportError, ImportWarning } from '@/lib/import/import-manager';

interface ImportProgressProps {
  progress: ImportProgress;
  onCancel?: () => void;
  onRetry?: (errorIds: string[]) => void;
  onPause?: () => void;
  onResume?: () => void;
  showDetails?: boolean;
  className?: string;
}

export function ImportProgressComponent({
  progress,
  onCancel,
  onRetry,
  onPause,
  onResume,
  showDetails = true,
  className,
}: ImportProgressProps) {
  const [showErrors, setShowErrors] = useState(false);
  const [showWarnings, setShowWarnings] = useState(false);
  const [selectedErrors, setSelectedErrors] = useState<Set<string>>(new Set());

  const progressPercentage = progress.total > 0 
    ? Math.round(((progress.completed + progress.failed) / progress.total) * 100)
    : 0;

  const successRate = progress.total > 0
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  const canRetry = progress.errors.some(error => error.retryable);
  const retryableErrors = progress.errors.filter(error => error.retryable);

  // Auto-expand errors if there are any
  useEffect(() => {
    if (progress.errors.length > 0 && !showErrors) {
      setShowErrors(true);
    }
  }, [progress.errors.length]);

  const handleSelectError = (errorId: string) => {
    const newSelected = new Set(selectedErrors);
    if (newSelected.has(errorId)) {
      newSelected.delete(errorId);
    } else {
      newSelected.add(errorId);
    }
    setSelectedErrors(newSelected);
  };

  const handleSelectAllRetryable = () => {
    const retryableIds = retryableErrors.map(error => error.id);
    setSelectedErrors(new Set(retryableIds));
  };

  const handleRetrySelected = () => {
    if (onRetry && selectedErrors.size > 0) {
      onRetry(Array.from(selectedErrors));
      setSelectedErrors(new Set());
    }
  };

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'running':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'cancelled':
        return <X className="h-5 w-5 text-gray-500" />;
      case 'paused':
        return <Pause className="h-5 w-5 text-yellow-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (progress.status) {
      case 'running':
        return progress.currentItem ? `Importing: ${progress.currentItem}` : 'Importing campaigns...';
      case 'completed':
        return 'Import completed successfully';
      case 'failed':
        return 'Import failed';
      case 'cancelled':
        return 'Import cancelled';
      case 'paused':
        return 'Import paused';
      default:
        return 'Ready to import';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Import Progress
        </CardTitle>
        <CardDescription>{getStatusText()}</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{progressPercentage}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{progress.completed + progress.failed} of {progress.total}</span>
            <span>Success rate: {successRate}%</span>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{progress.completed}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{progress.failed}</div>
            <div className="text-xs text-muted-foreground">Failed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{progress.warnings.length}</div>
            <div className="text-xs text-muted-foreground">Warnings</div>
          </div>
        </div>

        {/* Control Buttons */}
        {progress.status === 'running' && (
          <div className="flex gap-2">
            {onPause && (
              <Button variant="outline" size="sm" onClick={onPause}>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
            )}
            {onCancel && (
              <Button variant="destructive" size="sm" onClick={onCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}
          </div>
        )}

        {progress.status === 'paused' && onResume && (
          <Button variant="outline" size="sm" onClick={onResume}>
            <Play className="h-4 w-4 mr-2" />
            Resume
          </Button>
        )}

        {/* Errors Section */}
        {progress.errors.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowErrors(!showErrors)}
                className="p-0 h-auto font-medium text-red-600"
              >
                <XCircle className="h-4 w-4 mr-2" />
                {progress.errors.length} Error{progress.errors.length !== 1 ? 's' : ''}
              </Button>
              {canRetry && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllRetryable}
                    disabled={!onRetry}
                  >
                    Select All Retryable
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetrySelected}
                    disabled={!onRetry || selectedErrors.size === 0}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry Selected ({selectedErrors.size})
                  </Button>
                </div>
              )}
            </div>

            {showErrors && (
              <ScrollArea className="h-48 border rounded-md p-3">
                <div className="space-y-2">
                  {progress.errors.map((error, index) => (
                    <div key={`${error.id}-${index}`} className="space-y-1">
                      <div className="flex items-start gap-2">
                        {error.retryable && onRetry && (
                          <input
                            type="checkbox"
                            checked={selectedErrors.has(error.id)}
                            onChange={() => handleSelectError(error.id)}
                            className="mt-1"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{error.name}</span>
                            {error.retryable && (
                              <Badge variant="outline" className="text-xs">
                                Retryable
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-red-600 mt-1">{error.error}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(error.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      {index < progress.errors.length - 1 && <Separator />}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}

        {/* Warnings Section */}
        {progress.warnings.length > 0 && (
          <div className="space-y-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowWarnings(!showWarnings)}
              className="p-0 h-auto font-medium text-yellow-600"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              {progress.warnings.length} Warning{progress.warnings.length !== 1 ? 's' : ''}
            </Button>

            {showWarnings && (
              <ScrollArea className="h-32 border rounded-md p-3">
                <div className="space-y-2">
                  {progress.warnings.map((warning, index) => (
                    <div key={`${warning.id}-${index}`} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{warning.name}</span>
                      </div>
                      <p className="text-xs text-yellow-600">{warning.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(warning.timestamp).toLocaleTimeString()}
                      </p>
                      {index < progress.warnings.length - 1 && <Separator />}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}

        {/* Success Message */}
        {progress.status === 'completed' && progress.failed === 0 && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Successfully imported {progress.completed} campaign{progress.completed !== 1 ? 's' : ''}.
            </AlertDescription>
          </Alert>
        )}

        {/* Partial Success Message */}
        {progress.status === 'completed' && progress.failed > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Import completed with {progress.failed} failure{progress.failed !== 1 ? 's' : ''}. 
              {progress.completed > 0 && ` ${progress.completed} campaign${progress.completed !== 1 ? 's' : ''} imported successfully.`}
            </AlertDescription>
          </Alert>
        )}

        {/* Cancelled Message */}
        {progress.status === 'cancelled' && (
          <Alert>
            <X className="h-4 w-4" />
            <AlertDescription>
              Import was cancelled. {progress.completed > 0 && `${progress.completed} campaign${progress.completed !== 1 ? 's' : ''} were imported before cancellation.`}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}