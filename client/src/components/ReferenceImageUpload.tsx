import { useState, useRef, ChangeEvent } from "react";
import { FaUpload, FaTrash } from "react-icons/fa";
import { Loader2 } from "lucide-react";

interface ReferenceImageUploadProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  className?: string;
}

export default function ReferenceImageUpload({ value, onChange, className }: ReferenceImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(value || null);
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    
    // Validate file size (max 25MB)
    if (file.size > 25 * 1024 * 1024) {
      alert("File size must be less than 25MB");
      return;
    }
    
    // Validate file type
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      alert("Please upload a PNG, JPEG, or WebP image");
      return;
    }

    // Set upload loading state
    setUploading(true);

    try {
      // Create efficient preview using createObjectURL (no Base64 conversion)
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);

      // Upload directly to server using FormData (eliminates Base64 bottleneck)
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/video/upload-image', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload image');
      }

      const { imageUrl } = await response.json();
      
      // Call onChange with the uploaded image URL instead of Base64
      onChange(imageUrl);
      
    } catch (error: any) {
      console.error('Error uploading image:', error);
      alert(error.message || 'Failed to upload image. Please try again.');
      
      // Clear preview on error
      setPreview(null);
      onChange(undefined);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    // Clean up object URL if it exists to prevent memory leaks
    if (preview && preview.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    onChange(undefined);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  return (
    <div className={`border border-dashed border-border rounded-lg p-4 ${className}`}>
      <h4 className="text-sm font-medium mb-3">Reference Image</h4>
      
      <div className="flex items-center gap-3">
        {preview ? (
          <div className="relative w-20 h-20 group">
            <img 
              src={preview} 
              alt="Reference image preview" 
              className="w-full h-full object-cover rounded-md border"
            />
            <button
              type="button"
              onClick={removeImage}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
            >
              <FaTrash size={10} />
            </button>
          </div>
        ) : null}
        
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          disabled={uploading}
          className="w-20 h-20 flex items-center justify-center border border-dashed border-border rounded-md hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          ) : (
            <FaUpload className="text-muted-foreground" />
          )}
        </button>
      </div>
      
      <input
        type="file"
        ref={imageInputRef}
        onChange={handleFileChange}
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
      />
      
      <div className="text-xs text-muted-foreground mt-2">
        Upload a PNG, JPEG, or WebP image (max 25MB) to use as reference for image-to-image generation
      </div>
    </div>
  );
}