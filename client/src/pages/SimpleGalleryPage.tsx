import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useEditor } from '@/context/EditorContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Loader2, Star, Trash2, FolderOpen, Download, PenTool, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GalleryPageProps {
  mode?: 'gallery' | 'trash';
}

interface GalleryImage {
  id: string;
  prompt: string;
  width: number;
  height: number;
  fullUrl: string;
  thumbUrl: string;
  starred: boolean;
  deletedAt: string | null;
  createdAt: string;
}

// Mock images for development
const MOCK_IMAGES: GalleryImage[] = [
  {
    id: '1',
    prompt: 'A beautiful landscape with mountains and a sunset',
    width: 1024,
    height: 1024,
    fullUrl: 'https://placehold.co/1024x1024?text=Image+1',
    thumbUrl: 'https://placehold.co/400x400?text=Image+1',
    starred: true,
    deletedAt: null,
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    prompt: 'A futuristic city with flying cars and tall skyscrapers',
    width: 1024,
    height: 1024,
    fullUrl: 'https://placehold.co/1024x1024?text=Image+2',
    thumbUrl: 'https://placehold.co/400x400?text=Image+2',
    starred: false,
    deletedAt: null,
    createdAt: new Date().toISOString()
  },
  {
    id: '3',
    prompt: 'A cute cat sitting on a windowsill watching birds',
    width: 1024,
    height: 1024,
    fullUrl: 'https://placehold.co/1024x1024?text=Image+3',
    thumbUrl: 'https://placehold.co/400x400?text=Image+3',
    starred: false,
    deletedAt: null,
    createdAt: new Date().toISOString()
  }
];

const SimpleGalleryPage: React.FC<GalleryPageProps> = ({ mode = 'gallery' }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const { setMode, setSourceImages } = useEditor();
  
  // Simulated data for development
  const [images, setImages] = useState<GalleryImage[]>(
    mode === 'trash' 
      ? [] // Empty trash for now
      : showStarredOnly 
        ? MOCK_IMAGES.filter(img => img.starred) 
        : MOCK_IMAGES
  );
  
  // Toggle selection
  const toggleSelection = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };
  
  // Select all images
  const selectAll = () => {
    setSelectedIds(images.map(img => img.id));
  };
  
  // Clear selection
  const clearSelection = () => {
    setSelectedIds([]);
  };
  
  // Handle edit
  const handleEdit = (image: GalleryImage) => {
    setMode('edit');
    setSourceImages([image.fullUrl]);
    navigate('/');
  };
  
  // Handle star/unstar
  const handleStar = (id: string, starred: boolean) => {
    setImages(prev => 
      prev.map(img => img.id === id ? { ...img, starred } : img)
    );
    toast({
      title: starred ? 'Image starred' : 'Image unstarred',
      description: 'Your gallery has been updated',
    });
  };
  
  // Handle trash/restore
  const handleTrash = (id: string, toTrash: boolean) => {
    if (toTrash) {
      setImages(prev => prev.filter(img => img.id !== id));
      toast({
        title: 'Image moved to trash',
        description: 'You can restore it from the trash for the next 30 days',
      });
    } else {
      // In a real app, would restore from trash
      toast({
        title: 'Image restored',
        description: 'The image has been moved back to your gallery',
      });
    }
  };
  
  // Handle bulk star
  const handleBulkStar = (starred: boolean) => {
    setImages(prev => 
      prev.map(img => selectedIds.includes(img.id) ? { ...img, starred } : img)
    );
    toast({
      title: starred ? 'Images starred' : 'Images unstarred',
      description: `${selectedIds.length} images updated`,
    });
    clearSelection();
  };
  
  // Handle bulk trash
  const handleBulkTrash = (toTrash: boolean) => {
    if (toTrash) {
      setImages(prev => prev.filter(img => !selectedIds.includes(img.id)));
      toast({
        title: 'Images moved to trash',
        description: `${selectedIds.length} images moved to trash`,
      });
    } else {
      // In a real app, would restore from trash
      toast({
        title: 'Images restored',
        description: `${selectedIds.length} images restored to gallery`,
      });
    }
    clearSelection();
  };
  
  // Handle download
  const handleDownload = async (image: GalleryImage) => {
    try {
      toast({
        title: 'Downloading image',
        description: 'Your image is being prepared for download',
      });
      
      // In a real implementation, this would fetch the actual image
      // For now we just show a success toast
      setTimeout(() => {
        toast({
          title: 'Download complete',
          description: 'Your image has been downloaded',
        });
      }, 1500);
    } catch (error) {
      toast({
        title: 'Download failed',
        description: 'Could not download the image',
        variant: 'destructive',
      });
    }
  };
  
  // Filter images based on mode and starred filter
  React.useEffect(() => {
    if (mode === 'trash') {
      setImages([]); // Empty trash for this example
    } else {
      setImages(showStarredOnly 
        ? MOCK_IMAGES.filter(img => img.starred) 
        : MOCK_IMAGES
      );
    }
  }, [mode, showStarredOnly]);
  
  // Empty state
  if (images.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh] text-center">
        <FolderOpen className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-semibold mb-2">
          {mode === 'gallery' 
            ? showStarredOnly 
              ? 'No starred images yet' 
              : 'Your gallery is empty'
            : 'Trash is empty'
          }
        </h2>
        <p className="text-slate-500 max-w-md mb-6">
          {mode === 'gallery' 
            ? showStarredOnly
              ? 'Images you star will appear here for quick access'
              : 'Generate some amazing images to start building your collection'
            : 'Items you delete will appear here for 30 days before being permanently removed'
          }
        </p>
        {mode === 'gallery' && showStarredOnly && (
          <Button onClick={() => setShowStarredOnly(false)}>
            View all images
          </Button>
        )}
        {mode === 'gallery' && !showStarredOnly && (
          <Button onClick={() => navigate('/')}>
            Create images
          </Button>
        )}
      </div>
    );
  }
  
  return (
    <div>
      <div className="mb-6 flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:justify-between sm:items-center">
        <h1 className="text-2xl font-bold">
          {mode === 'gallery' ? 'Gallery' : 'Trash'}
        </h1>
        
        <div className="flex space-x-2 flex-wrap">
          {/* Only show filter in gallery mode */}
          {mode === 'gallery' && (
            <Button
              variant={showStarredOnly ? 'default' : 'outline'}
              onClick={() => setShowStarredOnly(!showStarredOnly)}
              className="flex items-center space-x-1"
            >
              <Star className={cn("w-4 h-4", showStarredOnly ? "fill-white" : "")} />
              <span>Starred</span>
            </Button>
          )}
          
          {/* Bulk actions when images are selected */}
          {selectedIds.length > 0 && (
            <>
              <span className="text-sm flex items-center px-2">
                {selectedIds.length} selected
              </span>
              
              {mode === 'gallery' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => handleBulkStar(true)}
                  >
                    <Star className="w-4 h-4 mr-2" />
                    <span>Star</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => handleBulkTrash(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    <span>Move to Trash</span>
                  </Button>
                </>
              )}
              
              {mode === 'trash' && (
                <Button
                  variant="outline"
                  onClick={() => handleBulkTrash(false)}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  <span>Restore</span>
                </Button>
              )}
              
              <Button
                variant="ghost"
                onClick={clearSelection}
              >
                Clear
              </Button>
            </>
          )}
          
          {selectedIds.length === 0 && images.length > 0 && (
            <Button
              variant="ghost"
              onClick={selectAll}
            >
              Select All
            </Button>
          )}
        </div>
      </div>
      
      {/* Image grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map(image => {
          const isSelected = selectedIds.includes(image.id);
          
          return (
            <Card key={image.id} className={cn(
              "rounded-lg overflow-hidden transition-all",
              isSelected ? "ring-2 ring-primary" : ""
            )}>
              <div className="relative group">
                <div 
                  className="absolute top-2 left-2 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelection(image.id);
                  }}
                >
                  <Checkbox 
                    checked={isSelected} 
                    className="bg-white/80 border-slate-400"
                  />
                </div>
                
                <img
                  src={image.thumbUrl}
                  alt={image.prompt}
                  className="w-full h-48 object-cover cursor-pointer"
                  onClick={() => toggleSelection(image.id)}
                />
                
                <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {mode === 'gallery' ? (
                    <>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="w-8 h-8 rounded-full bg-white/80 hover:bg-white"
                        onClick={() => handleStar(image.id, !image.starred)}
                      >
                        <Star 
                          className={cn("w-4 h-4", image.starred ? "fill-yellow-400 text-yellow-400" : "")} 
                        />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="w-8 h-8 rounded-full bg-white/80 hover:bg-white"
                        onClick={() => handleTrash(image.id, true)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="secondary"
                      size="icon"
                      className="w-8 h-8 rounded-full bg-white/80 hover:bg-white"
                      onClick={() => handleTrash(image.id, false)}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
              
              <CardContent className="p-3">
                <p className="text-xs text-slate-600 line-clamp-2 mb-2">{image.prompt}</p>
                
                <div className="flex justify-between items-center">
                  <div className="text-xs text-slate-500">
                    {new Date(image.createdAt).toLocaleDateString()}
                  </div>
                  
                  <div className="flex space-x-1">
                    {mode === 'gallery' && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-7 h-7 p-0"
                              onClick={() => handleEdit(image)}
                            >
                              <PenTool className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit this image</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-7 h-7 p-0"
                            onClick={() => handleDownload(image)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Download</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default SimpleGalleryPage;