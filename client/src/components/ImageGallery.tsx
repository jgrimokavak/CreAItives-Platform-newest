import { useState } from "react";
import { FaCopy, FaDownload, FaTrash, FaEdit, FaExpand } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { GeneratedImage } from "@/types/image";
import ImageModal from "./ImageModal";
import { useLocation, useRoute } from "wouter";
import { useEditor } from "@/context/EditorContext";

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
          <div
            key={image.id}
            className="bg-card rounded-lg overflow-hidden shadow-sm border border-border hover:shadow-md transition-shadow"
          >
            <div className="relative pb-[100%]">
              <img
                src={image.url}
                alt={image.prompt}
                className="absolute inset-0 w-full h-full object-cover cursor-pointer"
                onClick={() => setSelectedImage(image.url)}
                onError={(e) => {
                  console.error("Image failed to load:", image.url);
                  const target = e.target as HTMLImageElement;
                  target.onerror = null; // Prevent infinite loops
                  target.alt = "Failed to load image";
                  target.style.background = "#f0f0f0";
                  target.style.display = "flex";
                  target.style.alignItems = "center";
                  target.style.justifyContent = "center";
                  target.style.padding = "20px";
                }}
              />
              <div className="absolute top-2 right-2 flex space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleSendToEditor(image)}
                  className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm shadow-sm hover:bg-background/95 border border-border"
                  title="Edit this image"
                >
                  <FaEdit className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <div className="p-3 space-y-2">
              <p className="text-sm font-medium line-clamp-2">{image.prompt}</p>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="bg-muted/50 rounded-full px-2 py-0.5">
                  {image.model}
                </span>
                <span className="bg-muted/50 rounded-full px-2 py-0.5">
                  {image.size}
                </span>
                <span className="bg-muted/50 rounded-full px-2 py-0.5">
                  {image.quality || 'standard'}
                </span>
                {image.sourceThumb && (
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-xs text-muted-foreground">Source:</span>
                    <img 
                      src={image.sourceThumb} 
                      alt="Source" 
                      className="w-6 h-6 rounded-sm object-cover border border-border" 
                      title="Reference image used for editing"
                    />
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-center pt-2">
                <div className="text-xs text-muted-foreground">
                  {new Date(image.createdAt).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDownload(image)}
                    className="h-8 w-8 rounded-full hover:bg-muted transition-colors"
                    title="Download image"
                  >
                    <FaDownload className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopyPrompt(image.prompt)}
                    className="h-8 w-8 rounded-full hover:bg-muted transition-colors"
                    title="Copy prompt"
                  >
                    <FaCopy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
