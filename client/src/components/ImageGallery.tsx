import { FaCopy, FaDownload, FaTrash } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { GeneratedImage } from "@/types/image";

interface ImageGalleryProps {
  images: GeneratedImage[];
  onClearResults: () => void;
}

export default function ImageGallery({ images, onClearResults }: ImageGalleryProps) {
  const { toast } = useToast();

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

  return (
    <section className="mb-12">
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
                className="absolute inset-0 w-full h-full object-cover"
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
            </div>
            <div className="p-4">
              <p className="text-sm text-accent mb-2 line-clamp-2">
                {image.prompt}
              </p>
              <div className="flex justify-between items-center mb-2">
                <div className="flex flex-col">
                  <span className="text-xs text-accent">{image.size}</span>
                  <span className="text-xs text-accent mt-1">Model: {image.model}</span>
                  {image.url && (
                    <span className="text-xs text-emerald-600 mt-1 break-all line-clamp-1" title={image.url}>
                      URL: {image.url.substring(0, 20)}...
                    </span>
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
