"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDebounce } from "./use-debounce";

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<string | void>; // Return draft ID or void
  delay?: number;
  enabled?: boolean;
  onError?: (error: string) => void;
  onSuccess?: (draftId?: string) => void;
}

export interface AutoSaveStatus {
  status: 'idle' | 'saving' | 'saved' | 'error';
  isSaving: boolean;
  lastSaved: Date | null;
  error: string | null;
  saveCount: number;
  draftId?: string;
}

interface UseAutoSaveReturn extends AutoSaveStatus {
  save: () => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

export function useAutoSave<T>({
  data,
  onSave,
  delay = 30000, // 30 seconds default
  enabled = true,
  onError,
  onSuccess,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveCount, setSaveCount] = useState(0);
  const [draftId, setDraftId] = useState<string | undefined>();

  const debouncedData = useDebounce(data, delay);
  const lastSavedDataRef = useRef<T | null>(null);
  const lastSavedDataStringRef = useRef<string>('');
  const isInitialMount = useRef(true);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const lastSaveAttemptRef = useRef<number>(0);
  const maxRetries = 3;
  const minSaveInterval = 5000; // Minimum 5 seconds between save attempts

  // Helper function to create stable data representation
  const getDataString = useCallback((data: T): string => {
    try {
      // Handle special cases for stable serialization
      const normalizeData = (obj: any): any => {
        if (obj instanceof Date) {
          return obj.getTime();
        }
        if (Array.isArray(obj)) {
          return obj.map(normalizeData);
        }
        if (obj && typeof obj === 'object') {
          const normalized: any = {};
          Object.keys(obj).sort().forEach(key => {
            normalized[key] = normalizeData(obj[key]);
          });
          return normalized;
        }
        return obj;
      };

      return JSON.stringify(normalizeData(data));
    } catch (error) {
      console.warn('Error serializing data for comparison:', error);
      return String(data);
    }
  }, []);

  const save = useCallback(async (isRetry = false) => {
    if (!enabled || status === 'saving') return;

    // Rate limiting: prevent saves too close together
    const now = Date.now();
    if (!isRetry && now - lastSaveAttemptRef.current < minSaveInterval) {
      console.log('Auto-save rate limited, skipping save attempt');
      return;
    }

    // Check if data has actually changed
    const currentDataString = getDataString(data);
    if (currentDataString === lastSavedDataStringRef.current) {
      console.log('No data changes detected, skipping save');
      return;
    }

    lastSaveAttemptRef.current = now;

    try {
      setStatus('saving');
      setError(null);
      
      const result = await onSave(data);
      
      const saveTime = new Date();
      setLastSaved(saveTime);
      setStatus('saved');
      setSaveCount(prev => prev + 1);
      lastSavedDataRef.current = data;
      lastSavedDataStringRef.current = currentDataString;
      retryCountRef.current = 0;

      // Handle draft ID if returned
      if (typeof result === 'string') {
        setDraftId(result);
      }

      onSuccess?.(typeof result === 'string' ? result : draftId);

      // Auto-clear saved status after 3 seconds
      setTimeout(() => {
        setStatus(prev => prev === 'saved' ? 'idle' : prev);
      }, 3000);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Auto-save failed";
      setError(errorMessage);
      setStatus('error');
      
      console.error("Auto-save error:", err);
      onError?.(errorMessage);

      // Implement retry logic with exponential backoff for real errors (not validation errors)
      if (!isRetry && retryCountRef.current < maxRetries && 
          !errorMessage.includes("No meaningful data") &&
          !errorMessage.includes("No changes detected") &&
          !errorMessage.includes("rate limited")) {
        retryCountRef.current++;
        const retryDelay = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000); // Max 10 seconds
        
        retryTimeoutRef.current = setTimeout(() => {
          console.log(`Retrying auto-save (attempt ${retryCountRef.current}/${maxRetries})`);
          save(true);
        }, retryDelay);
      }
    }
  }, [data, onSave, enabled, status, onError, onSuccess, draftId, getDataString]);

  // Manual save function (no retry logic)
  const manualSave = useCallback(async () => {
    // Clear any pending retries
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    await save(false);
  }, [save]);

  // Auto-save when debounced data changes
  useEffect(() => {
    // Skip auto-save on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      lastSavedDataStringRef.current = getDataString(debouncedData);
      return;
    }

    // Skip if data is empty/null/undefined
    if (
      !debouncedData ||
      (typeof debouncedData === "object" && 
       debouncedData !== null &&
       Object.keys(debouncedData).length === 0)
    ) {
      return;
    }

    // The save function now handles data change detection internally
    save(false);
  }, [debouncedData, save, getDataString]);

  // Cleanup retry timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setStatus(prev => prev === 'error' ? 'idle' : prev);
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setLastSaved(null);
    setError(null);
    setSaveCount(0);
    setDraftId(undefined);
    lastSavedDataRef.current = null;
    lastSavedDataStringRef.current = '';
    retryCountRef.current = 0;
    lastSaveAttemptRef.current = 0;
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  return {
    status,
    isSaving: status === 'saving',
    lastSaved,
    error,
    saveCount,
    draftId,
    save: manualSave,
    clearError,
    reset,
  };
}
