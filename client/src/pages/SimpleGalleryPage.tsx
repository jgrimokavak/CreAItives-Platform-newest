import React, { useState, useEffect } from 'react';
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
  width: number | string;
  height: number | string;
  fullUrl: string;
  thumbUrl: string;
  starred: boolean;
  deletedAt: string | null;
  createdAt: string;
  model: string;
  size: string;
  quality?: string;
  url?: string;
}

const SimpleGalleryPage: React.FC<GalleryPageProps> = ({ mode = 'gallery' }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const { setMode, setSourceImages } = useEditor();
  
  // Real data from database
  const [images, setImages] = useState<GalleryImage[]>([]);
  
  // Fetch gallery images
  const fetchImages = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (showStarredOnly) params.append('starred', 'true');
      if (mode === 'trash') params.append('trash', 'true');
      
      const url = `/api/gallery?${params.toString()}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Error fetching gallery: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Gallery data:', data);
      
      // Ensure images have proper URLs
      const formattedImages = data.items || [];
      
      setImages(formattedImages);
    } catch (err) {
      console.error('Error fetching gallery:', err);
      setError('Failed to load gallery images');
      toast({
        variant: 'destructive',
        title: 'Gallery Error',
        description: 'Failed to load images. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };
  
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
    // Set up editor context for edit mode
    setMode('edit');
    setSourceImages([image.fullUrl]);
    navigate('/');
  };
  
  // Handle download
  const handleDownload = async (image: GalleryImage) => {
    try {
      const response = await fetch(image.fullUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      
      const blob = await response.blob();
      
      // Create a temporary link to download the image
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `image-${image.id}.png`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: 'Image downloaded',
        description: 'The image has been saved to your device.'
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        variant: 'destructive',
        title: 'Download failed',
        description: 'There was a problem downloading the image.'
      });
    }
  };
  
  // Handle star/unstar
  const handleStar = async (id: string, starred: boolean) => {
    try {
      // Update the UI optimistically
      setImages(prev =>
        prev.map(img => img.id === id ? { ...img, starred: !starred } : img)
      );
      
      // Make the actual API call
      const response = await fetch(`/api/image/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ starred: !starred })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update image');
      }
      
      toast({
        title: starred ? 'Image unmarked' : 'Image starred',
        description: starred 
          ? 'The image has been removed from your starred items' 
          : 'The image has been added to your starred items'
      });
    } catch (error) {
      // Revert on error
      setImages(prev =>
        prev.map(img => img.id === id ? { ...img, starred } : img)
      );
      
      toast({
        variant: 'destructive',
        title: 'Action failed',
        description: 'There was a problem updating the image.'
      });
    }
  };
  
  // Handle delete/restore
  const handleTrash = async (id: string, isInTrash: boolean) => {
    try {
      // Update UI optimistically
      if (isInTrash) {
        // Restore from trash
        setImages(prev =>
          prev.map(img => img.id === id ? { ...img, deletedAt: null } : img)
        );
      } else {
        // Move to trash
        setImages(prev => prev.filter(img => img.id !== id));
      }
      
      // Make the actual API call
      const response = await fetch(`/api/image/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(
          isInTrash ? { restoreFromTrash: true } : { deleteToTrash: true }
        )
      });
      
      if (!response.ok) {
        throw new Error('Failed to update image');
      }
      
      toast({
        title: isInTrash ? 'Image restored' : 'Image moved to trash',
        description: isInTrash
          ? 'The image has been restored from trash'
          : 'The image has been moved to trash'
      });
    } catch (error) {
      // Revert on error by refreshing the data
      fetchImages();
      
      toast({
        variant: 'destructive',
        title: 'Action failed',
        description: 'There was a problem updating the image.'
      });
    }
  };
  
  // Handle bulk actions
  const handleBulkAction = async (action: 'star' | 'unstar' | 'trash' | 'restore') => {
    if (selectedIds.length === 0) return;
    
    try {
      // Optimistic UI updates
      if (action === 'star' || action === 'unstar') {
        setImages(prev =>
          prev.map(img => selectedIds.includes(img.id) 
            ? { ...img, starred: action === 'star' } 
            : img
          )
        );
      } else if (action === 'trash') {
        setImages(prev => prev.filter(img => !selectedIds.includes(img.id)));
      } else if (action === 'restore') {
        setImages(prev =>
          prev.map(img => selectedIds.includes(img.id) 
            ? { ...img, deletedAt: null } 
            : img
          )
        );
      }
      
      // Make the actual API call
      const response = await fetch('/api/images/bulk', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ids: selectedIds,
          starred: action === 'star' ? true : action === 'unstar' ? false : undefined,
          deleteToTrash: action === 'trash' ? true : undefined,
          restoreFromTrash: action === 'restore' ? true : undefined
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update images');
      }
      
      // Clear selection after successful action
      setSelectedIds([]);
      
      toast({
        title: `${selectedIds.length} images updated`,
        description: action === 'star' 
          ? 'Images have been starred'
          : action === 'unstar'
            ? 'Images have been unmarked'
            : action === 'trash'
              ? 'Images have been moved to trash'
              : 'Images have been restored'
      });
    } catch (error) {
      // Refresh data on error
      fetchImages();
      
      toast({
        variant: 'destructive',
        title: 'Action failed',
        description: 'There was a problem updating the images.'
      });
    }
  };
  
  // Fetch images when component mounts, mode changes, or starred filter changes
  useEffect(() => {
    fetchImages();
    
    // Also refresh gallery when new images are created
    const handleWebSocketMessage = (ev: Event) => {
      fetchImages();
    };
    
    // Listen for custom events that we'll dispatch when websocket messages arrive
    window.addEventListener('gallery-updated', handleWebSocketMessage);
    
    return () => {
      window.removeEventListener('gallery-updated', handleWebSocketMessage);
    };
  }, [mode, showStarredOnly]);
  
  // Empty state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh] text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={fetchImages}>Try Again</Button>
      </div>
    );
  }
  
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
    <div className="pb-20">
      {/* Gallery toolbar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Filters for gallery mode */}
          {mode === 'gallery' && (
            <Button
              variant={showStarredOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowStarredOnly(!showStarredOnly)}
              className="gap-2"
            >
              <Star className={cn(
                "h-4 w-4", 
                showStarredOnly ? "fill-current" : ""
              )} />
              {showStarredOnly ? "Starred Only" : "All Images"}
            </Button>
          )}
          
          {/* Item count */}
          <div className="text-sm text-muted-foreground">
            {selectedIds.length > 0
              ? `${selectedIds.length} selected`
              : `${images.length} ${mode === 'trash' ? 'items' : 'images'}`
            }
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center">
          {/* Selection actions */}
          {selectedIds.length > 0 ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelection}
              >
                Cancel
              </Button>
              
              {mode === 'gallery' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction('star')}
                    className="gap-2"
                  >
                    <Star className="h-4 w-4" />
                    Star
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction('unstar')}
                    className="gap-2"
                  >
                    <Star className="h-4 w-4 fill-current" />
                    Unstar
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction('trash')}
                    className="gap-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </>
              )}
              
              {mode === 'trash' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction('restore')}
                    className="gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Restore
                  </Button>
                </>
              )}
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
              disabled={images.length === 0}
            >
              Select All
            </Button>
          )}
        </div>
      </div>
      
      {/* Gallery grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
        {images.map((image) => (
          <Card key={image.id} className="overflow-hidden group">
            <div className="relative">
              {/* Image thumbnail */}
              <img 
                src={image.thumbUrl} 
                alt={image.prompt}
                className="object-cover w-full aspect-square rounded-t-md"
                loading="lazy"
              />
              
              {/* Selection overlay */}
              <div className="absolute top-2 left-2">
                <Checkbox
                  checked={selectedIds.includes(image.id)}
                  onCheckedChange={() => toggleSelection(image.id)}
                />
              </div>
              
              {/* Actions overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-full bg-white/20 backdrop-blur-sm text-white hover:text-white hover:bg-white/30"
                        onClick={() => handleEdit(image)}
                      >
                        <PenTool className="h-4 w-4" />
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
                        className="h-9 w-9 rounded-full bg-white/20 backdrop-blur-sm text-white hover:text-white hover:bg-white/30"
                        onClick={() => handleDownload(image)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Download</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                {mode === 'gallery' && (
                  <>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className={cn(
                              "h-9 w-9 rounded-full bg-white/20 backdrop-blur-sm text-white hover:text-white hover:bg-white/30",
                              image.starred && "text-yellow-300 hover:text-yellow-300"
                            )}
                            onClick={() => handleStar(image.id, image.starred)}
                          >
                            <Star className={cn(
                              "h-4 w-4",
                              image.starred && "fill-current"
                            )} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{image.starred ? "Unstar" : "Star"}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 rounded-full bg-white/20 backdrop-blur-sm text-white hover:text-white hover:bg-white/30 hover:text-red-400"
                            onClick={() => handleTrash(image.id, false)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </>
                )}
                
                {mode === 'trash' && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-full bg-white/20 backdrop-blur-sm text-white hover:text-white hover:bg-white/30"
                          onClick={() => handleTrash(image.id, true)}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Restore</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              
              {/* Starred indicator */}
              {image.starred && mode === 'gallery' && (
                <div className="absolute top-2 right-2 text-yellow-300">
                  <Star className="h-5 w-5 fill-current" />
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
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SimpleGalleryPage;