import { useState, useRef, ChangeEvent } from "react";
import { FaUpload, FaTrash } from "react-icons/fa";
import { X } from "lucide-react";

interface MultiImageUploadProps {
  value?: string[];
  onChange: (value: string[]) => void;
  maxFiles?: number;
  className?: string;
}

export default function MultiImageUpload({ 
  value = [], 
  onChange, 
  maxFiles = 10,
  className 
}: MultiImageUploadProps) {
  const [previews, setPreviews] = useState<string[]>(value || []);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const files = Array.from(e.target.files);
    const remainingSlots = maxFiles - previews.length;
    
    if (files.length > remainingSlots) {
      alert(`You can only add ${remainingSlots} more image(s). Maximum is ${maxFiles}.`);
      return;
    }
    
    const newPreviews: string[] = [];
    
    for (const file of files) {
      // Validate file size (max 25MB per file)
      if (file.size > 25 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is 25MB.`);
        continue;
      }
      
      // Validate file type
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        alert(`File ${file.name} is not a valid image. Please upload PNG, JPEG, or WebP images.`);
        continue;
      }

      // Create data URL
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            resolve(e.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      });
      
      newPreviews.push(dataUrl);
    }
    
    const updatedPreviews = [...previews, ...newPreviews].slice(0, maxFiles);
    setPreviews(updatedPreviews);
    onChange(updatedPreviews);
    
    // Reset input
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    const updatedPreviews = previews.filter((_, i) => i !== index);
    setPreviews(updatedPreviews);
    onChange(updatedPreviews);
  };

  const removeAllImages = () => {
    setPreviews([]);
    onChange([]);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  return (
    <div className={`border border-dashed border-border rounded-lg p-4 ${className}`}>
      {previews.length > 0 && (
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">
            {previews.length} of {maxFiles} images
          </span>
          <button
            type="button"
            onClick={removeAllImages}
            className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
          >
            <FaTrash size={10} />
            Remove all
          </button>
        </div>
      )}
      
      <div className="grid grid-cols-5 gap-2">
        {previews.map((preview, index) => (
          <div key={index} className="relative group">
            <img 
              src={preview} 
              alt={`Reference image ${index + 1}`} 
              className="w-full h-20 object-cover rounded-md border"
            />
            <button
              type="button"
              onClick={() => removeImage(index)}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        
        {previews.length < maxFiles && (
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="w-full h-20 flex flex-col items-center justify-center border border-dashed border-border rounded-md hover:bg-muted transition-colors"
          >
            <FaUpload className="text-muted-foreground mb-1" size={16} />
            <span className="text-xs text-muted-foreground">Add</span>
          </button>
        )}
      </div>
      
      <input
        type="file"
        ref={imageInputRef}
        onChange={handleFileChange}
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="hidden"
      />
      
      {previews.length === 0 && (
        <div className="text-xs text-muted-foreground mt-2">
          Upload up to {maxFiles} images (PNG, JPEG, or WebP, max 25MB each) as reference
        </div>
      )}
    </div>
  );
}