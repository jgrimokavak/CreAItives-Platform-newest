import React from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GeneratedImage } from "@/types/image";
import { Download, Star, Trash } from "lucide-react";

interface ImageCardProps {
  image: GeneratedImage;
  mode?: "gallery" | "preview";
  onDownload?: (image: GeneratedImage) => void;
  onStar?: (image: GeneratedImage) => void;
  onDelete?: (image: GeneratedImage) => void;
}

const ImageCard: React.FC<ImageCardProps> = ({
  image,
  mode = "gallery",
  onDownload,
  onStar,
  onDelete,
}) => {
  // Choose which URL to display (full size for preview mode, thumbnail for gallery mode)
  const displayUrl = mode === "preview" 
    ? (image.fullUrl || image.url) 
    : (image.thumbUrl || image.url);
  
  // Format the creation date
  const formattedDate = new Date(image.createdAt).toLocaleString();
  
  // Create a short preview of the prompt
  const promptPreview = image.prompt.length > 70 
    ? `${image.prompt.substring(0, 70)}...` 
    : image.prompt;
  
  return (
    <Card className="overflow-hidden h-full flex flex-col">
      <div className="relative flex-grow overflow-hidden aspect-video">
        <img
          src={displayUrl}
          alt={promptPreview}
          className="object-cover w-full h-full"
          loading="lazy"
        />
      </div>
      
      {mode === "gallery" && (
        <CardContent className="p-3">
          <p className="text-sm text-muted-foreground mb-1">{formattedDate}</p>
          <p className="text-sm font-medium line-clamp-2" title={image.prompt}>
            {promptPreview}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Model: {image.model}
          </p>
        </CardContent>
      )}
      
      <CardFooter className="p-3 pt-1 flex justify-between">
        {onDownload && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDownload(image)}
            title="Download image"
          >
            <Download className="h-4 w-4" />
          </Button>
        )}
        
        {onStar && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onStar(image)}
            title={image.starred ? "Remove from favorites" : "Add to favorites"}
          >
            <Star
              className={`h-4 w-4 ${image.starred ? "fill-yellow-400 text-yellow-400" : ""}`}
            />
          </Button>
        )}
        
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(image)}
            title="Move to trash"
          >
            <Trash className="h-4 w-4" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default ImageCard;