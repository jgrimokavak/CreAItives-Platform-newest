import React, { useState } from 'react';
import { VideoIcon, Play, Download, Copy, RefreshCw, Plus, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

// Types
type VideoModel = 'Veo 3' | 'Veo 3 Fast' | 'Veo 2';
type AspectRatio = '16:9' | '9:16' | '1:1';
type Resolution = '720p' | '1080p';
type Duration = 5 | 6 | 7 | 8;
type PersonGeneration = 'allow_all' | 'dont_allow';

interface Project {
  id: string;
  name: string;
  createdAt: Date;
}

interface GeneratedVideo {
  id: string;
  url: string | null;
  gcsUri: string;
  prompt: string;
  model: VideoModel;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  duration: Duration;
  sampleIndex: number;
  timestamp: Date;
  projectId?: string;
  status?: 'generating' | 'completed' | 'failed';
  operationName?: string;
}

interface VideoFormData {
  prompt: string;
  negativePrompt: string;
  model: VideoModel;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  duration: Duration;
  sampleCount: number;
  generateAudio: boolean;
  seed?: number;
  enhancePrompt: boolean;
  personGeneration: PersonGeneration;
  projectId: string;
}

// Mock projects
const mockProjects: Project[] = [
  { id: '1', name: 'Marketing Campaign 2024', createdAt: new Date('2024-01-15') },
  { id: '2', name: 'Product Demo Videos', createdAt: new Date('2024-02-20') },
  { id: '3', name: 'Social Media Content', createdAt: new Date('2024-03-10') },
];

const VideoCreationPage: React.FC = () => {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [sessionVideos, setSessionVideos] = useState<GeneratedVideo[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<GeneratedVideo | null>(null);
  
  const [formData, setFormData] = useState<VideoFormData>({
    prompt: '',
    negativePrompt: '',
    model: 'Veo 3',
    aspectRatio: '16:9',
    resolution: '720p',
    duration: 8,
    sampleCount: 1,
    generateAudio: true,
    enhancePrompt: false,
    personGeneration: 'allow_all',
    projectId: projects[0]?.id || '',
  });

  // Model constraints
  const getModelConstraints = (model: VideoModel) => {
    switch (model) {
      case 'Veo 3':
        return {
          aspectRatios: ['16:9'] as AspectRatio[],
          resolutions: ['720p', '1080p'] as Resolution[],
          durations: [8] as Duration[],
          sampleCounts: [1, 2],
          supportsAudio: true,
        };
      case 'Veo 3 Fast':
        return {
          aspectRatios: ['16:9'] as AspectRatio[],
          resolutions: ['720p', '1080p'] as Resolution[],
          durations: [8] as Duration[],
          sampleCounts: [1, 2],
          supportsAudio: true,
        };
      case 'Veo 2':
        return {
          aspectRatios: ['16:9', '9:16', '1:1'] as AspectRatio[],
          resolutions: ['720p'] as Resolution[],
          durations: [5, 6, 7, 8] as Duration[],
          sampleCounts: [1, 2, 3, 4],
          supportsAudio: false,
        };
      default:
        return {
          aspectRatios: ['16:9'] as AspectRatio[],
          resolutions: ['720p'] as Resolution[],
          durations: [8] as Duration[],
          sampleCounts: [1],
          supportsAudio: false,
        };
    }
  };

  const constraints = getModelConstraints(formData.model);

  // Handle model change and reset incompatible values
  const handleModelChange = (model: VideoModel) => {
    const newConstraints = getModelConstraints(model);
    setFormData(prev => ({
      ...prev,
      model,
      aspectRatio: newConstraints.aspectRatios.includes(prev.aspectRatio) 
        ? prev.aspectRatio 
        : newConstraints.aspectRatios[0],
      resolution: newConstraints.resolutions.includes(prev.resolution)
        ? prev.resolution
        : newConstraints.resolutions[0],
      duration: newConstraints.durations.includes(prev.duration)
        ? prev.duration
        : newConstraints.durations[0],
      sampleCount: newConstraints.sampleCounts.includes(prev.sampleCount)
        ? prev.sampleCount
        : newConstraints.sampleCounts[0],
      generateAudio: newConstraints.supportsAudio ? prev.generateAudio : false,
    }));
  };

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    
    const newProject: Project = {
      id: Date.now().toString(),
      name: newProjectName.trim(),
      createdAt: new Date(),
    };
    
    setProjects(prev => [newProject, ...prev]);
    setFormData(prev => ({ ...prev, projectId: newProject.id }));
    setNewProjectName('');
    setShowNewProjectDialog(false);
    toast({ title: 'Project created successfully' });
  };

  const handleGenerate = async () => {
    if (!formData.prompt.trim()) {
      toast({ title: 'Please enter a prompt', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);
    
    try {
      console.log('Sending video generation request:', formData);
      
      const response = await fetch('/api/video-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: formData.prompt,
          negativePrompt: formData.negativePrompt,
          model: formData.model,
          aspectRatio: formData.aspectRatio,
          resolution: formData.resolution,
          duration: formData.duration,
          sampleCount: formData.sampleCount,
          generateAudio: formData.generateAudio,
          seed: formData.seed,
          enhancePrompt: formData.enhancePrompt,
          personGeneration: formData.personGeneration,
          projectId: formData.projectId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Video generation failed');
      }

      const result = await response.json();
      console.log('Video generation started:', result);
      
      // Create pending video entries for the UI
      const newVideos: GeneratedVideo[] = [];
      
      for (let i = 0; i < formData.sampleCount; i++) {
        newVideos.push({
          id: `${result.id}-${i}`,
          url: null, // Will be populated when job completes
          gcsUri: `pending`,
          prompt: formData.prompt,
          model: formData.model,
          aspectRatio: formData.aspectRatio,
          resolution: formData.resolution,
          duration: formData.duration,
          sampleIndex: i + 1,
          timestamp: new Date(),
          projectId: formData.projectId,
          status: 'generating',
          operationName: result.operationName,
        });
      }
      
      setSessionVideos(prev => [...newVideos, ...prev]);
      toast({ title: 'Video generation started', description: 'Your video is being processed...' });
      
      // Start polling for job completion
      pollJobStatus(result.id, result.operationName);
      
    } catch (error) {
      console.error('Video generation error:', error);
      toast({ 
        title: 'Generation failed', 
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive' 
      });
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };

  const pollJobStatus = async (videoId: string, operationName: string) => {
    const maxAttempts = 60; // Poll for up to 10 minutes (60 * 10 seconds)
    let attempts = 0;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        console.log('Polling timeout reached for video:', videoId);
        setIsGenerating(false);
        // Update video status to failed
        setSessionVideos(prev => prev.map(video => 
          video.id.startsWith(videoId) 
            ? { ...video, status: 'failed' as const }
            : video
        ));
        toast({ 
          title: 'Generation timeout', 
          description: 'Video generation took too long. Please try again.',
          variant: 'destructive' 
        });
        return;
      }

      try {
        const response = await fetch(`/api/video-generate/status/${videoId}`);
        if (!response.ok) {
          throw new Error('Failed to check status');
        }

        const status = await response.json();
        console.log('Job status:', status);

        if (status.status === 'completed') {
          // Update video entries with completed status and URLs
          setSessionVideos(prev => prev.map(video => 
            video.id.startsWith(videoId) 
              ? { 
                  ...video, 
                  status: 'completed' as const,
                  url: status.video_url,
                  gcsUri: status.gcs_uri
                }
              : video
          ));
          setIsGenerating(false);
          toast({ title: 'Video generated successfully!' });
        } else if (status.status === 'failed') {
          setSessionVideos(prev => prev.map(video => 
            video.id.startsWith(videoId) 
              ? { ...video, status: 'failed' as const }
              : video
          ));
          setIsGenerating(false);
          toast({ 
            title: 'Generation failed', 
            description: status.error_message || 'Unknown error',
            variant: 'destructive' 
          });
        } else {
          // Still processing, continue polling
          attempts++;
          setTimeout(poll, 10000); // Poll every 10 seconds
        }
      } catch (error) {
        console.error('Error polling job status:', error);
        attempts++;
        setTimeout(poll, 10000); // Continue polling even on errors
      }
    };

    // Start polling after a short delay
    setTimeout(poll, 5000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-primary/10 rounded-lg">
          <VideoIcon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Video Creation</h1>
          <p className="text-slate-600 mt-1">AI-powered video generation with Google Vertex AI</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Generation Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate Video</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Prompt */}
              <div className="space-y-2">
                <Label htmlFor="prompt">Prompt *</Label>
                <Textarea
                  id="prompt"
                  placeholder="Describe the video you want to generate..."
                  value={formData.prompt}
                  onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
                  rows={3}
                />
              </div>

              {/* Negative Prompt */}
              <div className="space-y-2">
                <Label htmlFor="negativePrompt">Negative Prompt</Label>
                <Input
                  id="negativePrompt"
                  placeholder="What to avoid in the video..."
                  value={formData.negativePrompt}
                  onChange={(e) => setFormData(prev => ({ ...prev, negativePrompt: e.target.value }))}
                />
              </div>

              {/* Model Selector */}
              <div className="space-y-2">
                <Label>Model</Label>
                <Select value={formData.model} onValueChange={handleModelChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Veo 3">Veo 3</SelectItem>
                    <SelectItem value="Veo 3 Fast">Veo 3 Fast</SelectItem>
                    <SelectItem value="Veo 2">Veo 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Aspect Ratio */}
                <div className="space-y-2">
                  <Label>Aspect Ratio</Label>
                  <Select 
                    value={formData.aspectRatio} 
                    onValueChange={(value: AspectRatio) => setFormData(prev => ({ ...prev, aspectRatio: value }))}
                    disabled={constraints.aspectRatios.length === 1}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {constraints.aspectRatios.map(ratio => (
                        <SelectItem key={ratio} value={ratio}>{ratio}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Resolution */}
                <div className="space-y-2">
                  <Label>Resolution</Label>
                  <Select 
                    value={formData.resolution} 
                    onValueChange={(value: Resolution) => setFormData(prev => ({ ...prev, resolution: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {constraints.resolutions.map(res => (
                        <SelectItem key={res} value={res}>{res}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Select 
                    value={formData.duration.toString()} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, duration: parseInt(value) as Duration }))}
                    disabled={constraints.durations.length === 1}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {constraints.durations.map(dur => (
                        <SelectItem key={dur} value={dur.toString()}>{dur} seconds</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sample Count */}
                <div className="space-y-2">
                  <Label>Sample Count</Label>
                  <Select 
                    value={formData.sampleCount.toString()} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, sampleCount: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {constraints.sampleCounts.map(count => (
                        <SelectItem key={count} value={count.toString()}>{count}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Additional Options */}
              <div className="space-y-3">
                {constraints.supportsAudio && (
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="generateAudio"
                      checked={formData.generateAudio}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, generateAudio: checked as boolean }))}
                    />
                    <Label htmlFor="generateAudio">Generate Audio</Label>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="enhancePrompt"
                    checked={formData.enhancePrompt}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enhancePrompt: checked as boolean }))}
                  />
                  <Label htmlFor="enhancePrompt">Enhance Prompt</Label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Person Generation */}
                <div className="space-y-2">
                  <Label>Person Generation</Label>
                  <Select 
                    value={formData.personGeneration} 
                    onValueChange={(value: PersonGeneration) => setFormData(prev => ({ ...prev, personGeneration: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="allow_all">Allow All</SelectItem>
                      <SelectItem value="dont_allow">Don't Allow</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Seed */}
                <div className="space-y-2">
                  <Label htmlFor="seed">Seed (optional)</Label>
                  <Input
                    id="seed"
                    type="number"
                    placeholder="Random seed..."
                    value={formData.seed || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, seed: e.target.value ? parseInt(e.target.value) : undefined }))}
                  />
                </div>
              </div>

              {/* Generate Button */}
              <Button 
                onClick={handleGenerate}
                disabled={!formData.prompt.trim() || isGenerating}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Generating Video...
                  </>
                ) : (
                  <>
                    <VideoIcon className="mr-2 h-4 w-4" />
                    Generate Video
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Project Selector */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Project</Label>
                <Select 
                  value={formData.projectId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, projectId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    New Project
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Project</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="projectName">Project Name</Label>
                      <Input
                        id="projectName"
                        placeholder="Enter project name..."
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setShowNewProjectDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateProject} disabled={!newProjectName.trim()}>
                        Create Project
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Session Gallery */}
      {sessionVideos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Session Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessionVideos.map((video) => (
                <Card key={video.id} className="overflow-hidden">
                  <div className="aspect-video bg-slate-100 flex items-center justify-center relative">
                    {video.status === 'generating' ? (
                      <div className="text-center">
                        <RefreshCw className="h-12 w-12 text-primary mx-auto mb-2 animate-spin" />
                        <p className="text-sm text-slate-500">Generating Video...</p>
                        <p className="text-xs text-slate-400">{video.resolution} • {video.duration}s</p>
                      </div>
                    ) : video.status === 'failed' ? (
                      <div className="text-center">
                        <X className="h-12 w-12 text-red-500 mx-auto mb-2" />
                        <p className="text-sm text-red-600">Generation Failed</p>
                        <p className="text-xs text-slate-400">{video.resolution} • {video.duration}s</p>
                      </div>
                    ) : video.url ? (
                      <video 
                        src={video.url}
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
                    
                    {video.status && (
                      <Badge 
                        variant={
                          video.status === 'completed' ? 'default' : 
                          video.status === 'generating' ? 'secondary' : 
                          'destructive'
                        }
                        className="absolute top-2 right-2"
                      >
                        {video.status}
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">{video.model}</Badge>
                        <span className="text-xs text-slate-500">
                          Sample {video.sampleIndex}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-2">{video.prompt}</p>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{video.aspectRatio}</span>
                        <span>{video.timestamp.toLocaleTimeString()}</span>
                      </div>
                      <div className="flex space-x-1">
                        <Button size="sm" variant="outline" className="flex-1">
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => copyToClipboard(video.gcsUri)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VideoCreationPage;