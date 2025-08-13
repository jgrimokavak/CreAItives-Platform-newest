import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Shield, User as UserIcon, ToggleLeft, ToggleRight, Search, Download, Users, Activity, Clock, UserCheck, TrendingUp, BarChart3, Eye, Calendar } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart, Line, Legend } from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import type { User } from '@shared/schema';

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Search and filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin'>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'lastLoginAt' | 'email' | 'firstName'>('lastLoginAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // AdminRoute component already handles access control, so we can assume user is admin here

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users', { search, statusFilter, roleFilter, sortBy, sortOrder }],
    queryFn: () => apiRequest(`/api/admin/users?search=${encodeURIComponent(search)}&statusFilter=${statusFilter}&roleFilter=${roleFilter}&sortBy=${sortBy}&sortOrder=${sortOrder}`),
    retry: false,
  });

  const { data: statistics } = useQuery<{
    totalUsers: number;
    activeUsers: number;
    adminUsers: number;
    recentLogins: number;
  }>({
    queryKey: ['/api/admin/users/statistics'],
    retry: false,
  });

  // Enhanced analytics queries
  const { data: userTrends } = useQuery<Array<{
    date: string;
    newUsers: number;
    totalUsers: number;
  }>>({
    queryKey: ['/api/admin/analytics/user-trends'],
    retry: false,
  });

  const { data: pageAnalytics } = useQuery<Array<{
    feature: string;
    count: number;
    percentage: number;
    category: string;
  }>>({
    queryKey: ['/api/admin/analytics/page-usage'],
    retry: false,
  });

  const { data: recentActivity } = useQuery<Array<{
    user: string;
    action: string;
    time: string;
    details: string;
  }>>({
    queryKey: ['/api/admin/analytics/recent-activity'],
    retry: false,
  });

  const { data: dailyActivity } = useQuery<Array<{
    date: string;
    images: number;
    videos: number;
    projects: number;
    activeUsers: number;
  }>>({
    queryKey: ['/api/admin/analytics/daily-activity'],
    retry: false,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      return await apiRequest(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/statistics'] });
      toast({
        title: "User Updated",
        description: "User status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user status",
        variant: "destructive",
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'user' | 'admin' }) => {
      return await apiRequest(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/statistics'] });
      toast({
        title: "User Updated",
        description: "User role updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  const toggleUserStatus = (userId: string, currentStatus: boolean) => {
    updateStatusMutation.mutate({ userId, isActive: !currentStatus });
  };

  const toggleUserRole = (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  const formatUserDate = (date: string | Date | null) => {
    if (!date) return 'Never';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-GB'); // dd/mm/yyyy format
  };

  const getInitials = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return (user.email || '').substring(0, 2).toUpperCase();
  };

  const getDisplayName = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.email || 'Unknown User';
  };

  const handleExport = () => {
    const exportUrl = `/api/admin/users/export?search=${encodeURIComponent(search)}&statusFilter=${statusFilter}&roleFilter=${roleFilter}&sortBy=${sortBy}&sortOrder=${sortOrder}`;
    window.open(exportUrl, '_blank');
  };

  // Chart colors
  const chartColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB'); // dd/mm/yyyy format
  };

  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr);
    return date.toLocaleString('en-GB', { 
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getActivityLevel = (lastLogin: Date | null) => {
    if (!lastLogin) return 'never';
    const now = new Date();
    const diffHours = (now.getTime() - new Date(lastLogin).getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 24) return 'recent';
    if (diffHours < 168) return 'week'; // 7 days
    if (diffHours < 720) return 'month'; // 30 days
    return 'old';
  };

  if (isLoading) {
    return (
      <div className="space-y-6 px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold">User Management</h1>
        </div>
        <div className="text-center py-8">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">User Management</h1>
        <Button 
          onClick={handleExport}
          variant="outline" 
          size="sm"
          className="w-full sm:w-auto"
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Statistics Dashboard */}
      {statistics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{statistics.totalUsers}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <UserCheck className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{statistics.activeUsers}</p>
                <p className="text-sm text-muted-foreground">Active Users</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{statistics.adminUsers}</p>
                <p className="text-sm text-muted-foreground">Admin Users</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{statistics.recentLogins}</p>
                <p className="text-sm text-muted-foreground">Recent Logins</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Enhanced Analytics Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Trends */}
        {userTrends && (
          <Card className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-semibold">User Growth Trends</h3>
            </div>
            <div style={{ width: '100%', height: '250px' }}>
              <ResponsiveContainer>
                <AreaChart data={userTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    interval="preserveStartEnd"
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={formatDate}
                    formatter={(value: number, name: string) => [value, name === 'newUsers' ? 'New Users' : 'Total Users']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="newUsers" 
                    stackId="1"
                    stroke="#3B82F6" 
                    fill="#3B82F6"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* Daily Activity Overview */}
        {dailyActivity && (
          <Card className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Calendar className="w-5 h-5 text-purple-500" />
              <h3 className="text-lg font-semibold">Daily Platform Activity</h3>
            </div>
            <div style={{ width: '100%', height: '250px' }}>
              <ResponsiveContainer>
                <ComposedChart data={dailyActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatDate} />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    labelFormatter={formatDate}
                    formatter={(value: number, name: string) => {
                      const nameMap = {
                        images: 'Images Generated',
                        videos: 'Videos Generated', 
                        projects: 'Projects Created',
                        activeUsers: 'Active Users'
                      };
                      return [value, nameMap[name as keyof typeof nameMap] || name];
                    }}
                  />
                  <Bar yAxisId="left" dataKey="images" fill="#3B82F6" name="images" />
                  <Bar yAxisId="left" dataKey="videos" fill="#10B981" name="videos" />
                  <Bar yAxisId="left" dataKey="projects" fill="#F59E0B" name="projects" />
                  <Line yAxisId="right" type="monotone" dataKey="activeUsers" stroke="#EF4444" strokeWidth={2} name="activeUsers" />
                  <Legend />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Comprehensive Feature Usage */}
        {pageAnalytics && (
          <Card className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <BarChart3 className="w-5 h-5 text-green-500" />
              <h3 className="text-lg font-semibold">Platform Capabilities Usage</h3>
            </div>
            <div style={{ width: '100%', height: '300px' }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pageAnalytics}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="count"
                    nameKey="feature"
                    label={({ feature, count, percentage }) => `${percentage}%`}
                  >
                    {pageAnalytics.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string, props: any) => [
                      `${value} uses (${props.payload.percentage}%)`, 
                      `${props.payload.category}: ${name}`
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-3">
              {Object.entries(
                pageAnalytics.reduce((acc: any, feature: any) => {
                  const category = feature.category;
                  if (!acc[category]) acc[category] = [];
                  acc[category].push(feature);
                  return acc;
                }, {})
              ).map(([category, features]: [string, any]) => (
                <div key={category} className="space-y-2">
                  <h5 className="font-medium text-sm text-muted-foreground">{category}</h5>
                  {features.map((item: any, index: number) => (
                    <div key={item.feature} className="flex items-center justify-between pl-4">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: chartColors[pageAnalytics.indexOf(item) % chartColors.length] }}
                        />
                        <span className="text-sm">{item.feature}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {item.count} uses ({item.percentage}%)
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Platform Activity Summary */}
        {pageAnalytics && statistics && (
          <Card className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Activity className="w-5 h-5 text-orange-500" />
              <h3 className="text-lg font-semibold">Platform Activity Summary</h3>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">
                    {pageAnalytics.find(f => f.feature === 'AI Image Generation')?.count || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Images Generated</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {pageAnalytics.find(f => f.feature === 'AI Video Generation')?.count || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Videos Generated</p>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">
                    {pageAnalytics.find(f => f.feature === 'Car Design Visualization')?.count || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Car Designs</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">
                    {pageAnalytics.find(f => f.feature === 'Video Projects')?.count || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Projects Created</p>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <h6 className="font-medium text-sm mb-2">Engagement Metrics</h6>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Content Generation Rate</span>
                    <span className="font-medium">
                      {Math.round((
                        (pageAnalytics.find(f => f.feature === 'AI Image Generation')?.count || 0) +
                        (pageAnalytics.find(f => f.feature === 'AI Video Generation')?.count || 0)
                      ) / Math.max(statistics.activeUsers, 1))} per user
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Car Design Usage</span>
                    <span className="font-medium">
                      {pageAnalytics.find(f => f.feature === 'Car Design Visualization')?.percentage || 0}% of images
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Comprehensive Recent Activity Timeline */}
      {recentActivity && recentActivity.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Clock className="w-5 h-5 text-indigo-500" />
            <h3 className="text-lg font-semibold">Recent Platform Activity</h3>
            <Badge variant="outline" className="ml-auto">
              Last 7 days
            </Badge>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {recentActivity.map((activity: any, index: number) => {
              const activityColor = activity.action.includes('Image') ? 'blue' : 
                                   activity.action.includes('Video') ? 'green' :
                                   activity.action.includes('Project') ? 'yellow' :
                                   activity.action.includes('Login') ? 'purple' : 'gray';
              
              return (
                <div key={index} className="flex items-start space-x-3 py-3 px-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className={`w-3 h-3 rounded-full mt-2 flex-shrink-0 ${
                    activityColor === 'blue' ? 'bg-blue-500' :
                    activityColor === 'green' ? 'bg-green-500' :
                    activityColor === 'yellow' ? 'bg-yellow-500' :
                    activityColor === 'purple' ? 'bg-purple-500' : 'bg-gray-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium truncate">{activity.user}</p>
                      <Badge variant="secondary" className="text-xs">
                        {activity.action}
                      </Badge>
                    </div>
                    {activity.details && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {activity.details}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTime(activity.time)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t text-center">
            <p className="text-xs text-muted-foreground">
              Showing {recentActivity.length} recent activities across all platform features
            </p>
          </div>
        </Card>
      )}

      {/* Search and Filters */}
      <Card className="p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={statusFilter} onValueChange={(value: 'all' | 'active' | 'inactive') => setStatusFilter(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Select value={roleFilter} onValueChange={(value: 'all' | 'user' | 'admin') => setRoleFilter(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>

          <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
            const [field, order] = value.split('-');
            setSortBy(field as 'createdAt' | 'lastLoginAt' | 'email' | 'firstName');
            setSortOrder(order as 'asc' | 'desc');
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lastLoginAt-desc">Last Login (Recent)</SelectItem>
              <SelectItem value="lastLoginAt-asc">Last Login (Oldest)</SelectItem>
              <SelectItem value="createdAt-desc">Created (Recent)</SelectItem>
              <SelectItem value="createdAt-asc">Created (Oldest)</SelectItem>
              <SelectItem value="email-asc">Email (A-Z)</SelectItem>
              <SelectItem value="email-desc">Email (Z-A)</SelectItem>
              <SelectItem value="firstName-asc">Name (A-Z)</SelectItem>
              <SelectItem value="firstName-desc">Name (Z-A)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Users List */}
      <div className="grid gap-4">
        {users?.map((user) => (
          <Card key={user.id} className="p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-center space-x-4 w-full lg:w-auto">
                {user.profileImageUrl ? (
                  <img
                    src={user.profileImageUrl}
                    alt={getDisplayName(user)}
                    className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                    {getInitials(user)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-lg truncate">{getDisplayName(user)}</h3>
                  <p className="text-muted-foreground truncate">{user.email}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge variant={user.isActive ? "default" : "secondary"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant={user.role === 'admin' ? "destructive" : "outline"}>
                      {user.role === 'admin' ? <Shield className="w-3 h-3 mr-1" /> : <UserIcon className="w-3 h-3 mr-1" />}
                      {user.role}
                    </Badge>
                    <Badge variant={
                      getActivityLevel(user.lastLoginAt) === 'recent' ? "default" :
                      getActivityLevel(user.lastLoginAt) === 'week' ? "secondary" :
                      getActivityLevel(user.lastLoginAt) === 'month' ? "outline" : "destructive"
                    }>
                      <Activity className="w-3 h-3 mr-1" />
                      {getActivityLevel(user.lastLoginAt) === 'recent' ? 'Recently Active' :
                       getActivityLevel(user.lastLoginAt) === 'week' ? 'Active This Week' :
                       getActivityLevel(user.lastLoginAt) === 'month' ? 'Active This Month' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground mt-2 space-y-1">
                    <div>Joined: {formatUserDate(user.createdAt)}</div>
                    <div>Last login: {formatUserDate(user.lastLoginAt)}</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleUserStatus(user.id, user.isActive)}
                  className={`w-full sm:w-auto ${user.isActive ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                >
                  {user.isActive ? (
                    <>
                      <ToggleLeft className="w-4 h-4 mr-1" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <ToggleRight className="w-4 h-4 mr-1" />
                      Activate
                    </>
                  )}
                </Button>

                {user.email !== 'joaquin.grimoldi@kavak.com' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleUserRole(user.id, user.role)}
                    className={`w-full sm:w-auto ${user.role === 'admin' ? 'text-blue-600 hover:bg-blue-50' : 'text-purple-600 hover:bg-purple-50'}`}
                  >
                    {user.role === 'admin' ? (
                      <>
                        <UserIcon className="w-4 h-4 mr-1" />
                        Make User
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4 mr-1" />
                        Make Admin
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}

        {users?.length === 0 && (
          <Card className="p-8 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No users found</h3>
            <p className="text-muted-foreground">Try adjusting your search criteria or filters.</p>
          </Card>
        )}
      </div>
    </div>
  );
}