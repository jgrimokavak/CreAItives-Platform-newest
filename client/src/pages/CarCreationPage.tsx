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
import { CarFront, RefreshCw, CheckCircle, AlertCircle, Download, Pencil, Maximize2, ImageIcon, ExternalLink } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
// Import the local GeneratedImage type used by ImageCard
import type { GeneratedImage } from '@/types/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import CarImageCard from '@/components/CarImageCard';
import ImageModal from '@/components/ImageModal';
import CarListEditModal from '@/components/CarListEditModal';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { useEditor } from '@/context/EditorContext';

// Import car angle SVG assets
import defaultSvg from '@/assets/car-angles/default.svg';
import frontViewSvg from '@/assets/car-angles/front-view.svg';
import frontQuarterLeftSvg from '@/assets/car-angles/front-quarter-left.svg';
import frontQuarterRightSvg from '@/assets/car-angles/front-quarter-right.svg';
import sideProfileLeftSvg from '@/assets/car-angles/side-profile-left.svg';
import sideProfileRightSvg from '@/assets/car-angles/side-profile-right.svg';
import rearQuarterLeftSvg from '@/assets/car-angles/rear-quarter-left.svg';
import rearQuarterRightSvg from '@/assets/car-angles/rear-quarter-right.svg';
import rearViewSvg from '@/assets/car-angles/rear-view.svg';
import frontAerialSvg from '@/assets/car-angles/front-aerial.svg';
import rearAerialSvg from '@/assets/car-angles/rear-aerial.svg';
import topDownSvg from '@/assets/car-angles/top-down.svg';

// Car generation form schema
const carGenerationSchema = z.object({
  year: z.string().optional(),
  aspect_ratio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]),
  make: z.string().optional(),
  model: z.string().optional(),
  body_style: z.string().optional(),
  trim: z.string().optional(),
  color: z.string().optional(),
  wheel_color: z.string().optional(),
  has_adventure_cladding: z.boolean().optional(),
  background: z.enum(["white", "hub"]).default("white"),
  car_angle: z.string().optional()
});

type CarGenerationFormValues = z.infer<typeof carGenerationSchema>;

// SVG mapping for car angle previews
const carAngleSvgMap: Record<string, string> = {
  'default': defaultSvg,
  'front-view': frontViewSvg,
  'front-quarter-left': frontQuarterLeftSvg,
  'front-quarter-right': frontQuarterRightSvg,
  'side-profile-left': sideProfileLeftSvg,
  'side-profile-right': sideProfileRightSvg,
  'rear-quarter-left': rearQuarterLeftSvg,
  'rear-quarter-right': rearQuarterRightSvg,
  'rear-view': rearViewSvg,
  'front-aerial': frontAerialSvg,
  'rear-aerial': rearAerialSvg,
  'top-down': topDownSvg
};

const CarCreationPage: React.FC = () => {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { setMode, setSourceImages } = useEditor();
  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [bodyStyles, setBodyStyles] = useState<string[]>([]);
  const [trims, setTrims] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([
    // Fallback colors if Google Sheets is unavailable
    'silver', 'black', 'white', 'red', 'blue', 'green', 'yellow', 'orange', 'gray', 'brown',
    'burgundy', 'navy blue', 'gold', 'bronze', 'pearl white', 'metallic blue', 'electric blue',
    'electric red', 'electric orange', 'dark grey', 'light grey', 'charcoal', 'midnight blue',
    'forest green', 'champagne', 'matte black', 'matte gray', 'satin silver', 'sage green',
    'ceramic gray', 'volcanic gray', 'beige', 'tan', 'cherry red', 'royal blue', 'deep Ultramarine Blue'
  ]);
  const [bg, setBg] = useState<"white" | "hub">("hub");
  const [progress, setProgress] = useState<number | null>(null);
  const [image, setImage] = useState<GeneratedImage | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Batch mode state
  const [carCreationMode, setCarCreationMode] = useState<"single" | "batch">("single");
  const [batchJobId, setBatchJobId] = useState<string | null>(null);
  const [isUploadingBatch, setIsUploadingBatch] = useState<boolean>(false);
  
  // Modal state
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  
  // Custom color state
  const [showCustomColor, setShowCustomColor] = useState<boolean>(false);
  const [customColor, setCustomColor] = useState<string>("");
  
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
      wheel_color: 'silver', // Set default wheel color to silver
      has_adventure_cladding: false, // Set default adventure cladding to false
      background: 'hub',
      car_angle: 'default' // Default to 'default' for default angle
    }
  });

  const { watch, setValue } = form;
  const watchMake = watch('make');
  const watchModel = watch('model');
  const watchBodyStyle = watch('body_style');
  const watchWheelColor = watch('wheel_color');
  const watchAdventureCladding = watch('has_adventure_cladding');

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

  // Fetch colors
  const fetchColors = async () => {
    try {
      const response = await fetch('/api/cars/colors');
      if (!response.ok) {
        throw new Error(`Failed to fetch colors: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      // Update colors with data from Google Sheets, fallback to existing if empty
      if (data && data.length > 0) {
        setColors(data);
      }
    } catch (error) {
      console.error('Error fetching colors:', error);
      // Keep existing fallback colors on error
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
    if (make === 'None' || model === 'None') {
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

  // Load makes and colors on component mount
  useEffect(() => {
    fetchMakes();
    fetchColors();
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
      watchBodyStyle
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
        fetchColors();
        toast({
          title: "Data refreshed",
          description: "Car data and colors have been updated successfully",
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

  // Batch CSV upload handler
  const handleBatchUpload = async (file: File) => {
    console.log(`Starting batch upload for file: ${file.name}, size: ${file.size} bytes`);
    setIsUploadingBatch(true);
    
    try {
      // Create form data for the CSV upload
      const formData = new FormData();
      formData.append('file', file);
      console.log(`FormData created with file appended`);
      
      // Send the CSV to the batch endpoint
      console.log(`Sending POST request to /api/car-batch`);
      const response = await fetch('/api/car-batch', {
        method: 'POST',
        body: formData
      });
      
      console.log(`Received response from batch endpoint with status: ${response.status}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error(`Batch upload error response:`, errorData);
        throw new Error(errorData.error || 'Failed to start batch job');
      }
      
      const data = await response.json();
      console.log(`Batch job created successfully:`, data);
      
      if (data.jobId) {
        console.log(`Setting batch job ID: ${data.jobId}`);
        setBatchJobId(data.jobId);
        toast({
          title: "Batch job started",
          description: "Your batch car generation job has started processing",
        });
      } else {
        console.error(`Received success response but no jobId was returned:`, data);
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
      console.log(`Batch upload process completed`);
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold">Car Creation</h1>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              onClick={() => setShowEditModal(true)}
              disabled={generateMutation.isPending || isUploadingBatch}
              className="flex items-center justify-center gap-2 text-sm sm:text-base min-h-[40px] sm:min-h-[36px]"
            >
              <ExternalLink className="h-4 w-4 flex-shrink-0" />
              <span className="whitespace-nowrap">Edit Car List</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={refreshData}
              disabled={generateMutation.isPending || isUploadingBatch}
              className="flex items-center justify-center gap-2 text-sm sm:text-base min-h-[40px] sm:min-h-[36px]"
            >
              <RefreshCw className="h-4 w-4 flex-shrink-0" />
              <span className="whitespace-nowrap">Refresh Car Data</span>
            </Button>
          </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              {/* Form Section */}
              <div className="space-y-6 bg-card p-6 rounded-lg shadow-sm border">
                {/* Header with icon */}
                <div className="flex items-center space-x-3 border-b pb-4 mb-4">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <CarFront className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium">Car Details</h3>
                    <p className="text-sm text-muted-foreground">Customize your car specification</p>
                  </div>
                </div>
                
                {/* Form fields in logical groups */}
                <div className="space-y-5">
                  {/* Car identification section */}
                  <div className="bg-background/60 p-4 rounded-lg border border-border/40 shadow-sm">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="make">Make</Label>
                        <Select
                          value={watchMake || 'None'}
                          onValueChange={(value) => setValue('make', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select make">
                              {watchMake === 'None' ? <span className="text-muted-foreground">Select make</span> : watchMake}
                            </SelectValue>
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
                            <SelectValue placeholder="Select model">
                              {watchModel === 'None' ? <span className="text-muted-foreground">Select model</span> : watchModel}
                            </SelectValue>
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
                            <SelectValue placeholder="Select body style">
                              {watchBodyStyle === 'None' ? <span className="text-muted-foreground">Select body style</span> : watchBodyStyle}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
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
                            <SelectValue placeholder="Select trim">
                              {form.watch('trim') === 'None' ? <span className="text-muted-foreground">Select trim</span> : form.watch('trim')}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
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
                    </div>
                  </div>
                  
                  {/* Appearance section */}
                  <div className="bg-background/60 p-4 rounded-lg border border-border/40 shadow-sm">
                    <h2 className="text-lg font-semibold text-foreground mb-1">Appearance</h2>
                    <p className="text-xs text-muted-foreground mb-4">
                      Customize your vehicle's visual style
                    </p>
                    <div className="grid grid-cols-1 gap-3">
                      {/* Color selector with visual swatches */}
                      <div className="space-y-2">
                        <Label htmlFor="color">Color</Label>
                        <div className="grid grid-cols-8 gap-2 mb-1.5">
                          {['silver', 'black', 'white', 'red', 'blue', 'green', 'yellow', 'orange'].map(color => (
                            <div 
                              key={color}
                              className={`h-8 w-8 rounded-full cursor-pointer transition-all border-2 ${
                                form.watch('color') === color 
                                  ? 'border-primary scale-110' 
                                  : 'border-transparent hover:border-primary/50'
                              }`}
                              style={{ 
                                background: 
                                  color === 'silver' ? 'linear-gradient(135deg, #D8D8D8, #A8A8A8)' : 
                                  color === 'white' ? 'linear-gradient(135deg, #FFFFFF, #F0F0F0)' :
                                  color === 'black' ? 'linear-gradient(135deg, #333333, #111111)' :
                                  color === 'red' ? 'linear-gradient(135deg, #AF2A2A, #8B0000)' :
                                  color === 'blue' ? 'linear-gradient(135deg, #1E5AA8, #0A3B75)' :
                                  color === 'green' ? 'linear-gradient(135deg, #2E7D32, #1B5E20)' :
                                  color === 'yellow' ? 'linear-gradient(135deg, #E4C157, #C6A03E)' :
                                  color === 'orange' ? 'linear-gradient(135deg, #DC7633, #BA6125)' :
                                  color,
                                boxShadow: form.watch('color') === color 
                                  ? '0 0 0 2px rgba(0,0,0,0.1), inset 0 0 10px rgba(255,255,255,0.2)' 
                                  : 'inset 0 0 5px rgba(0,0,0,0.1)'
                              }}
                              onClick={() => setValue('color', color)}
                              title={color.charAt(0).toUpperCase() + color.slice(1)}
                            />
                          ))}
                        </div>
                        <Select
                          value={(() => {
                            const currentColor = form.watch('color');
                            const presetColors = colors;
                            
                            if (showCustomColor) return 'custom';
                            if (currentColor && presetColors.includes(currentColor)) return currentColor;
                            if (currentColor && !presetColors.includes(currentColor)) return 'custom';
                            return '';
                          })()}
                          onValueChange={(value) => {
                            if (value === 'custom') {
                              setShowCustomColor(true);
                              setCustomColor(form.watch('color') || '');
                            } else {
                              setShowCustomColor(false);
                              setCustomColor('');
                              setValue('color', value);
                            }
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select color" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="custom">✏️ Custom Color...</SelectItem>
                            {colors.map((color) => (
                              <SelectItem key={color} value={color}>
                                {color.charAt(0).toUpperCase() + color.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        {/* Custom color input */}
                        {showCustomColor && (
                          <div className="space-y-2 mt-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <Label htmlFor="custom_color" className="text-sm font-medium text-blue-800 dark:text-blue-200">
                              Enter Custom Color Name
                            </Label>
                            <Input
                              id="custom_color"
                              placeholder="e.g., midnight pearl, copper metallic, forest green..."
                              value={customColor}
                              onChange={(e) => {
                                setCustomColor(e.target.value);
                                setValue('color', e.target.value);
                              }}
                              className="bg-white dark:bg-gray-900 border-blue-300 dark:border-blue-700 focus:border-blue-500"
                            />
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setShowCustomColor(false);
                                  setCustomColor("");
                                  setValue('color', '');
                                  // Reset dropdown to empty state
                                }}
                                className="text-xs"
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  if (customColor.trim()) {
                                    setValue('color', customColor.trim());
                                    // Keep showCustomColor true so input stays visible
                                  }
                                }}
                                disabled={!customColor.trim()}
                                className="text-xs"
                              >
                                Apply
                              </Button>
                            </div>
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                              Tip: Be descriptive for best results (e.g., "metallic dark green" instead of just "green")
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {/* Wheel Color selector */}
                      <div className="space-y-2">
                        <Label htmlFor="wheel_color">Wheel Color</Label>
                        <div className="flex gap-2 items-center">
                          <div 
                            className="w-8 h-8 rounded-full border-2 border-gray-300 flex-shrink-0"
                            style={{
                              background: 
                                watchWheelColor === 'silver' ? 'linear-gradient(135deg, #D8D8D8, #A8A8A8)' :
                                watchWheelColor === 'black' ? 'linear-gradient(135deg, #333333, #111111)' :
                                watchWheelColor === 'dark-grey' ? 'linear-gradient(135deg, #555555, #333333)' :
                                watchWheelColor === 'light-grey' ? 'linear-gradient(135deg, #CCCCCC, #999999)' :
                                watchWheelColor === 'white' ? 'linear-gradient(135deg, #FFFFFF, #F0F0F0)' :
                                watchWheelColor === 'chrome' ? 'linear-gradient(135deg, #E8E8E8, #B8B8B8, #E8E8E8)' :
                                watchWheelColor === 'bronze' ? 'linear-gradient(135deg, #CD7F32, #A0522D)' :
                                watchWheelColor === 'gunmetal' ? 'linear-gradient(135deg, #2C3539, #1A1F23)' :
                                watchWheelColor === 'anthracite' ? 'linear-gradient(135deg, #3C4142, #2A2E2F)' :
                                watchWheelColor === 'polished-aluminum' ? 'linear-gradient(135deg, #F5F5F5, #DCDCDC, #F5F5F5)' :
                                '#D8D8D8',
                              boxShadow: 'inset 0 0 5px rgba(0,0,0,0.1)'
                            }}
                          />
                          <Select
                            value={watchWheelColor || 'silver'}
                            onValueChange={(value) => setValue('wheel_color', value)}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Select wheel color" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="silver">Silver</SelectItem>
                              <SelectItem value="black">Black</SelectItem>
                              <SelectItem value="dark-grey">Dark Grey</SelectItem>
                              <SelectItem value="light-grey">Light Grey</SelectItem>
                              <SelectItem value="white">White</SelectItem>
                              <SelectItem value="chrome">Chrome</SelectItem>
                              <SelectItem value="bronze">Bronze</SelectItem>
                              <SelectItem value="gunmetal">Gunmetal</SelectItem>
                              <SelectItem value="anthracite">Anthracite</SelectItem>
                              <SelectItem value="polished-aluminum">Polished Aluminum</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      {/* Adventure Cladding toggle */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Label htmlFor="adventure_cladding">Add Adventure Cladding</Label>
                              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5">
                                BETA
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Applies thick matte-black plastic cladding around the bumpers, wheel arches, rocker panels, and lower doors for a rugged, off-road look.
                            </p>
                          </div>
                          <Switch
                            id="adventure_cladding"
                            checked={watchAdventureCladding || false}
                            onCheckedChange={(checked: boolean) => setValue('has_adventure_cladding', checked)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Image settings section */}
                  <div className="bg-background/60 p-4 rounded-lg border border-border/40 shadow-sm">
                    <h2 className="text-lg font-semibold text-foreground mb-1">Image Settings</h2>
                    <p className="text-xs text-muted-foreground mb-4">
                      Configure background and aspect ratio for your image
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Background style with visual explanation */}
                      <div className="space-y-2">
                        <Label>Background Style</Label>
                        <Tabs value={bg} onValueChange={handleBgChange} className="w-full">
                          <TabsList className="grid grid-cols-2 w-full">
                            <TabsTrigger value="white" className="flex items-center gap-1">
                              <span className="h-3 w-3 bg-[#F5F5F5] border rounded-full"></span>
                              <span>Studio</span>
                            </TabsTrigger>
                            <TabsTrigger value="hub" className="flex items-center gap-1">
                              <span className="h-3 w-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full"></span>
                              <span>Showroom</span>
                            </TabsTrigger>
                          </TabsList>
                        </Tabs>
                        <p className="text-xs text-muted-foreground mt-1">
                          {bg === 'white' 
                            ? 'Clean white studio background with professional lighting' 
                            : 'Dynamic dealership showroom environment with ambient lighting'}
                        </p>
                        
                        {/* Beta disclaimer for Studio style */}
                        {bg === 'white' && (
                          <div className="mt-2 bg-amber-50 border border-amber-200 rounded-md p-2.5 flex items-start gap-2">
                            <div className="text-amber-500 mt-0.5">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                                <path d="M12 9v4"/>
                                <path d="m12 17 .01 0"/>
                              </svg>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-amber-800 block">Studio Style (Beta)</span>
                              <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                                The Studio style is currently in beta and may occasionally produce images with a gray floor instead of the intended white background. We're working to improve this feature.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Car Angle selection */}
                      <div className="space-y-3">
                        <Label htmlFor="car_angle">Car Angle</Label>
                        <div className="space-y-2">
                          <Select
                            value={form.watch('car_angle') || 'default'}
                            onValueChange={(value) => setValue('car_angle', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select viewing angle" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="default">Default (35° front-left)</SelectItem>
                              <SelectItem value="directly facing the camera in a symmetrical front view">Front view</SelectItem>
                              <SelectItem value="at a 35-degree front three-quarter angle showing the front grille and right side">Front 3/4 right</SelectItem>
                              <SelectItem value="at a 35-degree front three-quarter angle showing the front grille and left side">Front 3/4 left</SelectItem>
                              <SelectItem value="in a perfect side profile view showing the full length of the car from the left">Left side profile</SelectItem>
                              <SelectItem value="in a perfect side profile view showing the full length of the car from the right">Right side profile</SelectItem>
                              <SelectItem value="at a 45-degree rear three-quarter angle showcasing the taillights and left side">Rear 3/4 left</SelectItem>
                              <SelectItem value="at a 45-degree rear three-quarter angle showcasing the taillights and right side">Rear 3/4 right</SelectItem>
                              <SelectItem value="directly from behind in a symmetrical rear view showing the taillights and rear styling">Rear view</SelectItem>
                              <SelectItem value="captured from a high front-top angle emphasizing the hood, roof, and front styling">Front aerial view</SelectItem>
                              <SelectItem value="captured from a high rear-top angle emphasizing the roofline and rear details">Rear aerial view</SelectItem>
                              <SelectItem value="captured from directly above showing the complete roofline and vehicle proportions">Top-down view</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          {/* Custom SVG angle preview */}
                          <div className="flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 min-h-[80px]">
                            {(() => {
                              const angle = form.watch('car_angle') || 'default';
                              
                              // Map exact angle descriptions to SVG keys
                              const getAngleSvgKey = () => {
                                switch (angle) {
                                  case 'default':
                                    return 'default';
                                  case 'directly facing the camera in a symmetrical front view':
                                    return 'front-view';
                                  case 'at a 35-degree front three-quarter angle showing the front grille and right side':
                                    return 'front-quarter-right';
                                  case 'at a 35-degree front three-quarter angle showing the front grille and left side':
                                    return 'front-quarter-left';
                                  case 'in a perfect side profile view showing the full length of the car from the left':
                                    return 'side-profile-left';
                                  case 'in a perfect side profile view showing the full length of the car from the right':
                                    return 'side-profile-right';
                                  case 'at a 45-degree rear three-quarter angle showcasing the taillights and left side':
                                    return 'rear-quarter-left';
                                  case 'at a 45-degree rear three-quarter angle showcasing the taillights and right side':
                                    return 'rear-quarter-right';
                                  case 'directly from behind in a symmetrical rear view showing the taillights and rear styling':
                                    return 'rear-view';
                                  case 'captured from a high front-top angle emphasizing the hood, roof, and front styling':
                                    return 'front-aerial';
                                  case 'captured from a high rear-top angle emphasizing the roofline and rear details':
                                    return 'rear-aerial';
                                  case 'captured from directly above showing the complete roofline and vehicle proportions':
                                    return 'top-down';
                                  default:
                                    return 'default';
                                }
                              };

                              const svgKey = getAngleSvgKey();
                              const svgPath = carAngleSvgMap[svgKey] || carAngleSvgMap['default'];
                              
                              return (
                                <img 
                                  src={svgPath}
                                  alt="Car angle preview"
                                  className="w-20 h-12 drop-shadow-md"
                                  style={{ maxWidth: '100px', maxHeight: '60px' }}
                                />
                              );
                            })()}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Choose the camera angle for your car image. Default uses the standard automotive photography angle.
                        </p>
                      </div>
                      
                      {/* Aspect ratio with visual representations */}
                      <div className="space-y-2">
                        <Label htmlFor="aspect_ratio">Aspect Ratio</Label>
                        <div className="flex items-center gap-3">
                          <Select
                            value={form.watch('aspect_ratio')}
                            onValueChange={(value) => setValue('aspect_ratio', value as any)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select aspect ratio" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="4:3">4:3 (Classic)</SelectItem>
                              <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                              <SelectItem value="1:1">1:1 (Square)</SelectItem>
                              <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                              <SelectItem value="3:4">3:4 (Portrait)</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          {/* Visual aspect ratio indicator */}
                          {form.watch('aspect_ratio') && (
                            <div className="bg-primary/10 rounded p-1.5 border border-primary/10 flex items-center justify-center">
                              {form.watch('aspect_ratio') === '4:3' && (
                                <div className="w-10 h-8 bg-primary/20 rounded"></div>
                              )}
                              {form.watch('aspect_ratio') === '16:9' && (
                                <div className="w-12 h-7 bg-primary/20 rounded"></div>
                              )}
                              {form.watch('aspect_ratio') === '1:1' && (
                                <div className="w-8 h-8 bg-primary/20 rounded"></div>
                              )}
                              {form.watch('aspect_ratio') === '9:16' && (
                                <div className="w-6 h-10 bg-primary/20 rounded"></div>
                              )}
                              {form.watch('aspect_ratio') === '3:4' && (
                                <div className="w-6 h-8 bg-primary/20 rounded"></div>
                              )}
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Choose the dimensions that best suit your needs
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Generate button and progress status */}
                <div className="pt-4 border-t mt-4">
                  <Button 
                    onClick={handleGenerate} 
                    disabled={generateMutation.isPending || progress !== null}
                    className="w-full h-10 text-base"
                    size="lg"
                  >
                    {generateMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Generating...</span>
                      </div>
                    ) : (
                      <>
                        <CarFront className="mr-2 h-5 w-5" />
                        Create Car Image
                      </>
                    )}
                  </Button>
                </div>
                
                {progress !== null && (
                  <div className="bg-primary/5 rounded-md p-3 mt-4 border border-primary/10">
                    <div className="flex items-center mb-2">
                      <span className="text-sm font-medium flex-1">Generation progress</span>
                      <span className="text-sm font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-2">
                      {progress < 100 
                        ? 'Our AI is creating your custom car image...' 
                        : 'Your car image is ready!'}
                    </p>
                  </div>
                )}
                
                {generateMutation.isError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mt-4 flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Generation failed</p>
                      <p className="text-sm mt-1">{(generateMutation.error as Error).message || 'An error occurred while generating the image.'}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Preview Section */}
              <div>
                {image ? (
                  <div className="space-y-4">
                    {/* Preview header with title and car specification */}
                    <div className="flex flex-col p-4 pb-2.5 bg-card rounded-t-lg shadow-sm border border-b-0">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="h-5 w-5 text-primary" />
                          <h2 className="font-semibold">Preview</h2>
                        </div>
                        <Badge variant="outline" className="h-6">
                          {form.watch('aspect_ratio')}
                        </Badge>
                      </div>
                      
                      {/* Car specification summary */}
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {watchMake !== 'None' && (
                          <Badge variant="secondary" className="rounded-sm text-xs font-normal bg-secondary/40 hover:bg-secondary/40">
                            {watchMake}
                          </Badge>
                        )}
                        {watchModel !== 'None' && (
                          <Badge variant="secondary" className="rounded-sm text-xs font-normal bg-secondary/40 hover:bg-secondary/40">
                            {watchModel}
                          </Badge>
                        )}
                        {watchBodyStyle !== 'None' && (
                          <Badge variant="secondary" className="rounded-sm text-xs font-normal bg-secondary/40 hover:bg-secondary/40">
                            {watchBodyStyle}
                          </Badge>
                        )}
                        {form.watch('year') && (
                          <Badge variant="secondary" className="rounded-sm text-xs font-normal bg-secondary/40 hover:bg-secondary/40">
                            {form.watch('year')}
                          </Badge>
                        )}
                        {form.watch('color') && (
                          <Badge variant="secondary" className="rounded-sm text-xs font-normal bg-secondary/40 hover:bg-secondary/40 flex items-center gap-1">
                            <div 
                              className="h-2 w-2 rounded-full" 
                              style={{ 
                                background: 
                                  form.watch('color') === 'silver' ? 'linear-gradient(135deg, #D8D8D8, #A8A8A8)' : 
                                  form.watch('color') === 'white' ? 'linear-gradient(135deg, #FFFFFF, #F0F0F0)' :
                                  form.watch('color') === 'black' ? 'linear-gradient(135deg, #333333, #111111)' :
                                  form.watch('color') === 'red' ? 'linear-gradient(135deg, #AF2A2A, #8B0000)' :
                                  form.watch('color') === 'blue' ? 'linear-gradient(135deg, #1E5AA8, #0A3B75)' :
                                  form.watch('color') === 'green' ? 'linear-gradient(135deg, #2E7D32, #1B5E20)' :
                                  form.watch('color') === 'yellow' ? 'linear-gradient(135deg, #E4C157, #C6A03E)' :
                                  form.watch('color') === 'orange' ? 'linear-gradient(135deg, #DC7633, #BA6125)' :
                                  form.watch('color') === 'gray' ? 'linear-gradient(135deg, #808080, #606060)' :
                                  form.watch('color') === 'brown' ? 'linear-gradient(135deg, #8B4513, #6B3304)' :
                                  form.watch('color') === 'burgundy' ? 'linear-gradient(135deg, #800020, #5C0015)' :
                                  form.watch('color') === 'navy blue' ? 'linear-gradient(135deg, #000080, #000045)' :
                                  form.watch('color') === 'gold' ? 'linear-gradient(135deg, #CFB53B, #A6881D)' :
                                  form.watch('color') === 'bronze' ? 'linear-gradient(135deg, #CD7F32, #A5652A)' :
                                  form.watch('color') === 'pearl white' ? 'linear-gradient(135deg, #FAFAFA, #F0F0F0)' :
                                  form.watch('color') === 'metallic blue' ? 'linear-gradient(135deg, #2A6496, #0C476E)' :
                                  form.watch('color'),
                                boxShadow: 'inset 0 0 2px rgba(0,0,0,0.1)'
                              }}
                            />
                            {form.watch('color')}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="relative border-x shadow-sm">
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
                          // Use the same edit handler approach as the gallery page
                          const sourceUrl = img.fullUrl || img.url;
                          
                          // Set editor context for edit mode
                          setMode('edit');
                          setSourceImages([sourceUrl]);
                          
                          // Navigate to the create page with edit mode
                          setLocation('/create?mode=edit');
                        }}
                        onUpscale={(img) => {
                          // Navigate to upscale page with the image URL
                          const imageUrl = img.fullUrl || img.url;
                          setLocation(`/upscale?sourceUrl=${encodeURIComponent(imageUrl)}`);
                        }}
                        onDownload={handleDownload}
                        onClick={() => {
                          setSelectedImage(image.fullUrl || image.url);
                        }}
                      />
                    </div>
                    
                    {/* Image info footer */}
                    <div className="bg-muted/50 border rounded-b-lg p-3 text-sm space-y-3">
                      <div className="flex items-start gap-2">
                        <div className="bg-blue-100 text-blue-500 rounded-full p-1 mt-0.5">
                          <CheckCircle className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Saved to Gallery</p>
                          <p className="text-xs text-muted-foreground">
                            Your image has been automatically saved to your gallery for later use
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex justify-between gap-2 pt-1">
                        {/* Actions */}
                        <div className="flex gap-1.5">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 text-xs flex gap-1.5 bg-card"
                            onClick={() => handleDownload(image)}
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 text-xs flex gap-1.5 bg-card"
                            onClick={() => {
                              const sourceUrl = image.fullUrl || image.url;
                              setMode('edit');
                              setSourceImages([sourceUrl]);
                              setLocation('/create?mode=edit');
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                        </div>
                        
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 text-xs flex gap-1.5 bg-card"
                          onClick={() => setSelectedImage(image.fullUrl || image.url)}
                        >
                          <Maximize2 className="h-3.5 w-3.5" />
                          Fullscreen
                        </Button>
                      </div>
                      
                      {/* Disclaimer Downloads */}
                      <div className="pt-2 border-t">
                        <CarImageCard
                          image={image}
                          make={form.watch('make')}
                          model={form.watch('model')}
                          bodyStyle={form.watch('body_style')}
                          color={form.watch('color')}
                          disclaimerOnly={true}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col h-full bg-card border rounded-lg shadow-sm overflow-hidden">
                    {/* Empty state header */}
                    <div className="p-4 border-b bg-muted/30">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        <h2 className="font-semibold text-muted-foreground">Preview</h2>
                      </div>
                    </div>
                    
                    {/* Empty state content */}
                    <div className="flex-1 flex items-center justify-center py-16 px-6">
                      <div className="text-center max-w-xs">
                        <div className="relative mx-auto mb-4 w-20 h-20">
                          <div className="absolute inset-0 bg-primary/5 rounded-full animate-ping opacity-50"></div>
                          <div className="relative bg-primary/10 rounded-full p-5">
                            <CarFront className="h-10 w-10 text-primary/60" />
                          </div>
                        </div>
                        <h3 className="text-lg font-medium mb-2">Ready to create your car</h3>
                        <p className="text-muted-foreground text-sm mb-6">
                          Select your car specifications on the left and click Create to generate a high-quality image
                        </p>
                        <div className="text-xs text-muted-foreground flex items-center justify-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle className="h-3.5 w-3.5 text-primary/60" />
                            <span>High-quality rendering</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle className="h-3.5 w-3.5 text-primary/60" />
                            <span>Studio quality</span>
                          </div>
                        </div>
                      </div>
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
                <div className="space-y-6">
                  <div className="bg-card border rounded-lg shadow-sm p-6">
                    {/* Header with icon */}
                    <div className="flex items-center space-x-3 border-b pb-4 mb-4">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <CarFront className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium">Batch Car Generation</h3>
                        <p className="text-sm text-muted-foreground">Upload a CSV file to create multiple car images at once</p>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-100 rounded-md p-5 mb-6 flex gap-4 items-start">
                      <div className="bg-blue-100 p-3 rounded-full flex-shrink-0 mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                          <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                          <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
                          <path d="M9 9h1" />
                          <path d="M9 13h6" />
                          <path d="M9 17h6" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-medium text-blue-800 mb-2 text-base">Use our pre-formatted template</h4>
                        <p className="text-sm text-blue-700 mb-3 leading-relaxed">
                          Start with our ready-to-use spreadsheet template that's already formatted for batch car generation. Just fill in your car details and download as CSV.
                        </p>
                        <a 
                          href="https://docs.google.com/spreadsheets/d/1-YxShxye41KXVQtSr97crhM_mFH0H4qwOAidgdZ42Cc/copy" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md transition-colors"
                          onClick={(e) => {
                            e.preventDefault();
                            window.open("https://docs.google.com/spreadsheets/d/1-YxShxye41KXVQtSr97crhM_mFH0H4qwOAidgdZ42Cc/copy", "_blank", "noopener,noreferrer");
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 15v4c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-4M17 9l-5 5-5-5M12 12.8V2.5" />
                          </svg>
                          Get Template
                        </a>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-4 mb-6">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="flex items-center gap-3 text-sm p-2.5 rounded-md">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">1</div>
                          <span>Prepare your CSV file</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm p-2.5 rounded-md">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">2</div>
                          <span>Upload and validate</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm p-2.5 rounded-md">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">3</div>
                          <span>Download ZIP when complete</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <CSVUpload onUpload={handleBatchUpload} isLoading={isUploadingBatch} />
                    </div>
                  </div>
                  
                  <div className="mt-6 bg-card border rounded-md overflow-hidden">
                    <div className="bg-muted px-5 py-3.5 border-b">
                      <h4 className="font-medium flex items-center gap-2 text-base">
                        <span className="h-2.5 w-2.5 rounded-full bg-primary"></span>
                        CSV Format Guide
                      </h4>
                    </div>
                    
                    <div className="p-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {[
                          { name: 'make', example: 'Audi, BMW', desc: 'Car manufacturer' },
                          { name: 'model', example: 'Q5, X5', desc: 'Car model' },
                          { name: 'body_style', example: 'SUV, Sedan', desc: 'Car type' },
                          { name: 'trim', example: 'Sport, Premium', desc: 'Trim level' },
                          { name: 'year', example: '2025, 2024', desc: 'Model year' },
                          { name: 'color', example: 'silver, blue, red', desc: 'Car color' },
                          { name: 'background', example: 'white, hub', desc: 'Studio or showroom' },
                          { name: 'aspect_ratio', example: '4:3, 16:9, 1:1', desc: 'Image proportions' }
                        ].map(col => (
                          <div key={col.name} className="bg-muted/40 hover:bg-muted/60 transition-colors rounded-md p-3.5 border shadow-sm">
                            <div className="font-mono text-sm text-primary-foreground bg-primary/90 rounded px-2.5 py-1 inline-block mb-2">{col.name}</div>
                            <div className="text-xs text-muted-foreground mb-1.5">{col.desc}</div>
                            <div className="text-xs font-medium text-foreground/80">{col.example}</div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="bg-primary/5 rounded-md p-4 text-sm border border-primary/10">
                        <h5 className="font-medium mb-2 text-foreground">CSV Tips</h5>
                        <ul className="text-sm space-y-2 list-disc list-inside text-muted-foreground">
                          <li>All columns are optional. Default values will be used for missing columns.</li>
                          <li>The first row must contain column headers (names) as shown above.</li>
                          <li>Maximum 50 cars per batch for optimal performance.</li>
                        </ul>
                        
                        <div className="mt-4 bg-blue-50 rounded-md p-4 border border-blue-100 flex items-start gap-3">
                          <div className="text-blue-500 mt-0.5">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                              <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
                              <path d="M9 9h1" />
                              <path d="M9 13h6" />
                              <path d="M9 17h6" />
                            </svg>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-blue-800 block">Example Template Available</span>
                            <p className="text-sm text-blue-700 mt-1.5 leading-relaxed">
                              Get our <a 
                                href="#" 
                                onClick={(e) => {
                                  e.preventDefault();
                                  window.open("https://docs.google.com/spreadsheets/d/1-YxShxye41KXVQtSr97crhM_mFH0H4qwOAidgdZ42Cc/copy", "_blank", "noopener,noreferrer");
                                }}
                                className="text-blue-600 underline hover:no-underline font-medium"
                              >pre-formatted Google Sheet template</a>. Make a copy, fill in your car details, then download as CSV and upload here.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Car List Edit Modal */}
        <CarListEditModal 
          open={showEditModal} 
          onOpenChange={setShowEditModal} 
        />
      </div>
    </>
  );
};

export default CarCreationPage;