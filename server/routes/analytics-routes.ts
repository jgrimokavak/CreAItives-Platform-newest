import express from 'express';
import { getKPIs, getTrends, getModelUsage, getFeatureUsage } from '../analytics';
import { isAuthenticated } from '../replitAuth';

// Helper to parse dates - frontend now sends full ISO strings
const parseDate = (dateStr: string): Date => {
  return new Date(dateStr);
};

const router = express.Router();

// Get KPIs endpoint
router.get('/kpis', isAuthenticated, async (req: any, res) => {
  const routeId = `route_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  const startTime = Date.now();
  console.log(`[🚀 ROUTE START ${routeId}] /api/admin/analytics/kpis called by user: ${req.user?.claims?.sub}`);
  try {
    const { dateFrom, dateTo, roleFilter, statusFilter, domainFilter, activatedFilter } = req.query;
    
    if (!dateFrom || !dateTo) {
      return res.status(400).json({ message: 'dateFrom and dateTo are required' });
    }
    
    // Parse dates from frontend (now includes proper time boundaries)
    const from = parseDate(dateFrom as string);
    const to = parseDate(dateTo as string);
    
    console.log(`[Analytics Route] KPIs Date parsing - Input: ${dateFrom} to ${dateTo}`);
    console.log(`[Analytics Route] KPIs Date parsing - Parsed: ${from.toISOString()} to ${to.toISOString()}`);
    
    const filters = {
      roleFilter: roleFilter as string,
      statusFilter: statusFilter as string,
      domainFilter: domainFilter as string,
      activatedFilter: activatedFilter as string
    };
    
    console.log(`[📈 ROUTE ${routeId}] Getting CURRENT period KPIs...`);
    const kpis = await getKPIs(from, to, filters);
    
    // Calculate comparison period for deltas
    const daysDiff = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    const prevFrom = new Date(from);
    prevFrom.setDate(prevFrom.getDate() - daysDiff);
    const prevTo = new Date(from);
    prevTo.setDate(prevTo.getDate() - 1);
    prevTo.setHours(23, 59, 59, 999);
    
    console.log(`[📉 ROUTE ${routeId}] Getting PREVIOUS period KPIs (DUPLICATE WORK)...`);
    const prevKpis = await getKPIs(prevFrom, prevTo, filters);
    
    // Calculate deltas
    const calculateDelta = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };
    
    const routeTime = Date.now() - startTime;
    console.log(`[✅ ROUTE DONE ${routeId}] KPIs endpoint completed in ${routeTime}ms | Sent DAU: ${kpis.dau}, Success Rate: ${kpis.contentSuccessRate}%`);
    
    res.json({
      current: kpis,
      previous: prevKpis,
      deltas: {
        dau: calculateDelta(kpis.dau, prevKpis.dau),
        mau: calculateDelta(kpis.mau, prevKpis.mau),
        newUsers: calculateDelta(kpis.newUsers, prevKpis.newUsers),
        activationRate: kpis.activationRate - prevKpis.activationRate,
        stickiness: kpis.stickiness - prevKpis.stickiness,
        imageSuccesses: calculateDelta(kpis.imageSuccesses, prevKpis.imageSuccesses),
        videoSuccesses: calculateDelta(kpis.videoSuccesses, prevKpis.videoSuccesses),
        upscaleSuccesses: calculateDelta(kpis.upscaleSuccesses, prevKpis.upscaleSuccesses),
        contentSuccessRate: kpis.contentSuccessRate - prevKpis.contentSuccessRate
      }
    });
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    res.status(500).json({ message: 'Failed to fetch KPIs' });
  }
});

// Get trends endpoint
router.get('/trends', isAuthenticated, async (req, res) => {
  try {
    const { dateFrom, dateTo, interval = 'day', roleFilter, statusFilter, domainFilter, activatedFilter } = req.query;
    
    if (!dateFrom || !dateTo) {
      return res.status(400).json({ message: 'dateFrom and dateTo are required' });
    }
    
    // Parse dates from frontend (now includes proper time boundaries)
    const from = parseDate(dateFrom as string);
    const to = parseDate(dateTo as string);
    
    console.log(`[Analytics Route] Trends Date parsing - Input: ${dateFrom} to ${dateTo}`);
    console.log(`[Analytics Route] Trends Date parsing - Parsed: ${from.toISOString()} to ${to.toISOString()}`);
    
    const filters = {
      roleFilter: roleFilter as string,
      statusFilter: statusFilter as string,
      domainFilter: domainFilter as string,
      activatedFilter: activatedFilter as string
    };
    
    const trends = await getTrends(from, to, interval as 'day' | 'week', filters);
    const modelUsage = await getModelUsage(from, to, filters);
    const featureUsage = await getFeatureUsage(from, to, filters);
    
    res.json({
      featureUsageTrends: trends.featureUsageTrends || [],
      modelUsageTrends: [],
      errorRateTrend: [],
      latencyTrend: [],
      modelUsage: modelUsage || [],
      featureUsage: featureUsage || []
    });
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ message: 'Failed to fetch trends' });
  }
});

export default router;