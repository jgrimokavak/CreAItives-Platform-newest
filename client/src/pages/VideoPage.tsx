import React, { useState, useEffect, useMemo } from 'react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
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
  X,
  Edit,
  Edit2,
  Save,
  MoreVertical,
  Copy,
  FolderClosed,
  Eye,
  EyeOff,
  Info,
  Trash
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import SimpleGalleryPage from './SimpleGalleryPage';
import ReferenceImageUpload from '@/components/ReferenceImageUpload';
import type { Video } from '@shared/schema';
import VideoCard from '@/components/VideoCard';

import { ModelSelector } from '@/components/ModelSelector';
import { VIDEO_MODELS as MODEL_CONFIG } from '@/config/models';



// ProjectGroup Component for the collapsible project folders
interface ProjectGroupProps {
  groupId: string;
  videos: Video[];
  projectName: string;
  projects: any[];
  isCollapsed: boolean;
  originalGroupSize: number;
  isSelectMode: boolean;
  selectedVideos: Set<string>;
  onToggleGroup: (groupId: string) => void;
  onToggleVideoSelection: (videoId: string) => void;
  onSelectAllInGroup: (videos: Video[]) => void;
  onMove?: (videoId: string, projectId: string | null) => void;
  onDeleteProject?: (projectId: string) => void;
  onDuplicateProject?: (projectId: string, name: string) => void;
  onArchiveProject?: (projectId: string) => void;
  onExportProject?: (projectId: string, name: string) => void;
}

function ProjectGroup({ 
  groupId, 
  videos, 
  projectName, 
  projects, 
  isCollapsed, 
  originalGroupSize,
  isSelectMode,
  selectedVideos,
  onToggleGroup,
  onToggleVideoSelection,
  onSelectAllInGroup,
  onMove,
  onDeleteProject,
  onDuplicateProject,
  onArchiveProject,
  onExportProject
}: ProjectGroupProps) {
  const { toast } = useToast();
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [editName, setEditName] = useState(projectName);
  const [editDescription, setEditDescription] = useState(
    projects.find((p: any) => p.id === groupId)?.description || ''
  );
  const [showInfo, setShowInfo] = useState(false);
  
  const project = projects.find((p: any) => p.id === groupId);
  const createdAt = project?.createdAt ? new Date(project.createdAt).toLocaleDateString() : null;
  const totalDuration = videos.reduce((sum, v) => sum + (Number(v.duration) || 0), 0);
  
  const handleSaveEdit = async () => {
    if (groupId !== 'unassigned' && editName.trim()) {
      try {
        console.log('Saving project edit:', { name: editName.trim(), description: editDescription.trim() || undefined });
        
        const response = await apiRequest(`/api/projects/${groupId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            name: editName.trim(), 
            description: editDescription.trim() || null 
          })
        });
        
        console.log('Project update response:', response);
        
        // Invalidate multiple related queries to ensure UI updates
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['/api/projects'] }),
          queryClient.invalidateQueries({ queryKey: ['/api/projects', groupId] }),
          queryClient.invalidateQueries({ queryKey: ['/api/projects', groupId, 'details'] })
        ]);
        
        toast({
          title: "Project updated successfully",
          description: `"${editName.trim()}" has been updated.`,
        });
        setIsEditingProject(false);
      } catch (error: any) {
        console.error('Project update error:', error);
        toast({
          title: "Update failed",
          description: error.message || "Failed to update project",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Invalid input",
        description: "Project name cannot be empty",
        variant: "destructive",
      });
    }
  };
  
  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${!isCollapsed && videos.length > 0 ? 'ring-1 ring-primary/20 shadow-sm' : ''} ${videos.length > 0 ? 'border-green-200' : 'border-gray-200'}`}>
      <Collapsible open={!isCollapsed} onOpenChange={() => onToggleGroup(groupId)}>
        <CollapsibleTrigger asChild>
          <CardHeader className="hover:bg-gradient-to-r hover:from-primary/5 hover:to-primary/10 cursor-pointer transition-all duration-200 group backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className="flex items-center gap-2">
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4 transition-transform" />
                  ) : (
                    <ChevronDown className="w-4 h-4 transition-transform" />
                  )}
                  {isCollapsed ? (
                    <FolderClosed className="w-5 h-5 text-primary" />
                  ) : (
                    <FolderOpen className="w-5 h-5 text-primary" />
                  )}
                </div>
                {isEditingProject && groupId !== 'unassigned' ? (
                  <div className="flex-1" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-background/95 backdrop-blur-sm rounded-lg border p-4 space-y-3 shadow-sm">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                        <Edit2 className="w-4 h-4" />
                        Edit Project Details
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground block mb-1">
                            Project Name
                          </label>
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Enter project name"
                            className="h-9 border-2 focus:border-primary transition-colors"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveEdit();
                              }
                              if (e.key === 'Escape') {
                                setEditName(projectName);
                                setEditDescription(projects.find((p: any) => p.id === groupId)?.description || '');
                                setIsEditingProject(false);
                              }
                            }}
                          />
                        </div>
                        
                        <div>
                          <label className="text-xs font-medium text-muted-foreground block mb-1">
                            Description (Optional)
                          </label>
                          <Input
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            placeholder="Add a description for this project"
                            className="h-9 border-2 focus:border-primary transition-colors"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveEdit();
                              }
                              if (e.key === 'Escape') {
                                setEditName(projectName);
                                setEditDescription(projects.find((p: any) => p.id === groupId)?.description || '');
                                setIsEditingProject(false);
                              }
                            }}
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 pt-2">
                        <Button 
                          size="sm" 
                          onClick={handleSaveEdit}
                          className="h-8 px-3 bg-primary hover:bg-primary/90"
                          disabled={!editName.trim()}
                        >
                          <Save className="w-3 h-3 mr-1" />
                          Save Changes
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => {
                            setEditName(projectName);
                            setEditDescription(projects.find((p: any) => p.id === groupId)?.description || '');
                            setIsEditingProject(false);
                          }}
                          className="h-8 px-3"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${videos.length > 0 ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <CardTitle className="text-lg font-semibold">{projectName}</CardTitle>
                      </div>
                      {groupId !== 'unassigned' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-all h-8 w-8 p-0 hover:bg-primary/10"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent 
                            align="end" 
                            className="w-48"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <DropdownMenuLabel className="font-medium">
                              Project Actions
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            
                            <DropdownMenuItem
                              onClick={() => setIsEditingProject(true)}
                              className="cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4 mr-2" />
                              Edit Details
                            </DropdownMenuItem>
                            
                            <DropdownMenuItem
                              onClick={() => setShowInfo(!showInfo)}
                              className="cursor-pointer"
                            >
                              <Info className="w-4 h-4 mr-2" />
                              {showInfo ? 'Hide Info' : 'Show Info'}
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator />
                            
                            {onDuplicateProject && (
                              <DropdownMenuItem
                                onClick={() => onDuplicateProject(groupId, projectName)}
                                className="cursor-pointer"
                              >
                                <Copy className="w-4 h-4 mr-2" />
                                Duplicate Project
                              </DropdownMenuItem>
                            )}
                            
                            {onExportProject && (
                              <DropdownMenuItem
                                onClick={() => onExportProject(groupId, projectName)}
                                className="cursor-pointer"
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Export Data
                              </DropdownMenuItem>
                            )}
                            
                            {onArchiveProject && videos.length > 0 && (
                              <DropdownMenuItem
                                onClick={() => {
                                  if (confirm(`Archive project "${projectName}"? This will hide it from the main view.`)) {
                                    onArchiveProject(groupId);
                                  }
                                }}
                                className="cursor-pointer"
                              >
                                <FolderClosed className="w-4 h-4 mr-2" />
                                Archive Project
                              </DropdownMenuItem>
                            )}
                            
                            {onDeleteProject && videos.length === 0 && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    if (confirm(`Delete project "${projectName}"? This action cannot be undone.`)) {
                                      onDeleteProject(groupId);
                                    }
                                  }}
                                  className="cursor-pointer text-destructive focus:text-destructive"
                                >
                                  <Trash className="w-4 h-4 mr-2" />
                                  Delete Project
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    <div className="space-y-1">
                      {groupId !== 'unassigned' && project?.description && (
                        <p className="text-sm text-muted-foreground">
                          {project.description}
                        </p>
                      )}
                      {showInfo && groupId !== 'unassigned' && (
                        <div className="text-xs space-y-1 mt-3 p-3 bg-gradient-to-r from-muted/40 to-muted/20 rounded-lg border border-muted/50">
                          <div className="grid grid-cols-2 gap-2">
                            {createdAt && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-muted-foreground" />
                                <span className="text-muted-foreground">Created:</span>
                                <span className="font-medium">{createdAt}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <VideoIcon className="w-3 h-3 text-muted-foreground" />
                              <span className="text-muted-foreground">Videos:</span>
                              <span className="font-medium">{videos.length}</span>
                            </div>
                            {totalDuration > 0 && (
                              <div className="flex items-center gap-1">
                                <Play className="w-3 h-3 text-muted-foreground" />
                                <span className="text-muted-foreground">Duration:</span>
                                <span className="font-medium">{totalDuration}s</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Info className="w-3 h-3 text-muted-foreground" />
                              <span className="text-muted-foreground">ID:</span>
                              <span className="font-mono text-xs">{groupId.slice(0, 8)}...</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-end gap-1">
                  <Badge variant={videos.length === 0 ? 'secondary' : 'outline'} className="whitespace-nowrap">
                    {videos.length}{originalGroupSize !== videos.length && ` of ${originalGroupSize}`} video{originalGroupSize !== 1 ? 's' : ''}
                  </Badge>
                </div>
                {isSelectMode && videos.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectAllInGroup(videos);
                    }}
                    title="Select all in group"
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
                  onClick={() => isSelectMode && onToggleVideoSelection(video.id)}
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
                    onMove={onMove}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

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
  
  // State for managing collapse state of project groups - default all collapsed for performance
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
  
  // Project sorting
  const [projectSort, setProjectSort] = useState<'name' | 'date' | 'videos'>('name');

  // Fetch projects with stats
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['/api/projects', { withStats: true }],
    queryFn: () => apiRequest('/api/projects?withStats=true'),
    staleTime: 30000, // Cache for 30 seconds
  });

  // Fetch all videos with pagination
  const { data: videosResponse, isLoading: videosLoading, refetch: refetchVideos } = useQuery<{items: Video[]}>({
    queryKey: ['/api/video', 'all'],
    queryFn: () => apiRequest('/api/video?limit=100'), // Limit initial load
    staleTime: 10000, // Cache for 10 seconds
  });

  const isLoading = projectsLoading || videosLoading;
  const projects = projectsData || [];
  const allVideos = videosResponse?.items || [];

  // Memoized filtering for performance - moved before any conditional returns
  const filteredVideos = useMemo(() => {
    if (!allVideos.length) return [];
    
    return allVideos.filter(video => {
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
  }, [allVideos, statusFilter, dateFilter, searchQuery]);
  
  // Memoized video grouping and sorting - moved before any conditional returns
  const { videoGroups, nonEmptyGroups } = useMemo(() => {
    const groups: Record<string, Video[]> = {};
    
    // Initialize groups for all projects
    projects.forEach((project: any) => {
      groups[project.id] = [];
    });
    
    // Add unassigned group
    groups['unassigned'] = [];

    // Group filtered videos
    filteredVideos.forEach((video: Video) => {
      const groupKey = video.projectId || 'unassigned';
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(video);
    });

    // Filter out empty groups and sort
    const nonEmpty = Object.entries(groups)
      .filter(([_, videos]) => videos.length > 0)
      .sort(([groupIdA, videosA], [groupIdB, videosB]) => {
        if (groupIdA === 'unassigned') return 1;
        if (groupIdB === 'unassigned') return -1;
        
        const projectA = projects.find((p: any) => p.id === groupIdA);
        const projectB = projects.find((p: any) => p.id === groupIdB);
        
        switch (projectSort) {
          case 'name':
            return (projectA?.name || '').localeCompare(projectB?.name || '');
          case 'date':
            return new Date(projectB?.createdAt || 0).getTime() - new Date(projectA?.createdAt || 0).getTime();
          case 'videos':
            return videosB.length - videosA.length;
          default:
            return 0;
        }
      });

    return { videoGroups: groups, nonEmptyGroups: nonEmpty };
  }, [filteredVideos, projects, projectSort]);

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

  const handleToggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId] // Toggle: if undefined (collapsed by default), becomes false (expanded)
    }));
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

  const handleDeleteProject = async (projectId: string) => {
    try {
      await apiRequest(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      
      toast({
        title: 'Project deleted',
        description: 'The empty project has been deleted successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Delete failed',
        description: error.message || 'Could not delete project',
        variant: 'destructive',
      });
    }
  };

  const handleDuplicateProject = async (projectId: string, originalName: string) => {
    try {
      const response = await apiRequest('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${originalName} (Copy)`,
          description: `Duplicated from ${originalName}`,
        }),
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      
      toast({
        title: 'Project duplicated',
        description: `"${originalName} (Copy)" has been created.`,
      });
    } catch (error: any) {
      toast({
        title: 'Duplication failed',
        description: error.message || 'Could not duplicate project',
        variant: 'destructive',
      });
    }
  };

  const handleArchiveProject = async (projectId: string) => {
    try {
      await apiRequest(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deletedAt: new Date().toISOString() }),
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      
      toast({
        title: 'Project archived',
        description: 'Project has been archived successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Archive failed',
        description: error.message || 'Could not archive project',
        variant: 'destructive',
      });
    }
  };

  const handleExportProject = async (projectId: string, projectName: string) => {
    try {
      const projectDetails = await apiRequest(`/api/projects/${projectId}/details`);
      const exportData = {
        project: projectDetails,
        exportedAt: new Date().toISOString(),
        totalVideos: projectDetails.videos?.length || 0,
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_export.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Project exported',
        description: `"${projectName}" has been exported successfully.`,
      });
    } catch (error: any) {
      toast({
        title: 'Export failed',
        description: error.message || 'Could not export project',
        variant: 'destructive',
      });
    }
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

  return (
    <div className="space-y-6">
      {/* Gallery Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-semibold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Video Gallery
          </h3>
          <Badge variant="secondary" className="font-medium">
            {filteredVideos.length} of {allVideos.length} videos
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          {/* Project sorting */}
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">Sort by:</Label>
            <Select value={projectSort} onValueChange={(value: any) => setProjectSort(value)}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="date">Date Created</SelectItem>
                <SelectItem value="videos">Video Count</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Quick create project */}
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const name = prompt('Enter project name:');
              if (name?.trim()) {
                try {
                  await apiRequest('/api/projects', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: name.trim() }),
                  });
                  queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
                  toast({
                    title: 'Project created',
                    description: `"${name}" has been created successfully.`,
                  });
                } catch (error: any) {
                  toast({
                    title: 'Creation failed',
                    description: error.message || 'Could not create project',
                    variant: 'destructive',
                  });
                }
              }
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            New Project
          </Button>
          
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
          {nonEmptyGroups.map(([groupId, videos]: [string, Video[]]) => {
            // Default to collapsed (true) if not explicitly set to false
            const isCollapsed = collapsedGroups[groupId] !== false;
            const projectName = getProjectName(groupId);
            const originalGroupSize = allVideos.filter((v: Video) => 
              (v.projectId || 'unassigned') === groupId
            ).length;
            
            return (
              <ProjectGroup
                key={groupId}
                groupId={groupId}
                videos={videos}
                projectName={projectName}
                projects={projects}
                isCollapsed={isCollapsed}
                originalGroupSize={originalGroupSize}
                isSelectMode={isSelectMode}
                selectedVideos={selectedVideos}
                onToggleGroup={toggleGroup}
                onToggleVideoSelection={toggleVideoSelection}
                onSelectAllInGroup={(videos) => {
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
                onMove={async (videoId, projectId) => {
                  try {
                    await apiRequest(`/api/video/${videoId}/move`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ projectId }),
                    });
                    refetchVideos();
                    toast({
                      title: 'Video moved',
                      description: `Video moved to ${projectId ? getProjectName(projectId) : 'Unassigned'}`,
                    });
                  } catch (error) {
                    toast({
                      title: 'Move failed',
                      description: 'Could not move video',
                      variant: 'destructive',
                    });
                  }
                }}
                onDeleteProject={handleDeleteProject}
                onDuplicateProject={handleDuplicateProject}
                onArchiveProject={handleArchiveProject}
                onExportProject={handleExportProject}
              />
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
  model: z.enum(['hailuo-02', 'test-model-1', 'test-model-2', 'test-model-3', 'test-model-4', 'test-model-5']),
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
  const [showRenameProject, setShowRenameProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [renameProjectName, setRenameProjectName] = useState('');
  const [renameProjectDescription, setRenameProjectDescription] = useState('');
  const [firstFrameImagePreview, setFirstFrameImagePreview] = useState<string | null>(null);
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false);
  const [recentlyGeneratedVideos, setRecentlyGeneratedVideos] = useState<string[]>([]);
  

  
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

  // Project preselection with localStorage memory
  useEffect(() => {
    if (projects && projects.length > 0 && selectedProject === 'none') {
      // Check if there's a remembered project in localStorage
      const lastSelectedProjectId = localStorage.getItem('lastSelectedProjectId');
      
      if (lastSelectedProjectId) {
        // Check if the remembered project still exists
        const rememberedProject = projects.find(p => p.id === lastSelectedProjectId);
        if (rememberedProject) {
          setSelectedProject(lastSelectedProjectId);
          return;
        }
      }
      
      // If no remembered project or it doesn't exist anymore, select the first project
      const firstProject = projects[0];
      if (firstProject) {
        setSelectedProject(firstProject.id);
        localStorage.setItem('lastSelectedProjectId', firstProject.id);
      }
    }
  }, [projects, selectedProject]);

  // Handle project selection changes and update localStorage
  const handleProjectChange = (projectId: string) => {
    setSelectedProject(projectId);
    if (projectId !== 'none') {
      localStorage.setItem('lastSelectedProjectId', projectId);
    } else {
      localStorage.removeItem('lastSelectedProjectId');
    }
  };

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
      handleProjectChange(newProject.id);
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

  const renameProjectMutation = useMutation({
    mutationFn: async (renameData: { projectId: string; name: string; description?: string }) => {
      const updateData: { name: string; description?: string } = { name: renameData.name };
      if (renameData.description !== undefined) {
        updateData.description = renameData.description;
      }
      
      return await apiRequest(`/api/projects/${renameData.projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
    },
    onSuccess: (updatedProject) => {
      setShowRenameProject(false);
      setRenameProjectName('');
      setRenameProjectDescription('');
      // Invalidate and refetch projects
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      refetchProjects();
      toast({
        title: 'Project Updated',
        description: `Project has been updated successfully.`,
      });
    },
    onError: () => {
      toast({
        title: 'Update Failed',
        description: 'Could not update project. Please try again.',
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
          // Update results with completed status
          setResults(prev => prev.map(result => 
            result.videoId === videoId 
              ? { ...result, status: 'completed' as const }
              : result
          ));
          
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
          // Timeout - update results with failed status
          setResults(prev => prev.map(result => 
            result.videoId === videoId 
              ? { ...result, status: 'failed' as const }
              : result
          ));
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

  // Download functionality (previously in Job Tray)
  const handleDownload = async (videoId: string) => {
    try {
      const response = await fetch(`/api/object-storage/video/dev/video-generations/${videoId}.mp4`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `video-${videoId}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({ title: 'Video download started' });
    } catch (error) {
      toast({
        title: 'Failed to download video',
        description: 'An error occurred while downloading',
        variant: 'destructive'
      });
    }
  };

  // Dismiss functionality (previously in Job Tray)  
  const handleDismissResult = (videoId: string) => {
    setResults(prev => prev.filter(result => result.videoId !== videoId));
    // If we're dismissing the active result, clear the active selection
    if (activeResultVideoId === videoId) {
      setActiveResultVideoId(null);
    }
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

  const handleRenameProject = () => {
    if (renameProjectName.trim() && selectedProject !== 'none') {
      renameProjectMutation.mutate({
        projectId: selectedProject,
        name: renameProjectName.trim(),
        description: renameProjectDescription.trim() || undefined,
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
                <Card className="border-0 shadow-md bg-gradient-to-br from-background to-muted/20">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Settings className="w-6 h-6 text-primary" />
                      </div>
                      Video Configuration
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Set up your video generation parameters
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Enhanced Model Selection */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <Label className="text-sm font-semibold">AI Model</Label>
                      </div>
                      <ModelSelector
                        value={form.watch('model')}
                        onChange={(modelId) => form.setValue('model', modelId as any, { shouldDirty: true })}
                        disabled={generateVideoMutation.isPending}
                      />
                    </div>

                    <Separator />

                    {/* Enhanced Prompt Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Edit className="w-4 h-4 text-primary" />
                          <Label className="text-sm font-semibold">Video Prompt</Label>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleEnhancePrompt}
                          disabled={!form.watch('prompt')?.trim() || isEnhancingPrompt}
                          className="flex items-center gap-2 hover:bg-primary/5"
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
                        placeholder="Describe your video in detail... (e.g., 'A serene mountain lake at sunrise with gentle ripples on the water')"
                        className="min-h-[120px] resize-none focus:ring-2 focus:ring-primary/20 bg-background/50"
                        {...form.register('prompt')}
                      />
                      {form.formState.errors.prompt && (
                        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                          <AlertCircle className="w-4 h-4 text-destructive" />
                          <p className="text-sm text-destructive">
                            {form.formState.errors.prompt.message}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Enhanced Resolution & Duration Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Enhanced Resolution */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-primary" />
                          <Label className="text-sm font-semibold">Resolution</Label>
                        </div>
                        <Select
                          value={form.watch('resolution')}
                          onValueChange={(value) => form.setValue('resolution', value as any, { shouldDirty: true })}
                          disabled={generateVideoMutation.isPending}
                        >
                          <SelectTrigger className="h-12 focus:ring-2 focus:ring-primary/20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="512p" className="py-3">
                              <div className="flex flex-col items-start">
                                <span className="font-medium">512p</span>
                                <span className="text-xs text-muted-foreground">854 × 512 pixels</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="768p" className="py-3">
                              <div className="flex flex-col items-start">
                                <span className="font-medium">768p</span>
                                <span className="text-xs text-muted-foreground">1366 × 768 pixels</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="1080p" className="py-3">
                              <div className="flex flex-col items-start">
                                <span className="font-medium">1080p</span>
                                <span className="text-xs text-muted-foreground">1920 × 1080 pixels</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Enhanced Duration */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-primary" />
                          <Label className="text-sm font-semibold">Duration</Label>
                        </div>
                        <Select
                          value={form.watch('duration')?.toString()}
                          onValueChange={(value) => {
                            // Handle different duration formats for different models
                            if (VIDEO_MODELS[currentModel]?.supportsDurationInt) {
                              form.setValue('duration', parseInt(value), { shouldDirty: true });
                            } else {
                              form.setValue('duration', value as any, { shouldDirty: true });
                            }
                          }}
                          disabled={generateVideoMutation.isPending}
                        >
                          <SelectTrigger className="h-12 focus:ring-2 focus:ring-primary/20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="6" className="py-3">
                              <div className="flex flex-col items-start">
                                <span className="font-medium">6 seconds</span>
                                <span className="text-xs text-muted-foreground">Standard duration</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="10" disabled={form.watch('resolution') !== '768p'} className="py-3">
                              <div className="flex flex-col items-start">
                                <span className="font-medium">10 seconds</span>
                                <span className="text-xs text-muted-foreground">768p resolution only</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {form.watch('resolution') !== '768p' && (
                          <p className="text-xs text-muted-foreground">
                            10-second videos require 768p resolution
                          </p>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Enhanced Model-specific Options */}
                    {currentModel === 'hailuo-02' && (
                      <>
                        {/* Enhanced Prompt Optimizer for Hailuo-02 */}
                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                          <div>
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-primary" />
                              <Label className="text-sm font-semibold">Prompt Optimizer</Label>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              Automatically enhance your prompt for better results
                            </p>
                          </div>
                          <Switch
                            checked={form.watch('promptOptimizer')}
                            onCheckedChange={(checked) => form.setValue('promptOptimizer', checked, { shouldDirty: true })}
                          />
                        </div>

                        {/* Enhanced First Frame Image for Hailuo-02 */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-primary" />
                            <Label className="text-sm font-semibold">First Frame Image (Optional)</Label>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Sets the aspect ratio for your video and guides the generation style
                          </p>
                          <div className="p-4 bg-muted/30 rounded-lg border">
                            <ReferenceImageUpload
                              value={firstFrameImagePreview || undefined}
                              onChange={(value) => {
                                setFirstFrameImagePreview(value || null);
                                form.setValue('firstFrameImage', value || '', { shouldDirty: true });
                              }}
                              className="w-full"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Enhanced Generate Button */}
                <Button
                  type="submit"
                  size="lg"
                  disabled={generateVideoMutation.isPending || !form.watch('prompt')?.trim()}
                  className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {generateVideoMutation.isPending ? (
                    <>
                      <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                      Starting generation...
                    </>
                  ) : (
                    <>
                      <Play className="w-6 h-6 mr-3" />
                      Generate Video
                    </>
                  )}
                </Button>
              </form>
            </div>

            {/* Enhanced Right Column - Project Panel (4/12 columns) */}
            <div className="lg:col-span-4">
              <Card className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-8rem)] border-0 shadow-md bg-gradient-to-br from-background to-muted/20">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <FolderOpen className="w-6 h-6 text-blue-500" />
                    </div>
                    Project Panel
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Organize your videos into projects
                  </p>
                </CardHeader>
                <CardContent className="space-y-6 lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto lg:pr-2">
                  {/* Enhanced Project Selection */}
                  {projectsLoading ? (
                    <div className="flex items-center justify-center gap-2 p-8">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Loading projects...</span>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="w-4 h-4 text-primary" />
                          <Label className="text-sm font-semibold">Select Project</Label>
                        </div>
                        <Select value={selectedProject} onValueChange={handleProjectChange}>
                          <SelectTrigger className="h-12 focus:ring-2 focus:ring-primary/20 bg-background/50">
                            <SelectValue placeholder="Choose a project (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none" className="py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                                <span>No Project</span>
                              </div>
                            </SelectItem>
                            {projects?.map((project) => (
                              <SelectItem key={project.id} value={project.id} className="py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                                  <span>{project.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Enhanced Action Buttons */}
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowCreateProject(!showCreateProject)}
                          className="flex-1 h-10 flex items-center justify-center gap-2 hover:bg-primary/5 border-primary/20 hover:border-primary/30 transition-all duration-200"
                        >
                          <Plus className="w-4 h-4" />
                          New Project
                        </Button>
                        {selectedProject !== 'none' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const project = projects?.find(p => p.id === selectedProject);
                              setRenameProjectName(project?.name || '');
                              setRenameProjectDescription(project?.description || '');
                              setShowRenameProject(!showRenameProject);
                            }}
                            className="h-10 px-4 flex items-center gap-2 hover:bg-blue-500/10 text-blue-600 hover:text-blue-700 transition-all duration-200"
                          >
                            <Edit className="w-4 h-4" />
                            Rename
                          </Button>
                        )}
                      </div>

                      {/* Enhanced Create Project Form */}
                      {showCreateProject && (
                        <div className="space-y-4 p-5 border rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 shadow-sm">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 rounded-lg bg-primary/10">
                              <Plus className="w-4 h-4 text-primary" />
                            </div>
                            <h3 className="font-semibold text-sm">Create New Project</h3>
                          </div>
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label htmlFor="newProjectName" className="text-sm font-semibold flex items-center gap-1">
                                Project Name <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                id="newProjectName"
                                placeholder="Enter a descriptive project name"
                                value={newProjectName}
                                onChange={(e) => setNewProjectName(e.target.value)}
                                className="h-11 focus:ring-2 focus:ring-primary/20 bg-background/80"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="newProjectDescription" className="text-sm font-semibold">
                                Description <span className="text-muted-foreground font-normal">(optional)</span>
                              </Label>
                              <Input
                                id="newProjectDescription"
                                placeholder="Brief description of the project"
                                value={newProjectDescription}
                                onChange={(e) => setNewProjectDescription(e.target.value)}
                                className="h-11 focus:ring-2 focus:ring-primary/20 bg-background/80"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2 pt-3">
                            <Button
                              onClick={handleCreateProject}
                              disabled={!newProjectName.trim() || createProjectMutation.isPending}
                              size="sm"
                              className="flex-1 h-10 bg-primary hover:bg-primary/90 shadow-sm hover:shadow-md transition-all duration-200"
                            >
                              {createProjectMutation.isPending ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                  Creating...
                                </>
                              ) : (
                                <>
                                  <Plus className="w-4 h-4 mr-2" />
                                  Create Project
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setShowCreateProject(false)}
                              size="sm"
                              className="h-10 hover:bg-muted/50 transition-colors duration-200"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Enhanced Rename Project Form */}
                      {showRenameProject && selectedProject !== 'none' && (
                        <div className="space-y-4 p-5 border rounded-xl bg-gradient-to-br from-blue-50/50 to-blue-100/30 border-blue-200/50 shadow-sm">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 rounded-lg bg-blue-500/10">
                              <Edit className="w-4 h-4 text-blue-500" />
                            </div>
                            <h3 className="font-semibold text-sm">Rename Project</h3>
                          </div>
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label htmlFor="renameProjectName" className="text-sm font-semibold flex items-center gap-1">
                                Project Name <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                id="renameProjectName"
                                placeholder="Enter new project name"
                                value={renameProjectName}
                                onChange={(e) => setRenameProjectName(e.target.value)}
                                className="h-11 focus:ring-2 focus:ring-blue-500/20 bg-background/80"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="renameProjectDescription" className="text-sm font-semibold">
                                Description <span className="text-muted-foreground font-normal">(optional)</span>
                              </Label>
                              <Input
                                id="renameProjectDescription"
                                placeholder="Brief description of the project"
                                value={renameProjectDescription}
                                onChange={(e) => setRenameProjectDescription(e.target.value)}
                                className="h-11 focus:ring-2 focus:ring-blue-500/20 bg-background/80"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2 pt-3">
                            <Button
                              onClick={handleRenameProject}
                              disabled={!renameProjectName.trim() || renameProjectMutation.isPending}
                              size="sm"
                              className="flex-1 h-10 bg-blue-500 hover:bg-blue-600 text-white shadow-sm hover:shadow-md transition-all duration-200"
                            >
                              {renameProjectMutation.isPending ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                  Renaming...
                                </>
                              ) : (
                                <>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Rename Project
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setShowRenameProject(false)}
                              size="sm"
                              className="h-10 hover:bg-muted/50 transition-colors duration-200"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Enhanced Project Videos Section */}
                  <div className="space-y-4">
                    {/* Enhanced Visual Separator */}
                    <div className="relative">
                      <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-background px-3 py-1 rounded-full border shadow-sm">
                          <span className="text-xs text-muted-foreground font-medium">Videos</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Enhanced Video Section Header */}
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-blue-500/10">
                        <VideoIcon className="w-4 h-4 text-blue-500" />
                      </div>
                      <h4 className="text-sm font-semibold">
                        {selectedProject === 'none' ? 'Unassigned Videos' : 'Project Videos'}
                      </h4>
                    </div>
                    
                    {/* Enhanced Video Container */}
                    <div className="bg-muted/20 rounded-lg border p-3 shadow-sm">
                      <div className="max-h-[350px] overflow-y-auto scrollbar-thin scrollbar-thumb-muted/50 scrollbar-track-transparent pr-2 -mr-2">
                        <ProjectVideoPreview 
                          selectedProject={selectedProject} 
                          projects={projects || []}
                          compact={true}
                          onVideoPlay={(videoId) => console.log('Playing video:', videoId)}
                          onVideoDelete={(videoId) => console.log('Deleting video:', videoId)}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Results Panel - Multiple concurrent results with integrated Job Tray */}
          {results.length > 0 && (
            <div className="space-y-6 mt-8" data-result-panel>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-primary" />
                  Results & Job Queue
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
              
              {/* Job Status Summary */}
              {(() => {
                const pendingJobs = results.filter(r => r.status === 'pending').length;
                const processingJobs = results.filter(r => r.status === 'processing').length;
                const completedJobs = results.filter(r => r.status === 'completed').length;
                const failedJobs = results.filter(r => r.status === 'failed').length;
                
                return (
                  <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border">
                    {processingJobs > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span>{processingJobs} generating</span>
                      </div>
                    )}
                    {pendingJobs > 0 && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                        <span>{pendingJobs} queued</span>
                      </div>
                    )}
                    {completedJobs > 0 && (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>{completedJobs} completed</span>
                      </div>
                    )}
                    {failedJobs > 0 && (
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <div className="w-2 h-2 bg-destructive rounded-full"></div>
                        <span>{failedJobs} failed</span>
                      </div>
                    )}
                  </div>
                );
              })()}
              
              {/* Enhanced Results Grid - Integrated Job Management */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                      className={`transition-all duration-200 ${
                        isActive ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'
                      } ${!isCompleted ? 'opacity-70' : 'cursor-pointer'}`}
                      onClick={() => isCompleted && setActiveResultVideoId(result.videoId)}
                    >
                      <CardContent className="p-4 space-y-3">
                        {/* Enhanced Status Header */}
                        <div className="flex items-center justify-between">
                          <Badge 
                            variant={
                              result.status === 'completed' ? 'default' :
                              result.status === 'processing' ? 'secondary' :
                              result.status === 'failed' ? 'destructive' :
                              'outline'
                            }
                            className="text-xs font-medium px-2 py-1"
                          >
                            {result.status === 'processing' && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                            {result.status === 'failed' && <AlertCircle className="w-3 h-3 mr-1" />}
                            {result.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                            {result.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {result.status === 'processing' ? 'Generating' :
                             result.status === 'completed' ? 'Ready' :
                             result.status === 'failed' ? 'Failed' : 'Queued'}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">#{index + 1}</span>
                            {isCompleted && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePlayVideo(result.videoId);
                                  }}
                                  title="Play video"
                                >
                                  <Play className="w-3 h-3" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownload(result.videoId);
                                  }}
                                  title="Download video"
                                >
                                  <Download className="w-3 h-3" />
                                </Button>
                              </>
                            )}
                            {/* Dismiss button for completed or failed results */}
                            {(result.status === 'completed' || result.status === 'failed') && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDismissResult(result.videoId);
                                }}
                                title="Dismiss result"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {/* Enhanced Prompt Preview */}
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground line-clamp-2 leading-relaxed">
                            {isCompleted && result.data ? result.data.prompt : result.promptAtSubmit}
                          </p>
                        </div>
                        
                        {/* Enhanced Time & Model Info */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {getElapsedTime()}
                          </span>
                          {result.modelAtSubmit && (
                            <span className="bg-muted/60 px-2 py-1 rounded text-xs font-medium">
                              {result.modelAtSubmit.replace('hailuo-02', 'HaiLuo')}
                            </span>
                          )}
                        </div>
                        
                        {/* Enhanced Progress indicator */}
                        {result.status === 'processing' && (
                          <div className="space-y-2">
                            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                              <div className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full animate-pulse transition-all duration-300" 
                                   style={{
                                     width: '75%',
                                     animation: 'progress-shimmer 2s infinite ease-in-out'
                                   }}>
                              </div>
                            </div>
                            <p className="text-xs text-center text-muted-foreground">Generating video...</p>
                          </div>
                        )}
                        
                        {/* Error message for failed jobs */}
                        {result.status === 'failed' && (
                          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-2">
                            <p className="text-xs text-destructive">Generation failed. Please try again.</p>
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
          

        </TabsContent>

        <TabsContent value="gallery" className="space-y-6">
          <VideoGallery />
        </TabsContent>
      </Tabs>
    </div>
  );
}