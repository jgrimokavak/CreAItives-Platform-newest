import { useEffect, useRef, useState } from 'react';

export interface UseIntersectionObserverOptions {
  threshold?: number | number[];
  root?: Element | null;
  rootMargin?: string;
  triggerOnce?: boolean;
}

/**
 * Custom hook for intersection observer functionality
 * Detects when an element enters the viewport
 */
export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
) {
  const {
    threshold = 0.1,
    root = null,
    rootMargin = '50px',
    triggerOnce = false,
  } = options;

  const [isVisible, setIsVisible] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const elementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    
    if (!element || !window.IntersectionObserver) {
      // Fallback for environments without IntersectionObserver
      setIsVisible(true);
      return;
    }

    // If triggerOnce is enabled and already triggered, don't create observer
    if (triggerOnce && hasTriggered) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const visible = entry.isIntersecting;
          setIsVisible(visible);
          
          if (visible && triggerOnce) {
            setHasTriggered(true);
          }
        });
      },
      {
        threshold,
        root,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, root, rootMargin, triggerOnce, hasTriggered]);

  return {
    elementRef,
    isVisible: triggerOnce ? (hasTriggered || isVisible) : isVisible,
  };
}