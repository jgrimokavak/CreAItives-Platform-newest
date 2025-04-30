import { useState } from "react";
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
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { GeneratedImage } from "@/types/image";
import { Progress } from "@/components/ui/progress";

const promptSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(32000),
  model: z.enum(["gpt-image-1", "dall-e-3", "dall-e-2"]),
  size: z.enum(["auto", "1024x1024", "1536x1024", "1024x1536", "1792x1024", "1024x1792"]),
  quality: z.enum(["auto", "standard", "hd", "high", "medium", "low"]),
  style: z.enum(["vivid", "natural"]).optional(),
  count: z.enum(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]),
  background: z.enum(["auto", "transparent", "opaque"]).optional(),
});

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

  const form = useForm<PromptFormValues>({
    resolver: zodResolver(promptSchema),
    defaultValues: {
      prompt: "",
      model: "gpt-image-1",
      size: "1024x1024",
      quality: "high",
      style: "vivid",
      count: "1",
      background: "auto",
    },
  });
  
  // Watch for model changes to show appropriate options
  const selectedModel = form.watch("model");

  const generateMutation = useMutation<{images: GeneratedImage[]}, Error, PromptFormValues>({
    mutationFn: async (values: PromptFormValues) => {
      // Reset progress
      setProgress(0);
      
      // Step 1: Submit the request to the server to create a new job
      const response = await apiRequest(
        "POST",
        "/api/generate",
        values
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
            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Reset quality to appropriate default for model
                      if (value === "gpt-image-1") {
                        form.setValue("quality", "auto");
                      } else if (value === "dall-e-3") {
                        form.setValue("quality", "standard");  
                      } else {
                        form.setValue("quality", "standard");
                      }
                      
                      // Reset count to 1 for DALL-E 3
                      if (value === "dall-e-3") {
                        form.setValue("count", "1");
                      }
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="gpt-image-1">GPT-Image-1 (Latest & Recommended)</SelectItem>
                      <SelectItem value="dall-e-3">DALL-E 3 (High Quality)</SelectItem>
                      <SelectItem value="dall-e-2">DALL-E 2 (Faster)</SelectItem>
                    </SelectContent>
                    <div className="mt-2">
                      {selectedModel === "gpt-image-1" && (
                        <p className="text-xs text-slate-600">
                          OpenAI's latest image model. Excellent for realistic images with fine details.
                        </p>
                      )}
                      {selectedModel === "dall-e-3" && (
                        <p className="text-xs text-slate-600">
                          High-quality image generation with strong creative interpretation.
                        </p>
                      )}
                      {selectedModel === "dall-e-2" && (
                        <p className="text-xs text-slate-600">
                          Faster image generation, but less detailed than newer models.
                        </p>
                      )}
                    </div>
                  </Select>
                </FormItem>
              )}
            />

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
                      {selectedModel === "gpt-image-1" && (
                        <>
                          <SelectItem value="auto">Auto</SelectItem>
                          <SelectItem value="1024x1024">1024 × 1024</SelectItem>
                          <SelectItem value="1536x1024">1536 × 1024 (Landscape)</SelectItem>
                          <SelectItem value="1024x1536">1024 × 1536 (Portrait)</SelectItem>
                        </>
                      )}
                      {selectedModel === "dall-e-3" && (
                        <>
                          <SelectItem value="1024x1024">1024 × 1024</SelectItem>
                          <SelectItem value="1792x1024">1792 × 1024 (Landscape)</SelectItem>
                          <SelectItem value="1024x1792">1024 × 1792 (Portrait)</SelectItem>
                        </>
                      )}
                      {selectedModel === "dall-e-2" && (
                        <>
                          <SelectItem value="1024x1024">1024 × 1024</SelectItem>
                          <SelectItem value="512x512">512 × 512</SelectItem>
                          <SelectItem value="256x256">256 × 256</SelectItem>
                        </>
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
                      {selectedModel === "gpt-image-1" && (
                        <>
                          <SelectItem value="auto">Auto</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </>
                      )}
                      {selectedModel === "dall-e-3" && (
                        <>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="hd">HD</SelectItem>
                        </>
                      )}
                      {selectedModel === "dall-e-2" && (
                        <SelectItem value="standard">Standard</SelectItem>
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
                      // Reset to 1 if switching to DALL-E 3 as it only supports 1 image
                      if (selectedModel === "dall-e-3" && value !== "1") {
                        field.onChange("1");
                      } else {
                        field.onChange(value);
                      }
                    }}
                    defaultValue={field.value}
                    disabled={selectedModel === "dall-e-3"}
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
                  {selectedModel === "dall-e-3" && (
                    <p className="text-xs text-amber-600 mt-1">DALL-E 3 only supports generating 1 image at a time</p>
                  )}
                </FormItem>
              )}
            />
          </div>

          {/* Add style option for DALL-E 3 */}
          {selectedModel === "dall-e-3" && (
            <div className="mb-4">
              <FormField
                control={form.control}
                name="style"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Style</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value || "vivid"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select style" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="vivid">Vivid</SelectItem>
                        <SelectItem value="natural">Natural</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500 mt-1">Vivid creates hyper-real and dramatic images. Natural produces more realistic images.</p>
                  </FormItem>
                )}
              />
            </div>
          )}
          
          {/* Add background option for GPT-Image-1 */}
          {selectedModel === "gpt-image-1" && (
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
