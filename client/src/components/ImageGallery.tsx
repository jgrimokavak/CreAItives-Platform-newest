import { useState } from "react";
import { FaCopy, FaTrash, FaRegTimesCircle } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { GeneratedImage } from "@/types/image";
import ImageModal from "./ImageModal";
import { useLocation } from "wouter";
import { useEditor } from "@/context/EditorContext";
import ImageCard from "./ImageCard";

interface ImageGalleryProps {
  images: GeneratedImage[];
  onClearResults: () => void;
}

export default function ImageGallery({ images, onClearResults }: ImageGalleryProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { setMode, setSourceImages } = useEditor();

  if (images.length === 0) {
    return null;
  }

  const handleDownload = async (image: GeneratedImage) => {
    try {
      let url;
      
      // If the URL is a data URL (base64), use it directly
      if (image.url.startsWith('data:')) {
        url = image.url;
      } else {
        // Otherwise, fetch the image from the URL
        const response = await fetch(image.url);
        const blob = await response.blob();
        url = window.URL.createObjectURL(blob);
      }
      
      // Create a download link
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      
      // Create a clean filename from the prompt
      const cleanPrompt = image.prompt
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')    // Remove non-word chars
        .replace(/\s+/g, '_')         // Replace spaces with underscores
        .replace(/_+/g, '_')          // Replace multiple underscores with single ones
        .substring(0, 50);            // Limit length
      
      // Make sure we have a valid filename
      const filename = cleanPrompt || 'image';
      a.download = `${filename}.png`;
      
      document.body.appendChild(a);
      a.click();
      
      // Clean up the URL only if it was created from a blob
      if (!image.url.startsWith('data:')) {
        window.URL.revokeObjectURL(url);
      }
      
      toast({
        title: "Image downloaded",
        description: "Image has been downloaded successfully",
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download failed",
        description: "Failed to download the image",
        variant: "destructive",
      });
    }
  };

  const handleCopyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast({
      title: "Prompt copied",
      description: "Prompt has been copied to clipboard",
    });
  };

  const handleSendToEditor = (image: GeneratedImage) => {
    setSourceImages([image.url]);
    setMode("edit");
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast({
      title: "Image ready for editing",
      description: "Use the edit form to modify this image",
    });
  };
  
  // Handle upscale
  const handleUpscale = (image: GeneratedImage) => {
    // Navigate to upscale page with the image URL as a query parameter
    // Use the fullUrl if available, otherwise fallback to url
    const imageUrl = image.fullUrl || image.url;
    navigate(`/upscale?sourceUrl=${encodeURIComponent(imageUrl)}`);
  };

  return (
    <div className="h-full">
      {/* Image Modal for fullscreen viewing */}
      <ImageModal 
        imageUrl={selectedImage} 
        onClose={() => setSelectedImage(null)} 
      />
      
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Generated Results</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearResults}
          className="text-muted-foreground hover:text-foreground transition-colors text-xs flex items-center"
        >
          <FaRegTimesCircle className="mr-1.5 h-3.5 w-3.5" />
          <span>Clear</span>
        </Button>
      </div>

      <div className="h-[calc(100%-2.5rem)] overflow-y-auto pr-1 space-y-4">
        <div className="grid grid-cols-1 gap-4">
          {images.map((image) => (
            <div key={image.id} className="relative">
              <ImageCard
                image={image}
                mode="preview"
                onEdit={handleSendToEditor}
                onDownload={handleDownload}
                onCopyPrompt={handleCopyPrompt}
                onUpscale={handleUpscale}
                onClick={() => setSelectedImage(image.url)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
