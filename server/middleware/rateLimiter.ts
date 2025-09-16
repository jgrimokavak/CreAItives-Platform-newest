import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

export function createRateLimiter(windowMs: number, maxRequests: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    
    // Clean up expired entries
    Object.keys(store).forEach(k => {
      if (store[k].resetTime < now) {
        delete store[k];
      }
    });
    
    // Initialize or get current window
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs
      };
    } else {
      store[key].count++;
    }
    
    // Check if limit exceeded
    if (store[key].count > maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((store[key].resetTime - now) / 1000)
      });
    }
    
    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - store[key].count));
    res.setHeader('X-RateLimit-Reset', new Date(store[key].resetTime).toISOString());
    
    next();
  };
}

// Export specific rate limiters
export const galleryRateLimit = createRateLimiter(1000, 5); // 5 requests per second
export const uploadRateLimit = createRateLimiter(60000, 10); // 10 requests per minute

// === VIDEO-SPECIFIC RATE LIMITING ===

interface UserRateData {
  requests: number[];
  lastReset: number;
}

interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxConcurrentProcessing: number;
  windowMs: number;
}

class VideoRateLimiter {
  private userRequests: Map<string, UserRateData> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig = {
    maxRequestsPerMinute: 10,
    maxConcurrentProcessing: 2,
    windowMs: 60 * 1000 // 1 minute
  }) {
    this.config = config;
    
    // Clean up old data every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  async checkRateLimit(userId: string): Promise<{
    allowed: boolean;
    reason?: string;
    retryAfter?: number;
    queuePosition?: number;
  }> {
    const now = Date.now();
    
    // Clean up old requests for this user
    this.cleanupUserRequests(userId, now);
    
    // Get or create user rate data
    let userData = this.userRequests.get(userId);
    if (!userData) {
      userData = { requests: [], lastReset: now };
      this.userRequests.set(userId, userData);
    }

    // Check sliding window rate limit
    const requestsInWindow = userData.requests.filter(
      timestamp => timestamp > now - this.config.windowMs
    ).length;

    if (requestsInWindow >= this.config.maxRequestsPerMinute) {
      const oldestRequest = Math.min(...userData.requests);
      const retryAfter = Math.ceil((oldestRequest + this.config.windowMs - now) / 1000);
      
      return {
        allowed: false,
        reason: `Rate limit exceeded: ${requestsInWindow}/${this.config.maxRequestsPerMinute} requests per minute`,
        retryAfter
      };
    }

    // NOTE: Concurrency limits are now handled by the job queue system
    // This rate limiter only handles per-minute request throttling

    // Record this request
    userData.requests.push(now);
    userData.lastReset = now;

    return { allowed: true };
  }

  private cleanupUserRequests(userId: string, now: number): void {
    const userData = this.userRequests.get(userId);
    if (!userData) return;

    // Remove requests older than the window
    userData.requests = userData.requests.filter(
      timestamp => timestamp > now - this.config.windowMs
    );

    // Remove user data if no recent requests
    if (userData.requests.length === 0 && userData.lastReset < now - this.config.windowMs * 2) {
      this.userRequests.delete(userId);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [userId, userData] of Array.from(this.userRequests.entries())) {
      this.cleanupUserRequests(userId, now);
    }
  }

  // Get current status for monitoring
  getStats(): {
    totalUsers: number;
    totalActiveRequests: number;
    userStats: Record<string, { requests: number; lastActivity: number }>;
  } {
    const now = Date.now();
    const userStats: Record<string, { requests: number; lastActivity: number }> = {};
    let totalActiveRequests = 0;

    for (const [userId, userData] of Array.from(this.userRequests.entries())) {
      const activeRequests = userData.requests.filter(
        (timestamp: number) => timestamp > now - this.config.windowMs
      ).length;
      
      if (activeRequests > 0) {
        userStats[userId] = {
          requests: activeRequests,
          lastActivity: userData.lastReset
        };
        totalActiveRequests += activeRequests;
      }
    }

    return {
      totalUsers: this.userRequests.size,
      totalActiveRequests,
      userStats
    };
  }
}

// Global video rate limiter instance
const videoRateLimiter = new VideoRateLimiter();

// Express middleware for video generation
export const videoRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract user ID from request - using the authentication pattern from this codebase
    // @ts-ignore - req.user is extended by authentication middleware
    const userId = req.user?.claims?.sub || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const rateCheckResult = await videoRateLimiter.checkRateLimit(userId);

    if (!rateCheckResult.allowed) {
      // Only return 429 for rate limit exceeded (per-minute throttling)
      return res.status(429).json({
        error: rateCheckResult.reason,
        retryAfter: rateCheckResult.retryAfter
      });
    }

    next();
  } catch (error) {
    console.error('Rate limiter error:', error);
    // On error, allow the request to proceed but log the issue
    next();
  }
};

// Get rate limiter stats (for monitoring)
export const getRateLimiterStats = () => videoRateLimiter.getStats();