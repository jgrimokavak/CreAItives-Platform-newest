import { db } from './db';
import { users, activityEvents, dailyAnalytics } from '@shared/schema';
import { eq, and, gte, lte, sql, desc, asc, inArray, isNotNull, or } from 'drizzle-orm';

// Helper function to convert to Argentina timezone (UTC-3)
const toArgentinaTime = (date: Date): Date => {
  const argentinaOffset = -3 * 60; // Argentina is UTC-3
  const localOffset = date.getTimezoneOffset();
  const offsetDiff = argentinaOffset - localOffset;
  return new Date(date.getTime() + offsetDiff * 60 * 1000);
};

// Helper function to get current time in Argentina
const getArgentinaNow = (): Date => {
  return toArgentinaTime(new Date());
};

const getCurrentEnv = () => {
  const env = process.env.REPLIT_DEPLOYMENT === '1' ? 'prod' : 'dev';
  // Remove debug logging after verification
  return env;
};

// Valid models for validation
const VALID_MODELS = [
  'gpt-image-1', 'imagen-4', 'imagen-3', 'flux-pro', 
  'flux-kontext-max', 'flux-krea-dev', 'wan-2.2', 'hailuo-02', 'kling-v2.1', 'upscale',
  'google/nano-banana'
];

// Event logging for analytics with model validation
export async function logActivity(event: {
  userId: string;
  sessionId?: string;
  event: string;
  feature?: string;
  model?: string;
  status?: string;
  duration?: number;
  errorCode?: string;
  metadata?: any;
}) {
  try {
    // Validate model if provided
    if (event.model && !VALID_MODELS.includes(event.model)) {
      console.warn(`Invalid model "${event.model}" attempted to be logged. Skipping event.`);
      return;
    }

    const environment = getCurrentEnv();
    const eventLog = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...event,
      environment,
      createdAt: getArgentinaNow(), // Use Argentina time for all events
    };
    
    await db.insert(activityEvents).values(eventLog);
  } catch (error) {
    console.error('Failed to log activity event:', error);
    // Don't throw - analytics should not break main functionality
  }
}

// Session heartbeat update
export async function updateSessionHeartbeat(userId: string, sessionId: string) {
  try {
    await logActivity({
      userId,
      sessionId,
      event: 'session_heartbeat',
      feature: 'session_management',
      status: 'active'
    });
  } catch (error) {
    console.error('Failed to update session heartbeat:', error);
  }
}

// KPI calculation functions
export async function getKPIs(dateFrom: Date, dateTo: Date, filters: {
  roleFilter?: string;
  statusFilter?: string;  
  domainFilter?: string;
  activatedFilter?: string;
} = {}) {
  const environment = getCurrentEnv();
  const requestId = `kpi_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  console.log(`[🔥 KPI START ${requestId}] Date: ${dateFrom.toISOString()} to ${dateTo.toISOString()}`, {
    environment,
    filters,
    memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024 + 'MB'
  });
  
  // Build user filter conditions
  const userConditions = [];
  if (filters.roleFilter && filters.roleFilter !== 'all') {
    userConditions.push(eq(users.role, filters.roleFilter));
  }
  if (filters.statusFilter === 'active') {
    userConditions.push(eq(users.isActive, true));
  } else if (filters.statusFilter === 'inactive') {
    userConditions.push(eq(users.isActive, false));
  }
  if (filters.domainFilter) {
    userConditions.push(sql`split_part(${users.email}, '@', 2) = ${filters.domainFilter}`);
  }
  if (filters.activatedFilter === 'activated') {
    userConditions.push(isNotNull(users.lastLoginAt));
  } else if (filters.activatedFilter === 'not_activated') {
    userConditions.push(sql`${users.lastLoginAt} IS NULL`);
  }

  const userWhereClause = userConditions.length > 0 ? and(...userConditions) : undefined;

  // OPTIMIZED: Batch queries into parallel execution groups
  const startTime = Date.now();
  
  // Step 1: Get filtered user IDs if filters are applied (must run first)
  let filteredUserIds: string[] | undefined;
  if (userWhereClause) {
    const filteredUsers = await db.select({ id: users.id }).from(users).where(userWhereClause);
    filteredUserIds = filteredUsers.map(u => u.id);
  }

  // Build event filter conditions once
  const eventConditions = [
    eq(activityEvents.environment, environment),
    gte(activityEvents.createdAt, dateFrom),
    lte(activityEvents.createdAt, dateTo)
  ];

  if (filteredUserIds && filteredUserIds.length > 0) {
    eventConditions.push(inArray(activityEvents.userId, filteredUserIds));
  }

  const eventWhereClause = and(...eventConditions);

  // MAU date range for stickiness calculation
  const mauStartDate = new Date(dateTo);
  mauStartDate.setDate(mauStartDate.getDate() - 30);
  
  const mauEventConditions = [
    eq(activityEvents.environment, environment),
    gte(activityEvents.createdAt, mauStartDate),
    lte(activityEvents.createdAt, dateTo)
  ];
  
  if (filteredUserIds && filteredUserIds.length > 0) {
    mauEventConditions.push(inArray(activityEvents.userId, filteredUserIds));
  }

  // Step 2: Run independent queries in parallel
  const [
    // Combined activity events metrics (DAU, content metrics, errors) 
    combinedActivityMetrics,
    // New users from users table
    newUsersResult,
    // Activation rate calculation (complex JOIN, runs separately)
    activationResult,
    // MAU calculation
    mauResult
  ] = await Promise.all([
    // Combined query for all activity_events based metrics
    db.select({
      // DAU calculation
      dau: sql<number>`COUNT(DISTINCT ${activityEvents.userId})`,
      // Content generation metrics
      imageAttempts: sql<number>`COUNT(CASE WHEN ${activityEvents.feature} IN ('image_creation', 'image_editing', 'car_generation', 'batch_car_generation', 'photo_to_studio') THEN 1 END)`,
      imageSuccesses: sql<number>`COUNT(CASE WHEN ${activityEvents.feature} IN ('image_creation', 'image_editing', 'car_generation', 'batch_car_generation', 'photo_to_studio') AND ${activityEvents.status} = 'succeeded' THEN 1 END)`,
      videoAttempts: sql<number>`COUNT(CASE WHEN ${activityEvents.feature} = 'video_generation' THEN 1 END)`,
      videoSuccesses: sql<number>`COUNT(CASE WHEN ${activityEvents.feature} = 'video_generation' AND ${activityEvents.status} = 'succeeded' THEN 1 END)`,
      upscaleAttempts: sql<number>`COUNT(CASE WHEN ${activityEvents.feature} = 'upscale' THEN 1 END)`,
      upscaleSuccesses: sql<number>`COUNT(CASE WHEN ${activityEvents.feature} = 'upscale' AND ${activityEvents.status} = 'succeeded' THEN 1 END)`,
      totalErrors: sql<number>`COUNT(CASE WHEN ${activityEvents.status} = 'failed' THEN 1 END)`,
      // Performance metrics
      avgImageLatency: sql<number>`AVG(CASE WHEN ${activityEvents.feature} IN ('image_creation', 'image_editing', 'car_generation', 'batch_car_generation', 'photo_to_studio') AND ${activityEvents.status} = 'succeeded' AND ${activityEvents.duration} IS NOT NULL THEN ${activityEvents.duration} END)`,
      avgVideoLatency: sql<number>`AVG(CASE WHEN ${activityEvents.feature} = 'video_generation' AND ${activityEvents.status} = 'succeeded' AND ${activityEvents.duration} IS NOT NULL THEN ${activityEvents.duration} END)`,
      avgUpscaleLatency: sql<number>`AVG(CASE WHEN ${activityEvents.feature} = 'upscale' AND ${activityEvents.status} = 'succeeded' AND ${activityEvents.duration} IS NOT NULL THEN ${activityEvents.duration} END)`,
      p95ImageLatency: sql<number>`PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY CASE WHEN ${activityEvents.feature} IN ('image_creation', 'image_editing', 'car_generation', 'batch_car_generation', 'photo_to_studio') AND ${activityEvents.status} = 'succeeded' AND ${activityEvents.duration} IS NOT NULL THEN ${activityEvents.duration} END)`,
      p95VideoLatency: sql<number>`PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY CASE WHEN ${activityEvents.feature} = 'video_generation' AND ${activityEvents.status} = 'succeeded' AND ${activityEvents.duration} IS NOT NULL THEN ${activityEvents.duration} END)`
    })
    .from(activityEvents)
    .where(eventWhereClause),
    
    // New users count
    db.select({ count: sql`count(*)` })
      .from(users)
      .where(and(
        userWhereClause || sql`1=1`,
        gte(users.createdAt, dateFrom),
        lte(users.createdAt, dateTo)
      )),
    
    // Activation rate (complex query, kept separate)
    db.select({ count: sql`count(*)` })
      .from(users)
      .leftJoin(activityEvents, and(
        eq(users.id, activityEvents.userId),
        sql`${activityEvents.feature} IN ('image_creation', 'image_editing', 'car_generation', 'batch_car_generation', 'photo_to_studio', 'video_generation', 'upscale')`,
        eq(activityEvents.status, 'succeeded'),
        gte(activityEvents.createdAt, sql`${users.createdAt}`),
        lte(activityEvents.createdAt, sql`${users.createdAt} + INTERVAL '7 days'`)
      ))
      .where(and(
        userWhereClause || sql`1=1`,
        gte(users.createdAt, dateFrom),
        lte(users.createdAt, dateTo),
        isNotNull(activityEvents.id)
      )),
      
    // MAU calculation
    db.select({ count: sql`COUNT(DISTINCT ${activityEvents.userId})` })
      .from(activityEvents)
      .where(and(...mauEventConditions))
  ]);

  // Step 3: Get top errors in a separate query (needs grouping)
  const topErrorsResult = await db
    .select({
      errorCode: activityEvents.errorCode,
      count: sql`COUNT(*)`
    })
    .from(activityEvents)
    .where(and(
      eventWhereClause,
      isNotNull(activityEvents.errorCode)
    ))
    .groupBy(activityEvents.errorCode)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(5);

  // Extract results and calculate derived metrics
  const metrics = combinedActivityMetrics[0];
  const dau = Number(metrics?.dau || 0);
  const newUsers = Number(newUsersResult[0]?.count || 0);
  const activatedUsers = Number(activationResult[0]?.count || 0);
  const mau = Number(mauResult[0]?.count || 0);
  
  const imageAttempts = Number(metrics?.imageAttempts || 0);
  const imageSuccesses = Number(metrics?.imageSuccesses || 0);
  const videoAttempts = Number(metrics?.videoAttempts || 0);
  const videoSuccesses = Number(metrics?.videoSuccesses || 0);
  const upscaleAttempts = Number(metrics?.upscaleAttempts || 0);
  const upscaleSuccesses = Number(metrics?.upscaleSuccesses || 0);
  
  const totalAttempts = imageAttempts + videoAttempts + upscaleAttempts;
  const totalSuccesses = imageSuccesses + videoSuccesses + upscaleSuccesses;
  const contentSuccessRate = totalAttempts > 0 ? (totalSuccesses / totalAttempts) * 100 : 0;
  const activationRate = newUsers > 0 ? (activatedUsers / newUsers) * 100 : 0;
  const stickiness = mau > 0 ? (dau / mau) * 100 : 0;
  
  const queryTime = Date.now() - startTime;
  const memoryAfter = process.memoryUsage().heapUsed / 1024 / 1024;
  console.log(`[✅ KPI DONE ${requestId}] Completed in ${queryTime}ms | Memory: ${memoryAfter.toFixed(1)}MB | Queries: 4 parallel + 1 grouped | DAU: ${dau}, New Users: ${newUsers}`);
  
  // Log if this is a duplicate period calculation
  const periodType = dateFrom.getTime() < (Date.now() - (30 * 24 * 60 * 60 * 1000)) ? 'PREVIOUS' : 'CURRENT';
  console.log(`[📊 KPI ${requestId}] Period: ${periodType} | Success Rate: ${contentSuccessRate.toFixed(1)}% | Errors: ${Number(metrics?.totalErrors || 0)}`);

  return {
    dau,
    mau,
    newUsers,
    activatedUsers,
    activationRate: Math.round(activationRate * 100) / 100,
    stickiness: Math.round(stickiness * 100) / 100,
    contentSuccessRate: Math.round(contentSuccessRate * 100) / 100,
    imageAttempts,
    imageSuccesses,
    videoAttempts, 
    videoSuccesses,
    totalErrors: Number(metrics?.totalErrors || 0),
    avgImageLatency: Math.round(Number(metrics?.avgImageLatency || 0)),
    avgVideoLatency: Math.round(Number(metrics?.avgVideoLatency || 0)),
    avgUpscaleLatency: Math.round(Number(metrics?.avgUpscaleLatency || 0)),
    p95ImageLatency: Math.round(Number(metrics?.p95ImageLatency || 0)),
    p95VideoLatency: Math.round(Number(metrics?.p95VideoLatency || 0)),
    upscaleAttempts,
    upscaleSuccesses,
    topErrors: topErrorsResult.map(e => ({
      code: e.errorCode,
      count: Number(e.count)
    }))
  };
}

// OPTIMIZED: Get KPIs for both current and previous periods in a single call
export async function getKPIsWithComparison(
  currentFrom: Date, 
  currentTo: Date, 
  previousFrom: Date, 
  previousTo: Date, 
  filters: {
    roleFilter?: string;
    statusFilter?: string;  
    domainFilter?: string;
    activatedFilter?: string;
  } = {}
) {
  const environment = getCurrentEnv();
  const requestId = `kpi_batch_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  console.log(`[🔥 KPI BATCH START ${requestId}] Current: ${currentFrom.toISOString()} to ${currentTo.toISOString()}, Previous: ${previousFrom.toISOString()} to ${previousTo.toISOString()}`, {
    environment,
    filters,
    memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024 + 'MB'
  });
  
  // Build user filter conditions (same as original)
  const userConditions = [];
  if (filters.roleFilter && filters.roleFilter !== 'all') {
    userConditions.push(eq(users.role, filters.roleFilter));
  }
  if (filters.statusFilter === 'active') {
    userConditions.push(eq(users.isActive, true));
  } else if (filters.statusFilter === 'inactive') {
    userConditions.push(eq(users.isActive, false));
  }
  if (filters.domainFilter) {
    userConditions.push(sql`split_part(${users.email}, '@', 2) = ${filters.domainFilter}`);
  }
  if (filters.activatedFilter === 'activated') {
    userConditions.push(isNotNull(users.lastLoginAt));
  } else if (filters.activatedFilter === 'not_activated') {
    userConditions.push(sql`${users.lastLoginAt} IS NULL`);
  }

  const userWhereClause = userConditions.length > 0 ? and(...userConditions) : undefined;

  const startTime = Date.now();
  
  // Get filtered user IDs if filters are applied
  let filteredUserIds: string[] | undefined;
  if (userWhereClause) {
    const filteredUsers = await db.select({ id: users.id }).from(users).where(userWhereClause);
    filteredUserIds = filteredUsers.map(u => u.id);
  }

  // Combined query for both periods using conditional aggregation
  const eventConditions = [eq(activityEvents.environment, environment)];
  if (filteredUserIds && filteredUserIds.length > 0) {
    eventConditions.push(inArray(activityEvents.userId, filteredUserIds));
  }

  // Single mega-query for both periods using conditional aggregation
  const [combinedMetrics] = await Promise.all([
    db.select({
      // Current period metrics
      currentDau: sql<number>`COUNT(DISTINCT CASE WHEN ${activityEvents.createdAt} >= ${currentFrom} AND ${activityEvents.createdAt} <= ${currentTo} THEN ${activityEvents.userId} END)`,
      currentImageAttempts: sql<number>`COUNT(CASE WHEN ${activityEvents.createdAt} >= ${currentFrom} AND ${activityEvents.createdAt} <= ${currentTo} AND ${activityEvents.feature} IN ('image_creation', 'image_editing', 'car_generation', 'batch_car_generation', 'photo_to_studio') THEN 1 END)`,
      currentImageSuccesses: sql<number>`COUNT(CASE WHEN ${activityEvents.createdAt} >= ${currentFrom} AND ${activityEvents.createdAt} <= ${currentTo} AND ${activityEvents.feature} IN ('image_creation', 'image_editing', 'car_generation', 'batch_car_generation', 'photo_to_studio') AND ${activityEvents.status} = 'succeeded' THEN 1 END)`,
      currentVideoAttempts: sql<number>`COUNT(CASE WHEN ${activityEvents.createdAt} >= ${currentFrom} AND ${activityEvents.createdAt} <= ${currentTo} AND ${activityEvents.feature} = 'video_generation' THEN 1 END)`,
      currentVideoSuccesses: sql<number>`COUNT(CASE WHEN ${activityEvents.createdAt} >= ${currentFrom} AND ${activityEvents.createdAt} <= ${currentTo} AND ${activityEvents.feature} = 'video_generation' AND ${activityEvents.status} = 'succeeded' THEN 1 END)`,
      currentUpscaleAttempts: sql<number>`COUNT(CASE WHEN ${activityEvents.createdAt} >= ${currentFrom} AND ${activityEvents.createdAt} <= ${currentTo} AND ${activityEvents.feature} = 'upscale' THEN 1 END)`,
      currentUpscaleSuccesses: sql<number>`COUNT(CASE WHEN ${activityEvents.createdAt} >= ${currentFrom} AND ${activityEvents.createdAt} <= ${currentTo} AND ${activityEvents.feature} = 'upscale' AND ${activityEvents.status} = 'succeeded' THEN 1 END)`,
      currentTotalErrors: sql<number>`COUNT(CASE WHEN ${activityEvents.createdAt} >= ${currentFrom} AND ${activityEvents.createdAt} <= ${currentTo} AND ${activityEvents.status} = 'failed' THEN 1 END)`,
      
      // Previous period metrics
      previousDau: sql<number>`COUNT(DISTINCT CASE WHEN ${activityEvents.createdAt} >= ${previousFrom} AND ${activityEvents.createdAt} <= ${previousTo} THEN ${activityEvents.userId} END)`,
      previousImageAttempts: sql<number>`COUNT(CASE WHEN ${activityEvents.createdAt} >= ${previousFrom} AND ${activityEvents.createdAt} <= ${previousTo} AND ${activityEvents.feature} IN ('image_creation', 'image_editing', 'car_generation', 'batch_car_generation', 'photo_to_studio') THEN 1 END)`,
      previousImageSuccesses: sql<number>`COUNT(CASE WHEN ${activityEvents.createdAt} >= ${previousFrom} AND ${activityEvents.createdAt} <= ${previousTo} AND ${activityEvents.feature} IN ('image_creation', 'image_editing', 'car_generation', 'batch_car_generation', 'photo_to_studio') AND ${activityEvents.status} = 'succeeded' THEN 1 END)`,
      previousVideoAttempts: sql<number>`COUNT(CASE WHEN ${activityEvents.createdAt} >= ${previousFrom} AND ${activityEvents.createdAt} <= ${previousTo} AND ${activityEvents.feature} = 'video_generation' THEN 1 END)`,
      previousVideoSuccesses: sql<number>`COUNT(CASE WHEN ${activityEvents.createdAt} >= ${previousFrom} AND ${activityEvents.createdAt} <= ${previousTo} AND ${activityEvents.feature} = 'video_generation' AND ${activityEvents.status} = 'succeeded' THEN 1 END)`,
      previousUpscaleAttempts: sql<number>`COUNT(CASE WHEN ${activityEvents.createdAt} >= ${previousFrom} AND ${activityEvents.createdAt} <= ${previousTo} AND ${activityEvents.feature} = 'upscale' THEN 1 END)`,
      previousUpscaleSuccesses: sql<number>`COUNT(CASE WHEN ${activityEvents.createdAt} >= ${previousFrom} AND ${activityEvents.createdAt} <= ${previousTo} AND ${activityEvents.feature} = 'upscale' AND ${activityEvents.status} = 'succeeded' THEN 1 END)`,
      previousTotalErrors: sql<number>`COUNT(CASE WHEN ${activityEvents.createdAt} >= ${previousFrom} AND ${activityEvents.createdAt} <= ${previousTo} AND ${activityEvents.status} = 'failed' THEN 1 END)`
    })
    .from(activityEvents)
    .where(and(...eventConditions))
  ]);

  // Separate queries for user-specific metrics (new users, MAU, activation)
  const [currentNewUsers, previousNewUsers, currentMau, previousMau, currentActivated, previousActivated] = await Promise.all([
    // Current new users
    db.select({ count: sql`count(*)` }).from(users).where(and(
      userWhereClause || sql`1=1`,
      gte(users.createdAt, currentFrom),
      lte(users.createdAt, currentTo)
    )),
    // Previous new users  
    db.select({ count: sql`count(*)` }).from(users).where(and(
      userWhereClause || sql`1=1`,
      gte(users.createdAt, previousFrom),
      lte(users.createdAt, previousTo)
    )),
    // Current MAU
    db.select({ count: sql`COUNT(DISTINCT ${activityEvents.userId})` }).from(activityEvents).where(and(
      eq(activityEvents.environment, environment),
      gte(activityEvents.createdAt, new Date(currentTo.getTime() - 30 * 24 * 60 * 60 * 1000)),
      lte(activityEvents.createdAt, currentTo),
      ...(filteredUserIds ? [inArray(activityEvents.userId, filteredUserIds)] : [])
    )),
    // Previous MAU
    db.select({ count: sql`COUNT(DISTINCT ${activityEvents.userId})` }).from(activityEvents).where(and(
      eq(activityEvents.environment, environment),
      gte(activityEvents.createdAt, new Date(previousTo.getTime() - 30 * 24 * 60 * 60 * 1000)),
      lte(activityEvents.createdAt, previousTo),
      ...(filteredUserIds ? [inArray(activityEvents.userId, filteredUserIds)] : [])
    )),
    // Current activation
    db.select({ count: sql`count(*)` }).from(users).leftJoin(activityEvents, and(
      eq(users.id, activityEvents.userId),
      sql`${activityEvents.feature} IN ('image_creation', 'image_editing', 'car_generation', 'batch_car_generation', 'photo_to_studio', 'video_generation', 'upscale')`,
      eq(activityEvents.status, 'succeeded'),
      gte(activityEvents.createdAt, sql`${users.createdAt}`),
      lte(activityEvents.createdAt, sql`${users.createdAt} + INTERVAL '7 days'`)
    )).where(and(
      userWhereClause || sql`1=1`,
      gte(users.createdAt, currentFrom),
      lte(users.createdAt, currentTo),
      isNotNull(activityEvents.id)
    )),
    // Previous activation
    db.select({ count: sql`count(*)` }).from(users).leftJoin(activityEvents, and(
      eq(users.id, activityEvents.userId),
      sql`${activityEvents.feature} IN ('image_creation', 'image_editing', 'car_generation', 'batch_car_generation', 'photo_to_studio', 'video_generation', 'upscale')`,
      eq(activityEvents.status, 'succeeded'),
      gte(activityEvents.createdAt, sql`${users.createdAt}`),
      lte(activityEvents.createdAt, sql`${users.createdAt} + INTERVAL '7 days'`)
    )).where(and(
      userWhereClause || sql`1=1`,
      gte(users.createdAt, previousFrom),
      lte(users.createdAt, previousTo),
      isNotNull(activityEvents.id)
    ))
  ]);

  // Extract and calculate metrics
  const metrics = combinedMetrics[0];
  
  const current = {
    dau: Number(metrics?.currentDau || 0),
    mau: Number(currentMau[0]?.count || 0),
    newUsers: Number(currentNewUsers[0]?.count || 0),
    activatedUsers: Number(currentActivated[0]?.count || 0),
    imageAttempts: Number(metrics?.currentImageAttempts || 0),
    imageSuccesses: Number(metrics?.currentImageSuccesses || 0),
    videoAttempts: Number(metrics?.currentVideoAttempts || 0),
    videoSuccesses: Number(metrics?.currentVideoSuccesses || 0),
    upscaleAttempts: Number(metrics?.currentUpscaleAttempts || 0),
    upscaleSuccesses: Number(metrics?.currentUpscaleSuccesses || 0),
    totalErrors: Number(metrics?.currentTotalErrors || 0)
  };

  const previous = {
    dau: Number(metrics?.previousDau || 0),
    mau: Number(previousMau[0]?.count || 0),
    newUsers: Number(previousNewUsers[0]?.count || 0),
    activatedUsers: Number(previousActivated[0]?.count || 0),
    imageAttempts: Number(metrics?.previousImageAttempts || 0),
    imageSuccesses: Number(metrics?.previousImageSuccesses || 0),
    videoAttempts: Number(metrics?.previousVideoAttempts || 0),
    videoSuccesses: Number(metrics?.previousVideoSuccesses || 0),
    upscaleAttempts: Number(metrics?.previousUpscaleAttempts || 0),
    upscaleSuccesses: Number(metrics?.previousUpscaleSuccesses || 0),
    totalErrors: Number(metrics?.previousTotalErrors || 0)
  };

  // Calculate derived metrics for both periods
  const currentTotalAttempts = current.imageAttempts + current.videoAttempts + current.upscaleAttempts;
  const currentTotalSuccesses = current.imageSuccesses + current.videoSuccesses + current.upscaleSuccesses;
  const currentSuccessRate = currentTotalAttempts > 0 ? (currentTotalSuccesses / currentTotalAttempts) * 100 : 0;
  const currentActivationRate = current.newUsers > 0 ? (current.activatedUsers / current.newUsers) * 100 : 0;
  const currentStickiness = current.mau > 0 ? (current.dau / current.mau) * 100 : 0;

  const previousTotalAttempts = previous.imageAttempts + previous.videoAttempts + previous.upscaleAttempts;
  const previousTotalSuccesses = previous.imageSuccesses + previous.videoSuccesses + previous.upscaleSuccesses;
  const previousSuccessRate = previousTotalAttempts > 0 ? (previousTotalSuccesses / previousTotalAttempts) * 100 : 0;
  const previousActivationRate = previous.newUsers > 0 ? (previous.activatedUsers / previous.newUsers) * 100 : 0;
  const previousStickiness = previous.mau > 0 ? (previous.dau / previous.mau) * 100 : 0;

  const queryTime = Date.now() - startTime;
  const memoryAfter = process.memoryUsage().heapUsed / 1024 / 1024;
  console.log(`[✅ KPI BATCH DONE ${requestId}] Completed in ${queryTime}ms | Memory: ${memoryAfter.toFixed(1)}MB | SINGLE batched query vs 2 separate | Current DAU: ${current.dau}, Previous DAU: ${previous.dau}`);

  // Calculate deltas
  const calculateDelta = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  return {
    current: {
      dau: current.dau,
      mau: current.mau,
      newUsers: current.newUsers,
      activatedUsers: current.activatedUsers,
      activationRate: Math.round(currentActivationRate * 100) / 100,
      stickiness: Math.round(currentStickiness * 100) / 100,
      contentSuccessRate: Math.round(currentSuccessRate * 100) / 100,
      imageAttempts: current.imageAttempts,
      imageSuccesses: current.imageSuccesses,
      videoAttempts: current.videoAttempts,
      videoSuccesses: current.videoSuccesses,
      upscaleAttempts: current.upscaleAttempts,
      upscaleSuccesses: current.upscaleSuccesses,
      totalErrors: current.totalErrors
    },
    previous: {
      dau: previous.dau,
      mau: previous.mau,
      newUsers: previous.newUsers,
      activatedUsers: previous.activatedUsers,
      activationRate: Math.round(previousActivationRate * 100) / 100,
      stickiness: Math.round(previousStickiness * 100) / 100,
      contentSuccessRate: Math.round(previousSuccessRate * 100) / 100,
      imageAttempts: previous.imageAttempts,
      imageSuccesses: previous.imageSuccesses,
      videoAttempts: previous.videoAttempts,
      videoSuccesses: previous.videoSuccesses,
      upscaleAttempts: previous.upscaleAttempts,
      upscaleSuccesses: previous.upscaleSuccesses,
      totalErrors: previous.totalErrors
    },
    deltas: {
      dau: calculateDelta(current.dau, previous.dau),
      mau: calculateDelta(current.mau, previous.mau),
      newUsers: calculateDelta(current.newUsers, previous.newUsers),
      activationRate: currentActivationRate - previousActivationRate,
      stickiness: currentStickiness - previousStickiness,
      imageSuccesses: calculateDelta(current.imageSuccesses, previous.imageSuccesses),
      videoSuccesses: calculateDelta(current.videoSuccesses, previous.videoSuccesses),
      upscaleSuccesses: calculateDelta(current.upscaleSuccesses, previous.upscaleSuccesses),
      contentSuccessRate: currentSuccessRate - previousSuccessRate
    }
  };
}

// Trend data for charts
export async function getTrends(dateFrom: Date, dateTo: Date, interval: 'day' | 'week' = 'day', filters: any = {}) {
  const environment = getCurrentEnv();
  
  // Feature usage trends - track actual content generation features
  const dateFormat = interval === 'week' ? 'YYYY-WW' : 'YYYY-MM-DD';
  const dateGroup = interval === 'week' ? 
    sql`date_trunc('week', ${activityEvents.createdAt})` : 
    sql`date_trunc('day', ${activityEvents.createdAt})`;

  const featureUsageTrends = await db
    .select({
      date: sql<string>`to_char(${dateGroup}, ${dateFormat})`,
      imageCreation: sql<number>`COUNT(CASE WHEN ${activityEvents.feature} = 'image_creation' AND ${activityEvents.status} = 'succeeded' THEN 1 END)`,
      imageEditing: sql<number>`COUNT(CASE WHEN ${activityEvents.feature} = 'image_editing' AND ${activityEvents.status} = 'succeeded' THEN 1 END)`,
      carGeneration: sql<number>`COUNT(CASE WHEN ${activityEvents.feature} = 'car_generation' AND ${activityEvents.status} = 'succeeded' THEN 1 END)`,
      batchCarGeneration: sql<number>`COUNT(CASE WHEN ${activityEvents.feature} = 'batch_car_generation' AND ${activityEvents.status} = 'succeeded' THEN 1 END)`,
      photoToStudio: sql<number>`COUNT(CASE WHEN ${activityEvents.feature} = 'photo_to_studio' AND ${activityEvents.status} = 'succeeded' THEN 1 END)`,
      upscale: sql<number>`COUNT(CASE WHEN ${activityEvents.feature} = 'upscale' AND ${activityEvents.status} = 'succeeded' THEN 1 END)`,
      videoGeneration: sql<number>`COUNT(CASE WHEN ${activityEvents.feature} = 'video_generation' AND ${activityEvents.status} = 'succeeded' THEN 1 END)`
    })
    .from(activityEvents)
    .where(and(
      eq(activityEvents.environment, environment),
      gte(activityEvents.createdAt, dateFrom),
      lte(activityEvents.createdAt, dateTo)
    ))
    .groupBy(dateGroup)
    .orderBy(asc(dateGroup));

  // Model usage distribution - track all generation types including upscale
  const modelUsage = await db
    .select({
      model: sql<string>`CASE 
        WHEN ${activityEvents.feature} = 'upscale' THEN 'upscale'
        ELSE ${activityEvents.model}
      END`,
      count: sql<number>`COUNT(*)`
    })
    .from(activityEvents)
    .where(and(
      eq(activityEvents.environment, environment),
      gte(activityEvents.createdAt, dateFrom),
      lte(activityEvents.createdAt, dateTo),
      sql`${activityEvents.status} = 'succeeded'`,
      or(
        isNotNull(activityEvents.model),
        eq(activityEvents.feature, 'upscale')
      )
    ))
    .groupBy(sql`CASE 
      WHEN ${activityEvents.feature} = 'upscale' THEN 'upscale'
      ELSE ${activityEvents.model}
    END`)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(15); // Show more models

  return {
    featureUsageTrends: featureUsageTrends.map(t => ({
      date: t.date,
      imageCreation: Number(t.imageCreation),
      imageEditing: Number(t.imageEditing),
      carGeneration: Number(t.carGeneration),
      batchCarGeneration: Number(t.batchCarGeneration),
      photoToStudio: Number(t.photoToStudio),
      upscale: Number(t.upscale),
      videoGeneration: Number(t.videoGeneration)
    })),
    modelUsage: modelUsage.map(m => ({
      model: m.model || 'Unknown',
      total: Number(m.count)
    }))
  };
}

// Model usage analytics
export async function getModelUsage(dateFrom: Date, dateTo: Date, filters: any = {}) {
  const environment = getCurrentEnv();
  
  const modelUsage = await db
    .select({
      model: activityEvents.model,
      count: sql<number>`COUNT(*)`,
      successes: sql<number>`COUNT(CASE WHEN ${activityEvents.status} = 'succeeded' THEN 1 END)`,
      failures: sql<number>`COUNT(CASE WHEN ${activityEvents.status} = 'failed' THEN 1 END)`
    })
    .from(activityEvents)
    .where(and(
      eq(activityEvents.environment, environment),
      gte(activityEvents.createdAt, dateFrom),
      lte(activityEvents.createdAt, dateTo),
      isNotNull(activityEvents.model)
    ))
    .groupBy(activityEvents.model)
    .orderBy(desc(sql`COUNT(*)`));
    
  return modelUsage.map(m => ({
    model: m.model || 'Unknown',
    total: Number(m.count),
    successes: Number(m.successes),
    failures: Number(m.failures),
    successRate: Number(m.count) > 0 ? (Number(m.successes) / Number(m.count)) * 100 : 0
  }));
}

// Feature usage analytics
export async function getFeatureUsage(dateFrom: Date, dateTo: Date, filters: any = {}) {
  const environment = getCurrentEnv();
  
  const featureUsage = await db
    .select({
      feature: activityEvents.feature,
      count: sql<number>`COUNT(*)`,
      successes: sql<number>`COUNT(CASE WHEN ${activityEvents.status} = 'succeeded' THEN 1 END)`,
      avgDuration: sql<number>`AVG(CASE WHEN ${activityEvents.duration} IS NOT NULL THEN ${activityEvents.duration} END)`
    })
    .from(activityEvents)
    .where(and(
      eq(activityEvents.environment, environment),
      gte(activityEvents.createdAt, dateFrom),
      lte(activityEvents.createdAt, dateTo),
      isNotNull(activityEvents.feature)
    ))
    .groupBy(activityEvents.feature)
    .orderBy(desc(sql`COUNT(*)`));
    
  return featureUsage.map(f => ({
    feature: f.feature || 'Unknown',
    total: Number(f.count),
    successes: Number(f.successes),
    avgDuration: Math.round(Number(f.avgDuration || 0))
  }));
}