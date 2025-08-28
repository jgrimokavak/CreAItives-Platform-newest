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
import { CarFront, RefreshCw, CheckCircle, AlertCircle, Download, Pencil, Maximize2, ImageIcon, ExternalLink, Upload } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
// Import the local GeneratedImage type used by ImageCard
import type { GeneratedImage } from '@/types/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import CarImageCard from '@/components/CarImageCard';
import ImageModal from '@/components/ImageModal';
import CarListEditModal from '@/components/CarListEditModal';
import { JobsTray, type JobStatus } from '@/components/JobsTray';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { useEditor } from '@/context/EditorContext';
import { downloadImageMobile } from '@/utils/mobileDownload';
import { useWebSocket } from '@/lib/websocket';
import { loadAnglePresets, loadColorPresets, type AnglePreset, type ColorPreset } from '@/services/marketplaceData';

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

// Photo-to-Studio form schema
const photoToStudioSchema = z.object({
  mode: z.enum(['background-only', 'studio-enhance']),
  brand: z.string().optional(),
  additionalInstructions: z.string().optional(),
  modelKey: z.enum(["google/nano-banana", "flux-kontext-max"]).default("google/nano-banana"),
}).refine((data) => {
  // Brand is required when mode is 'studio-enhance'
  if (data.mode === 'studio-enhance') {
    return data.brand && data.brand.trim().length > 0;
  }
  return true;
}, {
  message: "Brand is required when Studio Enhance mode is selected",
  path: ["brand"],
});

type PhotoToStudioFormValues = z.infer<typeof photoToStudioSchema>;

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
  
  // Connect to WebSocket for real-time updates
  useWebSocket();
  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [bodyStyles, setBodyStyles] = useState<string[]>([]);
  const [trims, setTrims] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([
    // Fallback colors if Google Sheets is unavailable (capitalized to match Google Sheets format)
    'Silver', 'Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Gray', 'Brown',
    'Burgundy', 'Navy blue', 'Gold', 'Bronze', 'Pearl white', 'Metallic blue', 'Electric blue',
    'Electric red', 'Electric orange', 'Dark grey', 'Light grey', 'Charcoal', 'Midnight blue',
    'Forest green', 'Champagne', 'Matte black', 'Matte gray', 'Satin silver', 'Sage green',
    'Ceramic gray', 'Volcanic gray', 'Beige', 'Tan', 'Cherry red', 'Royal blue', 'Deep Ultramarine Blue'
  ]);
  const [bg, setBg] = useState<"white" | "hub">("hub");
  const [progress, setProgress] = useState<number | null>(null);
  const [image, setImage] = useState<GeneratedImage | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Creation mode state - updated to include photo-to-studio and marketplace
  const [carCreationMode, setCarCreationMode] = useState<"single" | "batch" | "photo-to-studio" | "marketplace">("single");
  const [batchJobId, setBatchJobId] = useState<string | null>(null);
  
  // Jobs Tray state
  const [isJobsTrayOpen, setIsJobsTrayOpen] = useState<boolean>(false);
  const [isGeneratingStudio, setIsGeneratingStudio] = useState<boolean>(false);
  const [currentJobs, setCurrentJobs] = useState<JobStatus[]>([]);
  const [isUploadingBatch, setIsUploadingBatch] = useState<boolean>(false);
  
  // Modal state
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  
  // Custom color state
  const [showCustomColor, setShowCustomColor] = useState<boolean>(false);
  const [customColor, setCustomColor] = useState<string>("");
  
  // Photo-to-Studio state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [photoToStudioProgress, setPhotoToStudioProgress] = useState<number | null>(null);
  const [photoToStudioImages, setPhotoToStudioImages] = useState<GeneratedImage[]>([]);

  // Car Marketplace state
  const [marketplaceFiles, setMarketplaceFiles] = useState<File[]>([]);
  const [marketplacePreviewUrls, setMarketplacePreviewUrls] = useState<string[]>([]);
  const [marketplaceImageUrls, setMarketplaceImageUrls] = useState<string[]>([]);
  const [selectedAngles, setSelectedAngles] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [autoColorize, setAutoColorize] = useState<boolean>(true);
  const [marketplaceBatchId, setMarketplaceBatchId] = useState<string | null>(null);
  const [marketplaceResults, setMarketplaceResults] = useState<Map<string, GeneratedImage>>(new Map());
  const [marketplaceMatrix, setMarketplaceMatrix] = useState<Record<string, Record<string, { status: string; imageUrl?: string; thumbUrl?: string }>>>({});
  const [anglePresets, setAnglePresets] = useState<any[]>([]);
  const [colorPresets, setColorPresets] = useState<any[]>([]);
  
  // Additional marketplace state for new features
  const [additionalInstructions, setAdditionalInstructions] = useState<string>('');
  const [showMarketplaceCustomColor, setShowMarketplaceCustomColor] = useState<boolean>(false);
  const [marketplaceCustomColor, setMarketplaceCustomColor] = useState<string>('');
  const [marketplaceCustomColors, setMarketplaceCustomColors] = useState<string[]>([]);
  const [carMakeModel, setCarMakeModel] = useState<string>('');
  
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
      color: 'Red', // Set default color to Red
      wheel_color: 'Silver', // Set default wheel color to Silver
      has_adventure_cladding: false, // Set default adventure cladding to false
      background: 'hub',
      car_angle: 'default' // Default to 'default' for default angle
    }
  });

  const photoToStudioForm = useForm<PhotoToStudioFormValues>({
    resolver: zodResolver(photoToStudioSchema),
    defaultValues: {
      mode: 'background-only',
      brand: '',
      additionalInstructions: '',
      modelKey: 'google/nano-banana'
    }
  });

  const { watch, setValue } = form;
  const watchMake = watch('make');
  const watchModel = watch('model');
  const watchBodyStyle = watch('body_style');
  const watchWheelColor = watch('wheel_color');
  const watchAdventureCladding = watch('has_adventure_cladding');
  
  const { watch: watchPhotoToStudio } = photoToStudioForm;
  const watchMode = watchPhotoToStudio('mode');
  
  // Listen for WebSocket gallery updates to refresh the image if it was just generated
  useEffect(() => {
    const handleGalleryUpdate = (event: CustomEvent) => {
      console.log('[TRACE CarCreationPage] Received gallery-updated event:', event.detail);
      if (event.detail?.type === 'created' && event.detail?.data?.image) {
        const newImage = event.detail.data.image;
        console.log('[TRACE CarCreationPage] New image data:', newImage);
        // If we just generated an image and it matches, update our local state
        if (image && newImage.id === image.id) {
          console.log('[TRACE CarCreationPage] Updating local image state with new data');
          // Transform the WebSocket image data to match our GeneratedImage type
          const transformedImage: GeneratedImage = {
            id: newImage.id,
            url: newImage.fullUrl || newImage.url, // Use fullUrl instead of thumbUrl for now
            prompt: newImage.prompt,
            size: newImage.size,
            model: newImage.model,
            createdAt: newImage.createdAt,
            sourceThumb: undefined,
            sourceImage: undefined,
            width: newImage.width,
            height: newImage.height,
            thumbUrl: newImage.thumbUrl,
            fullUrl: newImage.fullUrl,
            starred: newImage.starred,
            deletedAt: newImage.deletedAt
          };
          console.log(`[TRACE CarCreationPage] Using fullUrl: ${newImage.fullUrl} instead of thumbUrl: ${newImage.thumbUrl}`);
          console.log('[TRACE CarCreationPage] Transformed image:', transformedImage);
          setImage(transformedImage);
        }
      }
    };
    
    window.addEventListener('gallery-updated', handleGalleryUpdate as EventListener);
    return () => {
      window.removeEventListener('gallery-updated', handleGalleryUpdate as EventListener);
    };
  }, [image]);

  // Load marketplace data when marketplace tab is selected
  useEffect(() => {
    if (carCreationMode === 'marketplace') {
      if (process.env.NODE_ENV !== 'production') console.log('[MP] Loading marketplace data...');
      loadAnglePresets().then(angles => {
        if (process.env.NODE_ENV !== 'production') console.log('[MP] loaded angle presets:', { count: angles.length, firstRow: angles[0] });
        setAnglePresets(angles);
      }).catch(console.error);
      loadColorPresets().then(colors => {
        if (process.env.NODE_ENV !== 'production') console.log('[MP] loaded color presets:', { count: colors.length, firstRow: colors[0] });
        setColorPresets(colors);
      }).catch(console.error);
    }
  }, [carCreationMode]);

  // Listen for marketplace WebSocket updates
  useEffect(() => {
    const handleMarketplaceUpdate = (event: CustomEvent) => {
      const { type, data } = event.detail || {};
      if (process.env.NODE_ENV !== 'production') console.log('[MP] ws-message', type, 'batch=', data?.batchId, 'payloadKeys=', Object.keys(data || {}));
      
      // Only handle events for the current batch
      if (data?.batchId !== marketplaceBatchId) return;
      
      if (type === 'marketplaceBatchCreated') {
        // Batch created - placeholders already set up
      } else if (type === 'marketplaceJobUpdated') {
        const { result } = data;
        if (result) {
          console.log('[MP][CLIENT] cell', { 
            batchId: data.batchId, 
            angleKey: result.angleKey, 
            colorKey: result.colorKey, 
            status: result.status 
          });
          
          // Update the matrix cell for this result
          const cellKey = result.type === 'angle' ? '__angle__' : result.colorKey;
          
          if (result.status === 'processing') {
            setMarketplaceMatrix(prev => ({
              ...prev,
              [result.angleKey]: {
                ...prev[result.angleKey],
                [cellKey]: {
                  status: 'processing'
                }
              }
            }));
          } else if (result.status === 'completed') {
            setMarketplaceMatrix(prev => ({
              ...prev,
              [result.angleKey]: {
                ...prev[result.angleKey],
                [cellKey]: {
                  status: 'completed',
                  imageUrl: result.imageUrl,
                  thumbUrl: result.thumbUrl
                }
              }
            }));
            
            // Also update the legacy results map for backwards compatibility
            const resultKey = result.colorKey 
              ? `${result.angleKey}-${result.colorKey}`
              : `${result.angleKey}-base`;
              
            const transformedImage: GeneratedImage = {
              id: resultKey,
              url: result.imageUrl,
              prompt: `${result.type} generation`,
              size: '1024x1024',
              model: 'google/nano-banana',
              createdAt: new Date().toISOString(),
              sourceThumb: undefined,
              sourceImage: undefined,
              width: 1024,
              height: 1024,
              thumbUrl: result.thumbUrl || result.imageUrl,
              fullUrl: result.imageUrl,
              starred: false,
              deletedAt: null
            };
            
            setMarketplaceResults(prev => new Map(prev.set(resultKey, transformedImage)));
          } else if (result.status === 'failed') {
            setMarketplaceMatrix(prev => ({
              ...prev,
              [result.angleKey]: {
                ...prev[result.angleKey],
                [cellKey]: {
                  status: 'failed',
                  error: result.error
                }
              }
            }));
          }
        }
      } else if (type === 'marketplaceBatchCompleted') {
        // Batch completed
        if (process.env.NODE_ENV !== 'production') console.log('[MP] Batch completed:', data.batchId);
      }
    };
    
    window.addEventListener('ws-message', handleMarketplaceUpdate as EventListener);
    return () => {
      window.removeEventListener('ws-message', handleMarketplaceUpdate as EventListener);
    };
  }, [marketplaceBatchId]);

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

  // Enhanced mobile download handler
  const handleDownload = async (image: GeneratedImage) => {
    try {
      const imageUrl = image.fullUrl || image.url;
      
      // Generate a safe filename based on car details or prompt
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

      // Use enhanced mobile download with fallback options
      const result = await downloadImageMobile(imageUrl, `${filename}.png`, {
        fallbackToShare: true,
        title: "Save Car Image",
        text: image.prompt ? `${image.prompt.substring(0, 100)}...` : "Save this car image to your gallery"
      });

      if (result.success) {
        toast({
          title: "Image ready",
          description: result.message,
          duration: result.method.includes('share') ? 8000 : 4000,
        });
      } else if (result.method !== 'web-share-cancelled' && result.method !== 'file-system-cancelled') {
        // Don't show error for user cancellation, show fallback instructions
        toast({
          title: "Alternative download method",
          description: "Long-press the image and select 'Save to Photos' (iOS) or 'Download image' (Android)",
          duration: 8000,
        });
      }
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download failed",
        description: "Try long-pressing the image and selecting 'Save to Photos' or 'Download image'",
        variant: "destructive",
        duration: 8000,
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

  // File validation helper
  const validateFile = (file: File) => {
    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPG, PNG, or WebP image",
        variant: "destructive"
      });
      return false;
    }

    // Validate file size (25MB)
    if (file.size > 25 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 25MB",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  // Process selected files - updated for multiple file support
  const processFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const currentModel = photoToStudioForm.watch('modelKey');
    
    // Validate based on selected model
    if (currentModel === 'flux-kontext-max') {
      if (fileArray.length > 1 || selectedFiles.length >= 1) {
        toast({
          title: "Single image only",
          description: "Flux Kontext Max only supports one image at a time",
          variant: "destructive"
        });
        return;
      }
    } else {
      // Nano banana - allow up to 10
      if (selectedFiles.length + fileArray.length > 10) {
        toast({
          title: "Too many files",
          description: "You can upload a maximum of 10 images",
          variant: "destructive"
        });
        return;
      }
      
      // Warn when approaching limits for better user experience
      if (selectedFiles.length + fileArray.length > 5) {
        toast({
          title: "Large batch detected",
          description: "For best results and faster processing, consider using 5 or fewer images at a time",
          variant: "default"
        });
      }
    }
    
    const validFiles: File[] = [];
    const validPreviewUrls: string[] = [];
    
    for (const file of fileArray) {
      if (!validateFile(file)) continue;
      
      validFiles.push(file);
      
      // Create preview URL using FileReader
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        setPreviewUrls(prev => [...prev, url]);
      };
      reader.readAsDataURL(file);
    }
    
    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  };

  // File upload handler for Photo-to-Studio
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    processFiles(files);
  };

  // Drag and drop handlers
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  };

  // Clear uploaded files
  const clearSelectedFiles = () => {
    setSelectedFiles([]);
    setPreviewUrls([]);
    // Reset the file input
    const fileInput = document.getElementById('car-photo') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // Marketplace file handlers
  const handleMarketplaceFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    processMarketplaceFiles(files);
  };

  const handleMarketplaceDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleMarketplaceDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processMarketplaceFiles(files);
    }
  };

  const processMarketplaceFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    // Validate file count
    if (marketplaceFiles.length + fileArray.length > 10) {
      toast({
        title: "Too many files",
        description: "You can upload a maximum of 10 source images",
        variant: "destructive"
      });
      return;
    }

    // Validate each file
    for (const file of fileArray) {
      if (!validateFile(file)) return;
    }

    // Add files to state
    setMarketplaceFiles(prev => [...prev, ...fileArray]);

    // Create preview URLs
    const newPreviewUrls = fileArray.map(file => URL.createObjectURL(file));
    setMarketplacePreviewUrls(prev => [...prev, ...newPreviewUrls]);
  };

  const clearMarketplaceFiles = () => {
    setMarketplaceFiles([]);
    setMarketplacePreviewUrls([]);
    setMarketplaceImageUrls([]);
    // Reset the file input
    const fileInput = document.getElementById('marketplace-photos') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const removeMarketplaceFile = (index: number) => {
    setMarketplaceFiles(prev => prev.filter((_, i) => i !== index));
    setMarketplacePreviewUrls(prev => {
      const urlToRevoke = prev[index];
      URL.revokeObjectURL(urlToRevoke);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Upload marketplace files to server
  const uploadMarketplaceFiles = async (): Promise<string[]> => {
    if (marketplaceFiles.length === 0) return [];

    const formData = new FormData();
    marketplaceFiles.forEach(file => formData.append('images', file));

    const response = await fetch('/api/car/marketplace/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload images');
    }

    const { imageUrls } = await response.json();
    return imageUrls;
  };

  // Start marketplace batch
  const handleMarketplaceGenerate = async () => {
    try {
      if (process.env.NODE_ENV !== 'production') console.log('[MP] Generate button clicked');
      if (marketplaceFiles.length === 0) {
        toast({
          title: "No source images",
          description: "Please upload at least one source image",
          variant: "destructive"
        });
        return;
      }

      if (selectedAngles.length === 0) {
        toast({
          title: "No angles selected",
          description: "Please select at least one angle to generate",
          variant: "destructive"
        });
        return;
      }

      setIsGeneratingStudio(true);

      // Upload files first
      if (process.env.NODE_ENV !== 'production') console.log('[MP] Uploading files:', { fileCount: marketplaceFiles.length });
      const imageUrls = await uploadMarketplaceFiles();
      if (process.env.NODE_ENV !== 'production') console.log('[MP] Upload response:', { imageUrls: imageUrls.length });
      setMarketplaceImageUrls(imageUrls);

      // Start marketplace batch
      const allColors = [...selectedColors, ...marketplaceCustomColors];
      const batchPayload = {
        sourceImageUrls: imageUrls,
        angles: selectedAngles,
        colors: allColors,
        autoColorize,
        additionalInstructions: additionalInstructions.trim() || undefined,
        carMakeModel: carMakeModel.trim() || undefined
      };
      if (process.env.NODE_ENV !== 'production') console.log('[MP] submit batch', { sourceCount: imageUrls.length, angles: selectedAngles, colors: selectedColors, autoColorize });
      
      const response = await fetch('/api/car/marketplace/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (process.env.NODE_ENV !== 'production') console.log('[MP] batch error response:', errorData);
        throw new Error(errorData.error || 'Failed to start marketplace batch');
      }

      const { batchId } = await response.json();
      if (process.env.NODE_ENV !== 'production') console.log('[MP] batch response', { batchId });
      setMarketplaceBatchId(batchId);
      
      // Create matrix placeholders immediately after batch response
      const newMatrix: Record<string, Record<string, { status: string; imageUrl?: string; thumbUrl?: string }>> = {};
      
      for (const angleKey of selectedAngles) {
        newMatrix[angleKey] = {};
        // Create angle cell placeholder (base column)
        newMatrix[angleKey]['__angle__'] = { status: 'queued' };
        
        // Create color cell placeholders if auto-colorize is enabled
        if (autoColorize) {
          for (const colorKey of selectedColors) {
            newMatrix[angleKey][colorKey] = { status: 'queued' };
          }
        }
      }
      
      setMarketplaceMatrix(newMatrix);
      
      // Log placeholder creation
      const totalJobs = selectedAngles.length + (autoColorize ? selectedAngles.length * selectedColors.length : 0);
      console.log('[MP][CLIENT] placeholders', { batchId, angles: selectedAngles.length, colors: autoColorize ? selectedColors.length : 0 });

      toast({
        title: "Marketplace batch started",
        description: `Processing ${selectedAngles.length} angles${autoColorize ? ` and ${selectedColors.length * selectedAngles.length} color variants` : ''}`,
      });

    } catch (error: any) {
      console.error('Error starting marketplace batch:', error);
      toast({
        title: "Generation failed",
        description: error.message || "Failed to start marketplace generation",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingStudio(false);
    }
  };
  
  // Remove a specific file
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Photo-to-Studio generation mutation
  const photoToStudioMutation = useMutation({
    mutationFn: async (values: PhotoToStudioFormValues) => {
      if (!selectedFiles || selectedFiles.length === 0) {
        throw new Error('No image files selected');
      }

      setPhotoToStudioProgress(10);
      
      // Create form data
      const formData = new FormData();
      
      // Append all selected images
      selectedFiles.forEach((file, index) => {
        formData.append('images', file);
      });
      
      formData.append('mode', values.mode);
      formData.append('modelKey', values.modelKey);
      if (values.brand) {
        formData.append('brand', values.brand);
      }
      if (values.additionalInstructions) {
        formData.append('additionalInstructions', values.additionalInstructions);
      }
      
      setPhotoToStudioProgress(20);
      
      // Simulate progress while waiting for the API
      const interval = setInterval(() => {
        setPhotoToStudioProgress(prev => {
          if (prev === null) return 20;
          return Math.min(prev + 5, 90);
        });
      }, 2000);
      
      try {
        const response = await fetch('/api/car/photo-to-studio', {
          method: 'POST',
          body: formData
        });
        
        clearInterval(interval);
        
        if (!response.ok) {
          let errorMessage = 'Failed to generate studio image';
          
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch (parseError) {
            // If response is not JSON, try to get text response
            try {
              const textResponse = await response.text();
              errorMessage = textResponse || `Server error (${response.status})`;
            } catch (textError) {
              errorMessage = `Server error (${response.status})`;
            }
          }
          
          throw new Error(errorMessage);
        }
        
        setPhotoToStudioProgress(95);
        const data = await response.json();
        setPhotoToStudioProgress(100);
        
        // Clear progress after a delay
        setTimeout(() => setPhotoToStudioProgress(null), 1000);
        
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
      setPhotoToStudioImages([data]);
      // Invalidate gallery cache to make sure the new image shows up
      queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
      
      toast({
        title: "Studio image generated",
        description: "Your studio-ready image has been generated successfully"
      });
    },
    onError: (error: Error) => {
      console.error('Error generating studio image:', error);
      setPhotoToStudioProgress(null);
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate studio image. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Form submission handler
  const handleGenerate = () => {
    const values = form.getValues();
    generateMutation.mutate(values);
  };

  // Photo-to-Studio form submission handler
  const handlePhotoToStudioGenerate = () => {
    const values = photoToStudioForm.getValues();
    
    // Since we're now using the job queue, we need to call the API directly
    // instead of using the old mutation
    handlePhotoToStudioGenerateAsync(values);
  };

  // New async photo-to-studio handler for job queue
  const handlePhotoToStudioGenerateAsync = async (values: PhotoToStudioFormValues) => {
    if (!selectedFiles || selectedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one image file",
        variant: "destructive"
      });
      return;
    }

    // Set loading state for visual feedback
    setIsGeneratingStudio(true);

    try {
      // Create form data
      const formData = new FormData();
      
      // Append all selected images
      selectedFiles.forEach((file, index) => {
        formData.append('images', file);
      });
      
      formData.append('mode', values.mode);
      formData.append('modelKey', values.modelKey);
      if (values.brand) {
        formData.append('brand', values.brand);
      }
      if (values.additionalInstructions) {
        formData.append('additionalInstructions', values.additionalInstructions);
      }

      const response = await fetch('/api/car/photo-to-studio', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create generation job');
      }

      const result = await response.json();
      
      toast({
        title: "Job created",
        description: `Generation started - queue position ${result.queuePosition}`,
      });
      
      // Open the jobs tray to show progress
      setIsJobsTrayOpen(true);
      
      // Clear form after successful submission
      photoToStudioForm.reset();
      setSelectedFiles([]);
      setPreviewUrls([]);

    } catch (error: any) {
      console.error('Error creating job:', error);
      toast({
        title: "Failed to create job",
        description: error.message || "Failed to create generation job",
        variant: "destructive"
      });
    } finally {
      // Always reset loading state
      setIsGeneratingStudio(false);
    }
  };

  // Handle completed jobs from the tray
  const handleJobCompleted = (job: JobStatus) => {
    if (job.resultImageUrl && job.resultThumbUrl) {
      const completedImage: GeneratedImage = {
        id: job.jobId,
        url: job.resultImageUrl,
        fullUrl: job.resultImageUrl,
        thumbUrl: job.resultThumbUrl,
        prompt: `Photo-to-Studio (${job.mode})`,
        size: "unknown",
        model: job.modelKey,
        createdAt: new Date().toISOString(),
        width: 1024,
        height: 1024,
        starred: false,
        deletedAt: null
      };
      
      // Add to array instead of replacing
      setPhotoToStudioImages(prev => {
        // Avoid duplicates by checking if job ID already exists
        if (prev.some(img => img.id === job.jobId)) {
          return prev;
        }
        return [completedImage, ...prev];
      });
      
      toast({
        title: "Studio image completed",
        description: "Your image has been generated and added to the results",
      });
    }
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
          onValueChange={(value) => setCarCreationMode(value as "single" | "batch" | "photo-to-studio" | "marketplace")}
          className="mb-6"
        >
          <TabsList className="grid w-full grid-cols-4 gap-1 h-auto min-h-[44px] p-1 bg-gray-400/60 dark:bg-gray-500/60 rounded-lg">
            <TabsTrigger 
              value="single" 
              className="rounded-md font-medium text-xs sm:text-sm py-2 px-2 sm:px-4 transition-all duration-200 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground data-[state=inactive]:text-gray-700 dark:data-[state=inactive]:text-gray-200 hover:bg-gray-300/50 dark:hover:bg-gray-400/50"
            >
              <span className="whitespace-nowrap">Custom Build</span>
            </TabsTrigger>
            <TabsTrigger 
              value="photo-to-studio" 
              className="rounded-md font-medium text-xs sm:text-sm py-2 px-1.5 sm:px-3 transition-all duration-200 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground data-[state=inactive]:text-gray-700 dark:data-[state=inactive]:text-gray-200 hover:bg-gray-300/50 dark:hover:bg-gray-400/50 flex items-center justify-center gap-0.5 sm:gap-1"
            >
              <span className="whitespace-nowrap text-[10px] sm:text-xs md:text-sm">Photo Studio</span>
              <span className="inline-flex items-center justify-center px-1 py-0.5 text-[6px] sm:text-[7px] md:text-[8px] font-bold leading-none text-white bg-gradient-to-r from-blue-500 to-purple-500 rounded-full min-w-[18px] sm:min-w-[20px]">
                NEW
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="batch" 
              className="rounded-md font-medium text-xs sm:text-sm py-2 px-2 sm:px-4 transition-all duration-200 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground data-[state=inactive]:text-gray-700 dark:data-[state=inactive]:text-gray-200 hover:bg-gray-300/50 dark:hover:bg-gray-400/50"
            >
              <span className="whitespace-nowrap">Bulk Generate</span>
            </TabsTrigger>
            <TabsTrigger 
              value="marketplace" 
              className="rounded-md font-medium text-xs sm:text-sm py-2 px-1.5 sm:px-3 transition-all duration-200 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground data-[state=inactive]:text-gray-700 dark:data-[state=inactive]:text-gray-200 hover:bg-gray-300/50 dark:hover:bg-gray-400/50 flex items-center justify-center gap-0.5 sm:gap-1"
            >
              <span className="whitespace-nowrap text-[10px] sm:text-xs md:text-sm">Marketplace</span>
              <span className="inline-flex items-center justify-center px-1 py-0.5 text-[6px] sm:text-[7px] md:text-[8px] font-bold leading-none text-white bg-gradient-to-r from-green-500 to-blue-500 rounded-full min-w-[18px] sm:min-w-[20px]">
                NEW
              </span>
            </TabsTrigger>
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
                          {[
                            { key: 'silver', sheetColor: 'Silver' },
                            { key: 'black', sheetColor: 'Black' },
                            { key: 'white', sheetColor: 'White' },
                            { key: 'red', sheetColor: 'Red' },
                            { key: 'blue', sheetColor: 'Blue' },
                            { key: 'green', sheetColor: 'Green' },
                            { key: 'yellow', sheetColor: 'Yellow' },
                            { key: 'orange', sheetColor: 'Orange' }
                          ].map(({ key, sheetColor }) => (
                            <div 
                              key={key}
                              className={`h-8 w-8 rounded-full cursor-pointer transition-all border-2 ${
                                form.watch('color') === sheetColor 
                                  ? 'border-primary scale-110' 
                                  : 'border-transparent hover:border-primary/50'
                              }`}
                              style={{ 
                                background: 
                                  key === 'silver' ? 'linear-gradient(135deg, #D8D8D8, #A8A8A8)' : 
                                  key === 'white' ? 'linear-gradient(135deg, #FFFFFF, #F0F0F0)' :
                                  key === 'black' ? 'linear-gradient(135deg, #333333, #111111)' :
                                  key === 'red' ? 'linear-gradient(135deg, #AF2A2A, #8B0000)' :
                                  key === 'blue' ? 'linear-gradient(135deg, #1E5AA8, #0A3B75)' :
                                  key === 'green' ? 'linear-gradient(135deg, #2E7D32, #1B5E20)' :
                                  key === 'yellow' ? 'linear-gradient(135deg, #E4C157, #C6A03E)' :
                                  key === 'orange' ? 'linear-gradient(135deg, #DC7633, #BA6125)' :
                                  key,
                                boxShadow: form.watch('color') === sheetColor 
                                  ? '0 0 0 2px rgba(0,0,0,0.1), inset 0 0 10px rgba(255,255,255,0.2)' 
                                  : 'inset 0 0 5px rgba(0,0,0,0.1)'
                              }}
                              onClick={() => {
                                setValue('color', sheetColor);
                                setShowCustomColor(false);
                                setCustomColor('');
                              }}
                              title={sheetColor}
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
                            return currentColor || 'Silver'; // Default to Silver if no color selected
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
          
          <TabsContent value="photo-to-studio">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              {/* Form Section */}
              <div className="space-y-6 bg-card p-6 rounded-lg shadow-sm border">
                {/* Header with icon */}
                <div className="flex items-center space-x-3 border-b pb-4 mb-4">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <Upload className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium">Photo-to-Studio</h3>
                    <p className="text-sm text-muted-foreground">Transform car photos into studio-ready images</p>
                  </div>
                </div>
                
                {/* Model Selection - Compact */}
                <div className="bg-background/60 p-3 rounded-lg border border-border/40 shadow-sm mb-4">
                  <div className="flex items-center gap-3">
                    <Label className="text-sm font-medium shrink-0">AI Model:</Label>
                    <Select
                      value={photoToStudioForm.watch('modelKey')}
                      onValueChange={(value) => {
                        photoToStudioForm.setValue('modelKey', value as 'google/nano-banana' | 'flux-kontext-max');
                        // Clear extra files if switching to flux-kontext-max
                        if (value === 'flux-kontext-max' && selectedFiles.length > 1) {
                          setSelectedFiles([selectedFiles[0]]);
                          setPreviewUrls([previewUrls[0]]);
                        }
                      }}
                    >
                      <SelectTrigger className="w-auto min-w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="google/nano-banana">Nano Banana (Recommended)</SelectItem>
                        <SelectItem value="flux-kontext-max">Flux Kontext Max</SelectItem>
                      </SelectContent>
                    </Select>
                    {photoToStudioForm.watch('modelKey') === 'flux-kontext-max' && (
                      <span className="text-xs text-muted-foreground">Single image only</span>
                    )}
                  </div>
                </div>

                {/* Form fields */}
                <div className="space-y-5">
                  {/* File upload section */}
                  <div className="bg-background/60 p-4 rounded-lg border border-border/40 shadow-sm">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="car-photo">
                          Car Photos 
                          {photoToStudioForm.watch('modelKey') === 'flux-kontext-max' ? ' (1 image max)' : ' (up to 10)'}
                        </Label>
                        {selectedFiles.length > 0 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={clearSelectedFiles}
                            className="h-7 text-xs"
                          >
                            Clear All ({selectedFiles.length})
                          </Button>
                        )}
                      </div>
                      
                      {/* Drag & Drop Area */}
                      <div
                        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
                          isDragOver 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50'
                        }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                      >
                        <div className="text-center">
                          <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                          <div className="space-y-1">
                            <p className="text-sm font-medium">
                              Drag & drop your car photos here
                            </p>
                            <p className="text-xs text-muted-foreground">
                              or click to browse
                            </p>
                            <p className="text-xs text-muted-foreground">
                              JPG, PNG, or WebP • Max 25MB each
                              {photoToStudioForm.watch('modelKey') === 'google/nano-banana' && ' • Best with 5 or fewer images'}
                            </p>
                          </div>
                        </div>
                        <Input
                          id="car-photo"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple={photoToStudioForm.watch('modelKey') !== 'flux-kontext-max'}
                          onChange={handleFileUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                      
                      {selectedFiles.length > 0 && (
                        <div className="mt-3 space-y-3">
                          <div className="text-xs text-muted-foreground">
                            {selectedFiles.length} image{selectedFiles.length !== 1 ? 's' : ''} selected
                          </div>
                          <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                            {selectedFiles.map((file, index) => (
                              <div key={index} className="relative group">
                                <img 
                                  src={previewUrls[index]} 
                                  alt={`Preview ${index + 1}`} 
                                  className="w-full h-24 object-cover rounded-md border"
                                />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => removeFile(index)}
                                  className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  ×
                                </Button>
                                <div className="mt-1 text-xs text-muted-foreground truncate" title={file.name}>
                                  {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Mode selector section */}
                  <div className="bg-background/60 p-4 rounded-lg border border-border/40 shadow-sm">
                    <div className="space-y-3">
                      <Label>Enhancement Mode</Label>
                      <RadioGroup 
                        value={watchMode} 
                        onValueChange={(value) => photoToStudioForm.setValue('mode', value as 'background-only' | 'studio-enhance')}
                        className="space-y-3"
                      >
                        <div 
                          className={`flex items-start space-x-3 p-3 rounded-md border transition-colors cursor-pointer ${
                            watchMode === 'background-only' 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border/60 hover:bg-accent/30'
                          }`}
                          onClick={() => photoToStudioForm.setValue('mode', 'background-only')}
                        >
                          <RadioGroupItem value="background-only" id="background-only" className="mt-1" />
                          <div className="space-y-1 flex-1">
                            <Label htmlFor="background-only" className="font-medium text-sm cursor-pointer">
                              Background Only
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Swap the background for a clean studio backdrop. The car remains exactly as in the photo.
                            </p>
                          </div>
                        </div>
                        <div 
                          className={`flex items-start space-x-3 p-3 rounded-md border transition-colors cursor-pointer ${
                            watchMode === 'studio-enhance' 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border/60 hover:bg-accent/30'
                          }`}
                          onClick={() => photoToStudioForm.setValue('mode', 'studio-enhance')}
                        >
                          <RadioGroupItem value="studio-enhance" id="studio-enhance" className="mt-1" />
                          <div className="space-y-1 flex-1">
                            <Label htmlFor="studio-enhance" className="font-medium text-sm cursor-pointer">
                              Studio Enhance
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Studio backdrop plus subtle light/angle tuning while preserving every original vehicle detail.
                            </p>
                          </div>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                  
                  
                  {/* Brand field - shown only when Studio Enhance is selected */}
                  {watchMode === 'studio-enhance' && (
                    <div className="bg-background/60 p-4 rounded-lg border border-border/40 shadow-sm">
                      <div className="space-y-2">
                        <Label htmlFor="brand">Brand *</Label>
                        <Input
                          id="brand"
                          placeholder="e.g., Toyota, Ford, BMW"
                          {...photoToStudioForm.register('brand')}
                          className={photoToStudioForm.formState.errors.brand ? 'border-red-500' : ''}
                        />
                        {photoToStudioForm.formState.errors.brand && (
                          <p className="text-xs text-red-500">
                            {photoToStudioForm.formState.errors.brand.message}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Required for correct logo rendering in Studio Enhance mode
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Additional instructions field */}
                  <div className="bg-background/60 p-4 rounded-lg border border-border/40 shadow-sm">
                    <div className="space-y-2">
                      <Label htmlFor="additional-instructions">Additional Instructions (Optional)</Label>
                      <Textarea
                        id="additional-instructions"
                        placeholder="e.g. Remove the license plate, Clean mud from tires, Hide dashboard clutter"
                        rows={3}
                        {...photoToStudioForm.register('additionalInstructions')}
                      />
                      <p className="text-xs text-muted-foreground">
                        Additional instructions will be added to the generation prompt
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Generate button */}
                <div className="pt-4">
                  <Button 
                    onClick={() => {
                      if (!selectedFiles || selectedFiles.length === 0) {
                        toast({
                          title: "No images selected",
                          description: "Please upload at least one car photo first",
                          variant: "destructive"
                        });
                        return;
                      }
                      photoToStudioForm.handleSubmit(handlePhotoToStudioGenerate)();
                    }}
                    disabled={isGeneratingStudio || photoToStudioMutation.isPending || selectedFiles.length === 0}
                    className="w-full h-12 text-base font-medium"
                  >
                    {isGeneratingStudio || photoToStudioMutation.isPending ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Generating Studio Image...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Generate Studio Image
                      </>
                    )}
                  </Button>
                </div>
                
                {/* Progress bar */}
                {photoToStudioProgress !== null && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Generating studio image...</span>
                      <span>{photoToStudioProgress}%</span>
                    </div>
                    <Progress value={photoToStudioProgress} className="w-full" />
                  </div>
                )}
              </div>
              
              {/* Preview Section */}
              <div className="space-y-6">
                {photoToStudioImages.length > 0 ? (
                  <div className="flex flex-col bg-card border rounded-lg shadow-sm overflow-hidden">
                    {/* Header */}
                    <div className="p-4 border-b bg-muted/30">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <h2 className="font-semibold">Studio Image Generated</h2>
                      </div>
                    </div>
                    
                    {/* Image display */}
                    <div className="flex-1 p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {photoToStudioImages.map((image, index) => (
                          <CarImageCard
                            key={image.id}
                            image={image}
                            make={photoToStudioForm.watch('brand') ? photoToStudioForm.watch('brand') : undefined}
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
                        ))}
                      </div>
                    </div>
                    
                    {/* Details */}
                    <div className="p-4 bg-muted/30 border-t space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <div>
                          <p className="font-medium text-sm">Saved to Gallery</p>
                          <p className="text-xs text-muted-foreground">
                            Your studio image has been automatically saved to your gallery
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col h-full bg-card border rounded-lg shadow-sm overflow-hidden">
                    {/* Empty state header */}
                    <div className="p-4 border-b bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Upload className="h-5 w-5 text-muted-foreground" />
                        <h2 className="font-semibold text-muted-foreground">Studio Preview</h2>
                      </div>
                    </div>
                    
                    {/* Empty state content */}
                    <div className="flex-1 flex items-center justify-center py-16 px-6">
                      <div className="text-center max-w-xs">
                        <div className="relative mx-auto mb-4 w-20 h-20">
                          <div className="absolute inset-0 bg-primary/5 rounded-full animate-ping opacity-50"></div>
                          <div className="relative bg-primary/10 rounded-full p-5">
                            <Upload className="h-10 w-10 text-primary/60" />
                          </div>
                        </div>
                        <h3 className="text-lg font-medium mb-2">Ready to transform your photo</h3>
                        <p className="text-muted-foreground text-sm mb-6">
                          Upload a car photo, select your enhancement mode, and generate a professional studio image
                        </p>
                        <div className="text-xs text-muted-foreground flex items-center justify-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle className="h-3.5 w-3.5 text-primary/60" />
                            <span>Preserves details</span>
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

          <TabsContent value="marketplace">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              {/* Form Section */}
              <div className="space-y-6 bg-card p-6 rounded-lg shadow-sm border">
                {/* Header with icon */}
                <div className="flex items-center space-x-3 border-b pb-4 mb-4">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <Upload className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium">Car Marketplace</h3>
                    <p className="text-sm text-muted-foreground">Generate multi-angle & color variations from photos</p>
                  </div>
                </div>

                {/* File Upload Section */}
                <div className="space-y-4 pb-6 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4 text-primary" />
                    <Label className="text-base font-medium">Source Images</Label>
                  </div>
                  <div 
                    className="border-2 border-dashed border-border rounded-lg p-6 text-center bg-muted/30"
                    onDragOver={handleMarketplaceDragOver}
                    onDrop={handleMarketplaceDrop}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Drop car photos here or click to upload</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          JPG, PNG, or WebP • Max 25MB • Up to 10 images
                        </p>
                      </div>
                      <input
                        id="marketplace-photos"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        className="hidden"
                        onChange={handleMarketplaceFileUpload}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => document.getElementById('marketplace-photos')?.click()}
                      >
                        Browse Files
                      </Button>
                    </div>
                  </div>

                  {/* Preview uploaded files */}
                  {marketplaceFiles.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Selected Images ({marketplaceFiles.length})</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={clearMarketplaceFiles}
                        >
                          Clear All
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {marketplacePreviewUrls.map((url, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={url}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-20 object-cover rounded border bg-muted"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute -top-2 -right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeMarketplaceFile(index)}
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Car Make/Model Field */}
                <div className="space-y-4 pb-6 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <CarFront className="h-4 w-4 text-primary" />
                    <Label className="text-base font-medium">Car Make/Model (Optional)</Label>
                  </div>
                  <Input
                    placeholder="e.g., Toyota Camry, BMW X5, Ford Mustang"
                    value={carMakeModel}
                    onChange={(e) => setCarMakeModel(e.target.value)}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    This will be used to name your generated images for easy identification
                  </p>
                </div>

                {/* Angle Selection */}
                <div className="space-y-4 pb-6 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Maximize2 className="h-4 w-4 text-primary" />
                      <Label className="text-base font-medium">Camera Angles</Label>
                    </div>
                    <p className="text-xs text-muted-foreground">Select angles to generate</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {anglePresets.map((angle) => {
                      const isSelected = selectedAngles.includes(angle.angle_key);
                      // Simplify angle names as requested
                      const simplifiedLabel = angle.angle_label
                        .replace('Front 0°', 'Front')
                        .replace('Front 3/4 (45°)', 'Front 3/4')
                        .replace('Side (90°)', 'Side')
                        .replace('Rear 3/4 (135°)', 'Rear 3/4')
                        .replace('Rear (180°)', 'Rear');
                      
                      return (
                        <button
                          key={angle.angle_key}
                          type="button"
                          className={`relative h-16 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-1 ${
                            isSelected
                              ? 'border-primary bg-primary/10 shadow-sm scale-[1.02]'
                              : 'border-border bg-background hover:border-primary/50 hover:bg-muted/50'
                          }`}
                          onClick={() => {
                            setSelectedAngles(prev => 
                              prev.includes(angle.angle_key)
                                ? prev.filter(a => a !== angle.angle_key)
                                : [...prev, angle.angle_key]
                            );
                          }}
                        >
                          {isSelected && (
                            <div className="absolute top-1 right-1 h-4 w-4 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                              <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                          <span className={`text-xs font-medium transition-colors ${
                            isSelected ? 'text-primary' : 'text-foreground'
                          }`}>
                            {simplifiedLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Additional Instructions (Optional) */}
                <div className="space-y-4 pb-6 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <Pencil className="h-4 w-4 text-primary" />
                    <Label className="text-base font-medium">Additional Instructions (Optional)</Label>
                  </div>
                  <Input
                    placeholder="e.g., remove license plate, add racing stripes, etc."
                    value={additionalInstructions}
                    onChange={(e) => setAdditionalInstructions(e.target.value)}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    These instructions will be added to each angle prompt for more customized results
                  </p>
                </div>

                {/* Color Selection */}
                <div className="space-y-4 pb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-primary" />
                      <Label className="text-base font-medium">Color Variations</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="auto-colorize"
                        checked={autoColorize}
                        onChange={(e) => setAutoColorize(e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="auto-colorize" className="text-xs">Auto-colorize</Label>
                    </div>
                  </div>
                  
                  {autoColorize && (
                    <div className="space-y-4">
                      {/* Custom Color Input */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-normal">Custom Colors</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowMarketplaceCustomColor(!showMarketplaceCustomColor)}
                            className="text-xs"
                          >
                            {showMarketplaceCustomColor ? 'Cancel' : '+ Add Custom Color'}
                          </Button>
                        </div>
                        
                        {showMarketplaceCustomColor && (
                          <div className="space-y-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <Label htmlFor="marketplace_custom_color" className="text-sm font-medium text-blue-800 dark:text-blue-200">
                              Enter Custom Color Name
                            </Label>
                            <Input
                              id="marketplace_custom_color"
                              placeholder="e.g., midnight pearl, copper metallic, forest green..."
                              value={marketplaceCustomColor}
                              onChange={(e) => setMarketplaceCustomColor(e.target.value)}
                              className="bg-white dark:bg-gray-900 border-blue-300 dark:border-blue-700 focus:border-blue-500"
                            />
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setShowMarketplaceCustomColor(false);
                                  setMarketplaceCustomColor("");
                                }}
                                className="text-xs"
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  if (marketplaceCustomColor.trim()) {
                                    setMarketplaceCustomColors(prev => [...prev, marketplaceCustomColor.trim()]);
                                    setMarketplaceCustomColor("");
                                    setShowMarketplaceCustomColor(false);
                                  }
                                }}
                                disabled={!marketplaceCustomColor.trim()}
                                className="text-xs"
                              >
                                Add Color
                              </Button>
                            </div>
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                              Tip: Be descriptive for best results (e.g., "metallic dark green" instead of just "green")
                            </p>
                          </div>
                        )}
                        
                        {/* Display custom colors */}
                        {marketplaceCustomColors.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {marketplaceCustomColors.map((color, index) => (
                              <div key={index} className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded text-xs">
                                <span>{color}</span>
                                <button
                                  onClick={() => setMarketplaceCustomColors(prev => prev.filter((_, i) => i !== index))}
                                  className="text-blue-600 hover:text-blue-800 ml-1"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* Preset Colors */}
                      <div className="space-y-3">
                        <Label className="text-sm font-normal">Preset Colors</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-48 overflow-y-auto pr-2">
                      {colorPresets.map((color) => {
                        const isSelected = selectedColors.includes(color.color_key);
                        // Generate color swatch based on color name
                        const getColorSwatch = (colorName: string) => {
                          const colorMap: Record<string, string> = {
                            'red': '#DC2626',
                            'blue': '#2563EB', 
                            'green': '#16A34A',
                            'yellow': '#EAB308',
                            'orange': '#EA580C',
                            'purple': '#9333EA',
                            'pink': '#EC4899',
                            'black': '#171717',
                            'white': '#FFFFFF',
                            'gray': '#6B7280',
                            'grey': '#6B7280',
                            'silver': '#D1D5DB',
                            'gold': '#F59E0B',
                            'brown': '#92400E',
                            'beige': '#F3E8D0',
                            'navy': '#1E3A8A',
                            'maroon': '#7C2D12',
                            'teal': '#0F766E',
                            'lime': '#65A30D',
                            'indigo': '#4338CA',
                            'cyan': '#0891B2'
                          };
                          
                          // Find matching color or default to a neutral color
                          const colorKey = Object.keys(colorMap).find(key => 
                            colorName.toLowerCase().includes(key)
                          );
                          return colorKey ? colorMap[colorKey] : '#64748B';
                        };
                        
                        return (
                          <button
                            key={color.color_key}
                            type="button"
                            className={`relative h-12 rounded-lg border-2 transition-all duration-200 flex items-center gap-2 px-3 ${
                              isSelected
                                ? 'border-primary bg-primary/10 shadow-sm scale-[1.02]'
                                : 'border-border bg-background hover:border-primary/50 hover:bg-muted/50'
                            }`}
                            onClick={() => {
                              setSelectedColors(prev => 
                                prev.includes(color.color_key)
                                  ? prev.filter(c => c !== color.color_key)
                                  : [...prev, color.color_key]
                              );
                            }}
                          >
                            {isSelected && (
                              <div className="absolute top-1 right-1 h-4 w-4 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                                <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                            <div
                              className="h-6 w-6 rounded border shadow-sm flex-shrink-0"
                              style={{ 
                                backgroundColor: getColorSwatch(color.color_label),
                                border: getColorSwatch(color.color_label) === '#FFFFFF' ? '1px solid #E5E7EB' : 'none'
                              }}
                            />
                            <span className={`text-xs font-medium transition-colors truncate ${
                              isSelected ? 'text-primary' : 'text-foreground'
                            }`}>
                              {color.color_label}
                            </span>
                          </button>
                        );
                      })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Generate Button */}
                <div className="pt-2 border-t border-border/50">
                <Button
                  onClick={handleMarketplaceGenerate}
                  disabled={isGeneratingStudio || marketplaceFiles.length === 0 || selectedAngles.length === 0}
                  className="w-full h-12 text-base font-medium"
                  size="lg"
                >
                  {isGeneratingStudio ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                      Processing...
                    </div>
                  ) : (
                    autoColorize 
                      ? `Generate ${selectedAngles.length} Angles → ${selectedColors.length + marketplaceCustomColors.length} Colors each`
                      : `Generate ${selectedAngles.length} Angles (colors later)`
                  )}
                </Button>
                </div>
              </div>

              {/* Preview Section */}
              <div className="bg-card rounded-lg shadow-sm border overflow-hidden">
                {Object.keys(marketplaceMatrix).length === 0 ? (
                  <div className="h-full min-h-[400px] flex flex-col">
                    {/* Header */}
                    <div className="p-4 border-b bg-muted/30">
                      <div className="flex items-center gap-3">
                        <Upload className="h-5 w-5 text-muted-foreground" />
                        <h2 className="font-semibold text-muted-foreground">Marketplace Preview</h2>
                      </div>
                    </div>
                    
                    {/* Empty state content */}
                    <div className="flex-1 flex items-center justify-center py-16 px-6">
                      <div className="text-center max-w-xs">
                        <div className="relative mx-auto mb-4 w-20 h-20">
                          <div className="absolute inset-0 bg-primary/5 rounded-full animate-ping opacity-50"></div>
                          <div className="relative bg-primary/10 rounded-full p-5">
                            <Upload className="h-10 w-10 text-primary/60" />
                          </div>
                        </div>
                        <h3 className="text-lg font-medium mb-2">Ready for marketplace generation</h3>
                        <p className="text-muted-foreground text-sm mb-6">
                          Upload car photos, select angles and colors, then generate a complete marketplace set
                        </p>
                        <div className="text-xs text-muted-foreground flex items-center justify-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle className="h-3.5 w-3.5 text-primary/60" />
                            <span>Multiple angles</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle className="h-3.5 w-3.5 text-primary/60" />
                            <span>Color variations</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 space-y-8">
                    {/* Header with Download All Button */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-5 w-5 bg-primary/10 rounded flex items-center justify-center">
                          <div className="h-2.5 w-2.5 bg-primary/60 rounded"></div>
                        </div>
                        <h2 className="font-semibold text-lg">Marketplace Results</h2>
                        <div className="text-sm text-muted-foreground">
                          {Object.keys(marketplaceMatrix).length} angles
                          {autoColorize && ` × ${selectedColors.length + marketplaceCustomColors.length} colors`}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                        onClick={async () => {
                          // Download all completed images as ZIP
                          const completedImageCount = Object.entries(marketplaceMatrix).reduce((count, [angleKey, angleRow]) => {
                            return count + Object.entries(angleRow).filter(([cellKey, cell]) => 
                              cell.status === 'completed' && cell.imageUrl
                            ).length;
                          }, 0);
                          
                          if (completedImageCount === 0) {
                            toast({
                              title: "No Images Ready",
                              description: "Wait for images to complete processing first.",
                              variant: "destructive"
                            });
                            return;
                          }

                          if (!marketplaceBatchId) {
                            toast({
                              title: "Batch Not Found",
                              description: "Unable to find the marketplace batch for download.",
                              variant: "destructive"
                            });
                            return;
                          }
                          
                          try {
                            toast({
                              title: "Preparing Download",
                              description: `Creating ZIP file with ${completedImageCount} images...`,
                            });
                            
                            // Create a form to trigger the download
                            const form = document.createElement('form');
                            form.method = 'POST';
                            form.action = `/api/car/marketplace/batch/${marketplaceBatchId}/download`;
                            form.style.display = 'none';
                            document.body.appendChild(form);
                            form.submit();
                            document.body.removeChild(form);
                            
                            // Show success message after a delay
                            setTimeout(() => {
                              toast({
                                title: "Download Started",
                                description: "Your ZIP file should start downloading shortly.",
                              });
                            }, 1000);
                            
                          } catch (error) {
                            console.error('Download error:', error);
                            toast({
                              title: "Download Failed",
                              description: "There was an error creating the ZIP file.",
                              variant: "destructive"
                            });
                          }
                        }}
                      >
                        <Download className="h-4 w-4" />
                        Download All
                      </Button>
                    </div>

                    {/* Section 1: Angle Results (Base Images) */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <h3 className="font-medium text-base">Angle Results</h3>
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                          Base images from selected angles
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {Object.entries(marketplaceMatrix).map(([angleKey, angleRow]) => {
                          const baseCell = angleRow['__angle__'];
                          const simplifiedAngleName = angleKey
                            .replace('front_0', 'Front')
                            .replace('front_3_4', 'Front 3/4')
                            .replace('side_90', 'Side')
                            .replace('rear_3_4', 'Rear 3/4')
                            .replace('rear_180', 'Rear')
                            .replace('_', ' ')
                            .replace(/\b\w/g, l => l.toUpperCase());
                          
                          return (
                            <div key={angleKey} className="space-y-2">
                              {baseCell?.status === 'completed' && baseCell.imageUrl ? (
                                <div className="group relative bg-card rounded-lg border shadow-sm overflow-hidden">
                                  {/* Image */}
                                  <div className="aspect-square relative">
                                    <img
                                      src={baseCell.thumbUrl || baseCell.imageUrl}
                                      alt={`${simplifiedAngleName} view`}
                                      className="w-full h-full object-cover cursor-pointer"
                                      onClick={() => setSelectedImage(baseCell.imageUrl!)}
                                    />
                                    {/* Download Button Overlay */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <Button
                                        variant="secondary"
                                        size="sm"
                                        className="shadow-lg"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const link = document.createElement('a');
                                          link.href = baseCell.imageUrl!;
                                          link.download = `${angleKey}-base.jpg`;
                                          link.click();
                                        }}
                                      >
                                        <Download className="h-4 w-4 mr-1" />
                                        Download
                                      </Button>
                                    </div>
                                  </div>
                                  {/* Label */}
                                  <div className="p-3">
                                    <p className="text-sm font-medium text-center">{simplifiedAngleName}</p>
                                    <p className="text-xs text-muted-foreground text-center">Base</p>
                                  </div>
                                </div>
                              ) : baseCell?.status === 'failed' ? (
                                <div className="aspect-square rounded-lg border-2 border-destructive/20 bg-destructive/5 flex flex-col items-center justify-center p-4">
                                  <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                                  <p className="text-xs text-destructive font-medium mb-2">Generation Failed</p>
                                  <p className="text-xs text-center text-muted-foreground">{simplifiedAngleName}</p>
                                </div>
                              ) : (
                                <div className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/30 flex flex-col items-center justify-center p-4">
                                  {baseCell?.status === 'processing' ? (
                                    <>
                                      <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mb-2"></div>
                                      <p className="text-xs text-muted-foreground">Processing...</p>
                                    </>
                                  ) : (
                                    <>
                                      <div className="animate-pulse w-6 h-6 bg-primary/20 rounded mb-2"></div>
                                      <p className="text-xs text-muted-foreground">Queued</p>
                                    </>
                                  )}
                                  <p className="text-xs text-center text-muted-foreground mt-1">{simplifiedAngleName}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Section 2: Color Variants (only show if auto-colorize is enabled) */}
                    {autoColorize && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b">
                          <h3 className="font-medium text-base">Color Variants</h3>
                          <span className="text-xs bg-secondary/80 text-secondary-foreground px-2 py-1 rounded-full">
                            Recolored variations
                          </span>
                        </div>
                        
                        {Object.entries(marketplaceMatrix).map(([angleKey, angleRow]) => {
                          const colorVariants = Object.entries(angleRow).filter(([cellKey]) => cellKey !== '__angle__');
                          const simplifiedAngleName = angleKey
                            .replace('front_0', 'Front')
                            .replace('front_3_4', 'Front 3/4')
                            .replace('side_90', 'Side')
                            .replace('rear_3_4', 'Rear 3/4')
                            .replace('rear_180', 'Rear')
                            .replace('_', ' ')
                            .replace(/\b\w/g, l => l.toUpperCase());
                          
                          return colorVariants.length > 0 && (
                            <div key={`${angleKey}-colors`} className="space-y-3">
                              <h4 className="text-sm font-medium text-muted-foreground">{simplifiedAngleName} - Colors</h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                {colorVariants.map(([colorKey, cell]) => (
                                  <div key={`${angleKey}-${colorKey}`} className="space-y-2">
                                    {cell.status === 'completed' && cell.imageUrl ? (
                                      <div className="group relative bg-card rounded border shadow-sm overflow-hidden">
                                        {/* Image */}
                                        <div className="aspect-square relative">
                                          <img
                                            src={cell.thumbUrl || cell.imageUrl}
                                            alt={`${simplifiedAngleName} ${colorKey}`}
                                            className="w-full h-full object-cover cursor-pointer"
                                            onClick={() => setSelectedImage(cell.imageUrl!)}
                                          />
                                          {/* Download Button Overlay */}
                                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Button
                                              variant="secondary"
                                              size="sm"
                                              className="shadow-lg text-xs px-2"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const link = document.createElement('a');
                                                link.href = cell.imageUrl!;
                                                link.download = `${angleKey}-${colorKey}.jpg`;
                                                link.click();
                                              }}
                                            >
                                              <Download className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </div>
                                        {/* Label */}
                                        <div className="p-2">
                                          <p className="text-xs font-medium text-center capitalize">{colorKey}</p>
                                        </div>
                                      </div>
                                    ) : cell.status === 'failed' ? (
                                      <div className="aspect-square rounded border-2 border-destructive/20 bg-destructive/5 flex flex-col items-center justify-center p-2">
                                        <AlertCircle className="h-4 w-4 text-destructive mb-1" />
                                        <p className="text-[10px] text-destructive text-center">Failed</p>
                                        <p className="text-[9px] text-center text-muted-foreground capitalize">{colorKey}</p>
                                      </div>
                                    ) : (
                                      <div className="aspect-square rounded border-2 border-dashed border-muted-foreground/20 bg-muted/30 flex flex-col items-center justify-center p-2">
                                        {cell.status === 'processing' ? (
                                          <>
                                            <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full mb-1"></div>
                                            <p className="text-[10px] text-muted-foreground">Processing</p>
                                          </>
                                        ) : (
                                          <>
                                            <div className="animate-pulse w-4 h-4 bg-primary/20 rounded mb-1"></div>
                                            <p className="text-[10px] text-muted-foreground">Queued</p>
                                          </>
                                        )}
                                        <p className="text-[9px] text-center text-muted-foreground capitalize mt-1">{colorKey}</p>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Car List Edit Modal */}
        <CarListEditModal 
          open={showEditModal} 
          onOpenChange={setShowEditModal} 
        />
        
        {/* Image Modal for fullscreen viewing */}
        <ImageModal 
          imageUrl={selectedImage} 
          onClose={() => setSelectedImage(null)} 
        />
        
        {/* Jobs Tray - only shown in photo-to-studio and marketplace modes */}
        {(carCreationMode === "photo-to-studio" || carCreationMode === "marketplace") && (
          <>
            {/* Jobs Tray Toggle Button */}
            <button
              onClick={() => setIsJobsTrayOpen(!isJobsTrayOpen)}
              className={`fixed right-0 top-1/2 transform -translate-y-1/2 z-50 group transition-all duration-300 ${
                isJobsTrayOpen ? 'translate-x-0' : 'translate-x-0'
              }`}
            >
              <div className="relative">
                {/* Main button */}
                <div className="bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-6 rounded-l-xl shadow-xl border-r-0 transition-all duration-300 group-hover:shadow-2xl">
                  <div className="flex flex-col items-center gap-2" style={{ writingMode: 'horizontal-tb' }}>
                    <div className="text-xs font-semibold tracking-wider">JOBS</div>
                    <div className={`transition-transform duration-300 ${isJobsTrayOpen ? 'rotate-180' : ''}`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                {/* Pulse indicator for active jobs */}
                {currentJobs.some(job => job.status === 'pending' || job.status === 'processing') && (
                  <div className="absolute -top-1 -left-1 w-3 h-3 bg-orange-400 rounded-full animate-pulse"></div>
                )}
                
                {/* Job count badge */}
                {currentJobs.length > 0 && (
                  <div className="absolute -top-2 -left-2 bg-white text-blue-600 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md border border-blue-200">
                    {currentJobs.length}
                  </div>
                )}
              </div>
            </button>
            
            {/* Jobs Tray Component */}
            <JobsTray
              isOpen={isJobsTrayOpen}
              onClose={() => setIsJobsTrayOpen(false)}
              onJobCompleted={handleJobCompleted}
              onJobsUpdate={setCurrentJobs}
            />
          </>
        )}
      </div>
    </>
  );
};

export default CarCreationPage;