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
import { FaUpload, FaImage } from 'react-icons/fa';
import { useToast } from '@/hooks/use-toast';
import { GeneratedImage } from '@/types/image';
import LoadingState from './LoadingState';

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
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
    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file (JPEG, PNG, etc.)",
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
      
      setSelectedFile(file);
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onload = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [toast]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'image/webp': []
    },
    maxFiles: 1
  });
  
  const handleSubmit = async (values: FileUploadValues) => {
    if (!selectedFile || !filePreview) {
      toast({
        title: "No image selected",
        description: "Please upload an image first",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsUploading(true);
      onUploadStart();
      
      // Extract the base64 data from the data URL
      const base64Data = filePreview.split(',')[1];
      
      // Create the upload payload
      const uploadData = {
        image: base64Data,
        prompt: values.prompt || undefined,
        model: values.model,
        size: values.size,
        count: values.count,
        quality: values.quality
      };
      
      // Send the request
      const response = await apiRequest<{ images: GeneratedImage[] }>('/api/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(uploadData)
      });
      
      if (response && response.images) {
        onUploadComplete(response.images);
      } else {
        throw new Error('No images received');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      onError(error.message || 'Failed to process the image');
    } finally {
      setIsUploading(false);
    }
  };
  
  const clearSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
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
              : filePreview 
                ? 'border-green-500 bg-green-50' 
                : 'border-gray-300 hover:border-primary'
          }`}
        >
          <input {...getInputProps()} />
          
          {filePreview ? (
            <div className="space-y-4">
              <img 
                src={filePreview} 
                alt="Image preview" 
                className="max-h-64 mx-auto rounded-lg shadow-sm"
              />
              <div className="flex justify-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearSelectedFile();
                  }}
                >
                  Change Image
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
                    : "Drag & drop your image here or click to browse"}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Supported formats: JPEG, PNG, WebP
                </p>
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
                disabled={isUploading || !selectedFile}
                className="px-6 py-3"
              >
                {isUploading ? (
                  <LoadingState />
                ) : (
                  <>
                    <span>Process Image</span>
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