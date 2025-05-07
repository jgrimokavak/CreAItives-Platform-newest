import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FaMagic } from "react-icons/fa";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { GeneratedImage } from "@/types/image";
import { Progress } from "@/components/ui/progress";
import { ModelKey, modelCatalog } from "@/lib/modelCatalog";
import { modelSchemas, modelDefaults, GenericFormValues } from "@/lib/formSchemas";
import ModelSelect from "@/components/ModelSelect";
import ModelInfoCard from "@/components/ModelInfoCard";
import DynamicForm from "@/components/DynamicForm";
import { Label } from "@/components/ui/label";

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
        if (visibleFields.includes(key) || key === "prompt") {
          filteredValues[key] = value;
        }
      });
      
      // Special case for "count" field which needs to be sent as "n"
      if (visibleFields.includes("n") && values.count) {
        filteredValues.n = parseInt(values.count);
      }
      
      // Step 1: Submit the request to the server to create a new job
      const response = await apiRequest(
        "POST",
        "/api/generate",
        filteredValues
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
            {/* Model selector at the top */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">AI Model</Label>
              <ModelSelect value={modelKey} onChange={setModelKey} />
              
              {/* Model info card with color coding based on provider */}
              <ModelInfoCard modelKey={modelKey} className="mt-3" />
            </div>

            {/* Prompt field */}
            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-sm font-medium">Image Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what you want to see. Be specific about details, style, and composition."
                      className="resize-none min-h-[100px] text-sm"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    For best results, include details about style, lighting, colors, and composition
                  </p>
                </FormItem>
              )}
            />

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
