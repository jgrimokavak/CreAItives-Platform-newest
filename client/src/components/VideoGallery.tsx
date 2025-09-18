import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  VideoIcon, 
  Search, 
  Filter, 
  Loader2, 
  RefreshCw,
  Calendar,
  Clock,
  User,
  Folder,
  Play,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';
import VideoCard from '@/components/VideoCard';
import type { Video } from '@shared/schema';

interface VideoGalleryProps {
  mode?: 'gallery' | 'trash';
}

export default function VideoGallery({ mode = 'gallery' }: VideoGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'failed' | 'in_progress' | 'queued'>('all');
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | '24h' | '7d' | '30d'>('all');
  const { toast } = useToast();

  // Fetch videos with filters
  const { data: videosData, isLoading, refetch, error } = useQuery({
    queryKey: ['/api/video', 'gallery', { 
      search: searchQuery, 
      status: statusFilter,
      model: modelFilter,
      project: projectFilter,
      date: dateFilter,
      limit: 100
    }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('limit', '100');
      
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (modelFilter !== 'all') {
        params.append('model', modelFilter);
      }
      if (projectFilter !== 'all') {
        params.append('projectId', projectFilter);
      }
      if (dateFilter !== 'all') {
        const now = new Date();
        let fromDate: Date;
        switch (dateFilter) {
          case '24h':
            fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case '7d':
            fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30d':
            fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            fromDate = new Date(0);
        }
        params.append('fromDate', fromDate.toISOString());
      }

      return apiRequest(`/api/video?${params.toString()}`);
    },
    refetchInterval: 10000, // Refetch every 10 seconds to get status updates
  });

  // Fetch projects for filter dropdown
  const { data: projectsData } = useQuery({
    queryKey: ['/api/projects'],
    queryFn: () => apiRequest('/api/projects'),
  });

  // Get unique models from videos for filter
  const availableModels = React.useMemo(() => {
    if (!videosData?.items) return [];
    const models = [...new Set(videosData.items.map((v: Video) => v.model))];
    return models.filter(Boolean);
  }, [videosData]);

  const videos = videosData?.items || [];
  const totalCount = videosData?.totalCount || 0;

  // Handle video deletion
  const deleteMutation = useMutation({
    mutationFn: (videoId: string) => 
      apiRequest(`/api/video/${videoId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast({
        title: 'Video deleted',
        description: 'Video has been successfully deleted',
      });
      refetch();
    },
    onError: () => {
      toast({
        title: 'Delete failed',
        description: 'Could not delete video',
        variant: 'destructive',
      });
    },
  });

  // Handle video move to project
  const moveMutation = useMutation({
    mutationFn: ({ videoId, projectId }: { videoId: string; projectId: string | null }) => 
      apiRequest(`/api/video/${videoId}`, {
        method: 'PATCH',
        body: JSON.stringify({ projectId }),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: () => {
      toast({
        title: 'Video moved',
        description: 'Video has been moved to project',
      });
      refetch();
    },
    onError: () => {
      toast({
        title: 'Move failed',
        description: 'Could not move video',
        variant: 'destructive',
      });
    },
  });

  const handleDelete = (videoId: string) => {
    deleteMutation.mutate(videoId);
  };

  const handleMove = (videoId: string, projectId: string | null) => {
    moveMutation.mutate({ videoId, projectId });
  };

  // Reset search when switching modes
  useEffect(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setModelFilter('all');
    setProjectFilter('all');
    setDateFilter('all');
  }, [mode]);

  if (error) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to load videos</h3>
            <p className="text-muted-foreground mb-4">
              {error instanceof Error ? error.message : 'An error occurred while loading videos'}
            </p>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Video Gallery</h2>
          <p className="text-muted-foreground">
            {totalCount === 0 ? 'No videos yet' : `${totalCount} video${totalCount === 1 ? '' : 's'} total`}
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search videos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-videos"
                />
              </div>
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
              <SelectTrigger data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="queued">Queued</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            {/* Model Filter */}
            <Select value={modelFilter} onValueChange={setModelFilter}>
              <SelectTrigger data-testid="select-model-filter">
                <SelectValue placeholder="Model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Models</SelectItem>
                {availableModels.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Filter */}
            <Select value={dateFilter} onValueChange={(value) => setDateFilter(value as any)}>
              <SelectTrigger data-testid="select-date-filter">
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Video Grid */}
      {isLoading ? (
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin mr-3" />
              <span>Loading videos...</span>
            </div>
          </CardContent>
        </Card>
      ) : videos.length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <VideoIcon className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Videos Yet</h3>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all' || modelFilter !== 'all' || projectFilter !== 'all' || dateFilter !== 'all'
                  ? 'No videos match your current filters. Try adjusting your search criteria.'
                  : 'Generate your first video using the form above. Videos will appear here once completed.'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {videos.map((video: Video) => (
            <VideoCard
              key={video.id}
              video={{
                id: video.id,
                url: video.url,
                thumbUrl: video.thumbUrl,
                firstFrameImage: video.firstFrameImage,
                status: video.status as 'pending' | 'processing' | 'completed' | 'failed',
                prompt: video.prompt,
                model: video.model,
                resolution: video.resolution,
                duration: video.duration,
                projectId: video.projectId,
                createdAt: video.createdAt,
                referenceImageUrl: video.referenceImageUrl,
              }}
              onDelete={handleDelete}
              onMove={handleMove}
              className="w-full"
              data-testid={`video-card-${video.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}