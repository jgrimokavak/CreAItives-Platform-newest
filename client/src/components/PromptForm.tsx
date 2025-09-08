import { useState, useEffect, useRef, ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FaMagic, FaUpload, FaTrash } from "react-icons/fa";
import { Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { GeneratedImage } from "@/types/image";
import { Progress } from "@/components/ui/progress";
import { ModelKey, modelCatalog } from "@/lib/modelCatalog";
import { modelSchemas, modelDefaults, GenericFormValues } from "@/lib/formSchemas";
import AIModelSelector from "@/components/AIModelSelector";
import DynamicForm from "@/components/DynamicForm";
import { Label } from "@/components/ui/label";
import { useHotkeys } from "react-hotkeys-hook";
import { AISuggestionBadges } from "@/components/AISuggestionBadges";
import { usePromptSuggestions } from "@/hooks/usePromptSuggestions";

// Component to manage prompt suggestions
interface PromptSuggestionsSectionProps {
  prompt: string;
  modelKey: ModelKey;
  onSuggestionSelect: (suggestion: string) => void;
}

function PromptSuggestionsSection({ 
  prompt, 
  modelKey, 
  onSuggestionSelect 
}: PromptSuggestionsSectionProps) {
  // Use our custom hook to fetch suggestions
  const { suggestions, isLoading } = usePromptSuggestions(prompt, modelKey);
  
  return (
    <div>
      <AISuggestionBadges 
        suggestions={suggestions}
        onSuggestionSelect={onSuggestionSelect}
        isLoading={isLoading}
      />
    </div>
  );
}

// Model interface from API
interface ModelInfo {
  key: string;
  provider: 'openai' | 'replicate';
  schema: any;
  visible: string[];
  defaults: Record<string, any>;
  description: string;
}

interface PromptFormProps {
  onGenerateStart: () => void;
  onGenerateComplete: (images: GeneratedImage[]) => void;
  onError: (message: string) => void;
}

export default function PromptForm({
  onGenerateStart,
  onGenerateComplete,
  onError,
}: PromptFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEnhancing, setEnhancing] = useState(false);
  const [progress, setProgress] = useState(0);

  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Source images state (for nano banana)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Fetch models when component mounts
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch('/api/models');
        if (response.ok) {
          const models = await response.json();
          setAvailableModels(models);
        }
      } catch (error) {
        console.error('Failed to fetch models:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchModels();
  }, []);

  const [modelKey, setModelKey] = useState<ModelKey>("google/nano-banana" as ModelKey);
  
  // Update form when model changes
  useEffect(() => {
    // Reset form with default values for the selected model
    const defaults = modelDefaults[modelKey] || {};
    Object.entries(defaults).forEach(([key, value]) => {
      form.setValue(key as any, value);
    });
  }, [modelKey]);

  const form = useForm<GenericFormValues>({
    resolver: zodResolver(modelSchemas[modelKey]),
    defaultValues: {
      prompt: "",
      ...modelDefaults[modelKey]
    },
  });

  const generateMutation = useMutation<{images: GeneratedImage[]}, Error, GenericFormValues>({
    mutationFn: async (values: GenericFormValues) => {
      // Reset progress
      setProgress(0);
      
      // Only send values that are applicable to the current model
      const visibleFields = modelCatalog[modelKey].visible;
      const filteredValues: Record<string, any> = { modelKey };
      
      // Add all visible fields from the form values
      Object.entries(values).forEach(([key, value]) => {
        if (visibleFields.includes(key as any) || key === "prompt") {
          filteredValues[key] = value;
        }
      });
      
      // Special case for "count" field which needs to be sent as "n"
      if (visibleFields.includes("n" as any) && values.count) {
        filteredValues.n = parseInt(values.count as string);
      }
      
      // Add source images for nano banana
      if (modelKey === "google/nano-banana" && selectedFiles.length > 0) {
        const imageDataUrls: string[] = [];
        for (const file of selectedFiles) {
          if (previews[file.name]) {
            imageDataUrls.push(previews[file.name]);
          }
        }
        filteredValues.image_input = imageDataUrls;
      }
      
      // Step 1: Submit the request to the server to create a new job
      const response = await apiRequest("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(filteredValues),
      });
      
      const { jobId } = response;
      if (!jobId) throw new Error("No job ID returned from server");
      
      // Step 2: Start progress animation
      setProgress(10);
      
      // Step 3: Poll for job status until complete
      return new Promise((resolve, reject) => {
        // Update progress slightly more often for better user experience
        const progressInterval = setInterval(() => {
          setProgress(current => {
            if (current >= 95) {
              return 95; // Cap at 95% until we actually get the results
            }
            // Gradually increase progress to simulate ongoing work
            return current + (95 - current) * 0.1;
          });
        }, 1000);
        
        // Poll for job status
        const statusCheck = async () => {
          try {
            const job = await apiRequest(`/api/job/${jobId}`);
            
            if (job.status === "done" && job.result) {
              // Job completed successfully
              clearInterval(progressInterval);
              clearTimeout(pollTimeout);
              setProgress(100);
              resolve({ images: job.result });
            } else if (job.status === "error") {
              // Job failed
              clearInterval(progressInterval);
              clearTimeout(pollTimeout);
              reject(new Error(job.error || "Image generation failed"));
            } else {
              // Job still in progress, schedule another check
              pollTimeout = setTimeout(statusCheck, 1000);
            }
          } catch (error) {
            clearInterval(progressInterval);
            clearTimeout(pollTimeout);
            reject(error);
          }
        };
        
        // Keep track of the timeout so we can clear it if needed
        let pollTimeout = setTimeout(statusCheck, 1000);
      });
    },
    onSuccess: (data) => {
      setIsSubmitting(false);
      onGenerateComplete(data.images);
      queryClient.invalidateQueries({ queryKey: ["/api/images"] });
      toast({
        title: "Images generated successfully",
        description: `Generated ${data.images.length} images`,
      });
    },
    onError: (error) => {
      setIsSubmitting(false);
      onError(error.message || "Failed to generate images");
      toast({
        title: "Failed to generate images",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  // Prompt enhancement function
  const enhancePromptMutation = useMutation({
    mutationFn: async () => {
      const currentPrompt = form.getValues("prompt");
      
      if (currentPrompt.length < 3) {
        throw new Error("Prompt must be at least 3 characters long");
      }
      
      const response = await apiRequest("/api/enhance-prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: currentPrompt,
          model: modelKey,
        }),
      });
      
      return response;
    },
    onSuccess: (data) => {
      // Update the form with the enhanced prompt
      form.setValue("prompt" as keyof GenericFormValues, data.prompt);
      
      // If negative prompt exists and is applicable to this model
      if (data.negativePrompt && 
          // Type assertion to make TypeScript happy with the string literal type
          modelCatalog[modelKey].visible.includes("negative_prompt" as any)) {
        form.setValue("negative_prompt" as keyof GenericFormValues, data.negativePrompt);
      }
      
      setEnhancing(false);
      toast({
        title: "Prompt enhanced!",
        description: "Your prompt has been rewritten for optimal results",
      });
    },
    onError: (error) => {
      setEnhancing(false);
      toast({
        title: "Couldn't enhance prompt",
        description: "API error: " + (error.message || "Unknown error"),
        variant: "destructive",
      });
    }
  });
  
  const enhancePrompt = () => {
    if (isEnhancing) return;
    setEnhancing(true);
    enhancePromptMutation.mutate();
  };
  
  // Set up keyboard shortcut
  useHotkeys("ctrl+space", (event) => {
    event.preventDefault();
    enhancePrompt();
  });

  // Source images handling (for nano banana)
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    const files = Array.from(e.target.files);
    const currentCount = selectedFiles.length;
    const remainingSlots = 10 - currentCount;
    
    if (files.length > remainingSlots) {
      toast({
        title: "Too many files",
        description: `You can only add ${remainingSlots} more image(s). Maximum is 10.`,
        variant: "destructive",
      });
      return;
    }
    
    const validFiles: File[] = [];
    const newPreviews: Record<string, string> = { ...previews };
    
    for (const file of files) {
      // Validate file size (max 25MB)
      if (file.size > 25 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} is too large. Maximum size is 25MB.`,
          variant: "destructive",
        });
        continue;
      }
      
      // Validate file type
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a valid image. Please upload PNG, JPEG, or WebP images.`,
          variant: "destructive",
        });
        continue;
      }
      
      validFiles.push(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          newPreviews[file.name] = e.target.result as string;
          setPreviews(newPreviews);
        }
      };
      reader.readAsDataURL(file);
    }
    
    setSelectedFiles(prev => [...prev, ...validFiles]);
    
    // Reset input
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const removeFile = (filename: string) => {
    setSelectedFiles(prev => prev.filter(file => file.name !== filename));
    setPreviews(prev => {
      const newPreviews = { ...prev };
      delete newPreviews[filename];
      return newPreviews;
    });
  };
  
  const onSubmit = async (values: GenericFormValues) => {
    setIsSubmitting(true);
    setProgress(0);
    onGenerateStart();
    generateMutation.mutate(values);
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
              Generating images...
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
            {/* Enhanced AI Model selector */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">AI Model</Label>
              <AIModelSelector value={modelKey} onChange={setModelKey} className="mt-2" />
            </div>

            {/* Prompt field */}
            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-sm font-medium">Image Description</FormLabel>
                  <FormControl>
                    <div>
                      <Textarea
                        placeholder="Describe what you want to see. Be specific about details, style, and composition."
                        className="resize-none min-h-[120px] text-sm"
                        {...field}
                      />
                      <div className="flex justify-end mt-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 bg-gradient-to-r from-violet-50 to-indigo-50 border-purple-200 ring-1 ring-inset ring-purple-100/70 hover:ring-purple-300 shadow-sm hover:shadow text-sm px-3 text-purple-800"
                          title="Enhance Prompt (Ctrl+Space)"
                          onClick={enhancePrompt}
                          disabled={isEnhancing || field.value?.length < 3}
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
                  
                  {/* Prompt Suggestions Dropdowns - only show when prompt has 3+ characters */}
                  {field.value && field.value.length >= 3 && (
                    <PromptSuggestionsSection 
                      prompt={field.value} 
                      modelKey={modelKey} 
                      onSuggestionSelect={(suggestion) => {
                        // Append the suggestion to the current prompt
                        const currentPrompt = form.getValues("prompt");
                        form.setValue("prompt" as keyof GenericFormValues, 
                          currentPrompt + (currentPrompt.endsWith(",") || currentPrompt.endsWith(" ") ? " " : ", ") + suggestion
                        );
                      }} 
                    />
                  )}
                </FormItem>
              )}
            />

            {/* Source Images (for nano banana only) */}
            {modelKey === "google/nano-banana" && (
              <div className="border border-dashed border-border rounded-lg p-5">
                <h3 className="text-sm font-medium mb-3">Source Images (Optional)</h3>
                
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
                  Upload 1-10 PNG, JPEG, or WebP images (max 25MB each) to use as reference
                </div>
              </div>
            )}

            {/* Dynamic form fields based on the selected model */}
            <div className="p-4 bg-muted/40 rounded-lg border border-border/50">
              <h2 className="text-lg font-semibold text-foreground mb-1">Image Settings</h2>
              <p className="text-xs text-muted-foreground mb-4">
                Configure your image generation options
              </p>
              <DynamicForm modelKey={modelKey} form={form} />
            </div>

            <div className="flex justify-center pt-2">
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full sm:w-auto sm:px-8 py-2.5 h-auto font-medium text-sm"
                size="lg"
              >
                <span>Generate Images</span>
                <FaMagic className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
