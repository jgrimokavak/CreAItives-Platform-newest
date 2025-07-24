import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Settings, ToggleLeft, ToggleRight, Eye, EyeOff, Save } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import type { PageSettings } from '@shared/schema';

export default function PageSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: pageSettings, isLoading } = useQuery<PageSettings[]>({
    queryKey: ['/api/admin/page-settings'],
    retry: false,
  });

  const updatePageSettingMutation = useMutation({
    mutationFn: async ({ pageKey, isEnabled }: { pageKey: string; isEnabled: boolean }) => {
      return await apiRequest(`/api/admin/page-settings/${pageKey}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isEnabled }),
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/page-settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/page-settings/enabled'] });
      toast({
        title: "Page Setting Updated",
        description: `${variables.pageKey} page ${variables.isEnabled ? 'enabled' : 'disabled'} successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update page setting",
        variant: "destructive",
      });
    },
  });

  const handleTogglePageSetting = (pageKey: string, currentStatus: boolean) => {
    updatePageSettingMutation.mutate({ pageKey, isEnabled: !currentStatus });
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return 'Never';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString();
  };

  if (isLoading) {
    return (
      <div className="space-y-6 px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold">Page Settings</h1>
        </div>
        <div className="text-center py-8">Loading page settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Page Settings</h1>
          <p className="text-muted-foreground mt-2">
            Control which pages are visible in the sidebar navigation for all users
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pages</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pageSettings?.length || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enabled Pages</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {pageSettings?.filter(p => p.isEnabled).length || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disabled Pages</CardTitle>
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {pageSettings?.filter(p => !p.isEnabled).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Page Settings List */}
      <div className="grid gap-4">
        {pageSettings?.map((setting) => (
          <Card key={setting.id} className="p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-center space-x-4 w-full lg:w-auto">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${
                  setting.isEnabled 
                    ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                    : 'bg-gradient-to-br from-gray-400 to-gray-600'
                }`}>
                  {setting.isEnabled ? <Eye size={20} /> : <EyeOff size={20} />}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-lg truncate">{setting.pageName}</h3>
                  <p className="text-muted-foreground truncate">
                    Page Key: {setting.pageKey}
                  </p>
                  {setting.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {setting.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge variant={setting.isEnabled ? "default" : "secondary"}>
                      {setting.isEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Last updated: {formatDate(setting.updatedAt)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={setting.isEnabled}
                    onCheckedChange={() => handleTogglePageSetting(setting.pageKey, setting.isEnabled)}
                    disabled={updatePageSettingMutation.isPending}
                  />
                  <span className="text-sm font-medium">
                    {setting.isEnabled ? 'Visible' : 'Hidden'}
                  </span>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTogglePageSetting(setting.pageKey, setting.isEnabled)}
                  disabled={updatePageSettingMutation.isPending}
                  className={`w-full sm:w-auto ${
                    setting.isEnabled 
                      ? 'text-red-600 hover:bg-red-50' 
                      : 'text-green-600 hover:bg-green-50'
                  }`}
                >
                  {setting.isEnabled ? (
                    <>
                      <EyeOff className="w-4 h-4 mr-1" />
                      Hide Page
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-1" />
                      Show Page
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {pageSettings?.length === 0 && (
          <Card className="p-8 text-center">
            <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No page settings found</h3>
            <p className="text-muted-foreground">Page settings will be initialized automatically.</p>
          </Card>
        )}
      </div>

      {/* Help Information */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            How Page Settings Work
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800">
          <ul className="space-y-2 text-sm">
            <li>• <strong>Enabled pages</strong> appear in the sidebar navigation for all users</li>
            <li>• <strong>Disabled pages</strong> are hidden from the sidebar but remain accessible via direct URL</li>
            <li>• Changes take effect immediately for all users</li>
            <li>• Admin pages are always visible to admin users regardless of these settings</li>
            <li>• User permissions and authentication are still enforced on all pages</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}