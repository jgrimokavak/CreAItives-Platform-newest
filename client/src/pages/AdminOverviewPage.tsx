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

  // Calculate date ranges based on selection
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
    
    return {
      dateFrom: from.toISOString().split('T')[0],
      dateTo: to.toISOString().split('T')[0]
    };
  }, [dateRange]);

  // Fetch KPIs
  const { data: kpiData, isLoading: kpiLoading } = useQuery({
    queryKey: ['/api/admin/analytics/kpis', dateFrom, dateTo, globalFilters],
    queryFn: async () => {
      const params = new URLSearchParams({
        dateFrom,
        dateTo,
        ...globalFilters
      });
      const response = await fetch(`/api/admin/analytics/kpis?${params}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch KPIs');
      return response.json();
    },
  });

  // Fetch trends
  const { data: trendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ['/api/admin/analytics/trends', dateFrom, dateTo, globalFilters],
    queryFn: async () => {
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
      return response.json();
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
            onValueChange={(value) => setGlobalFilters(prev => ({ ...prev, roleFilter: value }))}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Daily Active Users"
          value={kpiData?.current?.dau || 0}
          delta={kpiData?.deltas?.dau}
          icon={<Users className="w-4 h-4 text-blue-600" />}
          tooltip="Unique users who performed any action in the selected period"
        />
        
        <KPICard
          title="Activation Rate"
          value={kpiData?.current?.activationRate || 0}
          delta={kpiData?.deltas?.activationRate}
          icon={<Target className="w-4 h-4 text-green-600" />}
          tooltip="Percentage of new users who generated content within 7 days of signup"
          format="percentage"
        />
        
        <KPICard
          title="Content Success Rate"
          value={kpiData?.current?.contentSuccessRate || 0}
          delta={kpiData?.deltas?.contentSuccessRate}
          icon={<TrendingUp className="w-4 h-4 text-purple-600" />}
          tooltip="Percentage of content generation attempts that succeeded"
          format="percentage"
        />
        
        <KPICard
          title="User Stickiness"
          value={kpiData?.current?.stickiness || 0}
          delta={kpiData?.deltas?.stickiness}
          icon={<Zap className="w-4 h-4 text-orange-600" />}
          tooltip="DAU/MAU ratio - measures how frequently users return"
          format="percentage"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              User Activity Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendsData?.activityTrends || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="activeUsers" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  name="Active Users"
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
              <BarChart data={trendsData?.activityTrends || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="imageGenerations" fill="#8884d8" name="Images" />
                <Bar dataKey="videoGenerations" fill="#82ca9d" name="Videos" />
                <Bar dataKey="projectsCreated" fill="#ffc658" name="Projects" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Avg Image Latency</span>
              <Badge variant="outline">{kpiData?.current?.avgImageLatency || 0}ms</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">P95 Image Latency</span>
              <Badge variant="outline">{kpiData?.current?.p95ImageLatency || 0}ms</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Avg Video Latency</span>
              <Badge variant="outline">{kpiData?.current?.avgVideoLatency || 0}ms</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">P95 Video Latency</span>
              <Badge variant="outline">{kpiData?.current?.p95VideoLatency || 0}ms</Badge>
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
                  dataKey="count"
                  label={({ model }) => model}
                >
                  {(trendsData?.modelUsage || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Error Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Error Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Errors</span>
              <Badge variant="destructive">{kpiData?.current?.totalErrors || 0}</Badge>
            </div>
            {(kpiData?.current?.topErrors || []).slice(0, 3).map((error, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground truncate">
                  {isPIIRevealed ? error.code : 'REDACTED'}
                </span>
                <Badge variant="outline">{error.count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}