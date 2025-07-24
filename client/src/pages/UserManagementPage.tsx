import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Shield, User as UserIcon, ToggleLeft, ToggleRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import type { User } from '@shared/schema';

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // AdminRoute component already handles access control, so we can assume user is admin here

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
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

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-center">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">User Management</h1>
        <p className="text-gray-600">Manage user access and permissions for the CreAItives Platform</p>
      </div>

      <div className="grid gap-6">
        {users?.map((user) => (
          <Card key={user.id} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    {user.profileImageUrl ? (
                      <img
                        src={user.profileImageUrl}
                        alt={getDisplayName(user)}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-blue-600 font-semibold">
                        {getInitials(user)}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{getDisplayName(user)}</h3>
                    <p className="text-gray-600">{user.email}</p>
                    <div className="flex items-center space-x-3 mt-2">
                      <Badge variant={user.isActive ? "default" : "secondary"}>
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant={user.role === 'admin' ? "destructive" : "outline"}>
                        {user.role === 'admin' ? (
                          <>
                            <Shield className="w-3 h-3 mr-1" />
                            Admin
                          </>
                        ) : (
                          <>
                            <UserIcon className="w-3 h-3 mr-1" />
                            User
                          </>
                        )}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right text-sm text-gray-500">
                    <div>Joined: {formatDate(user.createdAt)}</div>
                    <div>Last login: {formatDate(user.lastLoginAt)}</div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {user.id !== currentUser?.id && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleUserStatus(user.id, user.isActive)}
                          disabled={updateStatusMutation.isPending}
                        >
                          {user.isActive ? (
                            <>
                              <ToggleRight className="w-4 h-4 mr-1" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-4 h-4 mr-1" />
                              Activate
                            </>
                          )}
                        </Button>
                        
                        {/* Show role toggle only if not joaquin.grimoldi@kavak.com */}
                        {user.email !== 'joaquin.grimoldi@kavak.com' && (
                          <Button
                            variant={user.role === 'admin' ? "destructive" : "default"}
                            size="sm"
                            onClick={() => toggleUserRole(user.id, user.role)}
                            disabled={updateRoleMutation.isPending}
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
                      </>
                    )}
                    
                    {user.id === currentUser?.id && (
                      <Badge variant="outline">You</Badge>
                    )}
                    
                    {user.email === 'joaquin.grimoldi@kavak.com' && (
                      <Badge variant="default">Primary Admin</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )) || []}
      </div>

      {users && users.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No users found.</p>
        </div>
      )}
    </div>
  );
}