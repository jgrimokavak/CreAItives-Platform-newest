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
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import SimpleGalleryPage from './SimpleGalleryPage';
import ReferenceImageUpload from '@/components/ReferenceImageUpload';
import type { Video } from '@shared/schema';
import VideoCard from '@/components/VideoCard';

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

export default function VideoPage() {
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<string>('none');
  const [activeTab, setActiveTab] = useState<'create' | 'gallery'>('create');
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [generatingVideoId, setGeneratingVideoId] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState<string>('');
  const [lastCreatedVideo, setLastCreatedVideo] = useState<Video | null>(null);
  const [firstFrameImagePreview, setFirstFrameImagePreview] = useState<string | null>(null);
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false);
  const [recentlyGeneratedVideos, setRecentlyGeneratedVideos] = useState<string[]>([]);

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
          
          // Always refresh videos to show in recent videos section
          queryClient.invalidateQueries({ queryKey: ['/api/video'] });
          
          // Add to recently generated videos for immediate display
          setRecentlyGeneratedVideos(prev => [videoId, ...prev.slice(0, 4)]);
          
          // Set the last created video for the Result panel
          setLastCreatedVideo({
            ...response,
            model: response.model || 'hailuo-02',
            status: response.status as 'pending' | 'processing' | 'completed' | 'failed',
            createdAt: response.createdAt || new Date().toISOString()
          });
          
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

            {/* Right Column - Project Panel (4/12 columns) */}
            <div className="lg:col-span-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FolderOpen className="w-5 h-5" />
                    Project Panel
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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

          {/* Result Panel - Full width at bottom */}
          {lastCreatedVideo && (
            <div className="space-y-4 mt-8">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-primary" />
                  Result
                </h3>
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('gallery')}
                  className="flex items-center gap-2"
                >
                  <FolderOpen className="w-4 h-4" />
                  Open in Gallery
                </Button>
              </div>
              
              <Card>
                <CardContent className="p-4">
                  <div className="max-w-md">
                    <VideoCard
                      video={lastCreatedVideo}
                      className="w-full"
                    />
                  </div>
                </CardContent>
              </Card>
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