import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  VideoIcon, 
  Video as VideoIconSm,
  Sparkles, 
  Play, 
  Settings, 
  Clock, 
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  CheckCircle,
  FolderOpen,
  Plus,
  Download,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Folder,
  Search,
  Filter,
  CheckSquare,
  Square,
  MoveIcon,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import SimpleGalleryPage from './SimpleGalleryPage';
import ReferenceImageUpload from '@/components/ReferenceImageUpload';
import type { Video } from '@shared/schema';
import VideoCard from '@/components/VideoCard';
import { JobTray, type JobTrayItem } from '@/components/JobTray';



// ProjectVideoPreview Component for the right column
interface ProjectVideoPreviewProps {
  selectedProject: string;
  projects: Project[];
  compact?: boolean;
  onVideoPlay: (videoId: string) => void;
  onVideoDelete: (videoId: string) => void;
}

function ProjectVideoPreview({ selectedProject, projects, compact, onVideoPlay, onVideoDelete }: ProjectVideoPreviewProps) {
  const { toast } = useToast();
  
  // Fetch project details with videos
  const { data: projectDetails, isLoading: projectLoading } = useQuery({
    queryKey: ['/api/projects', selectedProject, 'details'],
    queryFn: () => selectedProject === 'none' ? 
      Promise.resolve(null) : 
      apiRequest(`/api/projects/${selectedProject}/details`),
    enabled: selectedProject !== 'none',
  });

  // Fetch unassigned videos when no project is selected
  const { data: unassignedVideos, isLoading: unassignedLoading } = useQuery<{items: Video[]}>({
    queryKey: ['/api/video', 'unassigned'],
    queryFn: () => apiRequest('/api/video?projectId=null'),
    enabled: selectedProject === 'none',
  });

  if (selectedProject === 'none') {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <VideoIconSm className="w-5 h-5" />
            Unassigned Videos
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Videos that aren't part of any project
          </p>
        </CardHeader>
        <CardContent>
          {unassignedLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="ml-2">Loading videos...</span>
            </div>
          ) : unassignedVideos?.items?.length ? (
            <div className="space-y-4">
              <div className={compact ? "grid grid-cols-1 gap-2" : "grid grid-cols-1 sm:grid-cols-2 gap-4"}>
                {unassignedVideos.items.slice(0, 8).map((video) => (
                  <VideoCard 
                    key={video.id}
                    video={{
                      ...video,
                      model: video.model || 'hailuo-02',
                      status: video.status as 'pending' | 'processing' | 'completed' | 'failed',
                      createdAt: typeof video.createdAt === 'string' ? video.createdAt : video.createdAt?.toISOString() || null
                    }}
                    className="w-full"
                  />
                ))}
              </div>
              
              {unassignedVideos.items.length > 8 && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    {unassignedVideos.items.length - 8} more videos...
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <VideoIconSm className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Unassigned Videos</h3>
              <p className="text-muted-foreground text-sm">
                All your videos are organized into projects, or you haven't created any videos yet.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const selectedProjectData = projects.find(p => p.id === selectedProject);

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-blue-500" />
              {selectedProjectData?.name || 'Project'}
            </CardTitle>
            {selectedProjectData?.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {selectedProjectData.description}
              </p>
            )}
          </div>
        </div>
        
        {projectDetails && (
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1">
              <VideoIconSm className="w-4 h-4" />
              <span>{projectDetails.totalVideos} videos</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>{projectDetails.completedVideos} completed</span>
            </div>
            {projectDetails.processingVideos > 0 && (
              <div className="flex items-center gap-1">
                <Loader2 className="w-4 h-4 text-yellow-500" />
                <span>{projectDetails.processingVideos} processing</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{projectDetails.totalDuration}s total</span>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {projectLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="ml-2">Loading project...</span>
          </div>
        ) : projectDetails?.videos?.length ? (
          <div className="space-y-4">
            <div className={compact ? "grid grid-cols-1 gap-2" : "grid grid-cols-1 sm:grid-cols-2 gap-4"}>
              {projectDetails.videos.slice(0, 8).map((video: Video) => (
                <VideoCard 
                  key={video.id}
                  video={{
                    ...video,
                    model: video.model || 'hailuo-02',
                    status: video.status as 'pending' | 'processing' | 'completed' | 'failed',
                    createdAt: typeof video.createdAt === 'string' ? video.createdAt : video.createdAt?.toISOString() || null
                  }}
                  className="w-full"
                />
              ))}
            </div>
            
            {projectDetails.videos.length > 8 && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  {projectDetails.videos.length - 8} more videos in this project...
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  View All Project Videos
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <FolderOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Videos in Project</h3>
            <p className="text-muted-foreground text-sm mb-4">
              This project doesn't have any videos yet. Generate your first video above to get started.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Video Gallery Component
function VideoGallery() {
  const { toast } = useToast();
  
  // State for managing collapse state of project groups
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  
  // Filter and selection state
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'processing' | 'failed'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | '7days' | '30days'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  
  // Undo state
  const [undoStack, setUndoStack] = useState<Array<{
    type: 'move' | 'delete';
    videos: Video[];
    originalProjectIds?: (string | null)[];
    timestamp: number;
  }>>([]);

  // Fetch projects with stats
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['/api/projects', { withStats: true }],
    queryFn: () => apiRequest('/api/projects?withStats=true'),
  });

  // Fetch all videos
  const { data: videosResponse, isLoading: videosLoading, refetch: refetchVideos } = useQuery<{items: Video[]}>({
    queryKey: ['/api/video'],
    queryFn: () => apiRequest('/api/video'),
  });

  const isLoading = projectsLoading || videosLoading;
  const projects = projectsData || [];
  const allVideos = videosResponse?.items || [];

  // Filter and selection functions
  const filterVideos = (videos: Video[]) => {
    return videos.filter(video => {
      // Status filter
      if (statusFilter !== 'all' && video.status !== statusFilter) {
        return false;
      }
      
      // Date filter
      if (dateFilter !== 'all') {
        const videoDate = new Date(video.createdAt || '');
        const now = new Date();
        const daysDiff = (now.getTime() - videoDate.getTime()) / (1000 * 3600 * 24);
        
        if (dateFilter === '7days' && daysDiff > 7) return false;
        if (dateFilter === '30days' && daysDiff > 30) return false;
      }
      
      // Search filter
      if (searchQuery && !video.prompt.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  };

  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    if (isSelectMode) {
      setSelectedVideos(new Set());
    }
  };

  const toggleVideoSelection = (videoId: string) => {
    setSelectedVideos(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(videoId)) {
        newSelection.delete(videoId);
      } else {
        newSelection.add(videoId);
      }
      return newSelection;
    });
  };

  const selectAllVisibleVideos = (videos: Video[]) => {
    const visibleVideoIds = videos.map(v => v.id);
    setSelectedVideos(new Set(visibleVideoIds));
  };

  const clearSelection = () => {
    setSelectedVideos(new Set());
  };

  // Bulk action functions
  const bulkMoveVideos = async (targetProjectId: string | null) => {
    const videosToMove = allVideos.filter(v => selectedVideos.has(v.id));
    const originalProjectIds = videosToMove.map(v => v.projectId);
    
    try {
      // Optimistic update
      queryClient.setQueryData(['/api/video'], (oldData: any) => {
        if (!oldData?.items) return oldData;
        return {
          ...oldData,
          items: oldData.items.map((video: Video) =>
            selectedVideos.has(video.id) ? { ...video, projectId: targetProjectId } : video
          )
        };
      });

      // API calls
      await Promise.all(
        Array.from(selectedVideos).map(videoId =>
          apiRequest(`/api/video/${videoId}/move`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId: targetProjectId }),
          })
        )
      );

      // Add to undo stack
      setUndoStack(prev => [...prev.slice(-4), {
        type: 'move',
        videos: videosToMove,
        originalProjectIds,
        timestamp: Date.now()
      }]);

      const targetName = targetProjectId 
        ? projects.find((p: Project) => p.id === targetProjectId)?.name || 'Unknown Project'
        : 'Unassigned';

      toast({
        title: 'Videos moved successfully',
        description: `${selectedVideos.size} video(s) moved to ${targetName}`,
        action: (
          <Button variant="outline" size="sm" onClick={() => undoMove(videosToMove, originalProjectIds)}>
            Undo
          </Button>
        ),
      });

      clearSelection();
      refetchVideos();
      
    } catch (error) {
      console.error('Bulk move failed:', error);
      
      // Revert optimistic update
      refetchVideos();
      
      toast({
        title: 'Failed to move videos',
        description: 'Some videos could not be moved. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const bulkDeleteVideos = async () => {
    const videosToDelete = allVideos.filter(v => selectedVideos.has(v.id));
    
    try {
      // Optimistic update
      queryClient.setQueryData(['/api/video'], (oldData: any) => {
        if (!oldData?.items) return oldData;
        return {
          ...oldData,
          items: oldData.items.filter((video: Video) => !selectedVideos.has(video.id))
        };
      });

      // API calls
      await Promise.all(
        Array.from(selectedVideos).map(videoId =>
          apiRequest(`/api/video/${videoId}`, { method: 'DELETE' })
        )
      );

      // Add to undo stack
      setUndoStack(prev => [...prev.slice(-4), {
        type: 'delete',
        videos: videosToDelete,
        timestamp: Date.now()
      }]);

      toast({
        title: 'Videos deleted successfully',
        description: `${selectedVideos.size} video(s) deleted`,
        action: (
          <Button variant="outline" size="sm" onClick={() => undoDelete(videosToDelete)}>
            Undo
          </Button>
        ),
      });

      clearSelection();
      refetchVideos();
      
    } catch (error) {
      console.error('Bulk delete failed:', error);
      
      // Revert optimistic update
      refetchVideos();
      
      toast({
        title: 'Failed to delete videos',
        description: 'Some videos could not be deleted. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const bulkDownloadVideos = async () => {
    const videosToDownload = allVideos.filter(v => selectedVideos.has(v.id) && v.url);
    
    if (videosToDownload.length === 0) {
      toast({
        title: 'No videos to download',
        description: 'Selected videos are not ready for download.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Starting downloads',
      description: `Downloading ${videosToDownload.length} video(s)...`,
    });

    for (const video of videosToDownload) {
      if (video.url) {
        try {
          const response = await fetch(video.url);
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          
          const link = document.createElement('a');
          link.href = url;
          link.download = `video-${video.id}.mp4`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        } catch (error) {
          console.error(`Failed to download video ${video.id}:`, error);
        }
      }
    }
  };

  // Undo functions
  const undoMove = async (videos: Video[], originalProjectIds: (string | null)[]) => {
    try {
      await Promise.all(
        videos.map((video, index) =>
          apiRequest(`/api/video/${video.id}/move`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId: originalProjectIds[index] }),
          })
        )
      );
      
      refetchVideos();
      toast({
        title: 'Move undone',
        description: 'Videos restored to their original projects',
      });
    } catch (error) {
      toast({
        title: 'Undo failed',
        description: 'Could not restore videos to original projects',
        variant: 'destructive',
      });
    }
  };

  const undoDelete = async (videos: Video[]) => {
    // Note: For now, this is just client-side restoration from the undo stack
    // In a real app, you'd need server-side soft delete functionality
    queryClient.setQueryData(['/api/video'], (oldData: any) => {
      if (!oldData?.items) return { items: videos };
      return {
        ...oldData,
        items: [...oldData.items, ...videos]
      };
    });
    
    toast({
      title: 'Delete undone',
      description: 'Videos restored (client-side only)',
    });
  };

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const getProjectName = (groupId: string) => {
    if (groupId === 'unassigned') return 'Unassigned';
    const project = projects.find((p: any) => p.id === groupId);
    return project?.name || 'Unknown Project';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading gallery...</span>
      </div>
    );
  }

  if (allVideos.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/5 p-8">
        <div className="text-center space-y-3">
          <VideoIcon className="w-16 h-16 text-muted-foreground mx-auto" />
          <h3 className="text-lg font-medium">No Videos Yet</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Generate your first video using the form above. Videos will appear here once completed.
          </p>
        </div>
      </div>
    );
  }

  // Apply filters to all videos first
  const filteredVideos = filterVideos(allVideos);

  // Group filtered videos by projectId
  const videoGroups: Record<string, Video[]> = {};
  
  // Initialize groups for all projects
  projects.forEach((project: any) => {
    videoGroups[project.id] = [];
  });
  
  // Add unassigned group
  videoGroups['unassigned'] = [];

  // Group filtered videos
  filteredVideos.forEach((video) => {
    const groupKey = video.projectId || 'unassigned';
    if (!videoGroups[groupKey]) {
      videoGroups[groupKey] = [];
    }
    videoGroups[groupKey].push(video);
  });

  // Filter out empty groups and sort
  const nonEmptyGroups = Object.entries(videoGroups).filter(([_, videos]) => videos.length > 0);

  return (
    <div className="space-y-6">
      {/* Gallery Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Video Gallery</h3>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{filteredVideos.length} of {allVideos.length} videos</Badge>
          <Button
            variant={isSelectMode ? "default" : "outline"}
            size="sm"
            onClick={toggleSelectMode}
            className="gap-2"
          >
            {isSelectMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            {isSelectMode ? 'Exit Select' : 'Select Mode'}
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Status Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Status
            </Label>
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Date Range
            </Label>
            <Select value={dateFilter} onValueChange={(value: any) => setDateFilter(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Search className="w-4 h-4" />
              Search Prompts
            </Label>
            <Input
              placeholder="Search by prompt..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-8"
            />
          </div>

          {/* Clear Filters */}
          <div className="space-y-2">
            <Label className="text-sm font-medium opacity-0">Actions</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStatusFilter('all');
                setDateFilter('all');
                setSearchQuery('');
              }}
              className="w-full"
              disabled={statusFilter === 'all' && dateFilter === 'all' && !searchQuery}
            >
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Selection Actions when in Select Mode */}
        {isSelectMode && filteredVideos.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectAllVisibleVideos(filteredVideos)}
                disabled={filteredVideos.every(v => selectedVideos.has(v.id))}
              >
                Select All Visible
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelection}
                disabled={selectedVideos.size === 0}
              >
                Clear Selection
              </Button>
              <span className="text-sm text-muted-foreground">
                {selectedVideos.size} video{selectedVideos.size !== 1 ? 's' : ''} selected
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Bulk Actions Bar */}
      {isSelectMode && selectedVideos.size > 0 && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-primary" />
              <span className="font-medium">{selectedVideos.size} videos selected</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Move to Project */}
              <Select onValueChange={bulkMoveVideos}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Move to..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null as any}>Unassigned</SelectItem>
                  {projects.map((project: any) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={bulkDownloadVideos}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
              
              <Button
                variant="destructive"
                size="sm"
                onClick={bulkDeleteVideos}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsSelectMode(false);
                  clearSelection();
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Video Groups */}
      {nonEmptyGroups.length === 0 ? (
        <div className="rounded-lg border bg-muted/5 p-8">
          <div className="text-center space-y-3">
            <Folder className="w-16 h-16 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-medium">
              {filteredVideos.length === 0 && allVideos.length > 0 
                ? 'No videos match your filters' 
                : 'No Video Groups'
              }
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {filteredVideos.length === 0 && allVideos.length > 0
                ? 'Try adjusting your filter criteria to see more videos.'
                : 'Videos will be organized by projects once you generate some content.'
              }
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {nonEmptyGroups.map(([groupId, videos]) => {
            const isCollapsed = collapsedGroups[groupId];
            const projectName = getProjectName(groupId);
            const originalGroupSize = allVideos.filter(v => 
              (v.projectId || 'unassigned') === groupId
            ).length;
            
            return (
              <Card key={groupId}>
                <Collapsible open={!isCollapsed} onOpenChange={() => toggleGroup(groupId)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="hover:bg-muted/50 cursor-pointer transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {isCollapsed ? (
                              <ChevronRight className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                            <Folder className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{projectName}</CardTitle>
                            {groupId !== 'unassigned' && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {projects.find((p: any) => p.id === groupId)?.description || ''}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {videos.length}{originalGroupSize !== videos.length && ` of ${originalGroupSize}`} video{originalGroupSize !== 1 ? 's' : ''}
                          </Badge>
                          {isSelectMode && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                const groupVideoIds = videos.map(v => v.id);
                                const allSelected = groupVideoIds.every(id => selectedVideos.has(id));
                                
                                if (allSelected) {
                                  setSelectedVideos(prev => {
                                    const newSet = new Set(prev);
                                    groupVideoIds.forEach(id => newSet.delete(id));
                                    return newSet;
                                  });
                                } else {
                                  setSelectedVideos(prev => {
                                    const newSet = new Set(prev);
                                    groupVideoIds.forEach(id => newSet.add(id));
                                    return newSet;
                                  });
                                }
                              }}
                            >
                              {videos.every(v => selectedVideos.has(v.id)) ? (
                                <CheckSquare className="w-4 h-4" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {videos.map((video) => (
                          <div 
                            key={video.id}
                            className={`relative ${isSelectMode ? 'cursor-pointer' : ''}`}
                            onClick={() => isSelectMode && toggleVideoSelection(video.id)}
                          >
                            {isSelectMode && (
                              <div className="absolute top-2 left-2 z-10">
                                <div className="bg-background/80 backdrop-blur-sm rounded-full p-1">
                                  {selectedVideos.has(video.id) ? (
                                    <CheckSquare className="w-5 h-5 text-primary" />
                                  ) : (
                                    <Square className="w-5 h-5 text-muted-foreground" />
                                  )}
                                </div>
                              </div>
                            )}
                            <VideoCard
                              video={{
                                ...video,
                                model: video.model || 'hailuo-02',
                                status: video.status as 'pending' | 'processing' | 'completed' | 'failed',
                                createdAt: typeof video.createdAt === 'string' ? video.createdAt : video.createdAt?.toISOString() || null
                              }}
                              className={`w-full ${isSelectMode && selectedVideos.has(video.id) ? 'ring-2 ring-primary' : ''}`}
                            />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Video generation form schema
const videoGenerationSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(2000, 'Prompt must be less than 2000 characters'),
  model: z.enum(['hailuo-02']),
  resolution: z.enum(['512p', '768p', '1080p']),
  duration: z.number().int().min(6).max(10), // 6 or 10 seconds only  
  projectId: z.string().optional(),
  firstFrameImage: z.string().optional(), // determines aspect ratio AND gets saved as reference
  promptOptimizer: z.boolean().default(true),
});

export type VideoGenerationForm = z.infer<typeof videoGenerationSchema>;

// DIAGNOSTIC: Log model configuration loading
console.log('[DIAGNOSTIC] Loading VIDEO_MODELS configuration');

// Video model configurations - Only Hailuo-02 is available
const VIDEO_MODELS = {
  'hailuo-02': {
    label: 'Minimax Hailuo-02',
    description: 'High-quality video generation (3-6 min processing time)',
    maxDuration: 10, // 6 or 10 seconds
    resolutions: ['512p', '768p', '1080p'],
    supportsDurationInt: true,
    supportsFirstFrame: true,
    supportsPromptOptimizer: true,
    durationOptions: [
      { value: 6, label: '6 seconds' },
      { value: 10, label: '10 seconds (768p only)' }
    ]
  }
};

// DIAGNOSTIC: Log the loaded models
console.log('[DIAGNOSTIC] VIDEO_MODELS loaded:', {
  modelKeys: Object.keys(VIDEO_MODELS),
  models: Object.entries(VIDEO_MODELS).reduce((acc, [key, model]) => {
    acc[key] = {
      label: model.label,
      maxDuration: model.maxDuration,
      maxDurationType: typeof model.maxDuration,
      resolutions: model.resolutions
    };
    return acc;
  }, {} as any)
});

// Project interface
interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// Result entry type for the new results system
type ResultEntry = {
  videoId: string;
  submittedAt: number;
  promptAtSubmit: string;
  modelAtSubmit: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  data?: Video; // Video data when fetched from API
};

export default function VideoPage() {
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<string>('none');
  const [activeTab, setActiveTab] = useState<'create' | 'gallery'>('create');
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [firstFrameImagePreview, setFirstFrameImagePreview] = useState<string | null>(null);
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false);
  const [recentlyGeneratedVideos, setRecentlyGeneratedVideos] = useState<string[]>([]);
  
  // Job Tray state
  const [jobTrayItems, setJobTrayItems] = useState<JobTrayItem[]>([]);
  
  // Track active polling for each job
  const [activePolling, setActivePolling] = useState<Set<string>>(new Set());
  
  // New results system - tracks each video by ID to prevent mismatches
  const [results, setResults] = useState<ResultEntry[]>([]);
  const [activeResultVideoId, setActiveResultVideoId] = useState<string | null>(null);

  // Form setup
  const form = useForm<VideoGenerationForm>({
    resolver: zodResolver(videoGenerationSchema),
    defaultValues: {
      prompt: '',
      model: 'hailuo-02',
      resolution: '1080p',
      duration: 6,
      promptOptimizer: true,
    },
  });

  const watchedModel = form.watch('model');
  
  // Always use hailuo-02 as it's the only model available
  const currentModel = 'hailuo-02';

  // Fetch projects
  const { data: projects, isLoading: projectsLoading, refetch: refetchProjects } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    queryFn: () => apiRequest('/api/projects'),
    retry: false,
  });

  // Fetch recent videos
  const { data: recentVideos, isLoading: recentVideosLoading } = useQuery<{ items: Video[]; nextCursor: string | null }>({
    queryKey: ['/api/video', 'recent'],
    queryFn: () => apiRequest('/api/video?limit=5&status=completed'),
    retry: false,
  });

  // Video prompt enhancement mutation
  const enhanceVideoPromptMutation = useMutation({
    mutationFn: async () => {
      const currentPrompt = form.getValues("prompt");
      
      if (currentPrompt.length < 3) {
        throw new Error("Prompt must be at least 3 characters long");
      }
      
      // Prepare the request payload
      const payload: any = {
        text: currentPrompt,
        model: "minimax-hailuo-02",
      };
      
      // Only include image if there's actually one selected
      if (firstFrameImagePreview) {
        payload.image = firstFrameImagePreview;
      }
      
      const response = await apiRequest("/api/enhance-video-prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      
      return response;
    },
    onSuccess: (data) => {
      // Update the form with the enhanced prompt
      if (data.prompt) {
        form.setValue("prompt", data.prompt);
      }
      
      setIsEnhancingPrompt(false);
      toast({
        title: "Video prompt enhanced!",
        description: "Your prompt has been optimized for video generation",
      });
    },
    onError: (error: any) => {
      setIsEnhancingPrompt(false);
      toast({
        title: "Couldn't enhance prompt",
        description: "API error: " + (error.message || "Unknown error"),
        variant: "destructive",
      });
    }
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (projectData: { name: string; description?: string }) => {
      return await apiRequest('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      });
    },
    onSuccess: (newProject) => {
      setSelectedProject(newProject.id);
      setShowCreateProject(false);
      setNewProjectName('');
      setNewProjectDescription('');
      // Invalidate and refetch projects
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      refetchProjects();
      toast({
        title: 'Project Created',
        description: `Project "${newProject.name}" has been created successfully.`,
      });
    },
    onError: () => {
      toast({
        title: 'Project Creation Failed',
        description: 'Could not create project. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Video generation mutation
  const generateVideoMutation = useMutation({
    mutationFn: async (data: VideoGenerationForm) => {
      const payload = {
        ...data,
        projectId: selectedProject === 'none' ? undefined : selectedProject,
      };
      
      return await apiRequest('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Video Generation Started',
        description: 'Processing will take 3-6 minutes. We\'ll notify you when complete.',
      });
      
      // Capture form data snapshot for the results system
      if (data.video?.id) {
        const formValues = form.getValues();
        
        // Add to Job Tray immediately
        const newJob: JobTrayItem = {
          id: data.video.id,
          status: 'pending',
          prompt: data.video.prompt || formValues.prompt,
          model: data.video.model || formValues.model,
          createdAt: Date.now()
        };
        setJobTrayItems(prev => [newJob, ...prev.slice(0, 4)]); // Keep max 5 jobs
        
        // Add to Results array with form snapshot to prevent mismatches
        const newResult: ResultEntry = {
          videoId: data.video.id,
          submittedAt: Date.now(),
          promptAtSubmit: formValues.prompt,
          modelAtSubmit: formValues.model,
          status: 'pending'
        };
        setResults(prev => [newResult, ...prev.slice(0, 4)]); // Keep last 5 results
        
        // Set as active result
        setActiveResultVideoId(data.video.id);
        
        // Start polling for this specific job
        pollVideoStatus(data.video.id);
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Generation Failed',
        description: error?.message || 'Could not start video generation. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Poll for video status - now handles individual jobs
  const pollVideoStatus = async (videoId: string) => {
    // Prevent duplicate polling for the same video
    if (activePolling.has(videoId)) {
      return;
    }

    setActivePolling(prev => new Set(Array.from(prev).concat([videoId])));

    const maxAttempts = 60; // 6 minutes with 6-second intervals
    let attempts = 0;

    const poll = async () => {
      try {
        attempts++;
        
        const response = await apiRequest(`/api/video/status/${videoId}`);
        
        if (response.status === 'completed') {
          // Update Job Tray item
          handleJobUpdate(videoId, 'completed');
          
          toast({
            title: 'Video Ready!',
            description: 'Your video has been generated successfully.',
          });
          
          // Always refresh videos to show in recent videos section
          queryClient.invalidateQueries({ queryKey: ['/api/video'] });
          
          // Add to recently generated videos for immediate display
          setRecentlyGeneratedVideos(prev => [videoId, ...prev.slice(0, 4)]);
          
          // Update the specific result entry with fetched data
          setResults(prev => prev.map(result => 
            result.videoId === videoId 
              ? { 
                  ...result, 
                  status: 'completed' as const,
                  data: {
                    ...response,
                    model: response.model || 'hailuo-02',
                    status: response.status as 'pending' | 'processing' | 'completed' | 'failed',
                    createdAt: response.createdAt instanceof Date 
                      ? response.createdAt.toISOString() 
                      : response.createdAt || new Date().toISOString()
                  }
                }
              : result
          ));
          
          // Auto-select this result as the active one
          setActiveResultVideoId(videoId);
          
          // Stop polling for this job
          setActivePolling(prev => {
            const newSet = new Set(prev);
            newSet.delete(videoId);
            return newSet;
          });
          return;
        }
        
        if (response.status === 'failed') {
          // Update Job Tray item with error
          handleJobUpdate(videoId, 'failed', response.error || 'Generation failed');
          
          // Update the specific result entry with failed status
          setResults(prev => prev.map(result => 
            result.videoId === videoId 
              ? { ...result, status: 'failed' as const }
              : result
          ));
          
          toast({
            title: 'Video Generation Failed',
            description: response.error || 'The video could not be generated.',
            variant: 'destructive',
          });
          
          // Stop polling for this job
          setActivePolling(prev => {
            const newSet = new Set(prev);
            newSet.delete(videoId);
            return newSet;
          });
          return;
        }
        
        // Update Job Tray status to processing
        if (response.status === 'processing') {
          handleJobUpdate(videoId, 'processing');
        }
        
        // Update results status for any non-completed/failed status
        setResults(prev => prev.map(result => 
          result.videoId === videoId 
            ? { ...result, status: response.status as 'pending' | 'processing' | 'completed' | 'failed' }
            : result
        ));
        
        // Continue polling if still processing
        if (attempts < maxAttempts) {
          setTimeout(poll, 6000); // Poll every 6 seconds
        } else {
          // Timeout
          handleJobUpdate(videoId, 'failed', 'Generation timed out');
          toast({
            title: 'Generation Timeout',
            description: 'Video generation is taking longer than expected. Please check back later.',
            variant: 'destructive',
          });
          
          // Stop polling for this job
          setActivePolling(prev => {
            const newSet = new Set(prev);
            newSet.delete(videoId);
            return newSet;
          });
        }
      } catch (error) {
        console.error('Error polling video status:', error);
        
        // Retry a few times on network errors
        if (attempts < 5) {
          setTimeout(poll, 6000);
        } else {
          handleJobUpdate(videoId, 'failed', 'Failed to check status');
          
          // Stop polling for this job
          setActivePolling(prev => {
            const newSet = new Set(prev);
            newSet.delete(videoId);
            return newSet;
          });
        }
      }
    };

    // Start polling
    poll();
  };

  // Job Tray handlers
  const handleJobUpdate = (jobId: string, status: JobTrayItem['status'], error?: string) => {
    setJobTrayItems(prev => 
      prev.map(job => 
        job.id === jobId 
          ? { ...job, status, error }
          : job
      )
    );
  };

  const handleJobDismiss = (jobId: string) => {
    setJobTrayItems(prev => prev.filter(job => job.id !== jobId));
  };

  const handlePlayVideo = async (videoId: string) => {
    try {
      // Fetch the full video data
      const response = await apiRequest(`/api/video/status/${videoId}`);
      
      if (response.status === 'completed') {
        // Update the specific result entry with fetched data
        setResults(prev => {
          const existingIndex = prev.findIndex(r => r.videoId === videoId);
          if (existingIndex >= 0) {
            // Update existing result
            return prev.map(result => 
              result.videoId === videoId 
                ? { 
                    ...result, 
                    status: 'completed' as const,
                    data: {
                      ...response,
                      model: response.model || 'hailuo-02',
                      status: response.status as 'pending' | 'processing' | 'completed' | 'failed',
                      createdAt: response.createdAt instanceof Date 
                        ? response.createdAt.toISOString() 
                        : response.createdAt || new Date().toISOString()
                    }
                  }
                : result
            );
          } else {
            // Create new result entry if not found
            const newResult: ResultEntry = {
              videoId,
              submittedAt: Date.now(),
              promptAtSubmit: response.prompt || 'Unknown prompt',
              modelAtSubmit: response.model || 'hailuo-02',
              status: 'completed',
              data: {
                ...response,
                model: response.model || 'hailuo-02',
                status: response.status as 'pending' | 'processing' | 'completed' | 'failed',
                createdAt: response.createdAt instanceof Date 
                  ? response.createdAt.toISOString() 
                  : response.createdAt || new Date().toISOString()
              }
            };
            return [newResult, ...prev.slice(0, 4)];
          }
        });
        
        // Set as active result and scroll to Result panel
        setActiveResultVideoId(videoId);
        
        setTimeout(() => {
          const resultPanel = document.querySelector('[data-result-panel]');
          if (resultPanel) {
            resultPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error playing video:', error);
      toast({
        title: 'Playback Error',
        description: 'Could not load video for playback.',
        variant: 'destructive',
      });
    }
  };

  const handleJumpToResult = (videoId: string) => {
    // Set this video as the active result and scroll to Result panel
    setActiveResultVideoId(videoId);
    
    // Scroll to Result panel smoothly
    setTimeout(() => {
      const resultPanel = document.querySelector('[data-result-panel]');
      if (resultPanel) {
        resultPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // Handle duration and resolution validation
  useEffect(() => {
    const currentDuration = form.watch('duration');
    const currentResolution = form.watch('resolution');
    
    // If 10 seconds is selected but resolution is not 768p, change to 6 seconds
    if (currentDuration === 10 && currentResolution !== '768p') {
      form.setValue('duration', 6);
      toast({
        title: 'Duration Adjusted',
        description: '10 seconds is only available for 768p resolution.',
        variant: 'destructive',
      });
    }
  }, [form.watch('duration'), form.watch('resolution'), form, toast]);

  const handleEnhancePrompt = () => {
    const currentPrompt = form.getValues('prompt');
    if (currentPrompt.trim().length < 3) {
      toast({
        title: "Prompt too short",
        description: "Please enter at least 3 characters to enhance the prompt",
        variant: "destructive",
      });
      return;
    }
    
    setIsEnhancingPrompt(true);
    enhanceVideoPromptMutation.mutate();
  };

  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      createProjectMutation.mutate({
        name: newProjectName.trim(),
        description: newProjectDescription.trim() || undefined,
      });
    }
  };

  const onSubmit = (data: VideoGenerationForm) => {
    generateVideoMutation.mutate(data);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <VideoIcon className="w-8 h-8 text-primary" />
          Video Creation
        </h1>
        <p className="text-muted-foreground">
          Generate AI-powered videos with advanced controls and project organization
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab as any} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create" className="flex items-center gap-2">
            <VideoIcon className="w-4 h-4" />
            Create Video
          </TabsTrigger>
          <TabsTrigger value="gallery" className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4" />
            Gallery
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column - Generation Form (8/12 columns) */}
            <div className="lg:col-span-8 space-y-6">
              {/* Video Generation Form */}
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Video Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Model Selection */}
                    <div className="space-y-2">
                      <Label>AI Model</Label>
                      <Select
                        value={form.watch('model')}
                        onValueChange={(value) => form.setValue('model', value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(VIDEO_MODELS).map(([key, model]) => (
                            <SelectItem key={key} value={key}>
                              <div className="flex flex-col items-start">
                                <span className="font-medium">{model.label}</span>
                                <span className="text-sm text-muted-foreground">
                                  {model.description}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    {/* Prompt */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Prompt</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleEnhancePrompt}
                          disabled={!form.watch('prompt')?.trim() || isEnhancingPrompt}
                          className="flex items-center gap-2"
                        >
                          {isEnhancingPrompt ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4" />
                          )}
                          AI Enhance
                        </Button>
                      </div>
                      <Textarea
                        placeholder="Describe the video you want to generate..."
                        className="min-h-[100px]"
                        {...form.register('prompt')}
                      />
                      {form.formState.errors.prompt && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.prompt.message}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Resolution */}
                      <div className="space-y-2">
                        <Label>Resolution</Label>
                        <Select
                          value={form.watch('resolution')}
                          onValueChange={(value) => form.setValue('resolution', value as any)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {VIDEO_MODELS[currentModel]?.resolutions?.map((res: string) => (
                              <SelectItem key={res} value={res}>
                                {res}
                              </SelectItem>
                            )) || []}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Duration */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Duration
                        </Label>
                        <Select
                          value={form.watch('duration')?.toString()}
                          onValueChange={(value) => {
                            // Handle different duration formats for different models
                            if (VIDEO_MODELS[currentModel]?.supportsDurationInt) {
                              form.setValue('duration', parseInt(value));
                            } else {
                              form.setValue('duration', value as any);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="6">6 seconds</SelectItem>
                            <SelectItem value="10">10 seconds (768p only)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Separator />

                    {/* Model-specific Options */}
                    {currentModel === 'hailuo-02' && (
                      <>
                        {/* Prompt Optimizer for Hailuo-02 */}
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Prompt Optimizer</Label>
                            <p className="text-sm text-muted-foreground">
                              Automatically enhance your prompt for better results
                            </p>
                          </div>
                          <Switch
                            checked={form.watch('promptOptimizer')}
                            onCheckedChange={(checked) => form.setValue('promptOptimizer', checked)}
                          />
                        </div>

                        {/* First Frame Image for Hailuo-02 */}
                        <div className="space-y-2">
                          <Label>First Frame Image (Optional)</Label>
                          <p className="text-sm text-muted-foreground">
                            Sets the aspect ratio for your video and guides the generation style
                          </p>
                          <ReferenceImageUpload
                            value={firstFrameImagePreview || undefined}
                            onChange={(value) => {
                              setFirstFrameImagePreview(value || null);
                              form.setValue('firstFrameImage', value || '');
                            }}
                            className="w-full"
                          />
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Button
                  type="submit"
                  size="lg"
                  disabled={generateVideoMutation.isPending || !form.watch('prompt')?.trim()}
                  className="w-full"
                >
                  {generateVideoMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting generation...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Generate Video
                    </>
                  )}
                </Button>
              </form>
            </div>

            {/* Right Column - Project Panel (4/12 columns) */}
            <div className="lg:col-span-4">
              <Card className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-8rem)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FolderOpen className="w-5 h-5" />
                    Project Panel
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto">
                  {/* Project Selection */}
                  {projectsLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Loading projects...</span>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label>Select Project</Label>
                        <Select value={selectedProject} onValueChange={setSelectedProject}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a project (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Project</SelectItem>
                            {projects?.map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowCreateProject(!showCreateProject)}
                          className="flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          New Project
                        </Button>
                      </div>

                      {showCreateProject && (
                        <div className="space-y-3 p-4 border rounded-lg bg-muted/5">
                          <div className="space-y-2">
                            <Label htmlFor="newProjectName">Project Name</Label>
                            <Input
                              id="newProjectName"
                              placeholder="Enter project name"
                              value={newProjectName}
                              onChange={(e) => setNewProjectName(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="newProjectDescription">Description (optional)</Label>
                            <Input
                              id="newProjectDescription"
                              placeholder="Enter project description"
                              value={newProjectDescription}
                              onChange={(e) => setNewProjectDescription(e.target.value)}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={handleCreateProject}
                              disabled={!newProjectName.trim() || createProjectMutation.isPending}
                              size="sm"
                            >
                              {createProjectMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                'Create'
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setShowCreateProject(false)}
                              size="sm"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Project Videos */}
                  <div className="space-y-3">
                    <Separator />
                    <h4 className="text-sm font-medium">
                      {selectedProject === 'none' ? 'Unassigned Videos' : 'Project Videos'}
                    </h4>
                    
                    <ProjectVideoPreview 
                      selectedProject={selectedProject} 
                      projects={projects || []}
                      compact={true}
                      onVideoPlay={(videoId) => console.log('Playing video:', videoId)}
                      onVideoDelete={(videoId) => console.log('Deleting video:', videoId)}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Results Panel - Multiple concurrent results */}
          {results.length > 0 && (
            <div className="space-y-4 mt-8" data-result-panel>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-primary" />
                  Results
                  <Badge variant="secondary" className="ml-2">
                    {results.length}
                  </Badge>
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setResults([])}
                    className="text-xs"
                  >
                    Clear All
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab('gallery')}
                    className="flex items-center gap-2"
                  >
                    <FolderOpen className="w-4 h-4" />
                    Open in Gallery
                  </Button>
                </div>
              </div>
              
              {/* Recent Results Grid */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {results.slice(0, 5).map((result, index) => {
                  const isActive = activeResultVideoId === result.videoId;
                  const isCompleted = result.status === 'completed' && result.data;
                  
                  // Calculate elapsed time
                  const getElapsedTime = () => {
                    if (!result.submittedAt) return 'Unknown time';
                    
                    try {
                      const startTime = new Date(result.submittedAt);
                      const now = new Date();
                      
                      // Check if date is valid
                      if (isNaN(startTime.getTime())) return 'Unknown time';
                      
                      const diffMs = now.getTime() - startTime.getTime();
                      const diffSeconds = Math.floor(diffMs / 1000);
                      const diffMinutes = Math.floor(diffSeconds / 60);
                      const diffHours = Math.floor(diffMinutes / 60);
                      
                      // For completed jobs, stop the clock to show total generation time
                      // For processing jobs, show elapsed time
                      if (diffHours > 0) return `${diffHours}h ${diffMinutes % 60}m`;
                      if (diffMinutes > 0) return `${diffMinutes}m ${diffSeconds % 60}s`;
                      return `${diffSeconds}s`;
                    } catch (error) {
                      return 'Unknown time';
                    }
                  };
                  
                  return (
                    <Card 
                      key={result.videoId}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        isActive ? 'ring-2 ring-primary shadow-lg' : ''
                      } ${!isCompleted ? 'opacity-60' : ''}`}
                      onClick={() => isCompleted && setActiveResultVideoId(result.videoId)}
                    >
                      <CardContent className="p-4 space-y-3">
                        {/* Status Header */}
                        <div className="flex items-center justify-between">
                          <Badge 
                            variant={
                              result.status === 'completed' ? 'default' :
                              result.status === 'processing' ? 'secondary' :
                              result.status === 'failed' ? 'destructive' :
                              'outline'
                            }
                            className="text-xs font-medium"
                          >
                            {result.status === 'processing' && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                            {result.status === 'failed' && <AlertCircle className="w-3 h-3 mr-1" />}
                            {result.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                            {result.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {result.status === 'processing' ? 'Generating' :
                             result.status === 'completed' ? 'Ready' :
                             result.status === 'failed' ? 'Failed' : 'Queued'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">#{index + 1}</span>
                        </div>
                        
                        {/* Prompt Preview */}
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground line-clamp-2 leading-relaxed">
                            {isCompleted && result.data ? result.data.prompt : result.promptAtSubmit}
                          </p>
                        </div>
                        
                        {/* Elapsed Time & Model Info */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {getElapsedTime()}
                          </span>
                          {result.modelAtSubmit && (
                            <span className="bg-muted px-2 py-1 rounded text-xs">
                              {result.modelAtSubmit}
                            </span>
                          )}
                        </div>
                        
                        {/* Progress indicator for processing */}
                        {result.status === 'processing' && (
                          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                            <div className="bg-primary h-1.5 rounded-full animate-pulse" 
                                 style={{
                                   width: '70%',
                                   animation: 'progress-shimmer 2s infinite'
                                 }}>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              {/* Active Result Display - Main Video Player */}
              {(() => {
                const activeResult = results.find(r => r.videoId === activeResultVideoId);
                if (!activeResult) return null;
                
                // Calculate elapsed time for active result
                const getActiveElapsedTime = () => {
                  if (!activeResult.submittedAt) return 'Unknown time';
                  
                  try {
                    const startTime = new Date(activeResult.submittedAt);
                    const now = new Date();
                    
                    // Check if date is valid
                    if (isNaN(startTime.getTime())) return 'Unknown time';
                    
                    const diffMs = now.getTime() - startTime.getTime();
                    const diffSeconds = Math.floor(diffMs / 1000);
                    const diffMinutes = Math.floor(diffSeconds / 60);
                    const diffHours = Math.floor(diffMinutes / 60);
                    
                    // For completed jobs, stop the clock to show total generation time
                    // For processing jobs, show elapsed time  
                    if (diffHours > 0) return `${diffHours}h ${diffMinutes % 60}m`;
                    if (diffMinutes > 0) return `${diffMinutes}m ${diffSeconds % 60}s`;
                    return `${diffSeconds}s`;
                  } catch (error) {
                    return 'Unknown time';
                  }
                };
                
                if (activeResult.status === 'completed' && activeResult.data) {
                  return (
                    <Card className="shadow-lg">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <CardTitle className="text-lg">Video Ready</CardTitle>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            {getActiveElapsedTime()}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="max-w-2xl">
                          <VideoCard
                            key={activeResult.data.id} // IMPORTANT: forces remount when ID changes
                            video={{
                              ...activeResult.data,
                              status: activeResult.data.status as 'pending' | 'processing' | 'completed' | 'failed',
                              createdAt: activeResult.data.createdAt instanceof Date 
                                ? activeResult.data.createdAt.toISOString() 
                                : activeResult.data.createdAt
                            }}
                            className="w-full"
                            autoPlay={true}
                            expanded={true}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                } else {
                  return (
                    <Card className="shadow-lg">
                      <CardContent className="p-6">
                        <div className="flex flex-col items-center justify-center space-y-4 py-8">
                          {/* Status Icon & Animation */}
                          <div className="relative">
                            {activeResult.status === 'processing' && (
                              <>
                                <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
                                <div className="absolute inset-0 rounded-full border-2 border-blue-200 animate-ping"></div>
                              </>
                            )}
                            {activeResult.status === 'failed' && (
                              <AlertCircle className="w-12 h-12 text-red-500" />
                            )}
                            {activeResult.status === 'pending' && (
                              <Clock className="w-12 h-12 text-yellow-500" />
                            )}
                          </div>
                          
                          {/* Status Message */}
                          <div className="text-center space-y-2">
                            <p className="text-xl font-semibold">
                              {activeResult.status === 'processing' && 'Generating Your Video'}
                              {activeResult.status === 'failed' && 'Generation Failed'}
                              {activeResult.status === 'pending' && 'Queued for Generation'}
                            </p>
                            <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
                              {activeResult.promptAtSubmit}
                            </p>
                            
                            {/* Elapsed Time */}
                            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-3">
                              <Clock className="w-4 h-4" />
                              <span>Started {getActiveElapsedTime()}</span>
                            </div>
                            
                            {/* Model Info */}
                            {activeResult.modelAtSubmit && (
                              <div className="mt-3">
                                <span className="bg-muted px-3 py-1 rounded-full text-xs">
                                  {activeResult.modelAtSubmit}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {/* Progress Bar for Processing */}
                          {activeResult.status === 'processing' && (
                            <div className="w-full max-w-md">
                              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                <div className="bg-blue-500 h-2 rounded-full" 
                                     style={{
                                       width: '75%',
                                       animation: 'progress-flow 3s infinite'
                                     }}>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground text-center mt-2">
                                This usually takes 3-6 minutes
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                }
              })()}
            </div>
          )}
          
          {/* Job Tray - Only show on Create tab */}
          {activeTab === 'create' && (
            <JobTray
              jobs={jobTrayItems}
              onJobUpdate={handleJobUpdate}
              onJobDismiss={handleJobDismiss}
              onPlayVideo={handlePlayVideo}
              onJumpToResult={handleJumpToResult}
            />
          )}
        </TabsContent>

        <TabsContent value="gallery" className="space-y-6">
          <VideoGallery />
        </TabsContent>
      </Tabs>
    </div>
  );
}