import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Shield, User as UserIcon, ToggleLeft, ToggleRight, Search, Download, Users, Activity, Clock, UserCheck } from 'lucide-react';
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

  const { data: statistics } = useQuery({
    queryKey: ['/api/admin/users/statistics'],
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

  const formatDate = (date: string | Date | null) => {
    if (!date) return 'Never';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString();
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
                    <div>Joined: {formatDate(user.createdAt)}</div>
                    <div>Last login: {formatDate(user.lastLoginAt)}</div>
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