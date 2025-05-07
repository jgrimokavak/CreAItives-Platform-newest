import { useState, useRef, ChangeEvent, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FaMagic, FaUpload, FaTrash } from "react-icons/fa";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { GeneratedImage } from "@/types/image";
import { editImageSchema } from "@shared/schema";
import { useEditor } from "@/context/EditorContext";
import { Progress } from "@/components/ui/progress";

type EditFormValues = {
  prompt: string;
  size: string;
  quality: string;
  n: number;
};

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
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const maskInputRef = useRef<HTMLInputElement>(null);
  const { sourceImages, setSourceImages } = useEditor();

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

  const form = useForm<EditFormValues>({
    resolver: zodResolver(
      z.object({
        prompt: z.string().min(1, "Prompt is required").max(32000),
        size: z.enum(["auto", "1024x1024", "1536x1024", "1024x1536"]),
        quality: z.enum(["auto", "high", "medium", "low"]),
        n: z.coerce.number().int().min(1).max(10),
      })
    ),
    defaultValues: {
      prompt: "",
      size: "1024x1024",
      quality: "high",
      n: 1,
    },
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

  const editMutation = useMutation<{images: GeneratedImage[]}, Error, EditFormValues>({
    mutationFn: async (values: EditFormValues) => {
      if (selectedFiles.length === 0) {
        throw new Error("Please select at least one image");
      }
      
      // Create FormData object for multipart/form-data upload
      const formData = new FormData();
      formData.append("prompt", values.prompt);
      formData.append("size", values.size);
      formData.append("quality", values.quality);
      formData.append("n", values.n.toString());
      
      // Append all selected images
      selectedFiles.forEach(file => {
        formData.append("image", file);
      });
      
      // Append mask if selected
      if (selectedMask) {
        formData.append("mask", selectedMask);
      }
      
      // Reset progress
      setProgress(0);
      
      // Use fetch directly for FormData to submit the job
      const response = await fetch("/api/edit-image", {
        method: "POST",
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to start image edit job");
      }
      
      // Get the job ID from the response
      const { jobId } = await response.json();
      
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

  const onSubmit = async (values: EditFormValues) => {
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
            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-sm font-medium">Edit Instructions</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what changes you want to make to the image"
                      className="resize-none min-h-[80px] text-sm"
                      {...field}
                    />
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
            
            <div className="grid grid-cols-1 gap-5 bg-muted/40 p-4 rounded-lg border border-border/50">
              <FormField
                control={form.control}
                name="size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Output Size</FormLabel>
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
                        <SelectItem value="auto">Auto</SelectItem>
                        <SelectItem value="1024x1024">1024 × 1024</SelectItem>
                        <SelectItem value="1536x1024">Landscape</SelectItem>
                        <SelectItem value="1024x1536">Portrait</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Quality</FormLabel>
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
                        <SelectItem value="auto">Auto</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="n"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Number of Outputs</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Count" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[1, 2, 3, 4].map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} {num === 1 ? 'Image' : 'Images'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
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