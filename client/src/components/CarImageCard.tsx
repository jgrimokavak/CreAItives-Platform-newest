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

  // Helper function to create image with disclaimer (cropped to 1.71:1 aspect ratio at 1280×748)
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
        // Target dimensions: exactly 1280×748 pixels (1.71:1 aspect ratio)
        const finalWidth = 1280;
        const finalHeight = 748;
        const targetAspectRatio = finalWidth / finalHeight; // 1.71:1
        
        // Calculate crop dimensions to maintain 1.71:1 aspect ratio
        let cropWidth = img.width;
        let cropHeight = img.height;
        let cropX = 0;
        let cropY = 0;
        
        const currentAspectRatio = img.width / img.height;
        
        if (currentAspectRatio > targetAspectRatio) {
          // Image is wider than target - crop width
          cropWidth = img.height * targetAspectRatio;
          cropX = (img.width - cropWidth) / 2;
        } else {
          // Image is taller than target - crop height
          cropHeight = img.width / targetAspectRatio;
          cropY = (img.height - cropHeight) / 2;
        }
        
        // Set canvas to exact final dimensions
        canvas.width = finalWidth;
        canvas.height = finalHeight;

        // Draw the cropped image
        ctx.drawImage(
          img,
          cropX, cropY, cropWidth, cropHeight,
          0, 0, finalWidth, finalHeight
        );

        // Parse disclaimer text based on region
        const parseDisclaimerText = (text: string) => {
          // Split at period followed by space, but keep periods with first part
          const parts = text.split(/\.\s+/);
          if (parts.length >= 2) {
            return {
              line1: parts[0] + '.',
              line2: parts.slice(1).join('. ')
            };
          }
          // Fallback for text without clear sentence breaks
          return {
            line1: text,
            line2: ''
          };
        };
        
        const { line1, line2 } = parseDisclaimerText(disclaimerText);
        
        // Calculate disclaimer pill positioning and styling (exact specifications)
        const edgePadding = 40; // Fixed 40px margin from edges (~3.1% of 1280px width)
        const boldFontSize = 21; // ~20-22px for first line
        const regularFontSize = 19; // ~18-20px for second line
        const lineHeight = boldFontSize * 1.15; // Tight line spacing
        const iconSize = 24; // Fixed icon size
        const pillPaddingH = 18; // Fixed horizontal padding
        const pillPaddingV = 10; // Fixed vertical padding
        const iconTextGap = 11; // 10-12px gap between icon and text
        
        // Set fonts - Helvetica Neue with exact weights
        const boldFont = `700 ${boldFontSize}px "Helvetica Neue", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`;
        const regularFont = `400 ${regularFontSize}px "Helvetica Neue", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`;
        
        // Measure text to determine pill size
        ctx.font = boldFont;
        const line1Width = ctx.measureText(line1).width;
        ctx.font = regularFont;
        const line2Width = ctx.measureText(line2).width;
        const maxTextWidth = Math.max(line1Width, line2Width);
        
        // Pill dimensions
        const contentWidth = iconSize + iconTextGap + maxTextWidth;
        const pillWidth = contentWidth + (pillPaddingH * 2);
        const pillHeight = (boldFontSize + regularFontSize + lineHeight * 0.5) + (pillPaddingV * 2);
        const pillRadius = 999; // Full pill shape (border-radius: 999px)
        
        // Pill position (bottom-right with fixed 40px edge padding)
        const pillX = finalWidth - edgePadding - pillWidth;
        const pillY = finalHeight - edgePadding - pillHeight;
        
        // Draw pill background with subtle shadow
        ctx.save();
        
        // Add single soft drop shadow (0px 2px 6px rgba(0,0,0,0.3))
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;
        ctx.shadowBlur = 6;
        
        // Draw pill background with semi-transparent black
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.roundRect(pillX, pillY, pillWidth, pillHeight, pillRadius);
        ctx.fill();
        
        ctx.restore();
        
        // Draw Lucide sparkles icon (solid blue #1553ec)
        const iconX = pillX + pillPaddingH;
        const iconCenterY = pillY + pillHeight / 2;
        
        ctx.fillStyle = '#1553ec'; // Solid blue
        ctx.save();
        
        // Draw Lucide sparkles icon - simplified version
        ctx.translate(iconX + iconSize/2, iconCenterY);
        
        // Main sparkle (4-pointed star)
        ctx.fillStyle = '#1553ec';
        ctx.beginPath();
        const mainSize = iconSize * 0.4;
        ctx.moveTo(0, -mainSize);
        ctx.lineTo(mainSize * 0.3, -mainSize * 0.3);
        ctx.lineTo(mainSize, 0);
        ctx.lineTo(mainSize * 0.3, mainSize * 0.3);
        ctx.lineTo(0, mainSize);
        ctx.lineTo(-mainSize * 0.3, mainSize * 0.3);
        ctx.lineTo(-mainSize, 0);
        ctx.lineTo(-mainSize * 0.3, -mainSize * 0.3);
        ctx.closePath();
        ctx.fill();
        
        // Small sparkle (top-right)
        ctx.beginPath();
        const smallSize = iconSize * 0.15;
        const offsetX = iconSize * 0.3;
        const offsetY = -iconSize * 0.25;
        ctx.moveTo(offsetX, offsetY - smallSize);
        ctx.lineTo(offsetX + smallSize * 0.3, offsetY - smallSize * 0.3);
        ctx.lineTo(offsetX + smallSize, offsetY);
        ctx.lineTo(offsetX + smallSize * 0.3, offsetY + smallSize * 0.3);
        ctx.lineTo(offsetX, offsetY + smallSize);
        ctx.lineTo(offsetX - smallSize * 0.3, offsetY + smallSize * 0.3);
        ctx.lineTo(offsetX - smallSize, offsetY);
        ctx.lineTo(offsetX - smallSize * 0.3, offsetY - smallSize * 0.3);
        ctx.closePath();
        ctx.fill();
        
        // Tiny sparkle (bottom-left)
        ctx.beginPath();
        const tinySize = iconSize * 0.1;
        const offsetX2 = -iconSize * 0.25;
        const offsetY2 = iconSize * 0.3;
        ctx.moveTo(offsetX2, offsetY2 - tinySize);
        ctx.lineTo(offsetX2 + tinySize * 0.3, offsetY2 - tinySize * 0.3);
        ctx.lineTo(offsetX2 + tinySize, offsetY2);
        ctx.lineTo(offsetX2 + tinySize * 0.3, offsetY2 + tinySize * 0.3);
        ctx.lineTo(offsetX2, offsetY2 + tinySize);
        ctx.lineTo(offsetX2 - tinySize * 0.3, offsetY2 + tinySize * 0.3);
        ctx.lineTo(offsetX2 - tinySize, offsetY2);
        ctx.lineTo(offsetX2 - tinySize * 0.3, offsetY2 - tinySize * 0.3);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
        
        // Draw text lines (left-aligned beside icon)
        const textStartX = iconX + iconSize + iconTextGap;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        // Clear any shadows for text
        ctx.shadowColor = 'transparent';
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowBlur = 0;
        
        // Calculate text block vertical center position
        const textBlockHeight = boldFontSize + regularFontSize + (lineHeight * 0.5);
        const textBlockStartY = pillY + pillPaddingV + (pillHeight - (pillPaddingV * 2) - textBlockHeight) / 2;
        
        // Draw first line (bold, 700 weight)
        ctx.font = boldFont;
        ctx.fillText(line1, textStartX, textBlockStartY);
        
        // Draw second line (regular, 400 weight)
        ctx.font = regularFont;
        const line2Y = textBlockStartY + boldFontSize + (lineHeight * 0.5);
        ctx.fillText(line2, textStartX, line2Y);

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