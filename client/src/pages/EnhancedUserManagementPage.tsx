import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Activity, 
  Clock, 
  UserCheck, 
  TrendingUp, 
  BarChart3, 
  Eye, 
  Calendar,
  Download,
  Settings
} from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';

// Import all new admin components
import UsersDataTable from '@/components/admin/UsersDataTable';
import UserDrawer from '@/components/admin/UserDrawer';
import BulkActionsBar from '@/components/admin/BulkActionsBar';
import ExportDialog from '@/components/admin/ExportDialog';
import GlobalControlsPanel from '@/components/admin/GlobalControlsPanel';

interface EnhancedUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  isActive: boolean;
  role: string;
  lastLoginAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  domain: string;
  imageCount: number;
  videoCount: number;
  projectCount: number;
  isActivated: boolean;
}

export default function EnhancedUserManagementPage() {
  const { user: currentUser } = useAuth();
  
  // Global filters state
  const [globalFilters, setGlobalFilters] = useState<{
    dateFrom?: Date;
    dateTo?: Date;
    roleFilter?: string;
    statusFilter?: string;
    domainFilter?: string;
    activatedFilter?: string;
  }>({});
  
  // Selection and UI state
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<EnhancedUser | null>(null);
  const [isUserDrawerOpen, setIsUserDrawerOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  // Statistics query (same as original)
  const { data: statistics } = useQuery<{
    totalUsers: number;
    activeUsers: number;
    adminUsers: number;
    recentLogins: number;
    onlineUsers: number;
  }>({
    queryKey: ['/api/admin/users/statistics'],
    retry: false,
  });

  // Enhanced analytics queries (same as original)
  const { data: userTrends } = useQuery<Array<{
    date: string;
    totalUsers: number;
  }>>({
    queryKey: ['/api/admin/analytics/user-trends'],
    retry: false,
  });

  const { data: dailyActivity } = useQuery<Array<{
    date: string;
    create: number;
    car: number;
    video: number;
    gallery: number;
    email: number;
    admin: number;
  }>>({
    queryKey: ['/api/admin/analytics/daily-activity'],
    retry: false,
  });

  // Handlers - memoized to prevent infinite re-renders
  const handleUserSelect = useCallback((user: EnhancedUser) => {
    setSelectedUser(user);
    setIsUserDrawerOpen(true);
  }, []);

  const handleSelectionChange = useCallback((selectedIds: string[]) => {
    setSelectedUserIds(selectedIds);
  }, []);

  const handleFiltersChange = useCallback((filters: typeof globalFilters) => {
    setGlobalFilters(filters);
  }, []);

  const handleExportClick = useCallback(() => {
    setIsExportDialogOpen(true);
  }, []);

  // Current filters for export
  const currentFilters = useMemo(() => ({
    ...globalFilters,
  }), [globalFilters]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Comprehensive user administration with analytics and audit logging
          </p>
        </div>
        
        <Button variant="outline" onClick={handleExportClick}>
          <Download className="w-4 h-4 mr-2" />
          Export Users
        </Button>
      </div>

      {/* Statistics Dashboard - Enhanced version */}
      {statistics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                Registered platform users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.activeUsers}</div>
              <p className="text-xs text-muted-foreground">
                Currently enabled accounts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Administrators</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.adminUsers}</div>
              <p className="text-xs text-muted-foreground">
                Admin role users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Logins</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.recentLogins}</div>
              <p className="text-xs text-muted-foreground">
                Last 7 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Online Now</CardTitle>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{statistics.onlineUsers}</div>
              <p className="text-xs text-muted-foreground">
                Active last 10 minutes
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Global Controls Panel */}
        <div className="lg:col-span-1">
          <GlobalControlsPanel 
            onFiltersChange={handleFiltersChange}
            initialFilters={globalFilters}
          />
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Bulk Actions Bar */}
          {selectedUserIds.length > 0 && (
            <BulkActionsBar 
              selectedIds={selectedUserIds}
              onClearSelection={() => setSelectedUserIds([])}
            />
          )}

          {/* Enhanced Users Data Table */}
          <UsersDataTable 
            onUserSelect={handleUserSelect}
            onSelectionChange={handleSelectionChange}
            selectedIds={selectedUserIds}
            globalFilters={globalFilters}
          />
        </div>
      </div>

      {/* Analytics Charts - Enhanced version */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* User Growth Trends */}
        {userTrends && userTrends.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <span>Total User Growth</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={userTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="totalUsers" 
                    stroke="#8884d8" 
                    fill="#8884d8" 
                    fillOpacity={0.3}
                    name="Total Users"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Route-Based Daily Activity */}
        {dailyActivity && dailyActivity.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-blue-500" />
                <span>Daily Platform Activity by Route</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  />
                  <Bar dataKey="create" stackId="a" fill="#8884d8" name="/create" />
                  <Bar dataKey="car" stackId="a" fill="#82ca9d" name="/car" />
                  <Bar dataKey="video" stackId="a" fill="#ffc658" name="/video" />
                  <Bar dataKey="gallery" stackId="a" fill="#ff7300" name="/gallery" />
                  <Bar dataKey="email" stackId="a" fill="#8dd1e1" name="/email" />
                  <Bar dataKey="admin" stackId="a" fill="#d084d0" name="/admin" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* User Details Drawer */}
      <UserDrawer 
        user={selectedUser}
        isOpen={isUserDrawerOpen}
        onClose={() => {
          setIsUserDrawerOpen(false);
          setSelectedUser(null);
        }}
      />

      {/* Export Dialog */}
      <ExportDialog 
        selectedIds={selectedUserIds}
        currentFilters={currentFilters}
        isOpen={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
      />
    </div>
  );
}