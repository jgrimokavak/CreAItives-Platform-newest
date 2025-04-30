import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useEditor } from '@/context/EditorContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Loader2, FolderOpen, Star, Trash2, RotateCcw, Trash, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import ImageCard from '@/components/ImageCard';

interface GalleryPageProps {
  mode?: 'gallery' | 'trash';
}

// Use GeneratedImage type from shared definition
import { GeneratedImage } from "@/types/image";

// Extend the GeneratedImage with any gallery-specific properties
interface GalleryImage {
  id: string;
  prompt: string;
  width?: string | number;
  height?: string | number;
  model: string;
  size: string;
  quality?: string;
  createdAt: string;
  url?: string;
  fullUrl: string;
  thumbUrl: string;
  sourceThumb?: string; // 128px thumbnail of the source image
  sourceImage?: string; // Full-resolution source image
  starred?: boolean;
  deletedAt: string | null;
}

const SimpleGalleryPage: React.FC<GalleryPageProps> = ({ mode = 'gallery' }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearchTerm = useDebounce(searchInput, 500); // 500ms delay
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const { setMode, setSourceImages } = useEditor();
  
  // Real data from database
  const [images, setImages] = useState<GalleryImage[]>([]);
  
  // Fetch gallery images
  const fetchImages = async () => {
    console.log(`fetchImages called with search term: "${debouncedSearchTerm}"`);
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (showStarredOnly) params.append('starred', 'true');
      if (mode === 'trash') params.append('trash', 'true');
      if (debouncedSearchTerm && debouncedSearchTerm.trim() !== '') {
        params.append('q', debouncedSearchTerm.trim()); // Backend expects 'q' parameter
        console.log(`Added search parameter q=${debouncedSearchTerm.trim()}`);
      }
      
      const url = `/api/gallery?${params.toString()}`;
      console.log('Fetching images with URL:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Error fetching gallery: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Gallery data received: ${data.items?.length || 0} images`);
      
      // Ensure images have proper URLs
      const formattedImages = data.items || [];
      
      // Clear selection when filter changes
      setSelectedIds([]);
      
      // Update the images
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
  
  // Handle copy prompt
  const handleCopyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast({
      title: 'Prompt copied',
      description: 'The prompt has been copied to your clipboard'
    });
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
      console.log(`Star action: id=${id}, current starred status=${starred}`);
      
      // The API requires "starred" to be the NEW state we want, not the current state
      const newStarredState = !starred;
      console.log(`Setting image ${id} star status to ${newStarredState}`);
      
      // Update the UI optimistically
      setImages(prev =>
        prev.map(img => img.id === id ? { ...img, starred: newStarredState } : img)
      );
      
      // Make the actual API call
      const response = await fetch(`/api/image/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ starred: newStarredState })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update image');
      }
      
      const data = await response.json();
      console.log('Star response:', data);
      
      // If we're in starred mode and unstarring, refresh the gallery to remove it
      if (showStarredOnly && !newStarredState) {
        console.log('Refreshing gallery after unstarring in starred mode');
        fetchImages();
      }
      
      toast({
        title: newStarredState ? 'Image starred' : 'Image unmarked',
        description: newStarredState 
          ? 'The image has been added to your starred items' 
          : 'The image has been removed from your starred items'
      });
    } catch (error) {
      console.error('Error starring image:', error);
      
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
  
  // Handle delete/restore/permanent delete
  const handleTrash = async (id: string, isInTrash: boolean, permanent: boolean = false) => {
    try {
      // Update UI optimistically
      if (permanent) {
        // Permanently delete
        setImages(prev => prev.filter(img => img.id !== id));
      } else if (isInTrash) {
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
          permanent 
            ? { permanentDelete: true } 
            : isInTrash 
              ? { restoreFromTrash: true } 
              : { deleteToTrash: true }
        )
      });
      
      if (!response.ok) {
        throw new Error('Failed to update image');
      }
      
      if (permanent) {
        toast({
          title: 'Image permanently deleted',
          description: 'The image has been permanently removed from the system'
        });
      } else if (isInTrash) {
        toast({
          title: 'Image restored',
          description: 'The image has been restored from trash'
        });
      } else {
        toast({
          title: 'Image moved to trash',
          description: 'The image has been moved to trash'
        });
      }
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
  const handleBulkAction = async (action: 'star' | 'unstar' | 'trash' | 'restore' | 'delete-permanent') => {
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
      } else if (action === 'delete-permanent') {
        // Remove from UI immediately
        setImages(prev => prev.filter(img => !selectedIds.includes(img.id)));
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
          restoreFromTrash: action === 'restore' ? true : undefined,
          permanentDelete: action === 'delete-permanent' ? true : undefined
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
              : action === 'delete-permanent'
                ? 'Images have been permanently deleted'
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
  
  // Separate effect for search term changes
  useEffect(() => {
    // Only search if term is not empty
    if (debouncedSearchTerm !== undefined) {
      console.log(`Search term changed to: ${debouncedSearchTerm}`);
      fetchImages();
    }
  }, [debouncedSearchTerm]);
  
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
          
          {/* Search input */}
          <div className="relative w-full max-w-xs" 
              onClick={(e) => e.stopPropagation()} // Stop click propagation
              onSubmit={(e) => e.preventDefault()} // Prevent any form submission
          >
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search" 
              placeholder="Search by prompt..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-8 h-9 md:w-[200px] lg:w-[300px]"
              onKeyDown={(e) => {
                // Prevent form submission on Enter key
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  return false;
                }
              }}
            />
            {searchInput && (
              <X
                className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={() => setSearchInput('')}
              />
            )}
          </div>
          
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
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to permanently delete these images? This action cannot be undone.')) {
                        handleBulkAction('delete-permanent');
                      }
                    }}
                    className="gap-2 text-destructive hover:text-destructive"
                  >
                    <Trash className="h-4 w-4" />
                    Delete Permanently
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
          <ImageCard
            key={image.id}
            image={{
              ...image,
              url: image.fullUrl || image.url || '', // Ensures url is always a string
              thumbUrl: image.thumbUrl || image.url || '', // Ensures thumbUrl is always available
            }}
            mode={mode}
            onEdit={(img) => handleEdit(image)}
            onDownload={(img) => handleDownload(image)}
            onDelete={(id) => handleTrash(id, false)}
            onStar={handleStar}
            onRestore={(id) => handleTrash(id, true)}
            onCopyPrompt={handleCopyPrompt}
            onSelect={toggleSelection}
            selected={selectedIds.includes(image.id)}
            onClick={() => {
              // Show image in fullscreen when clicked
              const img = document.createElement('div');
              img.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/90';
              img.onclick = () => document.body.removeChild(img);
              
              const imgEl = document.createElement('img');
              imgEl.src = image.fullUrl;
              imgEl.className = 'max-h-[90vh] max-w-[90vw] object-contain';
              
              img.appendChild(imgEl);
              document.body.appendChild(img);
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default SimpleGalleryPage;