import React, { useState } from 'react';
import { VideoIcon, Play, Download, Copy, RefreshCw, Plus, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import VideoProjectGallery from '@/components/VideoProjectGallery';

// Types
type VideoModel = 'Veo 3' | 'Veo 3 Fast' | 'Veo 2';
type AspectRatio = '16:9' | '9:16' | '1:1';
type Resolution = '720p' | '1080p';
type Duration = 5 | 6 | 7 | 8;
type PersonGeneration = 'allow_all' | 'dont_allow';

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
}

const VideoCreationPage: React.FC = () => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedProjectForGeneration, setSelectedProjectForGeneration] = useState<string>('');
  
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

  const handleGenerate = async () => {
    if (!formData.prompt.trim()) {
      toast({ title: 'Please enter a prompt', variant: 'destructive' });
      return;
    }

    if (!selectedProjectForGeneration) {
      toast({ title: 'Please select a project from the gallery', variant: 'destructive' });
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
          projectId: selectedProjectForGeneration,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Video generation failed');
      }

      const result = await response.json();
      console.log('Video generation started:', result);
      
      toast({ title: 'Video generation started', description: 'Your video is being processed...' });
      
      // Reset prompt after successful submission
      setFormData(prev => ({ ...prev, prompt: '' }));
      
    } catch (error) {
      console.error('Video generation error:', error);
      toast({ 
        title: 'Generation failed', 
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive' 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="flex flex-col lg:flex-row h-screen">
        {/* Left Column - Video Generation Form */}
        <div className="lg:w-1/2 p-8 overflow-y-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center justify-center gap-3">
              <VideoIcon className="h-8 w-8 text-blue-600" />
              AI Video Generator
            </h1>
            <p className="text-slate-600">
              Create videos with Google Vertex AI Veo
            </p>
          </div>

          <div className="space-y-6 max-w-2xl mx-auto">
            {/* Project Selection Display */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Selected Project</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-slate-50 rounded-lg text-center">
                  {selectedProjectForGeneration ? (
                    <div>
                      <div className="text-sm font-medium text-slate-900 mb-1">✓ Project Selected</div>
                      <div className="text-xs text-slate-600">ID: {selectedProjectForGeneration}</div>
                    </div>
                  ) : (
                    <div className="text-slate-500 text-sm">
                      <VideoIcon className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                      Select a project from the gallery →
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Generation Form */}
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
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Duration */}
                  <div className="space-y-2">
                    <Label>Duration</Label>
                    <Select 
                      value={formData.duration.toString()} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, duration: parseInt(value) as Duration }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {constraints.durations.map(dur => (
                          <SelectItem key={dur} value={dur.toString()}>{dur}s</SelectItem>
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

                <div className="grid grid-cols-2 gap-4">
                  {/* Generate Audio */}
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

                  {/* Enhance Prompt */}
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
                  disabled={!formData.prompt.trim() || !selectedProjectForGeneration || isGenerating}
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
        </div>

        {/* Right Column - Project Gallery */}
        <div className="lg:w-1/2 p-8 overflow-y-auto bg-white border-l border-slate-200">
          <VideoProjectGallery onSelectProject={setSelectedProjectForGeneration} />
        </div>
      </div>
    </div>
  );
};

export default VideoCreationPage;