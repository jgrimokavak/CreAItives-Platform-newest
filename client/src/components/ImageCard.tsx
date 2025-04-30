import { useState } from "react";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  DownloadIcon, 
  PenToolIcon, 
  StarIcon, 
  Trash2Icon,
  RotateCcwIcon,
  CopyIcon
} from "lucide-react";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { GeneratedImage } from "@/types/image";

interface ImageCardProps {
  image: GeneratedImage;
  mode: "preview" | "gallery" | "trash";
  onEdit?: (img: GeneratedImage) => void;
  onDownload?: (img: GeneratedImage) => void;
  onDelete?: (id: string, permanent?: boolean) => void;
  onStar?: (id: string, status: boolean) => void;
  onRestore?: (id: string) => void;
  onSelect?: (id: string, selected: boolean) => void;
  onCopyPrompt?: (prompt: string) => void;  // Add handler for copying the prompt
  onClick?: () => void;  // Add onClick handler for full-size preview
  selected?: boolean;
}

export default function ImageCard({ 
  image, 
  mode, 
  onEdit, 
  onDownload, 
  onDelete, 
  onStar, 
  onRestore, 
  onSelect,
  onCopyPrompt,
  onClick,
  selected
}: ImageCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      key={image.id}
      className="bg-card rounded-lg overflow-hidden shadow-sm border border-border hover:shadow-md transition-shadow group cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <div className="relative pb-[100%]">
        {/* Image thumbnail */}
        <img 
          src={image.thumbUrl || image.url} 
          alt={image.prompt}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        
        {/* Selection overlay */}
        {onSelect && (
          <div className="absolute top-2 left-2 z-10">
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => onSelect(image.id, e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
          </div>
        )}
        
        {/* Actions overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm shadow-sm hover:bg-background/95 border border-border"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.(image);
                  }}
                >
                  <PenToolIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm shadow-sm hover:bg-background/95 border border-border"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload?.(image);
                  }}
                >
                  <DownloadIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {mode === 'gallery' && onStar && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className={cn(
                      "h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm shadow-sm hover:bg-background/95 border border-border",
                      image.starred && "text-yellow-300 hover:text-yellow-300"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStar(image.id, !image.starred);
                    }}
                  >
                    <StarIcon className={cn(
                      "h-4 w-4",
                      image.starred && "fill-current"
                    )} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{image.starred ? "Unstar" : "Star"}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {mode === 'gallery' && onDelete && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm shadow-sm hover:bg-background/95 border border-border hover:text-red-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(image.id, false);
                    }}
                  >
                    <Trash2Icon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {mode === 'trash' && onRestore && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm shadow-sm hover:bg-background/95 border border-border"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRestore(image.id);
                    }}
                  >
                    <RotateCcwIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Restore</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {onCopyPrompt && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm shadow-sm hover:bg-background/95 border border-border"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCopyPrompt(image.prompt);
                    }}
                  >
                    <CopyIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy Prompt</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        
        {/* Starred indicator */}
        {image.starred && mode === 'gallery' && (
          <div className="absolute top-2 right-2 text-yellow-300">
            <StarIcon className="h-5 w-5 fill-current" />
          </div>
        )}
      </div>
      
      <CardContent className="p-3 space-y-2">
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
        </div>
      </CardContent>
    </div>
  );
}