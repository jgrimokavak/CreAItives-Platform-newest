import { useState } from "react";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DownloadIcon, 
  PenToolIcon, 
  CopyIcon,
  ImageUpscale,
  ChevronDown
} from "lucide-react";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { GeneratedImage } from "@/types/image";

// Localized disclaimer strings
const DISCLAIMER_TEXTS = {
  MX: "Imagen generada por IA. Revisa fotos reales.",
  AR: "Imagen generada por IA. Revisá fotos reales.",
  BR: "Imagem gerada por IA. Verifique fotos reais.",
  CL: "Imagen generada por IA. Revisa fotos reales.",
  EN: "AI-generated image. Check real photos."
} as const;

// Extended interface with car specific metadata
interface CarImageCardProps {
  image: GeneratedImage;
  make?: string;
  model?: string;
  bodyStyle?: string;
  trim?: string;
  year?: string;
  color?: string;
  background?: "white" | "hub";
  onEdit?: (img: GeneratedImage) => void;
  onDownload?: (img: GeneratedImage) => void;
  onCopyPrompt?: (prompt: string) => void;
  onUpscale?: (image: GeneratedImage) => void;
  onClick?: () => void;
}

export default function CarImageCard({ 
  image,
  make,
  model,
  bodyStyle,
  trim,
  year,
  color,
  background,
  onEdit, 
  onDownload,
  onCopyPrompt,
  onUpscale,
  onClick
}: CarImageCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Helper function to create image with disclaimer
  const createImageWithDisclaimer = async (disclaimerText: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous'; // Handle CORS if needed
      
      img.onload = () => {
        // Set canvas dimensions to match image
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw the original image
        ctx.drawImage(img, 0, 0);

        // Calculate disclaimer positioning with internal padding
        const padding = Math.max(20, img.width * 0.02); // 2% of image width, minimum 20px
        const fontSize = Math.max(12, img.width * 0.012); // 1.2% of image width, minimum 12px
        
        // Set font - try Helvetica Neue first, fall back to system defaults
        ctx.font = `${fontSize}px "Helvetica Neue", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; // Semi-transparent black for readability
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';

        // Add subtle text shadow for better readability
        ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.shadowBlur = 2;

        // Draw disclaimer text in bottom-right with padding
        ctx.fillText(
          disclaimerText,
          canvas.width - padding,
          canvas.height - padding
        );

        // Convert to JPEG with good quality
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      // Load the image
      const imageUrl = image.fullUrl || image.url;
      if (imageUrl.startsWith('data:')) {
        img.src = imageUrl;
      } else {
        // For external URLs, we might need to fetch through a proxy to avoid CORS
        fetch(imageUrl)
          .then(response => response.blob())
          .then(blob => {
            const url = URL.createObjectURL(blob);
            img.src = url;
          })
          .catch(() => {
            // Fallback: try direct loading
            img.src = imageUrl;
          });
      }
    });
  };

  // Handle disclaimer download
  const handleDisclaimerDownload = async (region: keyof typeof DISCLAIMER_TEXTS) => {
    try {
      const disclaimerText = DISCLAIMER_TEXTS[region];
      const imageWithDisclaimer = await createImageWithDisclaimer(disclaimerText);
      
      // Generate filename
      let filename = 'car-image';
      if (make && make !== 'None') {
        filename = `${make}`;
        if (model && model !== 'None') {
          filename += `_${model}`;
        }
        if (bodyStyle && bodyStyle !== 'None') {
          filename += `_${bodyStyle}`;
        }
        filename = filename.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '_').replace(/_+/g, '_');
      }
      
      // Add region suffix
      filename += `_${region}`;
      
      // Create download link
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = imageWithDisclaimer;
      a.download = `${filename}.jpg`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
    } catch (error) {
      console.error('Error creating disclaimer image:', error);
    }
  };

  return (
    <div 
      key={image.id}
      className="bg-card rounded-lg overflow-hidden shadow-sm border border-border hover:shadow-md transition-shadow group cursor-pointer"
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
            className="w-full h-full object-contain"
            loading="lazy"
          />
        </div>
        
        {/* Actions overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
          {onEdit && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm shadow-sm hover:bg-background/95 border border-border"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(image);
                    }}
                  >
                    <PenToolIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {onUpscale && (
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
          
          {onDownload && (
            <DropdownMenu>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm shadow-sm hover:bg-background/95 border border-border"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DownloadIcon className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Download Options</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenuContent 
                align="center" 
                className="w-64 bg-background/95 backdrop-blur-sm border border-border shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(image);
                  }}
                  className="flex items-center gap-2 py-2"
                >
                  <DownloadIcon className="h-4 w-4" />
                  <span>Download Original</span>
                </DropdownMenuItem>
                
                <div className="px-2 py-1">
                  <div className="text-xs text-muted-foreground mb-2 border-t pt-2">
                    Download with AI Disclaimer:
                  </div>
                  
                  {Object.entries(DISCLAIMER_TEXTS).map(([region, text]) => (
                    <DropdownMenuItem
                      key={region}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDisclaimerDownload(region as keyof typeof DISCLAIMER_TEXTS);
                      }}
                      className="flex items-center justify-between gap-2 py-1.5 px-2 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs font-medium">
                          {region}
                        </Badge>
                        <span className="text-xs text-muted-foreground truncate">
                          {text.length > 25 ? `${text.substring(0, 25)}...` : text}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
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
      </div>
      
      <CardContent className="p-3 space-y-2">
        <p className="text-sm font-medium line-clamp-2">{image.prompt}</p>
        
        {/* Car-specific variables */}
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
          {make && make !== 'None' && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Make:</span>
              <span className="font-medium">{make}</span>
            </div>
          )}
          
          {model && model !== 'None' && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Model:</span>
              <span className="font-medium">{model}</span>
            </div>
          )}
          
          {bodyStyle && bodyStyle !== 'None' && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Style:</span>
              <span className="font-medium">{bodyStyle}</span>
            </div>
          )}
          
          {trim && trim !== 'None' && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Trim:</span>
              <span className="font-medium">{trim}</span>
            </div>
          )}
          
          {year && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Year:</span>
              <span className="font-medium">{year}</span>
            </div>
          )}
          
          {color && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Color:</span>
              <span className="font-medium">{color}</span>
            </div>
          )}

          {background && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Background:</span>
              <span className="font-medium capitalize">{background}</span>
            </div>
          )}
        </div>

        {/* Technical metadata */}
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="bg-muted/50 rounded-full px-2 py-0.5">
            {image.model}
          </span>
          <span className="bg-muted/50 rounded-full px-2 py-0.5">
            {image.size}
          </span>
        </div>
      </CardContent>
    </div>
  );
}