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
import { 
  VideoIcon, 
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
  Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import SimpleGalleryPage from './SimpleGalleryPage';
import ReferenceImageUpload from '@/components/ReferenceImageUpload';

// Video Gallery Component
function VideoGallery() {
  const { toast } = useToast();
  const { data: videosResponse, isLoading } = useQuery<{items: any[]}>({
    queryKey: ['/api/video'],
    queryFn: () => apiRequest('/api/video'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading videos...</span>
      </div>
    );
  }

  const videos = videosResponse?.items || [];

  if (!videos || videos.length === 0) {
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
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Your Videos ({videos.length})</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.map((video) => (
          <Card key={video.id} className="overflow-hidden">
            <div className="aspect-video bg-muted relative group">
              {video.status === 'completed' && video.url ? (
                <>
                  {/* Create thumbnail from video */}
                  <video 
                    className="w-full h-full object-cover"
                    muted
                    preload="metadata"
                    onLoadedMetadata={(e) => {
                      const video = e.target as HTMLVideoElement;
                      video.currentTime = 1; // Seek to 1 second for thumbnail
                    }}
                  >
                    <source src={video.url} type="video/mp4" />
                  </video>
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => window.open(video.url, '_blank')}
                      className="flex items-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Play
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        // Force download by creating a blob and downloading it
                        fetch(video.url)
                          .then(response => response.blob())
                          .then(blob => {
                            const url = window.URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `video-${video.id}.mp4`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            window.URL.revokeObjectURL(url);
                          })
                          .catch(error => {
                            console.error('Download error:', error);
                            // Fallback: open in new tab
                            window.open(video.url, '_blank');
                          });
                      }}
                      className="flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        if (confirm('Are you sure you want to delete this video?')) {
                          try {
                            await apiRequest(`/api/video/${video.id}`, {
                              method: 'DELETE'
                            });
                            queryClient.invalidateQueries({ queryKey: ['/api/video'] });
                            toast({
                              title: 'Video Deleted',
                              description: 'Video has been successfully deleted.',
                            });
                          } catch (error) {
                            toast({
                              title: 'Delete Failed',
                              description: 'Failed to delete video. Please try again.',
                              variant: 'destructive',
                            });
                          }
                        }
                      }}
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                  </div>
                </>
              ) : video.status === 'processing' ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Processing...</p>
                  </div>
                </div>
              ) : video.status === 'failed' ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center text-destructive">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">Failed to generate</p>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <VideoIcon className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
            </div>
            <CardContent className="p-4">
              <p className="text-sm font-medium line-clamp-2 mb-2">{video.prompt}</p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{video.model}</span>
                <span>{video.resolution} • {video.duration}s</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                <span className={`capitalize ${
                  video.status === 'completed' ? 'text-green-600' :
                  video.status === 'processing' ? 'text-yellow-600' :
                  video.status === 'failed' ? 'text-red-600' : ''
                }`}>
                  {video.status}
                </span>
                <span>{new Date(video.createdAt).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
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
  firstFrameImage: z.string().optional(), // determines aspect ratio
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
      resolutions: model.resolutions,
      aspectRatios: model.aspectRatios
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

export default function VideoPage() {
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<string>('none');
  const [activeTab, setActiveTab] = useState<'create' | 'gallery'>('create');
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [generatingVideoId, setGeneratingVideoId] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState<string>('');
  const [firstFrameImagePreview, setFirstFrameImagePreview] = useState<string | null>(null);

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

  // AI Enhance mutation
  const aiEnhanceMutation = useMutation({
    mutationFn: async (prompt: string) => {
      return await apiRequest('/api/ai/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, type: 'video' }),
      });
    },
    onSuccess: (data) => {
      if (data.enhancedPrompt) {
        form.setValue('prompt', data.enhancedPrompt);
        toast({
          title: 'Prompt Enhanced',
          description: 'Your prompt has been improved with AI suggestions.',
        });
      }
    },
    onError: () => {
      toast({
        title: 'Enhancement Failed',
        description: 'Could not enhance prompt. Please try again.',
        variant: 'destructive',
      });
    },
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
      
      // Start polling for video status
      if (data.video?.id) {
        setGeneratingVideoId(data.video.id);
        setGenerationProgress('Starting video generation...');
        pollVideoStatus(data.video.id);
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Generation Failed',
        description: error?.message || 'Could not start video generation. Please try again.',
        variant: 'destructive',
      });
      setGeneratingVideoId(null);
      setGenerationProgress('');
    },
  });

  // Poll for video status
  const pollVideoStatus = async (videoId: string) => {
    const maxAttempts = 60; // 6 minutes with 6-second intervals
    let attempts = 0;

    const poll = async () => {
      try {
        attempts++;
        
        const response = await apiRequest(`/api/video/status/${videoId}`);
        
        if (response.status === 'completed') {
          setGenerationProgress('Video completed!');
          toast({
            title: 'Video Ready!',
            description: 'Your video has been generated successfully.',
          });
          
          // Refresh gallery if on gallery tab
          if (activeTab === 'gallery') {
            queryClient.invalidateQueries({ queryKey: ['/api/video'] });
          }
          
          setGeneratingVideoId(null);
          setGenerationProgress('');
          return;
        }
        
        if (response.status === 'failed') {
          setGenerationProgress('Generation failed');
          toast({
            title: 'Video Generation Failed',
            description: response.error || 'The video could not be generated.',
            variant: 'destructive',
          });
          setGeneratingVideoId(null);
          setGenerationProgress('');
          return;
        }
        
        // Update progress message
        const elapsed = attempts * 6;
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        setGenerationProgress(`Processing... (${minutes}:${seconds.toString().padStart(2, '0')} elapsed)`);
        
        // Continue polling if still processing
        if (attempts < maxAttempts) {
          setTimeout(poll, 6000); // Poll every 6 seconds
        } else {
          // Timeout
          setGenerationProgress('Generation timed out');
          toast({
            title: 'Generation Timeout',
            description: 'Video generation is taking longer than expected. Please check back later.',
            variant: 'destructive',
          });
          setGeneratingVideoId(null);
          setGenerationProgress('');
        }
      } catch (error) {
        console.error('Error polling video status:', error);
        
        // Retry a few times on network errors
        if (attempts < 5) {
          setTimeout(poll, 6000);
        } else {
          setGenerationProgress('Failed to check status');
          setGeneratingVideoId(null);
        }
      }
    };

    // Start polling
    poll();
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
    if (currentPrompt.trim()) {
      aiEnhanceMutation.mutate(currentPrompt);
    }
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Generation Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Project Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FolderOpen className="w-5 h-5" />
                    Project Selection
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                </CardContent>
              </Card>

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
                          disabled={!form.watch('prompt')?.trim() || aiEnhanceMutation.isPending}
                          className="flex items-center gap-2"
                        >
                          {aiEnhanceMutation.isPending ? (
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

                    <Separator />

                    {/* Model-specific Options */}
                    {currentModel === 'hailuo-02' && (
                      <>
                        <Separator />
                        
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
                        <ReferenceImageUpload
                          value={firstFrameImagePreview || undefined}
                          onChange={(value) => {
                            setFirstFrameImagePreview(value || null);
                            form.setValue('firstFrameImage', value || '');
                          }}
                          className="w-full"
                        />
                      </>
                    )}

                    <Separator />


                  </CardContent>
                </Card>

                <Button
                  type="submit"
                  size="lg"
                  disabled={generateVideoMutation.isPending || generatingVideoId !== null || !form.watch('prompt')?.trim()}
                  className="w-full"
                >
                  {generateVideoMutation.isPending || generatingVideoId ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {generationProgress || 'Starting generation...'}
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

            {/* Right Column - Info & Tips */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Model Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium">{VIDEO_MODELS['hailuo-02'].label}</h4>
                      <p className="text-sm text-muted-foreground">
                        {VIDEO_MODELS['hailuo-02'].description}
                      </p>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Max Duration:</span>
                        <Badge variant="secondary">{VIDEO_MODELS['hailuo-02'].maxDuration} seconds</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Resolutions:</span>
                        <div className="flex gap-1">
                          {VIDEO_MODELS['hailuo-02'].resolutions.map((res: string) => (
                            <Badge key={res} variant="outline" className="text-xs">
                              {res}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Best Practices</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <h4 className="font-medium mb-1">Prompt Tips</h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Be specific about camera movements</li>
                      <li>Describe lighting and mood clearly</li>
                      <li>Include motion and action details</li>
                      <li>Use the AI Enhance feature for better results</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Technical Notes</h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Higher resolutions take longer to generate</li>
                      <li>10 seconds duration only available for 768p</li>
                      <li>Upload first frame image to control aspect ratio</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="gallery" className="space-y-6">
          <VideoGallery />
        </TabsContent>
      </Tabs>
    </div>
  );
}