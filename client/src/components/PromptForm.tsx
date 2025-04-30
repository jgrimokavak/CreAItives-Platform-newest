import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FaMagic } from "react-icons/fa";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { GeneratedImage } from "@/types/image";
import { Progress } from "@/components/ui/progress";
import { ModelKey } from "@shared/schema";

// Model interface for the API response
interface ModelInfo {
  key: string;
  provider: 'openai' | 'replicate';
  schema: any;
  visible: string[];
  defaults: Record<string, any>;
  description: string;
}

// Base schema with common fields
const basePromptSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(32000),
  count: z.enum(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]),
  // Optional fields for all model types
  size: z.enum(["auto", "1024x1024", "1536x1024", "1024x1536", "1792x1024", "1024x1792"]).optional(),
  quality: z.enum(["auto", "standard", "hd", "high", "medium", "low"]).optional(),
  style: z.enum(["vivid", "natural"]).optional(),
  background: z.enum(["auto", "transparent", "opaque"]).optional(),
  aspect_ratio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"]).optional(),
  seed: z.coerce.number().optional(),
});

// Initial schema with basic validation
const promptSchema = basePromptSchema;

type PromptFormValues = z.infer<typeof promptSchema>;

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
  const [progress, setProgress] = useState(0);

  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);

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

  const [modelKey, setModelKey] = useState<ModelKey>("gpt-image-1");

  const form = useForm<PromptFormValues>({
    resolver: zodResolver(promptSchema),
    defaultValues: {
      prompt: "",
      size: "1024x1024",
      quality: "high",
      style: "vivid",
      count: "1",
      background: "auto",
      aspect_ratio: "1:1",
    },
  });
  
  // Watch for model changes to show appropriate options
  const selectedModelInfo = availableModels.find(model => model.key === modelKey);

  const generateMutation = useMutation<{images: GeneratedImage[]}, Error, PromptFormValues>({
    mutationFn: async (values: PromptFormValues) => {
      // Reset progress
      setProgress(0);
      
      // Step 1: Submit the request to the server to create a new job
      const response = await apiRequest(
        "POST",
        "/api/generate",
        { 
          modelKey,
          prompt: values.prompt,
          size: values.size,
          quality: values.quality,
          n: parseInt(values.count),
          style: values.style,
          background: values.background,
          aspect_ratio: values.aspect_ratio,
          seed: values.seed
        }
      );
      
      const { jobId } = await response.json();
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
            const statusResponse = await apiRequest(
              "GET",
              `/api/job/${jobId}`,
              null
            );
            
            const job = await statusResponse.json();
            
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

  const onSubmit = async (values: PromptFormValues) => {
    setIsSubmitting(true);
    setProgress(0);
    onGenerateStart();
    // Send values with the modelKey
    generateMutation.mutate(values);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-3xl mx-auto">
      {isSubmitting && (
        <div className="mb-6">
          <div className="flex justify-between mb-2 text-sm">
            <span>Generating images...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="prompt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prompt</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="An astronaut riding a horse on Mars, digital art"
                    className="resize-none min-h-[80px]"
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="mb-4">
              <FormLabel>Model</FormLabel>
              <Select
                onValueChange={(val: ModelKey) => {
                  setModelKey(val);
                  // Reset quality to appropriate default for model
                  if (val === "gpt-image-1") {
                    form.setValue("quality", "auto");
                  } else {
                    form.setValue("quality", "standard");
                  }
                }}
                defaultValue={modelKey}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {loading ? (
                    <SelectItem value="gpt-image-1">Loading models...</SelectItem>
                  ) : (
                    availableModels.map(model => (
                      <SelectItem key={model.key} value={model.key}>
                        {model.key === "gpt-image-1" ? "GPT-Image-1 (Latest)" : 
                         model.key === "imagen-3" ? "Imagen-3 (Replicate)" :
                         model.key === "flux-pro" ? "Flux-Pro (Replicate)" :
                         model.key}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <div className="mt-2">
                {selectedModelInfo && (
                  <p className="text-xs text-slate-600">
                    {selectedModelInfo.description || 
                      (selectedModelInfo.provider === "openai" ? "OpenAI model" : "Replicate model")}
                  </p>
                )}
              </div>
            </div>

            <FormField
              control={form.control}
              name="size"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Size</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {modelKey === "gpt-image-1" && (
                        <>
                          <SelectItem value="auto">Auto</SelectItem>
                          <SelectItem value="1024x1024">1024 × 1024</SelectItem>
                          <SelectItem value="1536x1024">1536 × 1024 (Landscape)</SelectItem>
                          <SelectItem value="1024x1536">1024 × 1536 (Portrait)</SelectItem>
                        </>
                      )}
                      {/* Replicate models don't use 'size' but 'aspect_ratio' */}
                      {(modelKey === "imagen-3" || modelKey === "flux-pro") && (
                        <SelectItem value="auto" disabled>
                          Not applicable - use aspect ratio instead
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="quality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quality</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select quality" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {modelKey === "gpt-image-1" && (
                        <>
                          <SelectItem value="auto">Auto</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="count"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Images</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select count" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">1 Image</SelectItem>
                      <SelectItem value="2">2 Images</SelectItem>
                      <SelectItem value="3">3 Images</SelectItem>
                      <SelectItem value="4">4 Images</SelectItem>
                      <SelectItem value="5">5 Images</SelectItem>
                      <SelectItem value="6">6 Images</SelectItem>
                      <SelectItem value="7">7 Images</SelectItem>
                      <SelectItem value="8">8 Images</SelectItem>
                      <SelectItem value="9">9 Images</SelectItem>
                      <SelectItem value="10">10 Images</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>
          
          {/* Add background option for GPT-Image-1 */}
          {modelKey === "gpt-image-1" && (
            <div className="mb-4">
              <FormField
                control={form.control}
                name="background"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Background</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value || "auto"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select background" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="auto">Auto</SelectItem>
                        <SelectItem value="transparent">Transparent</SelectItem>
                        <SelectItem value="opaque">Opaque</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500 mt-1">Set transparency for the background. Auto lets the model decide.</p>
                  </FormItem>
                )}
              />
            </div>
          )}
          
          {/* Add Replicate-specific parameters */}
          {(modelKey === "imagen-3" || modelKey === "flux-pro") && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <FormField
                control={form.control}
                name="aspect_ratio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aspect Ratio</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value || "1:1"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select aspect ratio" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1:1">1:1 (Square)</SelectItem>
                        <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                        <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                        <SelectItem value="4:3">4:3 (Standard)</SelectItem>
                        <SelectItem value="3:4">3:4 (Portrait)</SelectItem>
                        {modelKey === "flux-pro" && (
                          <>
                            <SelectItem value="3:2">3:2 (Landscape)</SelectItem>
                            <SelectItem value="2:3">2:3 (Portrait)</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500 mt-1">Choose the output image dimensions ratio.</p>
                  </FormItem>
                )}
              />
              
              {/* Add seed parameter for Flux-Pro only */}
              {modelKey === "flux-pro" && (
                <FormField
                  control={form.control}
                  name="seed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seed</FormLabel>
                      <FormControl>
                        <input
                          type="number"
                          min="0"
                          max="2147483647"
                          placeholder="Random seed (optional)"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value ? parseInt(e.target.value) : undefined;
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <p className="text-xs text-slate-500 mt-1">Set for reproducible generation. Leave empty for random results.</p>
                    </FormItem>
                  )}
                />
              )}
            </div>
          )}

          <div className="flex justify-center">
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="px-6 py-3"
            >
              <span>Generate Images</span>
              <FaMagic className="ml-2" />
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
