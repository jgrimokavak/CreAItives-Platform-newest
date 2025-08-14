import { db } from './db';
import { users, activityEvents, dailyAnalytics } from '@shared/schema';
import { eq, and, gte, lte, sql, desc, asc, inArray, isNotNull, or } from 'drizzle-orm';

const getCurrentEnv = () => process.env.REPLIT_DEPLOYMENT === '1' ? 'prod' : 'dev';

// Event logging for analytics
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
    const environment = getCurrentEnv();
    const eventLog = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...event,
      environment,
      createdAt: new Date(),
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

  // Get filtered user IDs if filters are applied
  let filteredUserIds: string[] | undefined;
  if (userWhereClause) {
    const filteredUsers = await db.select({ id: users.id }).from(users).where(userWhereClause);
    filteredUserIds = filteredUsers.map(u => u.id);
  }

  // Build event filter conditions
  const eventConditions = [
    eq(activityEvents.environment, environment),
    gte(activityEvents.createdAt, dateFrom),
    lte(activityEvents.createdAt, dateTo)
  ];

  if (filteredUserIds && filteredUserIds.length > 0) {
    eventConditions.push(inArray(activityEvents.userId, filteredUserIds));
  }

  const eventWhereClause = and(...eventConditions);

  // Calculate DAU
  const dauResult = await db
    .select({ 
      count: sql`COUNT(DISTINCT ${activityEvents.userId})` 
    })
    .from(activityEvents)
    .where(eventWhereClause);
  
  const dau = Number(dauResult[0]?.count || 0);

  // Calculate new users in period
  const newUsersResult = await db
    .select({ count: sql`count(*)` })
    .from(users)
    .where(and(
      userWhereClause || sql`1=1`,
      gte(users.createdAt, dateFrom),
      lte(users.createdAt, dateTo)
    ));
  
  const newUsers = Number(newUsersResult[0]?.count || 0);

  // Calculate activation rate (users with >= 1 generation in 7 days of signup)
  const activationResult = await db
    .select({ count: sql`count(*)` })
    .from(users)
    .leftJoin(activityEvents, and(
      eq(users.id, activityEvents.userId),
      sql`${activityEvents.feature} IN ('image_creation', 'image_editing', 'car_generation', 'batch_car_generation', 'video_generation', 'upscale')`,
      eq(activityEvents.status, 'succeeded'),
      gte(activityEvents.createdAt, sql`${users.createdAt}`),
      lte(activityEvents.createdAt, sql`${users.createdAt} + INTERVAL '7 days'`)
    ))
    .where(and(
      userWhereClause || sql`1=1`,
      gte(users.createdAt, dateFrom),
      lte(users.createdAt, dateTo),
      isNotNull(activityEvents.id)
    ));

  const activatedUsers = Number(activationResult[0]?.count || 0);
  const activationRate = newUsers > 0 ? (activatedUsers / newUsers) * 100 : 0;

  // Content generation metrics - using feature-based tracking with debug
  console.log('Analytics query debug - Date range:', { 
    dateFrom: dateFrom.toISOString(), 
    dateTo: dateTo.toISOString(), 
    environment,
    filteredUserIds: filteredUserIds?.length || 'none'
  });

  const generationMetrics = await db
    .select({
      imageAttempts: sql<number>`COUNT(CASE WHEN ${activityEvents.feature} IN ('image_creation', 'image_editing', 'car_generation', 'batch_car_generation') THEN 1 END)`,
      imageSuccesses: sql<number>`COUNT(CASE WHEN ${activityEvents.feature} IN ('image_creation', 'image_editing', 'car_generation', 'batch_car_generation') AND ${activityEvents.status} = 'succeeded' THEN 1 END)`,
      videoAttempts: sql<number>`COUNT(CASE WHEN ${activityEvents.feature} = 'video_generation' THEN 1 END)`,
      videoSuccesses: sql<number>`COUNT(CASE WHEN ${activityEvents.feature} = 'video_generation' AND ${activityEvents.status} = 'succeeded' THEN 1 END)`,
      upscaleAttempts: sql<number>`COUNT(CASE WHEN ${activityEvents.feature} = 'upscale' THEN 1 END)`,
      upscaleSuccesses: sql<number>`COUNT(CASE WHEN ${activityEvents.feature} = 'upscale' AND ${activityEvents.status} = 'succeeded' THEN 1 END)`,
      totalErrors: sql<number>`COUNT(CASE WHEN ${activityEvents.status} = 'failed' THEN 1 END)`,
      avgImageLatency: sql<number>`AVG(CASE WHEN ${activityEvents.feature} IN ('image_creation', 'image_editing', 'car_generation', 'batch_car_generation') AND ${activityEvents.status} = 'succeeded' AND ${activityEvents.duration} IS NOT NULL THEN ${activityEvents.duration} END)`,
      avgVideoLatency: sql<number>`AVG(CASE WHEN ${activityEvents.feature} = 'video_generation' AND ${activityEvents.status} = 'succeeded' AND ${activityEvents.duration} IS NOT NULL THEN ${activityEvents.duration} END)`,
      avgUpscaleLatency: sql<number>`AVG(CASE WHEN ${activityEvents.feature} = 'upscale' AND ${activityEvents.status} = 'succeeded' AND ${activityEvents.duration} IS NOT NULL THEN ${activityEvents.duration} END)`,
      p95ImageLatency: sql<number>`PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY CASE WHEN ${activityEvents.feature} IN ('image_creation', 'image_editing', 'car_generation', 'batch_car_generation') AND ${activityEvents.status} = 'succeeded' AND ${activityEvents.duration} IS NOT NULL THEN ${activityEvents.duration} END)`,
      p95VideoLatency: sql<number>`PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY CASE WHEN ${activityEvents.feature} = 'video_generation' AND ${activityEvents.status} = 'succeeded' AND ${activityEvents.duration} IS NOT NULL THEN ${activityEvents.duration} END)`
    })
    .from(activityEvents)
    .where(eventWhereClause);

  const metrics = generationMetrics[0];
  console.log('Generation metrics raw result:', metrics);
  const imageAttempts = Number(metrics?.imageAttempts || 0);
  const imageSuccesses = Number(metrics?.imageSuccesses || 0);
  const videoAttempts = Number(metrics?.videoAttempts || 0);
  const videoSuccesses = Number(metrics?.videoSuccesses || 0);
  const upscaleAttempts = Number(metrics?.upscaleAttempts || 0);
  const upscaleSuccesses = Number(metrics?.upscaleSuccesses || 0);
  
  const totalAttempts = imageAttempts + videoAttempts + upscaleAttempts;
  const totalSuccesses = imageSuccesses + videoSuccesses + upscaleSuccesses;
  const contentSuccessRate = totalAttempts > 0 ? (totalSuccesses / totalAttempts) * 100 : 0;

  // Get MAU for stickiness calculation (last 30 days from dateTo)
  const mauStartDate = new Date(dateTo);
  mauStartDate.setDate(mauStartDate.getDate() - 30);
  
  const mauResult = await db
    .select({ 
      count: sql`COUNT(DISTINCT ${activityEvents.userId})` 
    })
    .from(activityEvents)
    .where(and(
      eq(activityEvents.environment, environment),
      gte(activityEvents.createdAt, mauStartDate),
      lte(activityEvents.createdAt, dateTo),
      ...(filteredUserIds ? [inArray(activityEvents.userId, filteredUserIds)] : [])
    ));
  
  const mau = Number(mauResult[0]?.count || 0);
  const stickiness = mau > 0 ? (dau / mau) * 100 : 0;

  // Top error codes
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

  // Model usage distribution - track all generation types
  const modelUsage = await db
    .select({
      model: activityEvents.model,
      count: sql<number>`COUNT(*)`
    })
    .from(activityEvents)
    .where(and(
      eq(activityEvents.environment, environment),
      gte(activityEvents.createdAt, dateFrom),
      lte(activityEvents.createdAt, dateTo),
      sql`${activityEvents.status} = 'succeeded'`,
      isNotNull(activityEvents.model)
    ))
    .groupBy(activityEvents.model)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(15); // Show more models

  return {
    featureUsageTrends: featureUsageTrends.map(t => ({
      date: t.date,
      imageCreation: Number(t.imageCreation),
      imageEditing: Number(t.imageEditing),
      carGeneration: Number(t.carGeneration),
      batchCarGeneration: Number(t.batchCarGeneration),
      upscale: Number(t.upscale),
      videoGeneration: Number(t.videoGeneration)
    })),
    modelUsage: modelUsage.map(m => ({
      model: m.model || 'Unknown',
      count: Number(m.count)
    }))
  };
}