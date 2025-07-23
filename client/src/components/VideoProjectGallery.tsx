import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Folder, Play, Download, Copy, RefreshCw, X, Trash2, Edit3, FolderPlus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Project {
  id: string;
  name: string;
  description: string | null;
  video_count: number;
  created_at: string;
  gcs_folder: string;
}

interface Video {
  id: string;
  project_id: string | null;
  prompt: string;
  model_id: string;
  aspect_ratio: string;
  resolution: string;
  duration: string;
  status: string;
  video_url: string | null;
  gcs_uri: string | null;
  created_at: string;
}

interface VideoProjectGalleryProps {
  onSelectProject?: (projectId: string) => void;
}

export default function VideoProjectGallery({ onSelectProject }: VideoProjectGalleryProps) {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const queryClient = useQueryClient();

  // Fetch all projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['/api/projects'],
    queryFn: () => apiRequest('/api/projects'),
  });

  // Fetch videos for selected project
  const { data: projectVideos = [], isLoading: videosLoading } = useQuery({
    queryKey: ['/api/projects', selectedProject, 'videos'],
    queryFn: () => apiRequest(`/api/projects/${selectedProject}/videos`),
    enabled: !!selectedProject,
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) => {
      console.log('Creating project with data:', data);
      return apiRequest('/api/projects', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: (data) => {
      console.log('Project created successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setIsCreateDialogOpen(false);
      setNewProjectName('');
      setNewProjectDescription('');
      toast({
        title: 'Project created',
        description: 'Your new project has been created successfully.',
      });
    },
    onError: (error) => {
      console.error('Project creation failed:', error);
      toast({
        title: 'Error',
        description: `Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    
    createProjectMutation.mutate({
      name: newProjectName.trim(),
      description: newProjectDescription.trim() || undefined,
    });
  };

  const handleProjectSelect = (projectId: string) => {
    setSelectedProject(projectId);
    onSelectProject?.(projectId);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to clipboard',
      description: 'GCS URI has been copied to your clipboard.',
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'generating':
      case 'queued':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (projectsLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Projects Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Video Projects ({projects.length})
          </CardTitle>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <FolderPlus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="projectName">Project Name</Label>
                  <Input
                    id="projectName"
                    placeholder="Enter project name..."
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="projectDescription">Description (Optional)</Label>
                  <Textarea
                    id="projectDescription"
                    placeholder="Describe your project..."
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateProject}
                    disabled={!newProjectName.trim() || createProjectMutation.isPending}
                  >
                    {createProjectMutation.isPending ? 'Creating...' : 'Create Project'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project: Project) => (
              <Card 
                key={project.id} 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedProject === project.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => handleProjectSelect(project.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4" />
                      <h3 className="font-medium truncate">{project.name}</h3>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {project.video_count} videos
                    </Badge>
                  </div>
                  {project.description && (
                    <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  <p className="text-xs text-slate-500">
                    Created {new Date(project.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {projects.length === 0 && (
            <div className="text-center py-8">
              <Folder className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 mb-4">No projects yet</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <FolderPlus className="h-4 w-4 mr-2" />
                Create Your First Project
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Project Videos */}
      {selectedProject && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Project Videos ({projectVideos.length})
              {videosLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {videosLoading ? (
              <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="aspect-video bg-slate-200 rounded"></div>
                ))}
              </div>
            ) : projectVideos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projectVideos.map((video: Video) => (
                  <Card key={video.id} className="overflow-hidden">
                    <div className="aspect-video bg-slate-100 flex items-center justify-center relative">
                      {video.status === 'generating' || video.status === 'queued' ? (
                        <div className="text-center">
                          <RefreshCw className="h-12 w-12 text-primary mx-auto mb-2 animate-spin" />
                          <p className="text-sm text-slate-500">
                            {video.status === 'generating' ? 'Generating Video...' : 'In Queue...'}
                          </p>
                          <p className="text-xs text-slate-400">{video.resolution} • {video.duration}s</p>
                        </div>
                      ) : video.status === 'failed' ? (
                        <div className="text-center">
                          <X className="h-12 w-12 text-red-500 mx-auto mb-2" />
                          <p className="text-sm text-red-600">Generation Failed</p>
                          <p className="text-xs text-slate-400">{video.resolution} • {video.duration}s</p>
                        </div>
                      ) : video.video_url ? (
                        <video 
                          src={video.video_url}
                          className="w-full h-full object-cover"
                          controls
                          poster="/api/placeholder/300/200"
                        />
                      ) : (
                        <div className="text-center">
                          <Play className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                          <p className="text-sm text-slate-500">Video Preview</p>
                          <p className="text-xs text-slate-400">{video.resolution} • {video.duration}s</p>
                        </div>
                      )}
                      
                      <Badge 
                        variant={getStatusBadgeVariant(video.status)}
                        className="absolute top-2 right-2"
                      >
                        {video.status}
                      </Badge>
                    </div>
                    
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary">{video.model_id}</Badge>
                          <span className="text-xs text-slate-500">
                            {new Date(video.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 line-clamp-2">{video.prompt}</p>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>{video.aspect_ratio}</span>
                          <span>{video.duration}s • {video.resolution}</span>
                        </div>
                        <div className="flex space-x-1">
                          {video.video_url && (
                            <Button size="sm" variant="outline" className="flex-1">
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                          )}
                          {video.gcs_uri && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => copyToClipboard(video.gcs_uri!)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Play className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">No videos in this project yet</p>
                <p className="text-sm text-slate-500 mb-4">
                  Generate videos and assign them to this project to see them here
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}