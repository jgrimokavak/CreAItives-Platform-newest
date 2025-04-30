import { useState, useRef, ChangeEvent } from "react";
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
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const maskInputRef = useRef<HTMLInputElement>(null);

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
      quality: "auto",
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
      
      // Extract base64 data from previews
      const clean = (str: string) => str.replace(/^data:.*;base64,/, "");
      
      const body = {
        images: Object.values(previews).map(preview => clean(preview)),
        prompt: values.prompt,
        size: values.size,
        quality: values.quality,
        n: values.n,
        mask: maskPreview ? clean(maskPreview) : null
      };
      
      const response = await apiRequest(
        "POST",
        "/api/edit-image",
        body
      );
      return response.json();
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