import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { CarFront, RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// Import the local GeneratedImage type used by ImageCard
import type { GeneratedImage } from '@/types/image';
import { Card, CardContent } from '@/components/ui/card';
import ImageCard from '@/components/ImageCard';

// Car generation form schema
const carGenerationSchema = z.object({
  year: z.string().optional(),
  aspect_ratio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]),
  make: z.string().optional(),
  model: z.string().optional(),
  body_style: z.string().optional(),
  trim: z.string().optional(),
  color: z.string().optional(),
  background: z.enum(["white", "hub"]).default("white")
});

type CarGenerationFormValues = z.infer<typeof carGenerationSchema>;

const CarCreationPage: React.FC = () => {
  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [bodyStyles, setBodyStyles] = useState<string[]>([]);
  const [trims, setTrims] = useState<string[]>([]);
  const [bg, setBg] = useState<"white" | "hub">("white");
  const [progress, setProgress] = useState<number | null>(null);
  const [image, setImage] = useState<GeneratedImage | null>(null);

  const form = useForm<CarGenerationFormValues>({
    resolver: zodResolver(carGenerationSchema),
    defaultValues: {
      year: '',
      aspect_ratio: '1:1',
      make: 'None',
      model: 'None',
      body_style: 'None',
      trim: 'None',
      color: '',
      background: 'white'
    }
  });

  const { watch, setValue } = form;
  const watchMake = watch('make');
  const watchModel = watch('model');
  const watchBodyStyle = watch('body_style');

  // Fetch makes
  const fetchMakes = async () => {
    try {
      const response = await fetch('/api/cars/makes');
      if (!response.ok) {
        throw new Error(`Failed to fetch makes: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      setMakes(data);
    } catch (error) {
      console.error('Error fetching makes:', error);
      setMakes([]);
    }
  };

  // Fetch models for selected make
  const fetchModels = async (make: string) => {
    if (make === 'None') {
      setModels([]);
      return;
    }
    
    try {
      const response = await fetch(`/api/cars/models?make=${encodeURIComponent(make)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      setModels(data);
    } catch (error) {
      console.error('Error fetching models:', error);
      setModels([]);
    }
  };

  // Fetch body styles for selected make and model
  const fetchBodyStyles = async (make: string, model: string) => {
    if (make === 'None' || model === 'None') {
      setBodyStyles([]);
      return;
    }
    
    try {
      const response = await fetch(`/api/cars/bodyStyles?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch body styles: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      setBodyStyles(data);
    } catch (error) {
      console.error('Error fetching body styles:', error);
      setBodyStyles([]);
    }
  };

  // Fetch trims for selected make, model and body style
  const fetchTrims = async (make: string, model: string, bodyStyle: string) => {
    if (make === 'None' || model === 'None' || bodyStyle === 'None') {
      setTrims([]);
      return;
    }
    
    try {
      const response = await fetch(`/api/cars/trims?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&bodyStyle=${encodeURIComponent(bodyStyle)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch trims: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      setTrims(data);
    } catch (error) {
      console.error('Error fetching trims:', error);
      setTrims([]);
    }
  };

  // Load makes on component mount
  useEffect(() => {
    fetchMakes();
  }, []);

  // Fetch models when make changes
  useEffect(() => {
    if (watchMake && watchMake !== 'None') {
      fetchModels(watchMake);
      setValue('model', 'None');
      setValue('body_style', 'None');
      setValue('trim', 'None');
    } else {
      setModels([]);
      setBodyStyles([]);
      setTrims([]);
    }
  }, [watchMake, setValue]);

  // Fetch body styles when model changes
  useEffect(() => {
    if (watchMake && watchMake !== 'None' && watchModel && watchModel !== 'None') {
      fetchBodyStyles(watchMake, watchModel);
      setValue('body_style', 'None');
      setValue('trim', 'None');
    } else {
      setBodyStyles([]);
      setTrims([]);
    }
  }, [watchMake, watchModel, setValue]);

  // Fetch trims when body style changes
  useEffect(() => {
    if (
      watchMake && watchMake !== 'None' && 
      watchModel && watchModel !== 'None' && 
      watchBodyStyle && watchBodyStyle !== 'None'
    ) {
      fetchTrims(watchMake, watchModel, watchBodyStyle);
      setValue('trim', 'None');
    } else {
      setTrims([]);
    }
  }, [watchMake, watchModel, watchBodyStyle, setValue]);

  // Background tabs change handler
  const handleBgChange = (value: string) => {
    const bgValue = value as "white" | "hub";
    setBg(bgValue);
    setValue('background', bgValue);
  };

  // Refresh car data handler
  const refreshData = () => {
    fetch('/api/cars/refresh', { method: 'POST' })
      .then(() => fetchMakes())
      .catch(err => console.error('Error refreshing car data:', err));
  };

  // Generate car image mutation
  const generateMutation = useMutation({
    mutationFn: async (values: CarGenerationFormValues) => {
      setProgress(10);
      
      // Convert 'None' values to empty strings
      const payload = {
        ...values,
        make: values.make === 'None' ? '' : values.make,
        model: values.model === 'None' ? '' : values.model,
        body_style: values.body_style === 'None' ? '' : values.body_style,
        trim: values.trim === 'None' ? '' : values.trim
      };
      
      // Create form data (API expects multipart form)
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined) {
          formData.append(key, value.toString());
        }
      });
      
      setProgress(20);
      
      // Simulate progress while waiting for the API
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev === null) return 20;
          return Math.min(prev + 5, 90);
        });
      }, 2000);
      
      try {
        const response = await fetch('/api/car-generate', {
          method: 'POST',
          body: formData
        });
        
        clearInterval(interval);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to generate car image');
        }
        
        setProgress(95);
        const data = await response.json();
        setProgress(100);
        
        // Clear progress after a delay
        setTimeout(() => setProgress(null), 1000);
        
        // Transform the API response into the correct GeneratedImage type
        const apiImage = data.image;
        const transformedImage: GeneratedImage = {
          id: apiImage.id,
          url: apiImage.url,
          prompt: apiImage.prompt,
          size: apiImage.size,
          model: apiImage.model,
          createdAt: apiImage.createdAt,
          sourceThumb: apiImage.sourceThumb || undefined,
          sourceImage: apiImage.sourceImage || undefined,
          width: apiImage.width,
          height: apiImage.height,
          thumbUrl: apiImage.thumbUrl,
          fullUrl: apiImage.fullUrl,
          starred: apiImage.starred,
          deletedAt: apiImage.deletedAt
        };
        
        return transformedImage;
      } catch (error) {
        clearInterval(interval);
        throw error;
      }
    },
    onSuccess: (data) => {
      setImage(data);
      // Invalidate gallery cache to make sure the new image shows up
      queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
    },
    onError: (error: Error) => {
      console.error('Error generating car image:', error);
      setProgress(null);
    }
  });

  // Form submission handler
  const handleGenerate = () => {
    const values = form.getValues();
    generateMutation.mutate(values);
  };

  return (
    <div className="container max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Car Creation</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Form Section */}
        <div className="space-y-6 bg-white p-6 rounded-lg shadow-sm border">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="make">Make</Label>
              <Select
                value={watchMake || 'None'}
                onValueChange={(value) => setValue('make', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select make" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  {makes.map(make => (
                    <SelectItem key={make} value={make}>{make}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Select
                value={watchModel || 'None'}
                onValueChange={(value) => setValue('model', value)}
                disabled={!models.length}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  {models.map(model => (
                    <SelectItem key={model} value={model}>{model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="body_style">Body Style</Label>
              <Select
                value={watchBodyStyle || 'None'}
                onValueChange={(value) => setValue('body_style', value)}
                disabled={!bodyStyles.length}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select body style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  {bodyStyles.map(style => (
                    <SelectItem key={style} value={style}>{style}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="trim">Trim</Label>
              <Select
                value={form.watch('trim') || 'None'}
                onValueChange={(value) => setValue('trim', value)}
                disabled={!trims.length}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select trim" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  {trims.map(trim => (
                    <SelectItem key={trim} value={trim}>{trim}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                min={1990}
                max={2025}
                placeholder="e.g. 2023"
                {...form.register('year')}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                placeholder="e.g. red"
                {...form.register('color')}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Background Style</Label>
              <Tabs value={bg} onValueChange={handleBgChange} className="w-full">
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="white">White Studio</TabsTrigger>
                  <TabsTrigger value="hub">HUB</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="aspect_ratio">Aspect Ratio</Label>
              <Select
                value={form.watch('aspect_ratio')}
                onValueChange={(value) => setValue('aspect_ratio', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select aspect ratio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1:1">1:1 (Square)</SelectItem>
                  <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                  <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                  <SelectItem value="4:3">4:3 (Classic)</SelectItem>
                  <SelectItem value="3:4">3:4 (Portrait)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex gap-4 pt-4">
            <Button 
              onClick={handleGenerate} 
              disabled={generateMutation.isPending || progress !== null}
              className="flex-1"
            >
              <CarFront className="mr-2 h-5 w-5" />
              Generate
            </Button>
            
            <Button 
              variant="outline" 
              onClick={refreshData}
              disabled={generateMutation.isPending}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh car data
            </Button>
          </div>
          
          {progress !== null && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-gray-500 text-center">
                {progress < 100 ? 'Generating car image...' : 'Generation complete!'}
              </p>
            </div>
          )}
          
          {generateMutation.isError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded">
              {(generateMutation.error as Error).message || 'An error occurred while generating the image.'}
            </div>
          )}
        </div>
        
        {/* Preview Section */}
        <div>
          {image ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Generated Image</h2>
              <div className="border rounded-lg overflow-hidden">
                <ImageCard 
                  image={image} 
                  mode="preview" 
                  onDownload={(img) => {
                    // Download the image
                    const link = document.createElement('a');
                    link.href = img.url;
                    link.download = `car-${new Date().getTime()}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                />
              </div>
              <p className="text-sm text-gray-500">Image saved to gallery automatically.</p>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[300px] bg-gray-50 border rounded-lg">
              <div className="text-center p-6">
                <CarFront className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">No image generated yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Fill out the form and click Generate to create a car image.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CarCreationPage;