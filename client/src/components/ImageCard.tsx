import { useState } from "react";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  DownloadIcon, 
  PenToolIcon, 
  StarIcon, 
  Trash2Icon,
  TrashIcon,
  RotateCcwIcon,
  CopyIcon,
  ImageIcon,
  ImageUpscale
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
  onSelect?: (id: string, shiftKey?: boolean) => void;
  onCopyPrompt?: (prompt: string) => void;  // Add handler for copying the prompt
  onUpscale?: (image: GeneratedImage) => void; // Handler for upscaling
  onClick?: (e?: React.MouseEvent) => void;  // Add onClick handler for full-size preview
  selected?: boolean;
  selectionMode?: 'none' | 'selecting';
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
  onUpscale,
  onClick,
  selected,
  selectionMode = 'none'
}: ImageCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      key={image.id}
      className={cn(
        "bg-card rounded-lg overflow-hidden shadow-sm border transition-all group cursor-pointer",
        selectionMode === 'selecting'
          ? selected 
            ? "border-primary shadow-md ring-2 ring-primary/20 ring-inset" 
            : "border-border hover:border-primary/30"
          : "border-border hover:shadow-lg hover:border-primary/20"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <div className="relative pb-[100%]">
        {/* Image thumbnail with better aspect ratio handling */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/5">
          <img 
            src={image.thumbUrl || image.url} 
            alt={image.prompt}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          
          {/* Selection highlight overlay */}
          {selectionMode === 'selecting' && selected && (
            <div className="absolute inset-0 bg-primary/10 border-4 border-primary/30 z-10"></div>
          )}
        </div>
        
        {/* Selection overlay */}
        {onSelect && (
          <div 
            className={cn(
              "absolute top-2 left-2 z-10 bg-white/80 backdrop-blur-sm rounded-full p-1 shadow-sm transition-all cursor-pointer",
              selected ? "bg-primary/20" : "hover:bg-white/95",
              selectionMode === 'selecting' ? "opacity-100 scale-100" : "opacity-75 scale-90 hover:opacity-100 hover:scale-100"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(image.id, e.shiftKey);
            }}
          >
            <div className="relative w-5 h-5 flex items-center justify-center">
              <input
                type="checkbox"
                checked={selected}
                onChange={(e) => {
                  e.stopPropagation();
                  // Cast to MouseEvent to access shiftKey
                  onSelect(image.id, (e.nativeEvent as MouseEvent).shiftKey);
                }}
                className={cn(
                  "h-4 w-4 rounded-sm border-2 cursor-pointer transition-colors",
                  selected ? "border-primary bg-primary text-white" : "border-gray-400"
                )}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}
        
        {/* Actions overlay - hide when in selection mode */}
        {selectionMode !== 'selecting' && (
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
                        e.preventDefault();
                        if (onStar) {
                          try {
                            // Use the current state for consistency
                            const isCurrentlyStarred = image.starred || false;
                            console.log(`Card star button clicked - id:${image.id}, currently starred:${isCurrentlyStarred}`);
                            onStar(image.id, isCurrentlyStarred);
                          } catch (error) {
                            console.error('Error in star button handler:', error);
                          }
                        }
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
              <>
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
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm shadow-sm hover:bg-background/95 border border-border hover:text-red-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Are you sure you want to permanently delete this image? This action cannot be undone.') && onDelete) {
                            onDelete(image.id, true);
                          }
                        }}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete Permanently</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
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

            {(mode === 'gallery' || mode === 'preview') && onUpscale && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm shadow-sm hover:bg-background/95 border border-border"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpscale(image);
                      }}
                    >
                      <ImageUpscale className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Upscale</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}
        
        {/* Starred indicator */}
        {image.starred && mode === 'gallery' && (
          <div className="absolute top-2 right-2 text-yellow-400 bg-white/80 backdrop-blur-sm p-1 rounded-full shadow-sm">
            <StarIcon className="h-4 w-4 fill-current" />
          </div>
        )}
        
        {/* Source image thumbnail indicator (for edited images) */}
        {image.sourceThumb && (
          <div 
            className="absolute bottom-2 right-2 z-10 h-10 w-10 rounded-md overflow-hidden border-2 border-white shadow-lg cursor-pointer hover:scale-110 transition-transform bg-white"
            onClick={(e) => {
              e.stopPropagation();
              // Show source image in fullscreen when clicked
              const modal = document.createElement('div');
              modal.className = 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95';
              modal.onclick = () => document.body.removeChild(modal);
              
              const imgEl = document.createElement('img');
              // Use the full-resolution sourceImage if available, otherwise fall back to the thumbnail
              imgEl.src = image.sourceImage || image.sourceThumb || "";
              imgEl.className = 'max-h-[85vh] max-w-[90vw] object-contain';
              
              const caption = document.createElement('div');
              caption.className = 'mt-4 text-white/90 text-sm bg-black/30 px-4 py-2 rounded-full backdrop-blur-sm';
              caption.textContent = 'Source Image';
              
              modal.appendChild(imgEl);
              modal.appendChild(caption);
              document.body.appendChild(modal);
            }}
          >
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center backdrop-blur-sm">
              <ImageIcon className="h-5 w-5 text-white" />
            </div>
            <img 
              src={image.sourceThumb} 
              alt="Source" 
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>
      
      <CardContent className="p-4 space-y-3">
        <p className="text-sm font-medium line-clamp-2 text-foreground/90">{image.prompt}</p>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="bg-muted/50 rounded-full px-2.5 py-0.5 text-muted-foreground">
            {image.model}
          </span>
          <span className="bg-muted/50 rounded-full px-2.5 py-0.5 text-muted-foreground">
            {image.size}
          </span>
          {image.quality && (
            <span className="bg-muted/50 rounded-full px-2.5 py-0.5 text-muted-foreground">
              {image.quality}
            </span>
          )}
        </div>
      </CardContent>
    </div>
  );
}