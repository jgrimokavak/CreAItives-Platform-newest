import express from 'express';
import { getKPIs, getKPIsWithComparison, getTrends, getModelUsage, getFeatureUsage } from '../analytics';
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
    
    // Calculate comparison period for deltas
    const daysDiff = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    const prevFrom = new Date(from);
    prevFrom.setDate(prevFrom.getDate() - daysDiff);
    const prevTo = new Date(from);
    prevTo.setDate(prevTo.getDate() - 1);
    prevTo.setHours(23, 59, 59, 999);
    
    // OPTIMIZED: Single call for both periods instead of two separate calls
    const result = await getKPIsWithComparison(from, to, prevFrom, prevTo, filters);
    
    const routeTime = Date.now() - startTime;
    
    res.json(result);
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