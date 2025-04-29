import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { uploadImageSchema } from '@/../../shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { FaUpload, FaImage, FaTimes } from 'react-icons/fa';
import { useToast } from '@/hooks/use-toast';
import { GeneratedImage } from '@/types/image';
import LoadingState from './LoadingState';
import { Badge } from '@/components/ui/badge';

// File upload validation schema
const fileUploadSchema = z.object({
  prompt: z.string().optional(),
  model: z.enum(["gpt-image-1", "dall-e-3", "dall-e-2"]).default("gpt-image-1"),
  size: z.enum(["auto", "1024x1024", "1536x1024", "1024x1536", "1792x1024", "1024x1792"]).default("1024x1024"),
  count: z.enum(["1", "2", "3", "4"]).default("1"),
  quality: z.enum(["auto", "standard", "hd", "high", "medium", "low"]).default("auto"),
});

type FileUploadValues = z.infer<typeof fileUploadSchema>;

interface ImageUploaderProps {
  onUploadStart: () => void;
  onUploadComplete: (images: GeneratedImage[]) => void;
  onError: (message: string) => void;
}

export default function ImageUploader({ 
  onUploadStart,
  onUploadComplete,
  onError
}: ImageUploaderProps) {
  // Store array of files and their previews
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<FileUploadValues>({
    resolver: zodResolver(fileUploadSchema),
    defaultValues: {
      prompt: '',
      model: 'gpt-image-1',
      size: '1024x1024',
      count: '1',
      quality: 'auto'
    }
  });
  
  const selectedModel = form.watch('model');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Check if trying to add more than 16 images for GPT-Image-1 or more than 1 for DALL-E-2/3
    const model = form.getValues('model');
    const maxFiles = model === 'gpt-image-1' ? 16 : 1;
    
    if (selectedFiles.length >= maxFiles) {
      toast({
        title: "Too many images",
        description: model === 'gpt-image-1' ? 
          "Maximum 16 images allowed for GPT-Image-1" : 
          "Only 1 image allowed for DALL-E models",
        variant: "destructive"
      });
      return;
    }
    
    if (acceptedFiles && acceptedFiles.length > 0) {
      // Filter files that can be added without exceeding the limit
      const filesToAdd = acceptedFiles.slice(0, maxFiles - selectedFiles.length);
      
      // Process each file
      filesToAdd.forEach(file => {
        if (!file.type.startsWith('image/')) {
          toast({
            title: "Invalid file type",
            description: "Please upload an image file (JPEG, PNG, WebP)",
            variant: "destructive"
          });
          return;
        }
        
        // No size limit anymore, but still notify user about very large files
        if (file.size > 20 * 1024 * 1024) {
          toast({
            title: "Large file detected",
            description: "Very large images (>20MB) may take longer to process",
            variant: "default"
          });
        }
        
        // Create a preview URL
        const reader = new FileReader();
        reader.onload = () => {
          setFilePreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
      
      // Add files to state
      setSelectedFiles(prev => [...prev, ...filesToAdd]);
    }
  }, [form, selectedFiles.length, toast]);
  
  // Update maxFiles based on model selection
  React.useEffect(() => {
    const maxFiles = selectedModel === 'gpt-image-1' ? 16 : 1;
    
    // If model changed and we have too many files, keep only the allowed number
    if (selectedFiles.length > maxFiles) {
      setSelectedFiles(selectedFiles.slice(0, maxFiles));
      setFilePreviews(filePreviews.slice(0, maxFiles));
      
      toast({
        title: "Files removed",
        description: `Only ${maxFiles} ${maxFiles === 1 ? 'image' : 'images'} allowed for ${selectedModel}`,
        variant: "default"
      });
    }
  }, [selectedModel, selectedFiles, filePreviews, toast]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'image/webp': []
    },
    // Allow multiple files for gpt-image-1, just one for others
    multiple: selectedModel === 'gpt-image-1',
    maxFiles: selectedModel === 'gpt-image-1' ? 16 : 1
  });
  
  const handleSubmit = async (values: FileUploadValues) => {
    if (selectedFiles.length === 0 || filePreviews.length === 0) {
      toast({
        title: "No images selected",
        description: "Please upload at least one image",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsUploading(true);
      onUploadStart();
      
      // Extract the base64 data from the data URLs
      const base64Images = filePreviews.map(preview => preview.split(',')[1]);
      
      // Create the upload payload
      const uploadData = {
        images: base64Images,
        prompt: values.prompt || undefined,
        model: values.model,
        size: values.size,
        count: values.count,
        quality: values.quality
      };
      
      console.log(`Uploading ${base64Images.length} images with model ${values.model}`);
      
      // Send the request
      const response = await apiRequest<{ images: GeneratedImage[] }>('/api/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(uploadData)
      });
      
      if (response && response.images) {
        onUploadComplete(response.images);
        // Clear the selected files after successful upload
        clearSelectedFiles();
      } else {
        throw new Error('No images received from API');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      onError(error.message || 'Failed to process the images');
    } finally {
      setIsUploading(false);
    }
  };
  
  const clearSelectedFiles = () => {
    setSelectedFiles([]);
    setFilePreviews([]);
  };
  
  const removeImage = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setFilePreviews(prev => prev.filter((_, i) => i !== index));
  };
  
  return (
    <div className="w-full max-w-3xl mx-auto">
      <Card className="p-6 shadow-md">
        <h2 className="text-2xl font-bold mb-4 text-center">Upload Your Image</h2>
        
        <div 
          {...getRootProps()} 
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors mb-6 ${
            isDragActive 
              ? 'border-primary bg-primary/5' 
              : filePreviews.length > 0 
                ? 'border-green-500 bg-green-50' 
                : 'border-gray-300 hover:border-primary'
          }`}
        >
          <input {...getInputProps()} />
          
          {filePreviews.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center mb-2">
                <Badge variant="outline" className="text-sm">
                  {selectedFiles.length} {selectedFiles.length === 1 ? 'image' : 'images'} selected
                </Badge>
                {selectedModel === 'gpt-image-1' && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {16 - selectedFiles.length} more allowed
                  </Badge>
                )}
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto p-2">
                {filePreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img 
                      src={preview} 
                      alt={`Preview ${index + 1}`} 
                      className="h-24 w-full object-cover rounded border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(index);
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 
                                shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <FaTimes size={12} />
                    </button>
                  </div>
                ))}
                {selectedModel === 'gpt-image-1' && selectedFiles.length < 16 && (
                  <div 
                    className="h-24 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 cursor-pointer hover:border-primary hover:text-primary transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FaImage className="w-8 h-8" />
                  </div>
                )}
              </div>
              
              <div className="flex justify-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearSelectedFiles();
                  }}
                >
                  Clear All
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <FaImage className="w-16 h-16 mx-auto text-gray-400" />
              <div>
                <p className="font-medium">
                  {isDragActive 
                    ? "Drop your image here..." 
                    : `Drag & drop your ${selectedModel === 'gpt-image-1' ? 'images' : 'image'} here or click to browse`}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Supported formats: JPEG, PNG, WebP
                </p>
                {selectedModel === 'gpt-image-1' ? (
                  <p className="text-xs text-primary mt-1">
                    Upload up to 16 images for GPT-Image-1
                  </p>
                ) : (
                  <p className="text-xs text-amber-600 mt-1">
                    Only 1 image allowed for {selectedModel}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Optional Prompt</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Describe how to modify the image (optional)"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <div className="grid gap-4 md:grid-cols-2">
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
                        <SelectItem value="gpt-image-1">GPT-Image-1 (Best)</SelectItem>
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
                    <FormLabel>Output Size</FormLabel>
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
                    <FormLabel>Number of Variations</FormLabel>
                    <Select
                      onValueChange={field.onChange}
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
                      </SelectContent>
                    </Select>
                    {selectedModel === "dall-e-3" && (
                      <p className="text-xs text-amber-600 mt-1">
                        DALL-E 3 only supports 1 image at a time
                      </p>
                    )}
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
            </div>
            
            <div className="pt-4 flex justify-center">
              <Button 
                type="submit" 
                disabled={isUploading || selectedFiles.length === 0}
                className="px-6 py-3"
              >
                {isUploading ? (
                  <LoadingState />
                ) : (
                  <>
                    <span>Process {selectedFiles.length === 1 ? 'Image' : 'Images'}</span>
                    <FaUpload className="ml-2" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
}