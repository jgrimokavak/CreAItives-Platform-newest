import { useState } from "react";
import { FaCopy, FaTrash } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { GeneratedImage } from "@/types/image";
import ImageModal from "./ImageModal";
import { useLocation, useRoute } from "wouter";
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
      a.download = `image-${Date.now()}.png`;
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

  return (
    <section className="mb-12">
      {/* Image Modal for fullscreen viewing */}
      <ImageModal 
        imageUrl={selectedImage} 
        onClose={() => setSelectedImage(null)} 
      />
      
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Your Generated Images</h2>
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearResults}
            className="text-accent hover:text-foreground transition-colors text-sm flex items-center space-x-1"
          >
            <FaTrash className="mr-1" />
            <span>Clear all</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {images.map((image) => (
          <div key={image.id} className="relative">
            <ImageCard
              image={image}
              mode="preview"
              onEdit={handleSendToEditor}
              onDownload={handleDownload}
              // Add click handler to the image itself instead of an overlay
              onClick={() => setSelectedImage(image.url)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
