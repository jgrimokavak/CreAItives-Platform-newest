import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle 
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User, 
  Mail, 
  Shield, 
  Activity, 
  Calendar, 
  Image, 
  Video, 
  FolderOpen,
  ToggleLeft,
  ToggleRight,
  LogOut,
  AlertTriangle,
  Clock,
  Check,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import type { User as UserType } from '@shared/schema';

interface EnhancedUser extends UserType {
  domain: string;
  imageCount: number;
  videoCount: number;
  projectCount: number;
  isActivated: boolean;
}

interface UserDrawerProps {
  user: EnhancedUser | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function UserDrawer({ user, isOpen, onClose }: UserDrawerProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const updateUserStatusMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      apiRequest(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/paginated'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/statistics'] });
      toast({
        title: 'Success',
        description: 'User status updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user status',
        variant: 'destructive',
      });
    },
    onSettled: () => setActionLoading(null),
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'user' | 'admin' }) =>
      apiRequest(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/paginated'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/statistics'] });
      toast({
        title: 'Success',
        description: 'User role updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user role',
        variant: 'destructive',
      });
    },
    onSettled: () => setActionLoading(null),
  });

  const forceLogoutMutation = useMutation({
    mutationFn: (userId: string) =>
      apiRequest(`/api/admin/users/${userId}/logout`, {
        method: 'POST',
      }),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'User has been logged out successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to logout user',
        variant: 'destructive',
      });
    },
    onSettled: () => setActionLoading(null),
  });

  if (!user) return null;

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'Never';
    const d = new Date(date);
    return d.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeAgo = (date: Date | string | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return formatDate(date);
  };

  const isOnline = () => {
    if (!user.lastLoginAt) return false;
    const now = new Date();
    const lastLogin = new Date(user.lastLoginAt);
    const diffMins = (now.getTime() - lastLogin.getTime()) / (1000 * 60);
    return diffMins <= 10; // Online if logged in within last 10 minutes
  };

  const handleToggleStatus = () => {
    if (!user) return;
    setActionLoading('status');
    updateUserStatusMutation.mutate({
      userId: user.id,
      isActive: !user.isActive,
    });
  };

  const handleMakeAdmin = () => {
    if (!user) return;
    setActionLoading('role');
    updateUserRoleMutation.mutate({
      userId: user.id,
      role: 'admin',
    });
  };

  const handleRemoveAdmin = () => {
    if (!user) return;
    setActionLoading('role');
    updateUserRoleMutation.mutate({
      userId: user.id,
      role: 'user',
    });
  };

  const handleForceLogout = () => {
    if (!user || !confirm('Are you sure you want to force logout this user?')) return;
    setActionLoading('logout');
    forceLogoutMutation.mutate(user.id);
  };

  const isSelfAction = currentUser?.id === user.id;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center space-x-2">
            <User className="w-5 h-5" />
            <span>User Details</span>
            {isOnline() && (
              <Badge variant="default" className="bg-green-500">
                <div className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse"></div>
                Online
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            View and manage user account details and permissions
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Profile Header */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-4">
                {user.profileImageUrl ? (
                  <img 
                    src={user.profileImageUrl} 
                    alt={user.firstName || user.email || 'User'} 
                    className="w-16 h-16 rounded-full"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <User className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 space-y-1">
                  <h3 className="text-lg font-semibold">
                    {user.firstName && user.lastName 
                      ? `${user.firstName} ${user.lastName}` 
                      : (user.firstName || 'Unknown User')
                    }
                  </h3>
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-mono">{user.email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </Badge>
                    <Badge variant={user.isActive ? 'default' : 'destructive'}>
                      <Activity className="w-3 h-3 mr-1" />
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <Image className="w-6 h-6 mx-auto text-blue-600 mb-1" />
                  <div className="text-lg font-bold text-blue-600">{user.imageCount}</div>
                  <div className="text-xs text-muted-foreground">Images</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <Video className="w-6 h-6 mx-auto text-green-600 mb-1" />
                  <div className="text-lg font-bold text-green-600">{user.videoCount}</div>
                  <div className="text-xs text-muted-foreground">Videos</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <FolderOpen className="w-6 h-6 mx-auto text-purple-600 mb-1" />
                  <div className="text-lg font-bold text-purple-600">{user.projectCount}</div>
                  <div className="text-xs text-muted-foreground">Projects</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">Domain</div>
                  <div className="text-sm text-muted-foreground">{user.domain || 'N/A'}</div>
                </div>
                <Badge variant="outline">{user.domain || 'N/A'}</Badge>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">Account Status</div>
                  <div className="text-sm text-muted-foreground">
                    {user.isActivated ? 'Account activated' : 'Never logged in'}
                  </div>
                </div>
                <Badge variant={user.isActivated ? 'default' : 'secondary'}>
                  {user.isActivated ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                  {user.isActivated ? 'Activated' : 'Not Activated'}
                </Badge>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">Last Active</div>
                  <div className="text-sm text-muted-foreground">{getTimeAgo(user.lastLoginAt)}</div>
                </div>
                <div className="text-right text-sm">
                  {formatDate(user.lastLoginAt)}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">Joined</div>
                  <div className="text-sm text-muted-foreground">Member since</div>
                </div>
                <div className="text-right text-sm">
                  {formatDate(user.createdAt)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Admin Actions */}
          {currentUser?.role === 'admin' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center space-x-2">
                  <Shield className="w-4 h-4" />
                  <span>Admin Actions</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isSelfAction && (
                  <Alert>
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>
                      You cannot modify your own account permissions for security reasons.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-3">
                  <Button
                    variant={user.isActive ? "destructive" : "default"}
                    size="sm"
                    onClick={handleToggleStatus}
                    disabled={actionLoading === 'status' || isSelfAction}
                    className="w-full justify-start"
                  >
                    {user.isActive ? (
                      <ToggleLeft className="w-4 h-4 mr-2" />
                    ) : (
                      <ToggleRight className="w-4 h-4 mr-2" />
                    )}
                    {actionLoading === 'status' ? (
                      'Updating...'
                    ) : (
                      user.isActive ? 'Deactivate User' : 'Activate User'
                    )}
                  </Button>

                  <Button
                    variant={user.role === 'admin' ? "outline" : "default"}
                    size="sm"
                    onClick={user.role === 'admin' ? handleRemoveAdmin : handleMakeAdmin}
                    disabled={actionLoading === 'role' || isSelfAction}
                    className="w-full justify-start"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    {actionLoading === 'role' ? (
                      'Updating...'
                    ) : (
                      user.role === 'admin' ? 'Remove Admin' : 'Make Admin'
                    )}
                  </Button>

                  <Separator />

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleForceLogout}
                    disabled={actionLoading === 'logout' || isSelfAction}
                    className="w-full justify-start text-orange-600 hover:text-orange-700"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {actionLoading === 'logout' ? 'Processing...' : 'Force Logout'}
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground">
                  All admin actions are logged for audit purposes.
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}