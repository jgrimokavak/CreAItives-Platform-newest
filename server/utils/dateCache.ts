/**
 * PERFORMANCE OPTIMIZATION: Date caching utility
 * Reduces memory allocation and garbage collection pressure by caching Date objects
 * and providing optimized timestamp functions
 */

// Cache for formatted timestamps (refreshed every 1 second)
let cachedFormattedTime: string = '';
let lastFormattedTimeUpdate: number = 0;
const FORMATTED_TIME_CACHE_TTL = 1000; // 1 second

// Cache for ISO timestamps (refreshed every 100ms for higher precision)
let cachedIsoTime: string = '';
let lastIsoTimeUpdate: number = 0; 
const ISO_TIME_CACHE_TTL = 100; // 100ms

// Cache for Date.now() equivalents
let cachedNow: number = 0;
let lastNowUpdate: number = 0;
const NOW_CACHE_TTL = 50; // 50ms

/**
 * Get cached formatted time for logging (refreshed every 1 second)
 * Replaces frequent new Date().toLocaleTimeString() calls
 */
export function getCachedFormattedTime(): string {
  const now = Date.now();
  
  if (now - lastFormattedTimeUpdate > FORMATTED_TIME_CACHE_TTL) {
    cachedFormattedTime = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit", 
      second: "2-digit",
      hour12: true,
    });
    lastFormattedTimeUpdate = now;
  }
  
  return cachedFormattedTime;
}

/**
 * Get cached ISO timestamp (refreshed every 100ms)
 * Replaces frequent new Date().toISOString() calls
 */
export function getCachedIsoTime(): string {
  const now = Date.now();
  
  if (now - lastIsoTimeUpdate > ISO_TIME_CACHE_TTL) {
    cachedIsoTime = new Date().toISOString();
    lastIsoTimeUpdate = now;
  }
  
  return cachedIsoTime;
}

/**
 * Get cached Date.now() with minimal precision loss (refreshed every 50ms)
 * Use when millisecond precision isn't critical
 */
export function getCachedNow(): number {
  const now = Date.now();
  
  if (now - lastNowUpdate > NOW_CACHE_TTL) {
    cachedNow = now;
    lastNowUpdate = now;
  }
  
  return cachedNow;
}

/**
 * Get a fresh Date object when exact precision is needed
 * Use sparingly for critical timestamps
 */
export function getFreshDate(): Date {
  return new Date();
}

/**
 * Create file-safe timestamp string (cached)
 * Optimized for filename generation
 */
export function getCachedTimestampForFilename(): string {
  return getCachedNow().toString();
}