import { useState } from "react";
import { FaCopy, FaDownload, FaTrash, FaEdit, FaExpand } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { GeneratedImage } from "@/types/image";
import ImageModal from "./ImageModal";
import { useLocation, useRoute } from "wouter";

interface ImageGalleryProps {
  images: GeneratedImage[];
  onClearResults: () => void;
}

export default function ImageGallery({ images, onClearResults }: ImageGalleryProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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
    navigate("/edit", { state: { sourceImage: image.url } });
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
            className="bg-white rounded-lg overflow-hidden shadow-md border border-gray-100"
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
                  onClick={() => setSelectedImage(image.url)}
                  className="w-8 h-8 rounded-full bg-white shadow-md hover:bg-gray-100"
                  title="View full size"
                >
                  <FaExpand className="w-3 h-3" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigate("/edit", { state: { sourceImage: image.url } })}
                  className="w-8 h-8 rounded-full bg-white shadow-md hover:bg-gray-100"
                  title="Edit this image"
                >
                  <FaEdit className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <div className="p-4">
              <p className="text-sm text-accent mb-2 line-clamp-2">
                {image.prompt}
              </p>
              <div className="flex justify-between items-center mb-2">
                <div className="flex flex-col">
                  <span className="text-xs text-accent">{image.size}</span>
                  <span className="text-xs text-accent mt-1">Model: {image.model}</span>
                  {image.sourceThumb && (
                    <div className="mt-2 flex items-center">
                      <span className="text-xs text-accent mr-2">Source:</span>
                      <img 
                        src={image.sourceThumb} 
                        alt="Source" 
                        className="w-8 h-8 rounded object-cover border border-gray-200" 
                        title="Reference image used for editing"
                      />
                    </div>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDownload(image)}
                    className="text-accent hover:text-primary transition-colors p-2 rounded-md hover:bg-gray-100"
                    title="Download image"
                  >
                    <FaDownload />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopyPrompt(image.prompt)}
                    className="text-accent hover:text-primary transition-colors p-2 rounded-md hover:bg-gray-100"
                    title="Copy prompt"
                  >
                    <FaCopy />
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
