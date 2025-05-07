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
                month: 'short',
                day: 'numeric',
                year: '2-digit'
              })}
            </span>
          </div>
          
          {/* Enhanced prompt display with better typography and visual design */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/10 to-primary/5 rounded-md blur opacity-25 group-hover:opacity-40 transition duration-200"></div>
            <p className="relative text-sm font-medium leading-relaxed line-clamp-2 p-2 bg-card/90 dark:bg-card-foreground/10 rounded-md shadow-sm text-foreground/90 border-l-2 border-primary">
              {image.prompt}
            </p>
          </div>
        </div>
        
        {/* Parameters section with color coding */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Parameters</h4>
          
          <div className="flex flex-wrap gap-2 text-xs">
            {/* AI Model tag - blue color scheme */}
            <span className="bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-0.5 flex items-center shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5"></span>
              {image.model}
            </span>
            
            {/* Aspect Ratio tag - purple color scheme */}
            {(() => {
              // Priority 1: Use explicitly stored aspect ratio (new format)
              if (image.aspectRatio) {
                return (
                  <span className="bg-purple-50 text-purple-700 border border-purple-200 rounded-full px-2.5 py-0.5 flex items-center shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-1.5"></span>
                    {image.aspectRatio}
                  </span>
                );
              }
              
              // Priority 2: Check if size field contains a ratio format (e.g., "1:1", "16:9")
              if (image.size && image.size.includes(':')) {
                return (
                  <span className="bg-purple-50 text-purple-700 border border-purple-200 rounded-full px-2.5 py-0.5 flex items-center shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-1.5"></span>
                    {image.size}
                  </span>
                );
              }
              
              // Priority 3: Try to calculate a ratio from width/height if available
              if (image.width && image.height) {
                const w = parseInt(image.width);
                const h = parseInt(image.height);
                if (w && h) {
                  // For common ratios, use standard notation
                  if (w === h) return (
                    <span className="bg-purple-50 text-purple-700 border border-purple-200 rounded-full px-2.5 py-0.5 flex items-center shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-1.5"></span>
                      1:1
                    </span>
                  );
                  if (w/h === 16/9 || Math.abs(w/h - 16/9) < 0.01) return (
                    <span className="bg-purple-50 text-purple-700 border border-purple-200 rounded-full px-2.5 py-0.5 flex items-center shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-1.5"></span>
                      16:9
                    </span>
                  );
                  if (h/w === 16/9 || Math.abs(h/w - 16/9) < 0.01) return (
                    <span className="bg-purple-50 text-purple-700 border border-purple-200 rounded-full px-2.5 py-0.5 flex items-center shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-1.5"></span>
                      9:16
                    </span>
                  );
                  if (w/h === 4/3 || Math.abs(w/h - 4/3) < 0.01) return (
                    <span className="bg-purple-50 text-purple-700 border border-purple-200 rounded-full px-2.5 py-0.5 flex items-center shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-1.5"></span>
                      4:3
                    </span>
                  );
                  if (h/w === 4/3 || Math.abs(h/w - 4/3) < 0.01) return (
                    <span className="bg-purple-50 text-purple-700 border border-purple-200 rounded-full px-2.5 py-0.5 flex items-center shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-1.5"></span>
                      3:4
                    </span>
                  );
                }
              }
              
              // Priority 4: Size display as fallback if it's a dimension (e.g., "1024x1024")
              if (image.size && image.size.match(/\d+x\d+/i)) {
                return (
                  <span className="bg-purple-50 text-purple-700 border border-purple-200 rounded-full px-2.5 py-0.5 flex items-center shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-1.5"></span>
                    {image.size}
                  </span>
                );
              }
              
              return null; // Don't show anything if we can't determine a useful ratio
            })()}
            
            {/* Resolution dimensions tag - amber color scheme */}
            {image.width && image.height && (
              <span className="bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2.5 py-0.5 flex items-center shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
                {image.width}×{image.height}
              </span>
            )}
            
            {/* Quality tag - green color scheme */}
            {image.quality && (
              <span className="bg-green-50 text-green-700 border border-green-200 rounded-full px-2.5 py-0.5 flex items-center shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
                {image.quality.charAt(0).toUpperCase() + image.quality.slice(1)}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </div>
  );
}