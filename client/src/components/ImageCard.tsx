import { useState } from "react";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  CheckIcon,
  CopyIcon,
  DownloadIcon, 
  ImageIcon,
  ImageUpscale,
  PenToolIcon, 
  RotateCcwIcon,
  StarIcon, 
  Trash2Icon,
  TrashIcon
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
              "absolute top-2 left-2 z-10 transition-all duration-200 cursor-pointer",
              selectionMode === 'selecting' ? "opacity-100 scale-100" : "opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100"
            )}
            onClick={(e) => {
              e.stopPropagation();
              // Cast the event to MouseEvent to access shiftKey
              onSelect(image.id, (e as React.MouseEvent).shiftKey);
            }}
          >
            <div 
              className={cn(
                "flex items-center justify-center w-6 h-6 rounded-full shadow-md border border-white/40 backdrop-blur-md transition-colors",
                selected 
                  ? "bg-primary text-white" 
                  : "bg-background/70 hover:bg-background"
              )}
            >
              {selected ? (
                <CheckIcon className="h-3.5 w-3.5" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-sm border-2 border-muted-foreground/70" />
              )}
              <input
                type="checkbox"
                checked={selected}
                onChange={(e) => {
                  e.stopPropagation();
                  // Cast to MouseEvent to access shiftKey
                  onSelect(image.id, (e.nativeEvent as MouseEvent).shiftKey);
                }}
                className="sr-only" // Hide the actual checkbox but keep it accessible
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
      
      <CardContent className="p-4 space-y-4">
        {/* Prompt section with improved styling */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Prompt</h4>
            <div className="h-px flex-1 bg-border/50 mx-2"></div>
            <span className="text-[10px] text-muted-foreground/70 font-mono">
              {new Date(image.createdAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </span>
          </div>
          
          <div className="group relative">
            <p className="text-sm font-medium leading-5 line-clamp-2 text-foreground/90 p-2 bg-muted/20 rounded border-l-2 border-primary/30 hover:border-primary transition-colors">
              {image.prompt}
            </p>
            
            {/* Show full prompt on hover if it's truncated */}
            {image.prompt.length > 60 && (
              <div className="absolute z-10 left-0 right-0 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-200 delay-300">
                <div className="mt-1 p-3 bg-popover border rounded-md shadow-md text-sm max-w-md max-h-48 overflow-y-auto">
                  {image.prompt}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Parameters section with color coding */}
        <div className="space-y-1.5">
          <div className="flex items-center">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Parameters</h4>
            <div className="h-px flex-1 bg-border/50 ml-2"></div>
          </div>
          
          <div className="flex flex-wrap gap-2 text-xs">
            {/* Extract and normalize tags to avoid duplications */}
            {(() => {
              // Create a set of unique tags
              const tagSet = new Set<string>();
              const tags: {text: string; type: 'model' | 'size' | 'quality' | 'dimension' | 'aspect'}[] = [];
              
              // Add model tag (always blue)
              tags.push({
                text: image.model,
                type: 'model'
              });
              tagSet.add(image.model.toLowerCase());
              
              // Only add size tag if it's not already included in the model name
              if (!image.model.toLowerCase().includes(image.size.toLowerCase())) {
                tags.push({
                  text: image.size,
                  type: 'size'
                });
                tagSet.add(image.size.toLowerCase());
              }
              
              // Only add quality tag if present and not a duplicate
              if (image.quality && !tagSet.has(image.quality.toLowerCase())) {
                tags.push({
                  text: image.quality,
                  type: 'quality'
                });
                tagSet.add(image.quality.toLowerCase());
              }
              
              // Add dimensions tag if available
              if (image.width && image.height) {
                const dimensionText = `${image.width}×${image.height}`;
                if (!tagSet.has(dimensionText.toLowerCase())) {
                  tags.push({
                    text: dimensionText,
                    type: 'dimension'
                  });
                  tagSet.add(dimensionText.toLowerCase());
                }
              }
              
              // Calculate and add aspect ratio if width/height available or if provided
              const aspectRatio = image.aspectRatio || 
                (image.width && image.height) ? 
                  (() => {
                    const w = Number(image.width);
                    const h = Number(image.height);
                    if (!isNaN(w) && !isNaN(h) && h !== 0) {
                      const ratio = w / h;
                      // Return common aspect ratio names or numerical value
                      if (Math.abs(ratio - 1) < 0.01) return "1:1";
                      if (Math.abs(ratio - 4/3) < 0.01) return "4:3"; 
                      if (Math.abs(ratio - 16/9) < 0.01) return "16:9";
                      if (Math.abs(ratio - 3/2) < 0.01) return "3:2";
                      return ratio.toFixed(2);
                    }
                    return null;
                  })() : null;
              
              if (aspectRatio && !tagSet.has(aspectRatio.toLowerCase())) {
                tags.push({
                  text: aspectRatio,
                  type: 'aspect'
                });
              }
              
              // Render all unique tags with appropriate styling
              return tags.map((tag, index) => {
                // Define color schemes based on tag type
                let bgColor = "bg-blue-50";
                let textColor = "text-blue-700";
                let borderColor = "border-blue-200";
                let dotColor = "bg-blue-500";
                
                switch(tag.type) {
                  case 'model':
                    // Blue for model (default)
                    break; 
                  case 'size':
                    bgColor = "bg-purple-50";
                    textColor = "text-purple-700";
                    borderColor = "border-purple-200";
                    dotColor = "bg-purple-500";
                    break;
                  case 'quality':
                    bgColor = "bg-green-50";
                    textColor = "text-green-700";
                    borderColor = "border-green-200";
                    dotColor = "bg-green-500";
                    break;
                  case 'dimension':
                    bgColor = "bg-amber-50";
                    textColor = "text-amber-700";
                    borderColor = "border-amber-200";
                    dotColor = "bg-amber-500";
                    break;
                  case 'aspect':
                    bgColor = "bg-rose-50";
                    textColor = "text-rose-700";
                    borderColor = "border-rose-200";
                    dotColor = "bg-rose-500";
                    break;
                }
                
                return (
                  <span 
                    key={`${tag.type}-${index}`}
                    className={`${bgColor} ${textColor} border ${borderColor} rounded-full px-2.5 py-0.5 flex items-center hover:shadow-sm transition-all group`}
                    title={`${tag.type}: ${tag.text}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${dotColor} mr-1.5 group-hover:scale-125 transition-transform`}></span>
                    <span className="font-medium">{tag.text}</span>
                  </span>
                );
              });
            })()}
          </div>
        </div>
      </CardContent>
    </div>
  );
}