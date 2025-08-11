import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  VideoIcon,
  MoreHorizontal,
  Archive,
  Copy,
  FolderOpen,
  Trash2,
  ArchiveRestore,
  Clock,
  CheckCircle,
  Loader2,
  GripVertical,
  Filter,
  Search,
  Plus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import VideoCard from '@/components/VideoCard';
import type { Video, Project } from '@shared/schema';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ProjectWithStats extends Project {
  videoCount: number;
  completedCount: number;
  processingCount: number;
  lastActivity?: Date;
}

interface ProjectCardProps {
  project: ProjectWithStats;
  onOpen: (projectId: string) => void;
  onDuplicate: (projectId: string) => void;
  onArchive: (projectId: string) => void;
  onRestore: (projectId: string) => void;
  onDelete: (projectId: string) => void;
}

function SortableProjectCard({ 
  project, 
  onOpen, 
  onDuplicate, 
  onArchive, 
  onRestore, 
  onDelete 
}: ProjectCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isArchived = !!project.deletedAt;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`relative group hover:shadow-lg transition-all duration-200 ${
        isArchived ? 'opacity-75 border-muted' : ''
      } ${isDragging ? 'shadow-lg ring-2 ring-primary/20' : ''}`}
    >
      <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
           {...attributes}
           {...listeners}>
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 pr-8">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <VideoIcon className="w-4 h-4 text-primary" />
              </div>
              <span className="truncate">{project.name}</span>
              {isArchived && (
                <Badge variant="secondary" className="ml-2">
                  <Archive className="w-3 h-3 mr-1" />
                  Archived
                </Badge>
              )}
            </CardTitle>
            {project.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {project.description}
              </p>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Project actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onOpen(project.id)}>
                <FolderOpen className="w-4 h-4 mr-2" />
                Open
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(project.id)}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate project
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {isArchived ? (
                <DropdownMenuItem onClick={() => onRestore(project.id)}>
                  <ArchiveRestore className="w-4 h-4 mr-2" />
                  Restore project
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => onArchive(project.id)}>
                  <Archive className="w-4 h-4 mr-2" />
                  Archive project...
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(project.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete permanently...
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <VideoIcon className="w-3 h-3" />
              {project.videoCount} videos
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-500" />
              {project.completedCount} completed
            </span>
            {project.processingCount > 0 && (
              <span className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                {project.processingCount} processing
              </span>
            )}
          </div>
          {project.lastActivity && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(project.lastActivity).toLocaleDateString()}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function VideoGalleryPage() {
  const { toast } = useToast();
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [deleteConfirmProject, setDeleteConfirmProject] = useState<string | null>(null);
  const [deleteProjectName, setDeleteProjectName] = useState('');
  const [deleteVideos, setDeleteVideos] = useState(false);
  const [undoTimeouts, setUndoTimeouts] = useState<Record<string, NodeJS.Timeout>>({});
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [showUnassigned, setShowUnassigned] = useState(true);

  // Fetch projects with stats
  const { data: projects = [], isLoading: projectsLoading, refetch: refetchProjects } = useQuery<ProjectWithStats[]>({
    queryKey: ['/api/projects', 'with-stats', showArchived],
    queryFn: () => apiRequest(`/api/projects?withStats=true&showArchived=${showArchived}`),
    refetchInterval: 5000, // Refresh every 5 seconds for real-time updates
  });

  // Fetch project details with videos when a project is selected
  const { data: projectDetails, isLoading: projectDetailsLoading } = useQuery({
    queryKey: ['/api/projects', selectedProject, 'details'],
    queryFn: () => selectedProject ? apiRequest(`/api/projects/${selectedProject}/details`) : null,
    enabled: !!selectedProject,
  });

  // Fetch unassigned videos 
  const { data: unassignedVideos = [], isLoading: unassignedLoading } = useQuery<Video[]>({
    queryKey: ['/api/videos/unassigned'],
    queryFn: () => apiRequest('/api/videos/unassigned').then(data => data.videos || []),
    refetchInterval: 5000, // Refresh every 5 seconds for real-time updates
  });

  // Mutations for project operations
  const duplicateProjectMutation = useMutation({
    mutationFn: (projectId: string) => 
      apiRequest(`/api/projects/${projectId}/duplicate`, { method: 'POST', body: JSON.stringify({}) }),
    onSuccess: (data) => {
      toast({
        title: "Project duplicated",
        description: `"${data.name}" has been created successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      // Highlight the new project
      setSelectedProject(data.id);
    },
    onError: (error) => {
      toast({
        title: "Duplication failed", 
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const archiveProjectMutation = useMutation({
    mutationFn: (projectId: string) => 
      apiRequest(`/api/projects/${projectId}/archive`, { method: 'POST' }),
    onSuccess: (data) => {
      // Store undo timeout
      const timeoutId = setTimeout(() => {
        setUndoTimeouts(prev => {
          const newTimeouts = { ...prev };
          delete newTimeouts[data.id];
          return newTimeouts;
        });
      }, 30000);

      setUndoTimeouts(prev => ({ ...prev, [data.id]: timeoutId }));

      // Show undo toast
      toast({
        title: "Project archived",
        description: (
          <div className="flex items-center justify-between">
            <span>"{data.name}" has been archived.</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => restoreProjectMutation.mutate(data.id)}
              className="ml-2"
            >
              Undo
            </Button>
          </div>
        ),
        duration: 30000, // 30 seconds
      });

      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      
      // Clear selection if archived project was selected
      if (selectedProject === data.id) {
        setSelectedProject(null);
      }
    },
    onError: (error) => {
      toast({
        title: "Archive failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const restoreProjectMutation = useMutation({
    mutationFn: (projectId: string) => 
      apiRequest(`/api/projects/${projectId}/restore`, { method: 'POST' }),
    onSuccess: (data) => {
      // Clear any existing undo timeout
      if (undoTimeouts[data.id]) {
        clearTimeout(undoTimeouts[data.id]);
        setUndoTimeouts(prev => {
          const newTimeouts = { ...prev };
          delete newTimeouts[data.id];
          return newTimeouts;
        });
      }

      toast({
        title: "Project restored",
        description: `"${data.name}" has been restored from archive.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    },
    onError: (error) => {
      toast({
        title: "Restore failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (projectId: string) => 
      apiRequest(`/api/projects/${projectId}/permanent`, { 
        method: 'DELETE', 
        body: JSON.stringify({ deleteVideos }) 
      }),
    onSuccess: () => {
      toast({
        title: "Project deleted",
        description: "The project has been permanently deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setDeleteConfirmProject(null);
      setDeleteProjectName('');
      setDeleteVideos(false);
      
      // Clear selection if deleted project was selected
      if (selectedProject === deleteConfirmProject) {
        setSelectedProject(null);
      }
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const reorderProjectsMutation = useMutation({
    mutationFn: (projectIds: string[]) =>
      apiRequest('/api/projects/reorder', { method: 'POST', body: JSON.stringify({ projectIds }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    },
    onError: (error) => {
      toast({
        title: "Reorder failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Bulk move videos mutation
  const bulkMoveVideosMutation = useMutation({
    mutationFn: ({ videoIds, targetProjectId }: { videoIds: string[]; targetProjectId: string | null }) =>
      apiRequest('/api/videos/bulk/move', { method: 'PATCH', body: JSON.stringify({ videoIds, targetProjectId }) }),
    onSuccess: (data) => {
      toast({
        title: "Videos moved successfully",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/videos/unassigned'] });
      setSelectedVideos([]);
    },
    onError: (error) => {
      toast({
        title: "Move failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Filter projects based on search query
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (project.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Drag and drop handlers
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = filteredProjects.findIndex(p => p.id === active.id);
      const newIndex = filteredProjects.findIndex(p => p.id === over?.id);
      
      const reorderedProjects = arrayMove(filteredProjects, oldIndex, newIndex);
      const projectIds = reorderedProjects.map(p => p.id);
      
      reorderProjectsMutation.mutate(projectIds);
    }
  };

  // Event handlers
  const handleDeleteConfirm = () => {
    const project = projects.find(p => p.id === deleteConfirmProject);
    if (project && deleteProjectName === project.name) {
      deleteProjectMutation.mutate(deleteConfirmProject!);
    }
  };

  // Video selection handlers
  const handleVideoSelect = (videoId: string, selected: boolean) => {
    setSelectedVideos(prev => 
      selected 
        ? [...prev, videoId]
        : prev.filter(id => id !== videoId)
    );
  };

  const handleSelectAllVideos = (videos: Video[], selected: boolean) => {
    const videoIds = videos.map(v => v.id);
    setSelectedVideos(prev => 
      selected 
        ? Array.from(new Set([...prev, ...videoIds]))
        : prev.filter(id => !videoIds.includes(id))
    );
  };

  // Bulk move videos to project
  const handleBulkMoveVideos = (targetProjectId: string | null) => {
    if (selectedVideos.length > 0) {
      bulkMoveVideosMutation.mutate({ videoIds: selectedVideos, targetProjectId });
    }
  };

  // Create new project and move selected videos
  const createProjectMutation = useMutation({
    mutationFn: ({ name, description }: { name: string; description?: string }) =>
      apiRequest('/api/projects', { method: 'POST', body: JSON.stringify({ name, description }) }),
    onSuccess: (newProject) => {
      // Move selected videos to the new project
      if (selectedVideos.length > 0) {
        bulkMoveVideosMutation.mutate({ videoIds: selectedVideos, targetProjectId: newProject.id });
      }
      toast({
        title: "Project created",
        description: `"${newProject.name}" created successfully with ${selectedVideos.length} videos.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    },
    onError: (error) => {
      toast({
        title: "Project creation failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleCreateProjectAndMove = () => {
    const projectName = prompt('Enter new project name:');
    if (projectName?.trim()) {
      createProjectMutation.mutate({ name: projectName.trim() });
    }
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(undoTimeouts).forEach(timeout => clearTimeout(timeout));
    };
  }, [undoTimeouts]);

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-background via-background to-muted/20">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Video Gallery</h1>
          <p className="text-muted-foreground">
            Manage your video projects and organize your content
          </p>
        </div>

        {/* Filters and Search */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center space-x-2">
            <Switch
              id="show-archived"
              checked={showArchived}
              onCheckedChange={setShowArchived}
            />
            <Label htmlFor="show-archived" className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Show archived
            </Label>
          </div>
          
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Button onClick={() => window.location.href = '/video'} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        </div>

        <div className="flex gap-6 h-[calc(100vh-200px)]">
          {/* Projects List */}
          <div className="flex-1">
            <div className="space-y-4 max-h-full overflow-y-auto pr-2">
              {/* Unassigned Videos Section */}
              {unassignedVideos.length > 0 && (
                <Card className="border-dashed">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <VideoIcon className="w-5 h-5 text-muted-foreground" />
                        <span>Videos without a project</span>
                        <Badge variant="secondary">{unassignedVideos.length}</Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowUnassigned(!showUnassigned)}
                      >
                        {showUnassigned ? 'Hide' : 'Show'}
                      </Button>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      These are videos created without a project or whose project was deleted.
                    </p>
                    {selectedVideos.length > 0 && showUnassigned && (
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <Badge variant="outline">{selectedVideos.filter(id => unassignedVideos.find(v => v.id === id)).length} selected</Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              Move selected to project...
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {projects.filter(p => !p.deletedAt).map((project) => (
                              <DropdownMenuItem
                                key={project.id}
                                onClick={() => handleBulkMoveVideos(project.id)}
                              >
                                {project.name}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleCreateProjectAndMove}
                          disabled={createProjectMutation.isPending || bulkMoveVideosMutation.isPending}
                        >
                          {createProjectMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            'Create project & move'
                          )}
                        </Button>
                      </div>
                    )}
                  </CardHeader>
                  {showUnassigned && (
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={unassignedVideos.length > 0 && unassignedVideos.every(v => selectedVideos.includes(v.id))}
                            onChange={(e) => handleSelectAllVideos(unassignedVideos, e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <label className="text-sm font-medium">Select all</label>
                        </div>
                        {unassignedVideos.map((video) => (
                          <div key={video.id} className="flex items-start gap-3 p-3 border rounded-lg">
                            <input
                              type="checkbox"
                              checked={selectedVideos.includes(video.id)}
                              onChange={(e) => handleVideoSelect(video.id, e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 mt-1"
                            />
                            <VideoCard
                              video={{
                                ...video,
                                model: video.model || 'hailuo-02',
                                status: video.status as 'pending' | 'processing' | 'completed' | 'failed',
                                createdAt: typeof video.createdAt === 'string' ? video.createdAt : video.createdAt?.toISOString() || null
                              }}
                              className="flex-1"
                              onMove={(videoId, projectId) => {
                                bulkMoveVideosMutation.mutate({ videoIds: [videoId], targetProjectId: projectId });
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              )}

              {/* Projects Section */}
              {projectsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  Loading projects...
                </div>
              ) : filteredProjects.length === 0 ? (
                <Card className="p-8 text-center">
                  <VideoIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {projects.length === 0 ? 'No projects yet' : 'No projects found'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {projects.length === 0 
                      ? 'Create your first project to start organizing your videos'
                      : 'Try adjusting your search or filter settings'
                    }
                  </p>
                  {projects.length === 0 && (
                    <Button onClick={() => window.location.href = '/video'} className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Create First Project
                    </Button>
                  )}
                </Card>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <div className="space-y-4">
                    <SortableContext items={filteredProjects.map(p => p.id)} strategy={verticalListSortingStrategy}>
                      {filteredProjects.map((project) => (
                        <SortableProjectCard
                          key={project.id}
                          project={project}
                          onOpen={setSelectedProject}
                          onDuplicate={(id) => duplicateProjectMutation.mutate(id)}
                          onArchive={(id) => archiveProjectMutation.mutate(id)}
                          onRestore={(id) => restoreProjectMutation.mutate(id)}
                          onDelete={setDeleteConfirmProject}
                        />
                      ))}
                    </SortableContext>
                  </div>
                </DndContext>
              )}
            </div>
          </div>

          {/* Project Details Panel */}
          {selectedProject && (
            <div className="w-96">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <VideoIcon className="w-5 h-5" />
                    Project Videos
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedProject(null)}
                    className="absolute top-4 right-4"
                  >
                    ✕
                  </Button>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden">
                  {projectDetailsLoading ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="w-6 h-6 animate-spin mr-2" />
                      Loading videos...
                    </div>
                  ) : projectDetails?.videos?.length ? (
                    <div className="space-y-3 max-h-full overflow-y-auto">
                      {projectDetails.videos.map((video: Video) => (
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
                  ) : (
                    <div className="text-center p-8">
                      <VideoIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-medium mb-2">No videos yet</h3>
                      <p className="text-sm text-muted-foreground">
                        This project doesn't have any videos yet.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmProject} onOpenChange={() => {
        setDeleteConfirmProject(null);
        setDeleteProjectName('');
        setDeleteVideos(false);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project Permanently</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p className="mb-4">
                  This action cannot be undone. This will permanently delete the project
                  {deleteConfirmProject && (
                    <span className="font-medium">
                      {' "' + projects.find(p => p.id === deleteConfirmProject)?.name + '"'}
                    </span>
                  )}. <strong>Videos will not be deleted</strong> and will be moved to <strong>"Videos without a project"</strong>.
                </p>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="project-name" className="text-sm font-medium">
                      Type the project name to confirm:
                    </Label>
                    <Input
                      id="project-name"
                      value={deleteProjectName}
                      onChange={(e) => setDeleteProjectName(e.target.value)}
                      placeholder="Project name"
                      className="mt-1"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="delete-videos"
                      checked={deleteVideos}
                      onChange={(e) => setDeleteVideos(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="delete-videos" className="text-sm">
                      Also delete videos and assets (irreversible)
                    </Label>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteConfirmProject(null);
              setDeleteProjectName('');
              setDeleteVideos(false);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={
                !deleteConfirmProject ||
                deleteProjectName !== projects.find(p => p.id === deleteConfirmProject)?.name ||
                deleteProjectMutation.isPending
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteProjectMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Permanently'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}