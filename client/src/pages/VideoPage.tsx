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
  Plus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import SimpleGalleryPage from './SimpleGalleryPage';

// Video generation form schema
const videoGenerationSchema = z.object({
  prompt: z.string().min(10, 'Prompt must be at least 10 characters').max(2000, 'Prompt must be less than 2000 characters'),
  model: z.enum(['hailuo-02', 'veo-3', 'veo-3-fast', 'veo-2']),
  aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4']).optional(),
  resolution: z.enum(['512p', '768p', '720p', '1080p']),
  duration: z.union([
    z.enum(['3s', '5s', '10s', '15s']), // for veo models
    z.number().int().min(6).max(10) // for hailuo-02 (6 or 10 seconds)
  ]),
  projectId: z.string().optional(),
  referenceImage: z.string().optional(), // base64 encoded image
  firstFrameImage: z.string().optional(), // for hailuo-02
  seed: z.number().int().optional(),
  audioEnabled: z.boolean().default(false),
  personGeneration: z.boolean().default(true),
  promptOptimizer: z.boolean().default(true), // for hailuo-02
});

export type VideoGenerationForm = z.infer<typeof videoGenerationSchema>;

// Video model configurations
const VIDEO_MODELS = {
  'hailuo-02': {
    label: 'Hailuo-02',
    description: 'High-quality video generation from Minimax with fast generation times',
    maxDuration: 10, // numeric for hailuo-02
    resolutions: ['512p', '768p', '1080p'],
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'], // aspect ratio determined by firstFrameImage
    supportsDurationInt: true, // uses integer duration instead of string
    supportsFirstFrame: true,
    supportsPromptOptimizer: true
  },
  'veo-3': {
    label: 'Veo 3',
    description: 'Latest Google video model with highest quality',
    maxDuration: '15s',
    resolutions: ['720p', '1080p'],
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4']
  },
  'veo-3-fast': {
    label: 'Veo 3 Fast',
    description: 'Faster generation with good quality',
    maxDuration: '10s',
    resolutions: ['720p', '1080p'],
    aspectRatios: ['1:1', '16:9', '9:16']
  },
  'veo-2': {
    label: 'Veo 2',
    description: 'Stable and reliable video generation',
    maxDuration: '10s',
    resolutions: ['720p', '1080p'],
    aspectRatios: ['1:1', '16:9', '9:16', '4:3']
  }
};

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
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'create' | 'gallery'>('create');
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');

  // Form setup
  const form = useForm<VideoGenerationForm>({
    resolver: zodResolver(videoGenerationSchema),
    defaultValues: {
      prompt: '',
      model: 'hailuo-02',
      aspectRatio: '16:9',
      resolution: '1080p',
      duration: 6, // integer for hailuo-02
      audioEnabled: false,
      personGeneration: true,
      promptOptimizer: true,
    },
  });

  const watchedModel = form.watch('model');
  
  // Ensure we have a valid model, fallback to hailuo-02 if not
  const currentModel = watchedModel && VIDEO_MODELS[watchedModel] ? watchedModel : 'hailuo-02';

  // Fetch projects
  const { data: projects, isLoading: projectsLoading, refetch: refetchProjects } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    queryFn: () => apiRequest('/api/projects'),
    retry: false,
  });

  // AI Enhance mutation
  const aiEnhanceMutation = useMutation({
    mutationFn: async (prompt: string) => {
      return await apiRequest('/api/ai-enhance', {
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
        projectId: selectedProject || undefined,
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
        description: `Job ${data.jobId} has been queued. You'll be notified when complete.`,
      });
      // Switch to gallery tab to show progress
      setActiveTab('gallery');
    },
    onError: (error: any) => {
      toast({
        title: 'Generation Failed',
        description: error?.message || 'Could not start video generation. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Handle model change - update available options
  useEffect(() => {
    const modelConfig = VIDEO_MODELS[watchedModel];
    const currentResolution = form.getValues('resolution');
    const currentAspectRatio = form.getValues('aspectRatio');
    const currentDuration = form.getValues('duration');

    // Reset resolution if not available for selected model
    if (!modelConfig.resolutions.includes(currentResolution)) {
      form.setValue('resolution', modelConfig.resolutions[0] as any);
    }

    // Reset aspect ratio if not available for selected model
    if (!modelConfig.aspectRatios.includes(currentAspectRatio)) {
      form.setValue('aspectRatio', modelConfig.aspectRatios[0] as any);
    }

    // Reset duration if exceeds model's max duration
    const maxDurationSeconds = parseInt(modelConfig.maxDuration.replace('s', ''));
    const currentDurationSeconds = parseInt(currentDuration.replace('s', ''));
    if (currentDurationSeconds > maxDurationSeconds) {
      form.setValue('duration', modelConfig.maxDuration as any);
    }
  }, [watchedModel, form]);

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
                            <SelectItem value="">No Project</SelectItem>
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
                      {/* Aspect Ratio */}
                      <div className="space-y-2">
                        <Label>Aspect Ratio</Label>
                        <Select
                          value={form.watch('aspectRatio')}
                          onValueChange={(value) => form.setValue('aspectRatio', value as any)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {VIDEO_MODELS[currentModel]?.aspectRatios?.map((ratio) => (
                              <SelectItem key={ratio} value={ratio}>
                                {ratio}
                              </SelectItem>
                            )) || []}
                          </SelectContent>
                        </Select>
                      </div>

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
                            {VIDEO_MODELS[currentModel]?.resolutions?.map((res) => (
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
                          {currentModel === 'hailuo-02' ? (
                            <>
                              <SelectItem value="6">6 seconds</SelectItem>
                              <SelectItem value="10">10 seconds</SelectItem>
                            </>
                          ) : (
                            <>
                              <SelectItem value="3s">3 seconds</SelectItem>
                              <SelectItem value="5s">5 seconds</SelectItem>
                              {VIDEO_MODELS[currentModel] && typeof VIDEO_MODELS[currentModel].maxDuration === 'string' &&
                               parseInt(VIDEO_MODELS[currentModel].maxDuration.replace('s', '')) >= 10 && (
                                <SelectItem value="10s">10 seconds</SelectItem>
                              )}
                              {VIDEO_MODELS[currentModel] && typeof VIDEO_MODELS[currentModel].maxDuration === 'string' &&
                               parseInt(VIDEO_MODELS[currentModel].maxDuration.replace('s', '')) >= 15 && (
                                <SelectItem value="15s">15 seconds</SelectItem>
                              )}
                            </>
                          )}
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
                        <div className="space-y-2">
                          <Label>First Frame Image (Optional)</Label>
                          <p className="text-sm text-muted-foreground">
                            Upload an image to use as the first frame. The output video will match this aspect ratio.
                          </p>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (e) => {
                                  const base64 = e.target?.result as string;
                                  form.setValue('firstFrameImage', base64);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </div>
                      </>
                    )}

                    <Separator />

                    {/* Advanced Options */}
                    <div className="space-y-4">
                      <h3 className="font-medium">Advanced Options</h3>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Audio Generation</Label>
                          <p className="text-sm text-muted-foreground">
                            Generate background audio for the video
                          </p>
                        </div>
                        <Switch
                          checked={form.watch('audioEnabled')}
                          onCheckedChange={(checked) => form.setValue('audioEnabled', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Person Generation</Label>
                          <p className="text-sm text-muted-foreground">
                            Allow generation of people in videos
                          </p>
                        </div>
                        <Switch
                          checked={form.watch('personGeneration')}
                          onCheckedChange={(checked) => form.setValue('personGeneration', checked)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Seed (optional)</Label>
                        <Input
                          type="number"
                          placeholder="Enter seed for reproducible results"
                          {...form.register('seed', { valueAsNumber: true })}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Button
                  type="submit"
                  size="lg"
                  disabled={generateVideoMutation.isPending}
                  className="w-full"
                >
                  {generateVideoMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Video...
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
                      <h4 className="font-medium">{VIDEO_MODELS[watchedModel].label}</h4>
                      <p className="text-sm text-muted-foreground">
                        {VIDEO_MODELS[watchedModel].description}
                      </p>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Max Duration:</span>
                        <Badge variant="secondary">{VIDEO_MODELS[watchedModel].maxDuration}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Resolutions:</span>
                        <div className="flex gap-1">
                          {VIDEO_MODELS[watchedModel].resolutions.map((res) => (
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
                      <li>Use seed for consistent style across videos</li>
                      <li>Consider aspect ratio for intended platform</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="gallery" className="space-y-6">
          <div className="rounded-lg border bg-muted/5 p-6">
            <div className="text-center space-y-2">
              <VideoIcon className="w-12 h-12 text-muted-foreground mx-auto" />
              <h3 className="text-lg font-medium">Video Gallery</h3>
              <p className="text-muted-foreground">
                Video gallery integration will be available here. Videos will appear alongside images in the main gallery filtered by project.
              </p>
              <Button
                variant="outline"
                onClick={() => window.open('/gallery', '_blank')}
                className="mt-4"
              >
                Open Main Gallery
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}