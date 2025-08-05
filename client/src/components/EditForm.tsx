import { useState, useRef, ChangeEvent, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FaMagic, FaUpload, FaTrash } from "react-icons/fa";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { GeneratedImage } from "@/types/image";
import { useEditor } from "@/context/EditorContext";
import { Progress } from "@/components/ui/progress";
import { ModelKey, editModelCatalog, modelCatalog } from "@/lib/modelCatalog";
import { modelSchemas, modelDefaults, GenericFormValues } from "@/lib/formSchemas";
import AIModelSelector from "@/components/AIModelSelector";
import DynamicForm from "@/components/DynamicForm";
import { useHotkeys } from "react-hotkeys-hook";
import { useQuery } from "@tanstack/react-query";

interface EditFormProps {
  onEditStart: () => void;
  onEditComplete: (images: GeneratedImage[]) => void;
  onError: (message: string) => void;
}

export default function EditForm({
  onEditStart,
  onEditComplete,
  onError,
}: EditFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedMask, setSelectedMask] = useState<File | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [maskPreview, setMaskPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [modelKey, setModelKey] = useState<ModelKey>("flux-kontext-max" as ModelKey);
  const [isEnhancing, setIsEnhancing] = useState(false);
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const maskInputRef = useRef<HTMLInputElement>(null);
  const { sourceImages, setSourceImages } = useEditor();
  
  // Fetch models from API and filter for edit-capable models
  const { data: modelsData } = useQuery({
    queryKey: ['/api/models'],
  });
  
  // Create edit model catalog from API response
  const dynamicEditModelCatalog = useMemo(() => {
    if (!modelsData) return editModelCatalog;
    
    const editCapableModels: Record<string, any> = {};
    modelsData.forEach((model: any) => {
      if (model.supportsEdit) {
        // Use the description from API or fall back to catalog
        editCapableModels[model.key] = {
          label: modelCatalog[model.key as ModelKey]?.label || model.key,
          description: model.description || modelCatalog[model.key as ModelKey]?.description || '',
          visible: model.visible || []
        };
      }
    });
    
    // Return the dynamic catalog if we have models, otherwise use the static one
    return Object.keys(editCapableModels).length > 0 ? editCapableModels : editModelCatalog;
  }, [modelsData]);

  // Update form when model changes
  useEffect(() => {
    // Reset form with default values for the selected model
    const defaults = modelDefaults[modelKey] || {};
    Object.entries(defaults).forEach(([key, value]) => {
      form.setValue(key as any, value);
    });
  }, [modelKey]);

  // Set initial default values on component mount
  useEffect(() => {
    const defaults = modelDefaults[modelKey] || {};
    Object.entries(defaults).forEach(([key, value]) => {
      form.setValue(key as any, value);
    });
  }, []); // Run once on mount

  // Function to load image from data URL
  const presetFiles = async (dataURLs: string[]) => {
    if (!dataURLs.length) return;
    
    const newPreviews: Record<string, string> = {};
    const files: File[] = [];
    
    for (let i = 0; i < dataURLs.length; i++) {
      const dataURL = dataURLs[i];
      // Create a unique file name
      const fileName = `image_${Date.now()}_${i}.png`;
      
      // Set the preview directly
      newPreviews[fileName] = dataURL;
      
      try {
        // Convert data URL to File object for use with our form
        const response = await fetch(dataURL);
        const blob = await response.blob();
        const file = new File([blob], fileName, { type: 'image/png' });
        files.push(file);
      } catch (error) {
        console.error("Error loading image:", error);
      }
    }
    
    if (Object.keys(newPreviews).length > 0) {
      setPreviews(prev => ({ ...prev, ...newPreviews }));
      setSelectedFiles(prev => [...prev, ...files]);
      
      toast({
        title: "Image loaded for editing",
        description: "You can now add a mask and edit the image"
      });
    }
  };
  
  // Check for images passed via editor context
  useEffect(() => {
    if (sourceImages.length > 0) {
      presetFiles(sourceImages);
      // Clear the source images after loading
      setSourceImages([]);
    }
  }, [sourceImages, toast, setSourceImages]);

  const form = useForm<GenericFormValues>({
    resolver: zodResolver(modelSchemas[modelKey]),
    defaultValues: {
      prompt: "",
      ...modelDefaults[modelKey]
    },
  });

  // AI Enhance prompt mutation
  const enhancePromptMutation = useMutation({
    mutationFn: async () => {
      const currentPrompt = form.getValues("prompt");
      
      if (currentPrompt.length < 3) {
        throw new Error("Prompt must be at least 3 characters long");
      }
      
      // Get the first selected image for context
      let imageData = null;
      if (selectedFiles.length > 0) {
        const reader = new FileReader();
        imageData = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(selectedFiles[0]);
        });
      }
      
      const response = await apiRequest("/api/enhance-edit-prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: currentPrompt,
          model: modelKey,
          image: imageData,
        }),
      });
      
      return response;
    },
    onSuccess: (data) => {
      // Update the form with the enhanced prompt
      form.setValue("prompt" as keyof GenericFormValues, data.prompt);
      
      // If negative prompt exists and is applicable
      if (data.negativePrompt && 
          editModelCatalog[modelKey].visible.includes("negative_prompt" as any)) {
        form.setValue("negative_prompt" as keyof GenericFormValues, data.negativePrompt);
      }
      
      setIsEnhancing(false);
      toast({
        title: "Edit prompt enhanced!",
        description: "Your editing instructions have been improved for better results",
      });
    },
    onError: (error) => {
      setIsEnhancing(false);
      toast({
        title: "Couldn't enhance prompt",
        description: "API error: " + (error.message || "Unknown error"),
        variant: "destructive",
      });
    }
  });

  const enhancePrompt = () => {
    if (isEnhancing) return;
    
    // Check if user has uploaded an image
    if (selectedFiles.length === 0) {
      toast({
        title: "Image required",
        description: "Please upload an image to enhance the prompt",
        variant: "destructive",
      });
      return;
    }
    
    setIsEnhancing(true);
    enhancePromptMutation.mutate();
  };

  // Set up keyboard shortcut
  useHotkeys("ctrl+space", (event) => {
    event.preventDefault();
    enhancePrompt();
  });

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const files = Array.from(e.target.files);
    
    // Limit to 16 images total
    if (selectedFiles.length + files.length > 16) {
      toast({
        title: "Too many images",
        description: "Maximum of 16 images allowed",
        variant: "destructive",
      });
      return;
    }
    
    // Check file sizes
    for (const file of files) {
      if (file.size > 25 * 1024 * 1024) { // 25MB
        toast({
          title: "File too large",
          description: `${file.name} exceeds the 25MB size limit`,
          variant: "destructive",
        });
        return;
      }
    }
    
    // Check file types
    for (const file of files) {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        toast({
          title: "Unsupported file type",
          description: `${file.name} is not a supported image type (PNG, JPEG, or WebP)`,
          variant: "destructive",
        });
        return;
      }
    }
    
    // Add files to selected files
    setSelectedFiles(prev => [...prev, ...files]);
    
    // Create previews for each file
    const newPreviews: Record<string, string> = {};
    
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          newPreviews[file.name] = e.target.result as string;
          setPreviews(prev => ({ ...prev, ...newPreviews }));
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleMaskChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const maskFile = e.target.files[0];
    setSelectedMask(maskFile);
    
    // Create preview for mask
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setMaskPreview(e.target.result as string);
      }
    };
    reader.readAsDataURL(maskFile);
  };
  
  const removeFile = (fileName: string) => {
    setSelectedFiles(prev => prev.filter(file => file.name !== fileName));
    setPreviews(prev => {
      const newPreviews = { ...prev };
      delete newPreviews[fileName];
      return newPreviews;
    });
  };
  
  const removeMask = () => {
    setSelectedMask(null);
    setMaskPreview(null);
    if (maskInputRef.current) {
      maskInputRef.current.value = "";
    }
  };

  const editMutation = useMutation<{images: GeneratedImage[]}, Error, GenericFormValues>({
    mutationFn: async (values: GenericFormValues) => {
      if (selectedFiles.length === 0) {
        throw new Error("Please select at least one image");
      }
      
      // Reset progress
      setProgress(0);
      
      // Only send values that are applicable to the current model
      const visibleFields = dynamicEditModelCatalog[modelKey]?.visible || [];
      const filteredValues: Record<string, any> = { modelKey };
      
      visibleFields.forEach(field => {
        if (values[field as keyof GenericFormValues] !== undefined) {
          filteredValues[field] = values[field as keyof GenericFormValues];
        }
      });
      
      // Hardcode values for flux-kontext-max
      if (modelKey === "flux-kontext-max") {
        filteredValues.output_format = "png";
        filteredValues.safety_tolerance = 2;
      }
      
      // Convert selected files to base64 for API
      const images: string[] = [];
      for (const file of selectedFiles) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        images.push(base64);
      }
      

      
      // Create FormData for multipart upload
      const formData = new FormData();
      
      // Add text fields
      Object.entries(filteredValues).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
      
      // Add image files
      for (const file of selectedFiles) {
        formData.append('image', file);
      }
      
      // Add mask file if present
      if (selectedMask) {
        formData.append('mask', selectedMask);
      }
      
      // Use the edit-image API endpoint
      const response = await fetch("/api/edit-image", {
        method: "POST",
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to edit images");
      }
      
      // For async jobs, get job ID and poll
      const result = await response.json();
      if (result.jobId) {
        const { jobId } = result;
      
        // Set initial progress
        setProgress(10);
        
        // Poll for job completion
        return new Promise<{images: GeneratedImage[]}>((resolve, reject) => {
          // Create a progress indicator (10-95)
          let currentProgress = 10;
          
          const pollInterval = setInterval(async () => {
            try {
              // Increment progress for UI feedback (up to 95%)
              if (currentProgress < 95) {
                // Slow down progress as we get higher to avoid reaching 95 too quickly
                const increment = currentProgress < 30 ? 10 : 
                                 currentProgress < 60 ? 5 : 3;
                
                currentProgress = Math.min(95, currentProgress + increment);
                setProgress(currentProgress);
              }
              
              // Get job status
              const jobResponse = await fetch(`/api/job/${jobId}`);
              
              if (!jobResponse.ok) {
                clearInterval(pollInterval);
                reject(new Error("Failed to check job status"));
                return;
              }
              
              const job = await jobResponse.json();
              
              if (job.status === "done") {
                setProgress(100);
                clearInterval(pollInterval);
                resolve({ images: job.result });
              } else if (job.status === "error") {
                clearInterval(pollInterval);
                reject(new Error(job.error || "Failed to edit images"));
              }
              // Otherwise continue polling
            } catch (error: any) {
              clearInterval(pollInterval);
              reject(new Error(`Error polling job: ${error.message}`));
            }
          }, 2000); // Poll every 2 seconds
        });
      } else {
        // Direct response with images
        setProgress(100);
        return { images: result.images };
      }
    },
    onSuccess: (data) => {
      setIsSubmitting(false);
      onEditComplete(data.images);
      queryClient.invalidateQueries({ queryKey: ["/api/images"] });
      toast({
        title: "Images edited successfully",
        description: `Edited ${data.images.length} images`,
      });
    },
    onError: (error: Error) => {
      setIsSubmitting(false);
      onError(error.message || "Failed to edit images");
      toast({
        title: "Failed to edit images",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (values: GenericFormValues) => {
    setIsSubmitting(true);
    setProgress(0);
    onEditStart();
    editMutation.mutate(values);
  };

  return (
    <div className="bg-card rounded-xl shadow-sm border h-full">
      {isSubmitting && (
        <div className="p-5 border-b">
          <div className="flex justify-between mb-2 text-sm">
            <span className="font-medium flex items-center">
              <svg className="animate-spin mr-2 h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing images...
            </span>
            <span className="font-medium text-primary">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2 bg-primary/10" />
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Processing your request, typically takes 15-30 seconds
          </p>
        </div>
      )}
      <div className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Model Selection */}
            <div className="space-y-3">
              <FormLabel className="text-sm font-medium">AI Model</FormLabel>
              <AIModelSelector 
                value={modelKey} 
                onChange={(value) => setModelKey(value as ModelKey)}
                availableModels={dynamicEditModelCatalog}
              />
            </div>

            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-sm font-medium">Edit Instructions</FormLabel>
                  <FormControl>
                    <div>
                      <Textarea
                        placeholder="Describe what changes you want to make to the image"
                        className="resize-none min-h-[80px] text-sm"
                        {...field}
                      />
                      <div className="flex justify-end mt-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 bg-gradient-to-r from-violet-50 to-indigo-50 border-purple-200 ring-1 ring-inset ring-purple-100/70 hover:ring-purple-300 shadow-sm hover:shadow text-sm px-3 text-purple-800"
                          title="Enhance Edit Instructions (Ctrl+Space)"
                          onClick={enhancePrompt}
                          disabled={isEnhancing || field.value?.length < 3 || selectedFiles.length === 0}
                        >
                          <div className="flex items-center space-x-1.5">
                            {isEnhancing ? (
                              <svg className="animate-spin h-3.5 w-3.5 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-purple-600">
                                <path d="M12 1V5M12 19V23M4.22 4.22L7.05 7.05M16.95 16.95L19.78 19.78M1 12H5M19 12H23M4.22 19.78L7.05 16.95M16.95 7.05L19.78 4.22" 
                                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                            <span className="font-medium">AI Enhance</span>
                          </div>
                        </Button>
                      </div>
                    </div>
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Be specific about what to add, remove, or change in the image
                  </p>
                </FormItem>
              )}
            />

            <div className="border border-dashed border-border rounded-lg p-5">
              <h3 className="text-sm font-medium mb-3">Source Images</h3>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedFiles.map((file) => (
                  <div key={file.name} className="relative w-20 h-20 group">
                    <img 
                      src={previews[file.name]} 
                      alt={file.name} 
                      className="w-full h-full object-cover rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(file.name)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <FaTrash size={10} />
                    </button>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="w-20 h-20 flex items-center justify-center border border-dashed border-border rounded-md hover:bg-muted transition-colors"
                >
                  <FaUpload className="text-muted-foreground" />
                </button>
              </div>
              
              <input
                type="file"
                ref={imageInputRef}
                onChange={handleFileChange}
                accept="image/png,image/jpeg,image/webp"
                multiple
                className="hidden"
              />
              
              <div className="text-xs text-muted-foreground">
                Upload 1-16 PNG, JPEG, or WebP images (max 25MB each)
              </div>
            </div>
            
            {/* Dynamic form fields based on selected model */}
            <div className="bg-muted/40 p-4 rounded-lg border border-border/50">
              <h2 className="text-lg font-semibold text-foreground mb-1">Edit Settings</h2>
              <p className="text-xs text-muted-foreground mb-4">
                Configure your image editing options
              </p>
              <DynamicForm modelKey={modelKey} form={form} availableModels={dynamicEditModelCatalog} />
            </div>

            <div className="flex justify-center pt-2">
              <Button 
                type="submit" 
                disabled={isSubmitting || selectedFiles.length === 0}
                className="w-full sm:w-auto sm:px-8 py-2.5 h-auto font-medium text-sm"
                size="lg"
              >
                <span>Edit Images</span>
                <FaMagic className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}