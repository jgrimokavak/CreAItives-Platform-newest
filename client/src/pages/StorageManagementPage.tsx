import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  HardDrive, 
  Download, 
  Trash2, 
  Filter, 
  Calendar,
  FileImage,
  Database,
  DollarSign,
  Activity,
  Folder,
  Eye
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface StorageStats {
  totalObjects: number;
  totalSizeBytes: number;
  totalSizeGiB: number;
  estimatedMonthlyCost: number;
  environments: {
    dev: number;
    prod: number;
    current: string;
  };
  bucketId: string;
  dailyUploads: Array<{
    date: string;
    count: number;
  }>;
}

interface StorageObject {
  id: string;
  name: string;
  size: number;
  sizeFormatted: string;
  lastModified: string;
  environment: string;
  type: string;
  url: string;
}

interface StorageObjectsResponse {
  objects: StorageObject[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function StorageManagementPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Filters state
  const [page, setPage] = useState(1);
  const [environment, setEnvironment] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [minSize, setMinSize] = useState<string>('');
  const [maxSize, setMaxSize] = useState<string>('');
  const [chartDays, setChartDays] = useState<number>(30);
  const [verificationData, setVerificationData] = useState<any>(null);
  
  // Selection state
  const [selectedObjects, setSelectedObjects] = useState<Set<string>>(new Set());

  // Fetch storage statistics
  const { data: stats, isLoading: statsLoading } = useQuery<StorageStats>({
    queryKey: ['/api/admin/storage/stats', { environment: environment !== 'all' ? environment : undefined }],
    retry: false,
  });

  // Fetch storage objects
  const { data: objectsData, isLoading: objectsLoading } = useQuery<StorageObjectsResponse>({
    queryKey: ['/api/admin/storage/objects', { page, environment, dateFrom, dateTo, minSize, maxSize }],
    queryFn: () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(environment && environment !== 'all' && { environment }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
        ...(minSize && { minSize }),
        ...(maxSize && { maxSize }),
      });
      return apiRequest(`/api/admin/storage/objects?${params}`);
    },
    retry: false,
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (objectNames: string[]) => {
      return await apiRequest('/api/admin/storage/objects/bulk', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ objectNames }),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/storage/objects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/storage/stats'] });
      setSelectedObjects(new Set());
      toast({
        title: "Deletion Complete",
        description: `Deleted ${data.deleted} objects successfully${data.failed > 0 ? `, ${data.failed} failed` : ''}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete objects",
        variant: "destructive",
      });
    },
  });

  // Verification mutation
  const verifyMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/admin/storage/verify');
    },
    onSuccess: (data) => {
      setVerificationData(data);
      toast({
        title: "Verification Complete",
        description: "Storage data verified successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Failed to verify storage data",
        variant: "destructive",
      });
    },
  });

  const handleSelectAll = () => {
    if (selectedObjects.size === objectsData?.objects.length) {
      setSelectedObjects(new Set());
    } else {
      setSelectedObjects(new Set(objectsData?.objects.map(obj => obj.name) || []));
    }
  };

  const handleSelectObject = (objectName: string) => {
    const newSelected = new Set(selectedObjects);
    if (newSelected.has(objectName)) {
      newSelected.delete(objectName);
    } else {
      newSelected.add(objectName);
    }
    setSelectedObjects(newSelected);
  };

  const handleBulkDelete = () => {
    if (selectedObjects.size === 0) return;
    
    if (confirm(`Are you sure you want to permanently delete ${selectedObjects.size} objects? This action cannot be undone.`)) {
      bulkDeleteMutation.mutate(Array.from(selectedObjects));
    }
  };

  const handleExport = () => {
    const params = new URLSearchParams({
      ...(environment && environment !== 'all' && { environment }),
      ...(dateFrom && { dateFrom }),
      ...(dateTo && { dateTo }),
    });
    
    const url = `/api/admin/storage/objects/export?${params}`;
    window.open(url, '_blank');
  };

  const clearFilters = () => {
    setEnvironment('all');
    setDateFrom('');
    setDateTo('');
    setMinSize('');
    setMaxSize('');
    setPage(1);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Unknown';
    return new Date(dateStr).toLocaleDateString() + ' ' + new Date(dateStr).toLocaleTimeString();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Storage Management</h1>
          <p className="text-gray-600 mt-1">Manage Object Storage bucket and analyze usage</p>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="objects">Object Management</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Environment Toggle and Verification */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">Environment Filter:</label>
                <Select value={environment} onValueChange={setEnvironment}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Both</SelectItem>
                    <SelectItem value="dev">Dev</SelectItem>
                    <SelectItem value="prod">Prod</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">Chart Period:</label>
                <Select value={chartDays.toString()} onValueChange={(value) => setChartDays(parseInt(value))}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7d</SelectItem>
                    <SelectItem value="30">30d</SelectItem>
                    <SelectItem value="90">90d</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button 
                onClick={() => verifyMutation.mutate()} 
                disabled={verifyMutation.isPending}
                variant="outline"
                size="sm"
              >
                <Eye className="h-4 w-4 mr-2" />
                {verifyMutation.isPending ? 'Verifying...' : 'Verify Now'}
              </Button>
              
              {verificationData && (
                <Badge variant={verificationData.verified ? "default" : "destructive"}>
                  Last verified: {new Date(verificationData.timestamp).toLocaleTimeString()}
                </Badge>
              )}
            </div>
          </div>

          {/* Storage Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Objects</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? '...' : stats?.totalObjects.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  All files and thumbnails
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? '...' : `${stats?.totalSizeGiB} GiB`}
                </div>
                <p className="text-xs text-muted-foreground">
                  {statsLoading ? '' : `${((stats?.totalSizeBytes || 0) / (1024 * 1024)).toFixed(1)} MB`}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Cost</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? '...' : `$${stats?.estimatedMonthlyCost}`}
                </div>
                <p className="text-xs text-muted-foreground">
                  $0.03 per GiB/month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Environment</CardTitle>
                <Folder className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? '...' : stats?.environments.current.toUpperCase()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Dev: {stats?.environments.dev || 0} | Prod: {stats?.environments.prod || 0}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Daily Upload Activity Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-4 w-4 mr-2" />
                Daily Upload Activity ({chartDays} days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.dailyUploads && stats.dailyUploads.length > 0 ? (
                <div className="space-y-2">
                  {stats.dailyUploads.slice(-chartDays).map((day, index) => (
                    <div key={index} className="flex items-center justify-between" title={`${day.date}: ${day.count} uploads`}>
                      <span className="text-sm">{new Date(day.date).toLocaleDateString()}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all" 
                            style={{ 
                              width: `${Math.min(100, (day.count / Math.max(...stats.dailyUploads.map(d => d.count), 1)) * 100)}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8">{day.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-gray-500">
                  No upload activity data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="objects" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Environment</label>
                  <Select value={environment} onValueChange={setEnvironment}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="dev">Dev</SelectItem>
                      <SelectItem value="prod">Prod</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date From</label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date To</label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Min Size (bytes)</label>
                  <Input
                    type="number"
                    value={minSize}
                    onChange={(e) => setMinSize(e.target.value)}
                    placeholder="0"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Size (bytes)</label>
                  <Input
                    type="number"
                    value={maxSize}
                    onChange={(e) => setMaxSize(e.target.value)}
                    placeholder="No limit"
                  />
                </div>
                
                <div className="space-y-2 flex items-end">
                  <Button onClick={clearFilters} variant="outline" className="w-full">
                    Clear Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Object Management</span>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={handleExport}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  {selectedObjects.size > 0 && (
                    <Button
                      onClick={handleBulkDelete}
                      variant="destructive"
                      size="sm"
                      disabled={bulkDeleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete {selectedObjects.size} objects
                    </Button>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {objectsLoading ? (
                <div className="text-center py-8">Loading objects...</div>
              ) : !objectsData?.objects.length ? (
                <div className="text-center py-8 text-gray-500">No objects found</div>
              ) : (
                <div className="space-y-4">
                  {/* Table Header */}
                  <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg font-medium text-sm">
                    <Checkbox
                      checked={selectedObjects.size === objectsData.objects.length && objectsData.objects.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <div className="flex-1">Name</div>
                    <div className="w-24">Size</div>
                    <div className="w-20">Type</div>
                    <div className="w-16">Env</div>
                    <div className="w-32">Modified</div>
                  </div>

                  {/* Table Rows */}
                  {objectsData.objects.map((obj) => (
                    <div key={obj.id} className="flex items-center space-x-4 p-3 border rounded-lg hover:bg-gray-50">
                      <Checkbox
                        checked={selectedObjects.has(obj.name)}
                        onCheckedChange={() => handleSelectObject(obj.name)}
                      />
                      <div className="flex-1 font-mono text-sm truncate" title={obj.name}>
                        {obj.name}
                      </div>
                      <div className="w-24 text-sm">{obj.sizeFormatted}</div>
                      <div className="w-20">
                        <Badge variant={obj.type === 'thumbnail' ? 'secondary' : 'default'}>
                          {obj.type}
                        </Badge>
                      </div>
                      <div className="w-16">
                        <Badge variant={obj.environment === 'dev' ? 'outline' : 'default'}>
                          {obj.environment}
                        </Badge>
                      </div>
                      <div className="w-32 text-xs text-gray-500" title={formatDate(obj.lastModified)}>
                        {formatDate(obj.lastModified).split(' ')[0]}
                      </div>
                    </div>
                  ))}

                  {/* Pagination */}
                  {objectsData.pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4">
                      <div className="text-sm text-gray-500">
                        Page {objectsData.pagination.page} of {objectsData.pagination.totalPages} 
                        ({objectsData.pagination.total} total objects)
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={() => setPage(Math.max(1, page - 1))}
                          disabled={page === 1}
                          variant="outline"
                          size="sm"
                        >
                          Previous
                        </Button>
                        <Button
                          onClick={() => setPage(Math.min(objectsData.pagination.totalPages, page + 1))}
                          disabled={page === objectsData.pagination.totalPages}
                          variant="outline"
                          size="sm"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}