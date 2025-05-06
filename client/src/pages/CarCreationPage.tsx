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
import CSVUpload from '@/components/CSVUpload';
import BatchProgress from '@/components/BatchProgress';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { CarFront, RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// Import the local GeneratedImage type used by ImageCard
import type { GeneratedImage } from '@/types/image';
import { Card, CardContent } from '@/components/ui/card';
import CarImageCard from '@/components/CarImageCard';
import ImageModal from '@/components/ImageModal';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { useEditor } from '@/context/EditorContext';

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
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { setMode, setSourceImages } = useEditor();
  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [bodyStyles, setBodyStyles] = useState<string[]>([]);
  const [trims, setTrims] = useState<string[]>([]);
  const [bg, setBg] = useState<"white" | "hub">("white");
  const [progress, setProgress] = useState<number | null>(null);
  const [image, setImage] = useState<GeneratedImage | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Batch mode state
  const [carCreationMode, setCarCreationMode] = useState<"single" | "batch">("single");
  const [batchJobId, setBatchJobId] = useState<string | null>(null);
  const [isUploadingBatch, setIsUploadingBatch] = useState<boolean>(false);
  
  // Generate years from 1990 to current year
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1990 + 1 }, (_, i) => String(currentYear - i));

  const form = useForm<CarGenerationFormValues>({
    resolver: zodResolver(carGenerationSchema),
    defaultValues: {
      year: '2025',  // Set default year to 2025
      aspect_ratio: '4:3',  // Changed default to 4:3
      make: 'None',
      model: 'None',
      body_style: 'None',
      trim: 'None',
      color: 'silver', // Set default color to silver
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
    toast({
      title: "Refreshing data",
      description: "Fetching the latest car data from source...",
    });
    
    fetch('/api/cars/refresh', { method: 'POST' })
      .then(() => {
        fetchMakes();
        toast({
          title: "Data refreshed",
          description: "Car data has been updated successfully",
        });
      })
      .catch(err => {
        console.error('Error refreshing car data:', err);
        toast({
          title: "Refresh failed",
          description: "Failed to refresh car data. Please try again.",
          variant: "destructive"
        });
      });
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
      
      toast({
        title: "Image generated",
        description: "Car image has been generated successfully and saved to your gallery"
      });
    },
    onError: (error: Error) => {
      console.error('Error generating car image:', error);
      setProgress(null);
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate car image. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Image download handler
  const handleDownload = async (image: GeneratedImage) => {
    try {
      let url;
      const imageUrl = image.fullUrl || image.url;
      
      // If the URL is a data URL (base64), use it directly
      if (imageUrl.startsWith('data:')) {
        url = imageUrl;
      } else {
        // Otherwise, fetch the image from the URL
        const response = await fetch(imageUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }
        
        const blob = await response.blob();
        url = window.URL.createObjectURL(blob);
      }
      
      // Create a download link
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      
      // Generate a safe filename, handling the case where prompt might be undefined
      let filename = 'car-image';
      
      // First try to use car details for the filename
      if (watchMake && watchMake !== 'None') {
        filename = `${watchMake}`;
        if (watchModel && watchModel !== 'None') {
          filename += `_${watchModel}`;
        }
        if (watchBodyStyle && watchBodyStyle !== 'None') {
          filename += `_${watchBodyStyle}`;
        }
        filename = filename.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '_').replace(/_+/g, '_');
      } 
      // If no car details or as a fallback, use prompt if available
      else if (image.prompt) {
        const cleanPrompt = image.prompt
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')    // Remove non-word chars
          .replace(/\s+/g, '_')         // Replace spaces with underscores
          .replace(/_+/g, '_')          // Replace multiple underscores with single ones
          .substring(0, 50);            // Limit length
        
        if (cleanPrompt) {
          filename = cleanPrompt;
        }
      }
      
      a.download = `${filename}.png`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Clean up the URL only if it was created from a blob
      if (!imageUrl.startsWith('data:')) {
        window.URL.revokeObjectURL(url);
      }
      
      toast({
        title: "Image downloaded",
        description: "Car image has been downloaded successfully"
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download failed",
        description: "Failed to download the image. Error: " + (error instanceof Error ? error.message : String(error)),
        variant: "destructive"
      });
    }
  };

  // Handler functions for image actions

  // Batch CSV upload handler
  const handleBatchUpload = async (file: File) => {
    setIsUploadingBatch(true);
    
    try {
      // Create form data for the CSV upload
      const formData = new FormData();
      formData.append('file', file);
      
      // Send the CSV to the batch endpoint
      const response = await fetch('/api/car-batch', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start batch job');
      }
      
      const data = await response.json();
      
      if (data.jobId) {
        setBatchJobId(data.jobId);
        toast({
          title: "Batch job started",
          description: "Your batch car generation job has started processing",
        });
      } else {
        throw new Error('No job ID returned from server');
      }
    } catch (error) {
      console.error('Batch upload error:', error);
      toast({
        title: "Batch upload failed",
        description: error instanceof Error ? error.message : 'Unknown error starting batch job',
        variant: "destructive"
      });
    } finally {
      setIsUploadingBatch(false);
    }
  };
  
  // Reset batch state
  const resetBatch = () => {
    setBatchJobId(null);
  };

  // Form submission handler
  const handleGenerate = () => {
    const values = form.getValues();
    generateMutation.mutate(values);
  };

  return (
    <>
      {/* Image Modal for fullscreen viewing - outside the container to avoid z-index issues */}
      {selectedImage && (
        <ImageModal 
          imageUrl={selectedImage} 
          onClose={() => setSelectedImage(null)} 
        />
      )}
      
      <div className="container max-w-6xl mx-auto py-6">
      
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold">Car Creation</h1>
        <Button 
          variant="outline" 
          onClick={refreshData}
          disabled={generateMutation.isPending || isUploadingBatch}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Car Data
        </Button>
      </div>
      <p className="text-muted-foreground mb-6">
        Generate car images one at a time or in batch mode using a CSV file with up to 50 cars.
      </p>
      
      <Tabs 
        value={carCreationMode} 
        onValueChange={(value) => setCarCreationMode(value as "single" | "batch")}
        className="mb-6"
      >
        <TabsList className="grid w-full md:w-80 grid-cols-2">
          <TabsTrigger value="single">Single</TabsTrigger>
          <TabsTrigger value="batch">Batch</TabsTrigger>
        </TabsList>
        
        <TabsContent value="single">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Form Section */}
        <div className="space-y-6 bg-card p-6 rounded-lg shadow-sm border">
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
              <Select
                value={form.watch('year')}
                onValueChange={(value) => setValue('year', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Select
                value={form.watch('color')}
                onValueChange={(value) => setValue('color', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="silver">Silver</SelectItem>
                  <SelectItem value="black">Black</SelectItem>
                  <SelectItem value="white">White</SelectItem>
                  <SelectItem value="red">Red</SelectItem>
                  <SelectItem value="blue">Blue</SelectItem>
                  <SelectItem value="green">Green</SelectItem>
                  <SelectItem value="yellow">Yellow</SelectItem>
                  <SelectItem value="orange">Orange</SelectItem>
                  <SelectItem value="gray">Gray</SelectItem>
                  <SelectItem value="brown">Brown</SelectItem>
                  <SelectItem value="burgundy">Burgundy</SelectItem>
                  <SelectItem value="navy blue">Navy Blue</SelectItem>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="bronze">Bronze</SelectItem>
                  <SelectItem value="pearl white">Pearl White</SelectItem>
                  <SelectItem value="metallic blue">Metallic Blue</SelectItem>
                </SelectContent>
              </Select>
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
              Generate Car Image
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
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Generated Image</h2>
              </div>
              
              <div className="relative">
                {/* Image card with actions */}
                <CarImageCard
                  image={image}
                  make={watchMake !== 'None' ? watchMake : undefined}
                  model={watchModel !== 'None' ? watchModel : undefined}
                  bodyStyle={watchBodyStyle !== 'None' ? watchBodyStyle : undefined}
                  trim={form.watch('trim') !== 'None' ? form.watch('trim') : undefined}
                  year={form.watch('year')}
                  color={form.watch('color')}
                  background={form.watch('background')}
                  onEdit={(img) => {
                    console.log("Edit button clicked with image:", img);
                    
                    // Use the same edit handler approach as the gallery page
                    const sourceUrl = img.fullUrl || img.url;
                    console.log("Setting up edit mode with image URL:", sourceUrl);
                    
                    // Set editor context for edit mode
                    setMode('edit');
                    setSourceImages([sourceUrl]);
                    
                    // Navigate to the home page
                    console.log("Navigating to home for editing...");
                    setLocation('/');
                  }}
                  onUpscale={(img) => {
                    // Navigate to upscale page with the image URL
                    const imageUrl = img.fullUrl || img.url;
                    setLocation(`/upscale?sourceUrl=${encodeURIComponent(imageUrl)}`);
                  }}
                  onDownload={handleDownload}
                  onClick={() => {
                    console.log("Image clicked, setting fullscreen image:", image.fullUrl || image.url);
                    setSelectedImage(image.fullUrl || image.url);
                  }}
                />
              </div>
              
              <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm flex items-center border border-blue-100">
                <div className="mr-2 bg-blue-100 rounded-full p-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                </div>
                Image has been saved to your gallery automatically.
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[400px] bg-card/50 border rounded-lg shadow-sm">
              <div className="text-center p-8">
                <div className="bg-primary/10 rounded-full p-4 inline-block mb-2">
                  <CarFront className="mx-auto h-10 w-10 text-primary/80" />
                </div>
                <h3 className="mt-4 text-xl font-medium">No Car Image Generated Yet</h3>
                <p className="mt-2 text-muted-foreground max-w-md">
                  Fill out the form and click Generate to see your car image here.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
        </TabsContent>
        
        <TabsContent value="batch">
          <div className="space-y-8">
            {batchJobId ? (
              <BatchProgress 
                jobId={batchJobId} 
                onComplete={() => queryClient.invalidateQueries({ queryKey: ['/api/gallery'] })}
                onReset={resetBatch}
              />
            ) : (
              <div className="bg-card border rounded-lg shadow-sm p-6 max-w-4xl mx-auto">
                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-2">Batch Car Generation</h3>
                  <p className="text-muted-foreground">
                    Upload a CSV file with car details to generate multiple car images at once. 
                    The CSV should include columns like make, model, body_style, trim, year, color, background, and aspect_ratio.
                  </p>
                </div>
                
                <CSVUpload onUpload={handleBatchUpload} isLoading={isUploadingBatch} />
                
                <div className="mt-6 bg-slate-50 border border-slate-200 rounded-md p-4">
                  <h4 className="font-medium mb-2">CSV Format Instructions:</h4>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li><strong>make:</strong> The car manufacturer (e.g., "Audi", "Bmw")</li>
                    <li><strong>model:</strong> The car model (e.g., "Q5", "X5")</li>
                    <li><strong>body_style:</strong> The car body style (e.g., "SUV", "Sedan")</li>
                    <li><strong>trim:</strong> Specific trim level (e.g., "Sport", "Premium")</li>
                    <li><strong>year:</strong> Model year (e.g., "2025", "2024")</li>
                    <li><strong>color:</strong> Car color (e.g., "silver", "blue", "red")</li>
                    <li><strong>background:</strong> Either "white" for studio or "hub" for showroom</li>
                    <li><strong>aspect_ratio:</strong> One of "1:1", "16:9", "9:16", "4:3", "3:4"</li>
                  </ul>
                  <p className="text-xs mt-3 text-muted-foreground">
                    All columns are optional. If a column is missing, the AI will use its default values.
                    Maximum 50 rows per batch job.
                  </p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
      
    </div>
    </>
  );
};

export default CarCreationPage;