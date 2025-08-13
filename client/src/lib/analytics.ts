// Client-side analytics event logging for Phase 2

interface AnalyticsEvent {
  event: string;
  feature?: string;
  model?: string;
  status?: string;
  duration?: number;
  errorCode?: string;
  metadata?: Record<string, any>;
}

// Queue for offline events
let eventQueue: AnalyticsEvent[] = [];
let isOnline = navigator.onLine;

// Listen for online/offline events
window.addEventListener('online', () => {
  isOnline = true;
  flushEventQueue();
});

window.addEventListener('offline', () => {
  isOnline = false;
});

// Send event to server
async function sendEvent(event: AnalyticsEvent): Promise<void> {
  try {
    const response = await fetch('/api/analytics/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      throw new Error(`Analytics request failed: ${response.status}`);
    }
  } catch (error) {
    console.warn('Failed to send analytics event:', error);
    // Queue for retry if offline
    if (!isOnline) {
      eventQueue.push(event);
    }
  }
}

// Flush queued events when back online
async function flushEventQueue(): Promise<void> {
  const events = [...eventQueue];
  eventQueue = [];
  
  for (const event of events) {
    await sendEvent(event);
  }
}

// Send session heartbeat
export async function sendHeartbeat(): Promise<void> {
  try {
    await fetch('/api/analytics/heartbeat', {
      method: 'POST',
      credentials: 'include',
    });
  } catch (error) {
    console.warn('Failed to send heartbeat:', error);
  }
}

// Track page views
export function trackPageView(page: string): void {
  sendEvent({
    event: 'page_view',
    feature: 'navigation',
    metadata: { page }
  });
}

// Track content generation events
export function trackContentGeneration(type: 'image' | 'video', status: 'requested' | 'succeeded' | 'failed', options: {
  model?: string;
  duration?: number;
  errorCode?: string;
  metadata?: Record<string, any>;
} = {}): void {
  const { model, duration, errorCode, metadata } = options;
  
  sendEvent({
    event: `${type}_generate_${status}`,
    feature: `${type}_generation`,
    model,
    status,
    duration,
    errorCode,
    metadata
  });
}

// Track project events
export function trackProjectEvent(action: 'create' | 'update' | 'delete', metadata: Record<string, any> = {}): void {
  sendEvent({
    event: `project_${action}`,
    feature: 'project_management',
    status: 'succeeded',
    metadata
  });
}

// Track user actions
export function trackUserAction(action: string, feature: string, metadata: Record<string, any> = {}): void {
  sendEvent({
    event: action,
    feature,
    status: 'succeeded',
    metadata
  });
}

// Track errors
export function trackError(error: string, feature: string, metadata: Record<string, any> = {}): void {
  sendEvent({
    event: 'error',
    feature,
    status: 'failed',
    errorCode: error,
    metadata
  });
}

// Initialize heartbeat - send every 5 minutes
let heartbeatInterval: NodeJS.Timeout | null = null;

export function startHeartbeat(): void {
  if (heartbeatInterval) return;
  
  heartbeatInterval = setInterval(() => {
    sendHeartbeat();
  }, 5 * 60 * 1000); // 5 minutes
  
  // Send initial heartbeat
  sendHeartbeat();
}

export function stopHeartbeat(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

// Track user login/logout
export function trackAuth(action: 'login' | 'logout'): void {
  sendEvent({
    event: action,
    feature: 'authentication',
    status: 'succeeded'
  });
  
  if (action === 'login') {
    startHeartbeat();
  } else {
    stopHeartbeat();
  }
}

// Performance tracking helper
export class PerformanceTracker {
  private startTime: number;
  private feature: string;
  private action: string;
  private metadata: Record<string, any>;

  constructor(feature: string, action: string, metadata: Record<string, any> = {}) {
    this.startTime = Date.now();
    this.feature = feature;
    this.action = action;
    this.metadata = metadata;
  }

  finish(status: 'succeeded' | 'failed' = 'succeeded', errorCode?: string): void {
    const duration = Date.now() - this.startTime;
    
    sendEvent({
      event: `${this.action}_${status}`,
      feature: this.feature,
      status,
      duration,
      errorCode,
      metadata: this.metadata
    });
  }
}

// Export performance tracker for easy use
export function startPerformanceTracking(feature: string, action: string, metadata: Record<string, any> = {}): PerformanceTracker {
  return new PerformanceTracker(feature, action, metadata);
}