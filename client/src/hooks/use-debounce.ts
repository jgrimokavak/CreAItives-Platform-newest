import { useState, useEffect } from 'react';

/**
 * A hook to debounce values to avoid excessive re-renders or API calls
 * @param value The value to debounce
 * @param delay The delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up a timer to update the debounced value after the specified delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clear the timer if the value changes before the delay has expired
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}