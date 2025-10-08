"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";

/**
 * Hook for memoizing expensive calculations with dependency tracking
 */
export function useExpensiveMemo<T>(
  factory: () => T,
  deps: React.DependencyList,
  options: {
    timeout?: number;
    onCalculate?: (duration: number) => void;
  } = {}
): T {
  const { timeout = 5000, onCalculate } = options;
  const [value, setValue] = useState<T>(() => factory());
  const timeoutRef = useRef<NodeJS.Timeout>(null);
  const depsRef = useRef(deps);

  // Check if dependencies have changed
  const depsChanged = useMemo(() => {
    if (depsRef.current.length !== deps.length) return true;
    return depsRef.current.some((dep, index) => dep !== deps[index]);
  }, [deps]);

  useEffect(() => {
    if (depsChanged) {
      depsRef.current = deps;

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Debounce expensive calculations
      timeoutRef.current = setTimeout(() => {
        const startTime = performance.now();
        const newValue = factory();
        const duration = performance.now() - startTime;

        setValue(newValue);
        onCalculate?.(duration);
      }, 100);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [depsChanged, factory, onCalculate, deps]);

  return value;
}

/**
 * Hook for tracking component render performance
 */
export function useRenderPerformance(
  componentName: string,
  enabled: boolean = process.env.NODE_ENV === "development"
) {
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(0);
  const mountTimeRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    if (mountTimeRef.current === 0) {
      mountTimeRef.current = performance.now();
    }

    renderCountRef.current++;
    const currentTime = performance.now();
    const timeSinceLastRender = currentTime - lastRenderTimeRef.current;
    lastRenderTimeRef.current = currentTime;

    if (renderCountRef.current > 1) {
      console.log(
        `[Performance] ${componentName} render #${renderCountRef.current}, time since last: ${timeSinceLastRender.toFixed(2)}ms`
      );
    }

    // Warn about excessive re-renders
    if (renderCountRef.current > 10 && timeSinceLastRender < 100) {
      console.warn(
        `[Performance] ${componentName} is re-rendering frequently (${renderCountRef.current} times)`
      );
    }
  });

  return {
    renderCount: renderCountRef.current,
    timeSinceMount: performance.now() - mountTimeRef.current,
  };
}

/**
 * Hook for optimizing form field updates
 */
export function useOptimizedFormField<T>(
  value: T,
  onChange: (value: T) => void,
  options: {
    debounceMs?: number;
    validateOnChange?: boolean;
    validator?: (value: T) => boolean;
  } = {}
) {
  const { debounceMs = 300, validateOnChange = false, validator } = options;
  const [localValue, setLocalValue] = useState(value);
  const [isValid, setIsValid] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout>(null);
  const lastCommittedValueRef = useRef(value);

  // Update local value when external value changes
  useEffect(() => {
    if (value !== lastCommittedValueRef.current) {
      setLocalValue(value);
      lastCommittedValueRef.current = value;
    }
  }, [value]);

  const handleChange = useCallback(
    (newValue: T) => {
      setLocalValue(newValue);

      // Validate immediately if enabled
      if (validateOnChange && validator) {
        setIsValid(validator(newValue));
      }

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Debounce the onChange call
      timeoutRef.current = setTimeout(() => {
        lastCommittedValueRef.current = newValue;
        onChange(newValue);
      }, debounceMs);
    },
    [onChange, debounceMs, validateOnChange, validator]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    value: localValue,
    onChange: handleChange,
    isValid,
    isDirty: localValue !== lastCommittedValueRef.current,
  };
}

/**
 * Hook for virtual scrolling large lists
 */
export function useVirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5,
}: {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(
      0,
      Math.floor(scrollTop / itemHeight) - overscan
    );
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const visibleItems = useMemo(() => {
    return items
      .slice(visibleRange.startIndex, visibleRange.endIndex + 1)
      .map((item, index) => ({
        item,
        index: visibleRange.startIndex + index,
      }));
  }, [items, visibleRange]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.startIndex * itemHeight;

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
  };
}

/**
 * Hook for intersection observer (lazy loading, infinite scroll)
 */
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
      setEntry(entry);
    }, options);

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [options]);

  return {
    elementRef,
    isIntersecting,
    entry,
  };
}

/**
 * Hook for measuring component performance metrics
 */
export function usePerformanceMetrics(name: string) {
  const metricsRef = useRef({
    renderCount: 0,
    totalRenderTime: 0,
    averageRenderTime: 0,
    maxRenderTime: 0,
    minRenderTime: Infinity,
  });

  const startTime = useRef(0);

  // Mark render start
  useEffect(() => {
    startTime.current = performance.now();
  });

  // Mark render end
  useEffect(() => {
    const endTime = performance.now();
    const renderTime = endTime - startTime.current;

    const metrics = metricsRef.current;
    metrics.renderCount++;
    metrics.totalRenderTime += renderTime;
    metrics.averageRenderTime = metrics.totalRenderTime / metrics.renderCount;
    metrics.maxRenderTime = Math.max(metrics.maxRenderTime, renderTime);
    metrics.minRenderTime = Math.min(metrics.minRenderTime, renderTime);

    // Log performance warnings
    if (renderTime > 16) {
      // 60fps threshold
      console.warn(
        `[Performance] ${name} render took ${renderTime.toFixed(2)}ms (>16ms)`
      );
    }
  });

  const getMetrics = useCallback(() => ({ ...metricsRef.current }), []);

  const resetMetrics = useCallback(() => {
    metricsRef.current = {
      renderCount: 0,
      totalRenderTime: 0,
      averageRenderTime: 0,
      maxRenderTime: 0,
      minRenderTime: Infinity,
    };
  }, []);

  return { getMetrics, resetMetrics };
}
