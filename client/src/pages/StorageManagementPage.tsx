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
  const [environment, setEnvironment] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [minSize, setMinSize] = useState<string>('');
  const [maxSize, setMaxSize] = useState<string>('');
  
  // Selection state
  const [selectedObjects, setSelectedObjects] = useState<Set<string>>(new Set());

  // Fetch storage statistics
  const { data: stats, isLoading: statsLoading } = useQuery<StorageStats>({
    queryKey: ['/api/admin/storage/stats'],
    retry: false,
  });

  // Fetch storage objects
  const { data: objectsData, isLoading: objectsLoading } = useQuery<StorageObjectsResponse>({
    queryKey: ['/api/admin/storage/objects', { page, environment, dateFrom, dateTo, minSize, maxSize }],
    queryFn: () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(environment && { environment }),
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
      ...(environment && { environment }),
      ...(dateFrom && { dateFrom }),
      ...(dateTo && { dateTo }),
    });
    
    const url = `/api/admin/storage/objects/export?${params}`;
    window.open(url, '_blank');
  };

  const clearFilters = () => {
    setEnvironment('');
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
                  {statsLoading ? '' : `${(stats?.totalSizeBytes || 0 / (1024 * 1024)).toFixed(1)} MB`}
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

          {/* Environment Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Storage Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-lg font-semibold">Bucket ID</div>
                  <div className="text-sm text-muted-foreground font-mono">
                    {stats?.bucketId || 'kavak-gallery'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold">Active Environment</div>
                  <Badge variant={stats?.environments.current === 'prod' ? 'default' : 'secondary'}>
                    {stats?.environments.current || 'dev'}
                  </Badge>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold">Upload Activity</div>
                  <div className="text-sm text-muted-foreground">
                    {stats?.dailyUploads.reduce((sum, day) => sum + day.count, 0) || 0} uploads in 30 days
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Daily Upload Chart */}
          {stats?.dailyUploads && stats.dailyUploads.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Daily Upload Activity (Last 30 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.dailyUploads.slice(-10).map((day, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">{new Date(day.date).toLocaleDateString()}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all" 
                            style={{ 
                              width: `${Math.min(100, (day.count / Math.max(...stats.dailyUploads.map(d => d.count))) * 100)}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8">{day.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="objects" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters & Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
                <Select value={environment} onValueChange={setEnvironment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Environment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Environments</SelectItem>
                    <SelectItem value="dev">Development</SelectItem>
                    <SelectItem value="prod">Production</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  placeholder="From Date"
                />

                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  placeholder="To Date"
                />

                <Input
                  type="number"
                  value={minSize}
                  onChange={(e) => setMinSize(e.target.value)}
                  placeholder="Min Size (bytes)"
                />

                <Input
                  type="number"
                  value={maxSize}
                  onChange={(e) => setMaxSize(e.target.value)}
                  placeholder="Max Size (bytes)"
                />

                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleExport} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                
                {selectedObjects.size > 0 && (
                  <Button 
                    onClick={handleBulkDelete} 
                    variant="destructive"
                    disabled={bulkDeleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected ({selectedObjects.size})
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Objects Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileImage className="h-5 w-5" />
                Storage Objects
              </CardTitle>
            </CardHeader>
            <CardContent>
              {objectsLoading ? (
                <div className="text-center py-8">Loading objects...</div>
              ) : (
                <div className="space-y-4">
                  {/* Table Header */}
                  <div className="flex items-center gap-4 p-3 bg-muted rounded-lg font-medium">
                    <Checkbox
                      checked={selectedObjects.size === objectsData?.objects.length && objectsData?.objects.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <div className="flex-1">Name</div>
                    <div className="w-20">Size</div>
                    <div className="w-24">Environment</div>
                    <div className="w-20">Type</div>
                    <div className="w-32">Modified</div>
                    <div className="w-16">View</div>
                  </div>

                  {/* Table Rows */}
                  {objectsData?.objects.map((obj) => (
                    <div key={obj.id} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50">
                      <Checkbox
                        checked={selectedObjects.has(obj.name)}
                        onCheckedChange={() => handleSelectObject(obj.name)}
                      />
                      <div className="flex-1 font-mono text-sm truncate">{obj.name}</div>
                      <div className="w-20 text-sm">{obj.sizeFormatted}</div>
                      <div className="w-24">
                        <Badge variant={obj.environment === 'prod' ? 'default' : 'secondary'}>
                          {obj.environment}
                        </Badge>
                      </div>
                      <div className="w-20">
                        <Badge variant="outline">
                          {obj.type}
                        </Badge>
                      </div>
                      <div className="w-32 text-xs text-muted-foreground">
                        {formatDate(obj.lastModified)}
                      </div>
                      <div className="w-16">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(obj.url, '_blank')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Pagination */}
                  {objectsData && objectsData.pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4">
                      <div className="text-sm text-muted-foreground">
                        Showing {((objectsData.pagination.page - 1) * objectsData.pagination.limit) + 1} to{' '}
                        {Math.min(objectsData.pagination.page * objectsData.pagination.limit, objectsData.pagination.total)} of{' '}
                        {objectsData.pagination.total} objects
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page === 1}
                          onClick={() => setPage(page - 1)}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page === objectsData.pagination.totalPages}
                          onClick={() => setPage(page + 1)}
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