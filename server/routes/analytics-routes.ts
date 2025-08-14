import express from 'express';
import { getKPIs, getTrends, getModelUsage, getFeatureUsage } from '../analytics';
import { isAuthenticated } from '../replitAuth';

// Helper to parse dates to include full day range
const parseArgentinaDate = (dateStr: string, endOfDay: boolean = false): Date => {
  // For end of day, add 1 day to ensure we capture everything
  if (endOfDay) {
    const date = new Date(`${dateStr}T00:00:00`);
    date.setDate(date.getDate() + 1); // Move to next day midnight
    date.setSeconds(date.getSeconds() - 1); // Back up 1 second to 23:59:59
    return date;
  } else {
    return new Date(`${dateStr}T00:00:00`);
  }
};

const router = express.Router();

// Get KPIs endpoint
router.get('/kpis', isAuthenticated, async (req: any, res) => {
  console.log(`[Analytics Route] KPIs endpoint called by user: ${req.user?.claims?.sub}`);
  try {
    const { dateFrom, dateTo, roleFilter, statusFilter, domainFilter, activatedFilter } = req.query;
    
    if (!dateFrom || !dateTo) {
      return res.status(400).json({ message: 'dateFrom and dateTo are required' });
    }
    
    // Parse dates in Argentina timezone (UTC-3)
    const from = parseArgentinaDate(dateFrom as string, false);
    const to = parseArgentinaDate(dateTo as string, true);
    
    console.log(`[Analytics Route] KPIs Date parsing - Input: ${dateFrom} to ${dateTo}`);
    console.log(`[Analytics Route] KPIs Date parsing - Parsed (Argentina time): ${from.toISOString()} to ${to.toISOString()}`);
    
    const filters = {
      roleFilter: roleFilter as string,
      statusFilter: statusFilter as string,
      domainFilter: domainFilter as string,
      activatedFilter: activatedFilter as string
    };
    
    const kpis = await getKPIs(from, to, filters);
    
    // Calculate comparison period for deltas
    const daysDiff = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    const prevFrom = new Date(from);
    prevFrom.setDate(prevFrom.getDate() - daysDiff);
    const prevTo = new Date(from);
    prevTo.setDate(prevTo.getDate() - 1);
    prevTo.setHours(23, 59, 59, 999);
    
    const prevKpis = await getKPIs(prevFrom, prevTo, filters);
    
    // Calculate deltas
    const calculateDelta = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };
    
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
    
    // Parse dates in Argentina timezone (UTC-3)
    const from = parseArgentinaDate(dateFrom as string, false);
    const to = parseArgentinaDate(dateTo as string, true);
    
    console.log(`[Analytics Route] Trends Date parsing - Input: ${dateFrom} to ${dateTo}`);
    console.log(`[Analytics Route] Trends Date parsing - Parsed (Argentina time): ${from.toISOString()} to ${to.toISOString()}`);
    
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