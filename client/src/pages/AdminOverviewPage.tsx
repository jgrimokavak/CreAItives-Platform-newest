import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  CalendarDays,
  Calendar,
  Users,
  TrendingUp,
  Activity,
  Target,
  Zap,
  Clock,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface KPICardProps {
  title: string;
  value: string | number;
  delta?: number;
  icon: React.ReactNode;
  tooltip: string;
  format?: 'number' | 'percentage' | 'duration';
}

function KPICard({ title, value, delta, icon, tooltip, format = 'number' }: KPICardProps) {
  const formatValue = (val: string | number) => {
    if (format === 'percentage') return `${val}%`;
    if (format === 'duration') return `${val}ms`;
    if (typeof val === 'number') return val.toLocaleString();
    return val;
  };

  const getDeltaColor = (delta: number) => {
    if (delta > 0) return 'text-green-600';
    if (delta < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  const getDeltaIcon = (delta: number) => {
    if (delta > 0) return <ChevronUp className="w-3 h-3" />;
    if (delta < 0) return <ChevronDown className="w-3 h-3" />;
    return null;
  };

  return (
    <Card className="relative">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(value)}</div>
        {delta !== undefined && (
          <div className={`text-xs flex items-center ${getDeltaColor(delta)} mt-1`}>
            {getDeltaIcon(delta)}
            <span>{delta > 0 ? '+' : ''}{delta}% vs prev period</span>
          </div>
        )}
        <div className="text-xs text-muted-foreground mt-1" title={tooltip}>
          {tooltip}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminOverviewPage() {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [isPIIRevealed, setIsPIIRevealed] = useState(false);
  const [globalFilters, setGlobalFilters] = useState({
    roleFilter: 'all',
    statusFilter: 'all',
    domainFilter: '',
    activatedFilter: 'all'
  });


  // Calculate date ranges - fix end date to include full day
  const { dateFrom, dateTo } = useMemo(() => {
    const to = new Date();
    const from = new Date();
    
    switch (dateRange) {
      case '7d':
        from.setDate(from.getDate() - 7);
        break;
      case '30d':
        from.setDate(from.getDate() - 30);
        break;
      case '90d':
        from.setDate(from.getDate() - 90);
        break;
    }
    
    // CRITICAL: Format with proper time boundaries
    const formatStartDate = (date: Date) => {
      return date.toISOString().split('T')[0] + 'T00:00:00.000Z';
    };
    
    const formatEndDate = (date: Date) => {
      return date.toISOString().split('T')[0] + 'T23:59:59.999Z';
    };
    
    return {
      dateFrom: formatStartDate(from),
      dateTo: formatEndDate(to)
    };
  }, [dateRange]);

  // Fetch KPIs
  const { data: kpiData, isLoading: kpiLoading } = useQuery({
    queryKey: ['/api/admin/analytics/kpis', dateFrom, dateTo, globalFilters],
    queryFn: async () => {
      const startTime = Date.now();
      
      const params = new URLSearchParams({
        dateFrom,
        dateTo,
        ...globalFilters
      });
      const response = await fetch(`/api/admin/analytics/kpis?${params}`, {
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to fetch KPIs');
      const data = await response.json();
      return data;
    },
  });

  // Fetch trends
  const { data: trendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ['/api/admin/analytics/trends', dateFrom, dateTo, globalFilters],
    queryFn: async () => {
      const startTime = Date.now();
      
      const params = new URLSearchParams({
        dateFrom,
        dateTo,
        interval: dateRange === '7d' ? 'day' : 'day',
        ...globalFilters
      });
      const response = await fetch(`/api/admin/analytics/trends?${params}`, {
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to fetch trends');
      const data = await response.json();
      return data;
    },
  });

  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

  if (kpiLoading || trendsLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }


  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Analytics Overview</h1>
          <p className="text-muted-foreground">Platform performance and user engagement insights</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* PII Reveal Toggle (Admin only) */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPIIRevealed(!isPIIRevealed)}
            className="flex items-center gap-2"
          >
            {isPIIRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {isPIIRevealed ? 'Hide Details' : 'Show Details'}
          </Button>
          
          {/* Date Range Selector */}
          <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Global Filters */}
      <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Role:</label>
          <Select 
            value={globalFilters.roleFilter} 
            onValueChange={(value) => {
              setGlobalFilters(prev => ({ ...prev, roleFilter: value }));
            }}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Status:</label>
          <Select 
            value={globalFilters.statusFilter} 
            onValueChange={(value) => setGlobalFilters(prev => ({ ...prev, statusFilter: value }))}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Activation:</label>
          <Select 
            value={globalFilters.activatedFilter} 
            onValueChange={(value) => setGlobalFilters(prev => ({ ...prev, activatedFilter: value }))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="activated">Activated</SelectItem>
              <SelectItem value="not_activated">Not Activated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!isPIIRevealed && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <EyeOff className="w-3 h-3" />
            PII Redacted
          </Badge>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Images Generated"
          value={kpiData?.current?.imageSuccesses || 0}
          delta={kpiData?.deltas?.imageSuccesses}
          icon={<Target className="w-4 h-4 text-blue-600" />}
          tooltip="Successfully generated images (including car generation and editing)"
        />
        
        <KPICard
          title="Videos Created"
          value={kpiData?.current?.videoSuccesses || 0}
          delta={kpiData?.deltas?.videoSuccesses}
          icon={<Calendar className="w-4 h-4 text-green-600" />}
          tooltip="Successfully generated videos"
        />
        
        <KPICard
          title="Upscales Completed"
          value={kpiData?.current?.upscaleSuccesses || 0}
          delta={kpiData?.deltas?.upscaleSuccesses}
          icon={<TrendingUp className="w-4 h-4 text-purple-600" />}
          tooltip="Successfully upscaled images"
        />
        
        <KPICard
          title="Success Rate"
          value={kpiData?.current?.contentSuccessRate || 0}
          delta={kpiData?.deltas?.contentSuccessRate}
          icon={<Zap className="w-4 h-4 text-orange-600" />}
          tooltip="Percentage of all content generation attempts that succeeded"
          format="percentage"
        />
        
        <KPICard
          title="Active Users"
          value={kpiData?.current?.dau || 0}
          delta={kpiData?.deltas?.dau}
          icon={<Users className="w-4 h-4 text-cyan-600" />}
          tooltip="Users who generated content today"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Content Production Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Content Production Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendsData?.featureUsageTrends || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="imageCreation" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  name="Image Creation"
                />
                <Line 
                  type="monotone" 
                  dataKey="videoGeneration" 
                  stroke="#82ca9d" 
                  strokeWidth={2}
                  name="Video Generation"
                />
                <Line 
                  type="monotone" 
                  dataKey="carGeneration" 
                  stroke="#ffc658" 
                  strokeWidth={2}
                  name="Car Generation"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Feature Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              Feature Usage Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trendsData?.featureUsageTrends || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="imageCreation" fill="#8884d8" name="Image Creation" />
                <Bar dataKey="imageEditing" fill="#ffc658" name="Image Editing" />
                <Bar dataKey="carGeneration" fill="#82ca9d" name="Car Generation" />
                <Bar dataKey="batchCarGeneration" fill="#d084d0" name="Batch Car Generation" />
                <Bar dataKey="upscale" fill="#ff9999" name="Upscale" />
                <Bar dataKey="videoGeneration" fill="#66b3ff" name="Video Generation" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Content Volume */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Content Volume
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Images */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-blue-700">Images</span>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-blue-50">{kpiData?.current?.imageAttempts || 0} attempts</Badge>
                  <Badge variant="default" className="bg-blue-600">{kpiData?.current?.imageSuccesses || 0} success</Badge>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ 
                    width: `${kpiData?.current?.imageAttempts ? ((kpiData?.current?.imageSuccesses || 0) / kpiData?.current?.imageAttempts) * 100 : 0}%` 
                  }}
                />
              </div>
            </div>

            {/* Videos */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-green-700">Videos</span>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-green-50">{kpiData?.current?.videoAttempts || 0} attempts</Badge>
                  <Badge variant="default" className="bg-green-600">{kpiData?.current?.videoSuccesses || 0} success</Badge>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ 
                    width: `${kpiData?.current?.videoAttempts ? ((kpiData?.current?.videoSuccesses || 0) / kpiData?.current?.videoAttempts) * 100 : 0}%` 
                  }}
                />
              </div>
            </div>

            {/* Upscales */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-purple-700">Upscales</span>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-purple-50">{kpiData?.current?.upscaleAttempts || 0} attempts</Badge>
                  <Badge variant="default" className="bg-purple-600">{kpiData?.current?.upscaleSuccesses || 0} success</Badge>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full" 
                  style={{ 
                    width: `${kpiData?.current?.upscaleAttempts ? ((kpiData?.current?.upscaleSuccesses || 0) / kpiData?.current?.upscaleAttempts) * 100 : 0}%` 
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Model Usage Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Top Models Used
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={trendsData?.modelUsage?.slice(0, 5) || []}
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  fill="#8884d8"
                  dataKey="total"
                  label={({ model, total }) => {
                    // Shorten long model names for display and show count
                    let displayName = model;
                    if (model === 'imagen-4') displayName = 'Imagen-4';
                    else if (model === 'upscale') displayName = 'Upscale';
                    else if (model === 'hailuo-02') displayName = 'Hailuo';
                    else if (model === 'flux-kontext-max') displayName = 'Flux-Kontext';
                    else if (model?.length > 12) displayName = model.substring(0, 12) + '...';
                    return `${total}`;
                  }}
                >
                  {(trendsData?.modelUsage || []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any, name: any, props: any) => {
                    // Show usage count and model name
                    const modelName = props?.payload?.model;
                    const displayName = modelName === 'imagen-4' ? 'Imagen-4' :
                                       modelName === 'upscale' ? 'Upscale' :
                                       modelName === 'hailuo-02' ? 'Hailuo Video' :
                                       modelName === 'flux-kontext-max' ? 'Flux Kontext' :
                                       modelName;
                    return [`${value} uses`, displayName];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Error Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Error Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Overall Error Rate */}
            <div className="bg-red-50 p-3 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-red-800">Total Failures</span>
                <Badge variant="destructive">{kpiData?.current?.totalErrors || 0}</Badge>
              </div>
              <div className="text-xs text-red-600">
                {kpiData?.current?.totalErrors 
                  ? `${((kpiData.current.totalErrors / (kpiData.current.totalErrors + kpiData.current.imageSuccesses + kpiData.current.videoSuccesses + kpiData.current.upscaleSuccesses)) * 100).toFixed(1)}% failure rate`
                  : 'No failures detected'}
              </div>
            </div>

            {/* Error Breakdown */}
            {(kpiData?.current?.topErrors || []).length > 0 ? (
              <div className="space-y-2">
                <span className="text-sm font-medium">Common Issues:</span>
                {(kpiData?.current?.topErrors || []).slice(0, 3).map((error: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <div className="flex-1">
                      <span className="text-xs font-mono text-gray-700">
                        {error.code?.includes('Unsupported image type') 
                          ? 'Unsupported Format' 
                          : error.code?.includes('timeout')
                          ? 'Request Timeout'
                          : error.code?.includes('quota')
                          ? 'API Quota Exceeded' 
                          : error.code?.substring(0, 25) || 'Processing Error'}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">
                        {error.code?.includes('webp') && 'WEBP format not supported for upscaling'}
                        {error.code?.includes('timeout') && 'Request took too long to process'}
                        {error.code?.includes('quota') && 'Daily API limit reached'}
                      </div>
                    </div>
                    <Badge variant="outline" className="ml-2">{error.count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-4 text-gray-500 text-sm">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-green-600 text-lg">✓</span>
                </div>
                No errors in selected period
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}