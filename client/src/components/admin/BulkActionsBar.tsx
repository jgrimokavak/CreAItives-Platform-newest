import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Users, 
  Shield, 
  ToggleLeft, 
  ToggleRight, 
  AlertTriangle,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface BulkActionsBarProps {
  selectedIds: string[];
  onClearSelection: () => void;
}

const MAX_BULK_SELECTION = 100; // Client-side cap for bulk operations

export default function BulkActionsBar({ selectedIds, onClearSelection }: BulkActionsBarProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const bulkUpdateStatusMutation = useMutation({
    mutationFn: ({ userIds, isActive }: { userIds: string[]; isActive: boolean }) =>
      apiRequest('/api/admin/users/bulk/status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userIds, isActive }),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/paginated'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/statistics'] });
      
      toast({
        title: 'Bulk Action Completed',
        description: `Successfully updated ${data.success} users${data.failed.length > 0 ? `, ${data.failed.length} failed` : ''}`,
      });
      
      if (data.failed.length === 0) {
        onClearSelection();
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Bulk Action Failed',
        description: error.message || 'Failed to update user status',
        variant: 'destructive',
      });
    },
    onSettled: () => setActionLoading(null),
  });

  const bulkUpdateRoleMutation = useMutation({
    mutationFn: ({ userIds, role }: { userIds: string[]; role: 'user' | 'admin' }) =>
      apiRequest('/api/admin/users/bulk/role', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userIds, role }),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/paginated'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/statistics'] });
      
      toast({
        title: 'Bulk Action Completed',
        description: `Successfully updated ${data.success} users${data.failed.length > 0 ? `, ${data.failed.length} failed` : ''}`,
      });
      
      if (data.failed.length === 0) {
        onClearSelection();
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Bulk Action Failed',
        description: error.message || 'Failed to update user roles',
        variant: 'destructive',
      });
    },
    onSettled: () => setActionLoading(null),
  });

  if (selectedIds.length === 0) return null;

  const isOverLimit = selectedIds.length > MAX_BULK_SELECTION;

  const handleBulkActivate = () => {
    setActionLoading('activate');
    bulkUpdateStatusMutation.mutate({ userIds: selectedIds, isActive: true });
  };

  const handleBulkDeactivate = () => {
    setActionLoading('deactivate');
    bulkUpdateStatusMutation.mutate({ userIds: selectedIds, isActive: false });
  };

  const handleBulkMakeAdmin = () => {
    setActionLoading('make-admin');
    bulkUpdateRoleMutation.mutate({ userIds: selectedIds, role: 'admin' });
  };

  const handleBulkRemoveAdmin = () => {
    setActionLoading('remove-admin');
    bulkUpdateRoleMutation.mutate({ userIds: selectedIds, role: 'user' });
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-3">
            <Users className="w-5 h-5 text-blue-600" />
            <div>
              <div className="font-medium">
                {selectedIds.length} user{selectedIds.length > 1 ? 's' : ''} selected
              </div>
              {isOverLimit && (
                <div className="text-sm text-red-600 flex items-center space-x-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Selection exceeds limit of {MAX_BULK_SELECTION} users</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-wrap">
            {!isOverLimit && (
              <>
                {/* Status Actions */}
                <div className="flex items-center space-x-1">
                  <Badge variant="outline" className="text-xs">Status</Badge>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!!actionLoading}
                      >
                        <ToggleRight className="w-4 h-4 mr-1" />
                        Activate
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Activate Users</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to activate {selectedIds.length} selected user{selectedIds.length > 1 ? 's' : ''}?
                          This will allow them to access the platform.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleBulkActivate}
                          disabled={actionLoading === 'activate'}
                        >
                          {actionLoading === 'activate' ? 'Processing...' : 'Activate Users'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!!actionLoading}
                      >
                        <ToggleLeft className="w-4 h-4 mr-1" />
                        Deactivate
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Deactivate Users</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to deactivate {selectedIds.length} selected user{selectedIds.length > 1 ? 's' : ''}?
                          This will prevent them from accessing the platform.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleBulkDeactivate}
                          disabled={actionLoading === 'deactivate'}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {actionLoading === 'deactivate' ? 'Processing...' : 'Deactivate Users'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                {/* Role Actions */}
                <div className="flex items-center space-x-1">
                  <Badge variant="outline" className="text-xs">Role</Badge>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!!actionLoading}
                      >
                        <Shield className="w-4 h-4 mr-1" />
                        Make Admin
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Grant Admin Access</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to grant admin privileges to {selectedIds.length} selected user{selectedIds.length > 1 ? 's' : ''}?
                          This will give them full access to admin features.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleBulkMakeAdmin}
                          disabled={actionLoading === 'make-admin'}
                        >
                          {actionLoading === 'make-admin' ? 'Processing...' : 'Grant Admin Access'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!!actionLoading}
                      >
                        <Shield className="w-4 h-4 mr-1" />
                        Remove Admin
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove Admin Access</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to remove admin privileges from {selectedIds.length} selected user{selectedIds.length > 1 ? 's' : ''}?
                          This will revoke their access to admin features.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleBulkRemoveAdmin}
                          disabled={actionLoading === 'remove-admin'}
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          {actionLoading === 'remove-admin' ? 'Processing...' : 'Remove Admin Access'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          </div>
        </div>

        {isOverLimit && (
          <div className="mt-3 p-3 bg-red-50 rounded-lg">
            <div className="text-sm text-red-800 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4" />
              <span>
                Please reduce your selection to {MAX_BULK_SELECTION} or fewer users to perform bulk actions.
                Large bulk operations are restricted for safety.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}