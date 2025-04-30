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

  const editMutation = useMutation({
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
      
      // Poll for job completion
      return new Promise((resolve, reject) => {
        // Create a progress indicator (0-100)
        let progress = 0;
        
        const pollInterval = setInterval(async () => {
          try {
            // Increment progress for UI feedback (up to 95%)
            if (progress < 95) {
              progress += 5;
              // You can update a progress bar here if you implement one
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
    onEditStart();
    editMutation.mutate(values);
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
                <FormLabel>Edit Prompt</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Add a red hat to the person"
                    className="resize-none min-h-[80px]"
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="border border-dashed border-slate-300 rounded-lg p-6">
            <h3 className="text-sm font-medium mb-4">Source Images (1-16 images)</h3>
            
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
                className="w-20 h-20 flex items-center justify-center border border-dashed border-slate-300 rounded-md hover:bg-slate-50"
              >
                <FaUpload className="text-slate-400" />
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
            
            <div className="text-xs text-slate-500">
              Select PNG, JPEG, or WebP files (max 16 images, each ≤ 25MB)
            </div>
          </div>
          
          <div className="border border-dashed border-slate-300 rounded-lg p-6">
            <h3 className="text-sm font-medium mb-4">Mask Image (Optional)</h3>
            
            {maskPreview ? (
              <div className="relative w-full h-40 mb-4">
                <img 
                  src={maskPreview} 
                  alt="Mask" 
                  className="h-full mx-auto object-contain"
                />
                <button
                  type="button"
                  onClick={removeMask}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
                >
                  <FaTrash size={12} />
                </button>
              </div>
            ) : (
              <div 
                className="w-full h-40 flex items-center justify-center border border-dashed border-slate-300 rounded-md hover:bg-slate-50 mb-4 cursor-pointer"
                onClick={() => maskInputRef.current?.click()}
              >
                <div className="text-center">
                  <FaUpload className="mx-auto text-slate-400 mb-2" />
                  <div className="text-sm text-slate-500">Click to upload a mask</div>
                </div>
              </div>
            )}
            
            <input
              type="file"
              ref={maskInputRef}
              onChange={handleMaskChange}
              accept="image/png"
              className="hidden"
            />
            
            <div className="text-xs text-slate-500">
              Transparent areas in the mask (PNG) will be edited. If no mask is provided, the entire image will be editable.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="1024x1024">1024 × 1024</SelectItem>
                      <SelectItem value="1536x1024">1536 × 1024 (Landscape)</SelectItem>
                      <SelectItem value="1024x1536">1024 × 1536 (Portrait)</SelectItem>
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
                  <FormLabel>Number of Outputs</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    defaultValue={field.value.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select count" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
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

          <div className="flex justify-center">
            <Button 
              type="submit" 
              disabled={isSubmitting || selectedFiles.length === 0}
              className="px-6 py-3"
            >
              <span>Edit Images</span>
              <FaMagic className="ml-2" />
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}