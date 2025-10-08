"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface KeyboardNavigationOptions {
  onEnter?: () => void;
  onEscape?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onTab?: (shiftKey: boolean) => void;
  onSpace?: () => void;
  enabled?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

/**
 * Hook for handling keyboard navigation and accessibility
 */
export function useKeyboardNavigation(options: KeyboardNavigationOptions = {}) {
  const {
    onEnter,
    onEscape,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onTab,
    onSpace,
    enabled = true,
    preventDefault = true,
    stopPropagation = false,
  } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const { key, shiftKey } = event;

      let handled = false;

      switch (key) {
        case "Enter":
          if (onEnter) {
            onEnter();
            handled = true;
          }
          break;
        case "Escape":
          if (onEscape) {
            onEscape();
            handled = true;
          }
          break;
        case "ArrowUp":
          if (onArrowUp) {
            onArrowUp();
            handled = true;
          }
          break;
        case "ArrowDown":
          if (onArrowDown) {
            onArrowDown();
            handled = true;
          }
          break;
        case "ArrowLeft":
          if (onArrowLeft) {
            onArrowLeft();
            handled = true;
          }
          break;
        case "ArrowRight":
          if (onArrowRight) {
            onArrowRight();
            handled = true;
          }
          break;
        case "Tab":
          if (onTab) {
            onTab(shiftKey);
            handled = true;
          }
          break;
        case " ":
        case "Space":
          if (onSpace) {
            onSpace();
            handled = true;
          }
          break;
      }

      if (handled) {
        if (preventDefault) {
          event.preventDefault();
        }
        if (stopPropagation) {
          event.stopPropagation();
        }
      }
    },
    [
      enabled,
      onEnter,
      onEscape,
      onArrowUp,
      onArrowDown,
      onArrowLeft,
      onArrowRight,
      onTab,
      onSpace,
      preventDefault,
      stopPropagation,
    ]
  );

  return { handleKeyDown };
}

/**
 * Hook for managing focus within a container (focus trap)
 */
export function useFocusTrap(isActive: boolean = true) {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // Focus the first element when trap becomes active
    firstElement?.focus();

    container.addEventListener("keydown", handleTabKey);

    return () => {
      container.removeEventListener("keydown", handleTabKey);
    };
  }, [isActive]);

  return containerRef;
}

/**
 * Hook for managing roving tabindex (for lists, grids, etc.)
 */
export function useRovingTabIndex<T extends HTMLElement>(
  items: T[],
  orientation: "horizontal" | "vertical" | "both" = "vertical"
) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const { key } = event;
      let newIndex = currentIndex;

      switch (key) {
        case "ArrowUp":
          if (orientation === "vertical" || orientation === "both") {
            newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
            event.preventDefault();
          }
          break;
        case "ArrowDown":
          if (orientation === "vertical" || orientation === "both") {
            newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
            event.preventDefault();
          }
          break;
        case "ArrowLeft":
          if (orientation === "horizontal" || orientation === "both") {
            newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
            event.preventDefault();
          }
          break;
        case "ArrowRight":
          if (orientation === "horizontal" || orientation === "both") {
            newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
            event.preventDefault();
          }
          break;
        case "Home":
          newIndex = 0;
          event.preventDefault();
          break;
        case "End":
          newIndex = items.length - 1;
          event.preventDefault();
          break;
      }

      if (newIndex !== currentIndex) {
        setCurrentIndex(newIndex);
        items[newIndex]?.focus();
      }
    },
    [currentIndex, items, orientation]
  );

  // Update tabindex attributes
  useEffect(() => {
    items.forEach((item, index) => {
      if (item) {
        item.tabIndex = index === currentIndex ? 0 : -1;
      }
    });
  }, [items, currentIndex]);

  return {
    currentIndex,
    setCurrentIndex,
    handleKeyDown,
  };
}

/**
 * Hook for announcing changes to screen readers
 */
export function useAnnouncer() {
  const announcerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Create announcer element if it doesn't exist
    if (!announcerRef.current) {
      const announcer = document.createElement("div");
      announcer.setAttribute("aria-live", "polite");
      announcer.setAttribute("aria-atomic", "true");
      announcer.style.position = "absolute";
      announcer.style.left = "-10000px";
      announcer.style.width = "1px";
      announcer.style.height = "1px";
      announcer.style.overflow = "hidden";
      document.body.appendChild(announcer);
      announcerRef.current = announcer;
    }

    return () => {
      if (announcerRef.current && document.body.contains(announcerRef.current)) {
        document.body.removeChild(announcerRef.current);
      }
    };
  }, []);

  const announce = useCallback((message: string, priority: "polite" | "assertive" = "polite") => {
    if (announcerRef.current) {
      announcerRef.current.setAttribute("aria-live", priority);
      announcerRef.current.textContent = message;
      
      // Clear the message after a short delay to allow for re-announcements
      setTimeout(() => {
        if (announcerRef.current) {
          announcerRef.current.textContent = "";
        }
      }, 1000);
    }
  }, []);

  return { announce };
}

/**
 * Hook for managing skip links
 */
export function useSkipLinks() {
  const skipLinksRef = useRef<HTMLDivElement>(null);

  const addSkipLink = useCallback((targetId: string, label: string) => {
    if (!skipLinksRef.current) return;

    const link = document.createElement("a");
    link.href = `#${targetId}`;
    link.textContent = label;
    link.className = "sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md";
    
    skipLinksRef.current.appendChild(link);

    return () => {
      if (skipLinksRef.current && skipLinksRef.current.contains(link)) {
        skipLinksRef.current.removeChild(link);
      }
    };
  }, []);

  return { skipLinksRef, addSkipLink };
}