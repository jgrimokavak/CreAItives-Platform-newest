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

const promptSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(32000),
  model: z.enum(["gpt-image-1", "dall-e-3", "dall-e-2"]),
  size: z.enum(["auto", "1024x1024", "1536x1024", "1024x1536", "1792x1024", "1024x1792"]),
  quality: z.enum(["auto", "standard", "hd", "high", "medium", "low"]),
  style: z.enum(["vivid", "natural"]).optional(),
  count: z.enum(["1", "2", "3", "4", "5"]),
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

  const form = useForm<PromptFormValues>({
    resolver: zodResolver(promptSchema),
    defaultValues: {
      prompt: "",
      model: "gpt-image-1",
      size: "1024x1024",
      quality: "auto",
      style: "vivid",
      count: "1",
      background: "auto",
    },
  });
  
  // Watch for model changes to show appropriate options
  const selectedModel = form.watch("model");

  const generateMutation = useMutation({
    mutationFn: async (values: PromptFormValues) => {
      const response = await apiRequest(
        "POST",
        "/api/generate",
        values
      );
      return response.json();
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
    onGenerateStart();
    generateMutation.mutate(values);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-3xl mx-auto">
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
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="gpt-image-1">GPT Image Model (Newest)</SelectItem>
                      <SelectItem value="dall-e-3">DALL-E 3</SelectItem>
                      <SelectItem value="dall-e-2">DALL-E 2</SelectItem>
                    </SelectContent>
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
