import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { 
  DownloadIcon, 
  ShareIcon, 
  SmartphoneIcon, 
  MonitorIcon,
  InfoIcon,
  ChevronDownIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { mobileDownloadManager, downloadImageMobile } from "@/utils/mobileDownload";

interface MobileDownloadButtonProps {
  imageUrl: string;
  filename?: string;
  prompt?: string;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  showDropdown?: boolean;
}

export default function MobileDownloadButton({
  imageUrl,
  filename,
  prompt,
  className,
  variant = "outline",
  size = "icon",
  showDropdown = false
}: MobileDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();
  const capabilities = mobileDownloadManager.getAvailableMethods();

  const handleDownload = async (method?: 'share' | 'download' | 'instructions') => {
    if (isDownloading) return;
    
    setIsDownloading(true);
    
    try {
      const cleanFilename = filename || generateFilename(prompt);
      
      if (method === 'instructions') {
        const instructions = mobileDownloadManager.getManualSaveInstructions();
        toast({
          title: "How to save to gallery",
          description: instructions,
          duration: 8000,
        });
        return;
      }

      const options = {
        filename: cleanFilename,
        fallbackToShare: method === 'share' || (capabilities.platform === 'ios' && method !== 'download'),
        title: "Save Car Image",
        text: prompt ? `Check out this car: ${prompt.substring(0, 100)}...` : "Save this car image to your gallery"
      };

      const result = await downloadImageMobile(imageUrl, cleanFilename, options);
      
      if (result.success) {
        toast({
          title: getSuccessTitle(result.method),
          description: result.message,
          duration: result.method.includes('share') ? 8000 : 4000,
        });
      } else if (result.method !== 'web-share-cancelled' && result.method !== 'file-system-cancelled') {
        // Don't show error for user cancellation
        toast({
          title: "Download alternative",
          description: mobileDownloadManager.getManualSaveInstructions(),
          variant: "default",
          duration: 8000,
        });
      }
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: "Try the manual save instructions below",
        variant: "destructive",
      });
      
      // Show manual instructions as fallback
      setTimeout(() => {
        toast({
          title: "Manual save instructions",
          description: mobileDownloadManager.getManualSaveInstructions(),
          duration: 8000,
        });
      }, 2000);
    } finally {
      setIsDownloading(false);
    }
  };

  const generateFilename = (prompt?: string): string => {
    if (!prompt) return 'car-image.png';
    
    const cleaned = prompt
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 50);
    
    return `${cleaned || 'car-image'}.png`;
  };

  const getSuccessTitle = (method: string): string => {
    switch (method) {
      case 'web-share-file':
        return "Image ready to save";
      case 'web-share-url':
        return "Image link shared";
      case 'file-system-access':
        return "Image saved";
      case 'traditional-download':
        return capabilities.platform === 'ios' ? "Image opened" : "Image downloaded";
      default:
        return "Download complete";
    }
  };

  const getMainButtonIcon = () => {
    // Always prioritize download icon on desktop (Windows, Mac, Linux)
    if (capabilities.platform === 'desktop') {
      return <DownloadIcon className="h-4 w-4" />;
    }
    // On mobile, show share icon if available
    if (capabilities.webShare) {
      return <ShareIcon className="h-4 w-4" />;
    }
    return <DownloadIcon className="h-4 w-4" />;
  };

  const getMainButtonTooltip = () => {
    if (capabilities.platform === 'desktop') {
      return "Download image";
    }
    if (capabilities.webShare) {
      return "Share to save in gallery";
    }
    if (capabilities.platform === 'ios') {
      return "Open image to save";
    }
    return "Download image";
  };

  if (!showDropdown) {
    // Simple button mode
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={variant}
              size={size}
              className={cn(className, isDownloading && "opacity-50")}
              disabled={isDownloading}
              onClick={() => handleDownload()}
            >
              {isDownloading ? (
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                getMainButtonIcon()
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{getMainButtonTooltip()}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Dropdown mode with multiple options
  return (
    <DropdownMenu>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant={variant}
                size={size}
                className={cn(className, isDownloading && "opacity-50")}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    {getMainButtonIcon()}
                    <ChevronDownIcon className="h-3 w-3 ml-1" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Download options</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <DropdownMenuContent align="end" className="w-56">
        {capabilities.webShare && (
          <DropdownMenuItem onClick={() => handleDownload('share')} className="flex items-center gap-2">
            <ShareIcon className="h-4 w-4" />
            <div className="flex-1">
              <div className="font-medium">Share to Gallery</div>
              <div className="text-xs text-muted-foreground">
                {capabilities.platform === 'ios' ? 'Save to Photos app' : 'Save via share menu'}
              </div>
            </div>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuItem onClick={() => handleDownload('download')} className="flex items-center gap-2">
          <DownloadIcon className="h-4 w-4" />
          <div className="flex-1">
            <div className="font-medium">Direct Download</div>
            <div className="text-xs text-muted-foreground">
              {capabilities.platform === 'ios' 
                ? 'Open in new tab' 
                : capabilities.platform === 'android'
                ? 'Save to Downloads folder'
                : 'Save to device'
              }
            </div>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => handleDownload('instructions')} className="flex items-center gap-2">
          <InfoIcon className="h-4 w-4" />
          <div className="flex-1">
            <div className="font-medium">Manual Save Help</div>
            <div className="text-xs text-muted-foreground">
              Show step-by-step instructions
            </div>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <div className="px-2 py-1.5 text-xs text-muted-foreground flex items-center gap-2">
          {capabilities.platform === 'ios' ? (
            <SmartphoneIcon className="h-3 w-3" />
          ) : capabilities.platform === 'android' ? (
            <SmartphoneIcon className="h-3 w-3" />
          ) : (
            <MonitorIcon className="h-3 w-3" />
          )}
          {capabilities.platform === 'ios' ? 'iOS optimized' : 
           capabilities.platform === 'android' ? 'Android optimized' : 
           'Desktop mode'}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}