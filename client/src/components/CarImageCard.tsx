import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  DownloadIcon, 
  PenToolIcon, 
  CopyIcon,
  ArrowUpToLine,
  MaximizeIcon
} from "lucide-react";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { GeneratedImage } from "@/types/image";

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

  // Create separate click handlers for each button to prevent event bubbling
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onEdit) onEdit(image);
  };

  const handleUpscaleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onUpscale) onUpscale(image);
  };

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onDownload) onDownload(image);
  };

  const handleCopyPromptClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onCopyPrompt) onCopyPrompt(image.prompt);
  };

  const handleCardClick = () => {
    if (onClick) onClick();
  };

  // Function to stop event propagation
  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Card 
      className="overflow-hidden border rounded-lg shadow-sm hover:shadow-md transition-all group cursor-pointer" 
      onClick={handleCardClick}
    >
      {/* Image container with aspect ratio */}
      <div className="relative pb-[100%]">
        {/* Image */}
        <img 
          src={image.thumbUrl || image.url} 
          alt={image.prompt}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />

        {/* Overlay with action buttons */}
        <div 
          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3"
          onClick={stopPropagation}
        >
          {/* Action buttons in horizontal row */}
          <div className="flex items-center space-x-2">
            {/* Edit button */}
            {onEdit && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-full bg-white/90 text-black hover:bg-white shadow-md"
                      onClick={handleEditClick}
                    >
                      <PenToolIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Upscale button */}
            {onUpscale && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-full bg-white/90 text-black hover:bg-white shadow-md"
                      onClick={handleUpscaleClick}
                    >
                      <ArrowUpToLine className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Upscale</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Download button */}
            {onDownload && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-full bg-white/90 text-black hover:bg-white shadow-md"
                      onClick={handleDownloadClick}
                    >
                      <DownloadIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Download</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Copy prompt button */}
            {onCopyPrompt && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-full bg-white/90 text-black hover:bg-white shadow-md"
                      onClick={handleCopyPromptClick}
                    >
                      <CopyIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy Prompt</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Fullscreen indicator in the corner */}
          <div className="absolute bottom-2 right-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-white/70 p-1">
                    <MaximizeIcon className="h-4 w-4" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>View Fullscreen</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
      
      {/* Card content with prompt and car details */}
      <CardContent className="p-3 space-y-2">
        {/* Prompt text */}
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
    </Card>
  );
}