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
import { Loader2, FolderOpen, Star, Trash2, RotateCcw, Trash, Search, X, Sparkles, CheckSquare, SquareX } from 'lucide-react';
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
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState(''); // This will be used for actual searching
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState<'none' | 'selecting'>('none');
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<{
    models: string[];
    starred: boolean;
  }>({
    models: [],
    starred: false
  });
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const { setMode, setSourceImages } = useEditor();
  
  // Real data from database
  const [images, setImages] = useState<GalleryImage[]>([]);
  
  // Handle search submission
  const handleSearch = () => {
    setSearchTerm(searchInput.trim());
  };
  
  // Handle search clear
  const clearSearch = () => {
    setSearchInput('');
    setSearchTerm('');
  };
  
  // Fetch gallery images
  const fetchImages = async () => {
    console.log(`fetchImages called with search term: "${searchTerm}"`);
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (activeFilters.starred) params.append('starred', 'true');
      if (mode === 'trash') params.append('trash', 'true');
      if (searchTerm && searchTerm.trim() !== '') {
        params.append('q', searchTerm.trim()); // Backend expects 'q' parameter
        console.log(`Added search parameter q=${searchTerm.trim()}`);
      }
      
      const url = `/api/gallery?${params.toString()}`;
      console.log('Fetching images with URL:', url);
      
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Gallery fetch failed: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Error fetching gallery: ${response.status} - ${errorText}`);
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
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to load gallery images: ${errorMessage}`);
      toast({
        variant: 'destructive',
        title: 'Gallery Error',
        description: `Failed to load images: ${errorMessage}`
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Toggle selection
  // Track last selected image for shift-click range selection
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  // Toggle selection of an image
  const toggleSelection = (id: string, shiftKey = false) => {
    if (selectionMode === 'none') {
      // If not in selection mode, entering it automatically selects the image
      setSelectionMode('selecting');
      setSelectedIds([id]);
      setLastSelectedId(id);
    } else if (shiftKey && lastSelectedId) {
      // Handle shift-click range selection
      const allImageIds = filteredImages.map(img => img.id);
      const currentIndex = allImageIds.indexOf(id);
      const lastIndex = allImageIds.indexOf(lastSelectedId);
      
      if (currentIndex !== -1 && lastIndex !== -1) {
        // Get the range of ids between last selected and current
        const start = Math.min(currentIndex, lastIndex);
        const end = Math.max(currentIndex, lastIndex);
        const rangeIds = allImageIds.slice(start, end + 1);
        
        // Add the range to the selection
        setSelectedIds(prev => {
          // Create a Set and convert back to array to remove duplicates
          const set = new Set([...prev, ...rangeIds]);
          return Array.from(set);
        });
        setLastSelectedId(id);
      }
    } else {
      // In selection mode, toggle the selection status
      setSelectedIds(prev => {
        const newSelection = prev.includes(id) 
          ? prev.filter(i => i !== id) 
          : [...prev, id];
        
        return newSelection;
      });
      setLastSelectedId(id);
    }
  };
  
  // Select all images
  const selectAll = () => {
    setSelectionMode('selecting');
    setSelectedIds(images.map(img => img.id));
  };
  
  // Clear selection
  const clearSelection = () => {
    setSelectedIds([]);
    setSelectionMode('none');
  };
  
  // Handle edit
  const handleEdit = (image: GalleryImage) => {
    // Set up editor context for edit mode
    setMode('edit');
    setSourceImages([image.fullUrl]);
    navigate('/create?mode=edit');
  };
  
  // Handle copy prompt
  const handleCopyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast({
      title: 'Prompt copied',
      description: 'The prompt has been copied to your clipboard'
    });
  };
  
  // Navigate to upscale page with the selected image
  const handleUpscale = (image: GalleryImage) => {
    // Navigate to upscale page with the image URL as a query parameter
    navigate(`/upscale?sourceUrl=${encodeURIComponent(image.fullUrl || image.url || '')}`);
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
      
      // Create a clean filename from the prompt
      const cleanPrompt = image.prompt
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')    // Remove non-word chars
        .replace(/\s+/g, '_')         // Replace spaces with underscores
        .replace(/_+/g, '_')          // Replace multiple underscores with single ones
        .substring(0, 50);            // Limit length
        
      // Make sure we have a valid filename
      const filename = cleanPrompt || 'image';
      a.download = `${filename}.png`;
      
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
      if (activeFilters.starred && !newStarredState) {
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
    
    // Store selected IDs locally to avoid referencing the state that might change
    const idsToUpdate = [...selectedIds];
    console.log(`Bulk action '${action}' on ${idsToUpdate.length} images:`, idsToUpdate);
    
    try {
      // Optimistic UI updates
      if (action === 'star' || action === 'unstar') {
        const newStarredValue = action === 'star';
        setImages(prev =>
          prev.map(img => idsToUpdate.includes(img.id) 
            ? { ...img, starred: newStarredValue } 
            : img
          )
        );
      } else if (action === 'trash') {
        setImages(prev => prev.filter(img => !idsToUpdate.includes(img.id)));
      } else if (action === 'restore') {
        setImages(prev =>
          prev.map(img => idsToUpdate.includes(img.id) 
            ? { ...img, deletedAt: null } 
            : img
          )
        );
      } else if (action === 'delete-permanent') {
        // Remove from UI immediately
        setImages(prev => prev.filter(img => !idsToUpdate.includes(img.id)));
      }
      
      // Make the actual API call
      const payload = {
        ids: idsToUpdate,
        starred: action === 'star' ? true : action === 'unstar' ? false : undefined,
        deleteToTrash: action === 'trash' ? true : undefined,
        restoreFromTrash: action === 'restore' ? true : undefined,
        permanentDelete: action === 'delete-permanent' ? true : undefined
      };
      
      console.log('Sending bulk update payload:', payload);
      
      const response = await fetch('/api/images/bulk', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update images');
      }
      
      // Clear selection after successful action
      setSelectedIds([]);
      
      toast({
        title: `${idsToUpdate.length} images updated`,
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
  
  // Extract unique metadata values from images
  const getFilterOptions = (images: GalleryImage[]) => {
    const models = new Set<string>();
    
    // Add car-generator model to the options even if there are no images with this model yet
    models.add('car-generator');
    
    images.forEach(img => {
      if (img.model) models.add(img.model);
    });
    
    return {
      models: Array.from(models).sort()
    };
  };
  
  // Apply filters to images
  const applyFilters = (images: GalleryImage[]) => {
    if (!activeFilters.models.length) {
      return images;
    }
    
    return images.filter(img => {
      const modelMatch = activeFilters.models.length === 0 || activeFilters.models.includes(img.model);
      return modelMatch;
    });
  };
  
  // Toggle filter selection
  const toggleFilter = (type: 'models', value: string) => {
    setActiveFilters(prev => {
      const current = [...prev[type]];
      const index = current.indexOf(value);
      
      if (index >= 0) {
        current.splice(index, 1);
      } else {
        current.push(value);
      }
      
      return {
        ...prev,
        [type]: current
      };
    });
  };
  
  // Clear all filters
  const clearFilters = () => {
    setActiveFilters({
      models: [],
      starred: false
    });
  };

  // Final filtered images
  const filteredImages = applyFilters(images);
  
  // Get available filter options
  const filterOptions = getFilterOptions(images);
  
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
  }, [mode, activeFilters.starred]);
  
  // Separate effect for search term changes
  useEffect(() => {
    console.log(`Search term changed to: "${searchTerm}"`);
    
    // Always fetch images when the search term changes
    // This allows showing all images when search is cleared
    fetchImages();
  }, [searchTerm]);
  
  // Keyboard shortcuts
  useEffect(() => {
    // Global keyboard event handler
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape key to exit selection mode
      if (e.key === 'Escape' && selectionMode === 'selecting') {
        clearSelection();
      }
      
      // Ctrl/Cmd + A to select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && filteredImages.length > 0) {
        // Only if we're in the gallery page, not in an input field
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault(); // Prevent default browser select all
          selectAll();
        }
      }
    };
    
    // Add event listener
    document.addEventListener('keydown', handleKeyDown);
    
    // Cleanup on unmount
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectionMode, filteredImages.length, clearSelection, selectAll]);
  
  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh]">
        <div className="relative w-16 h-16 mb-4">
          <Loader2 className="w-16 h-16 animate-spin text-primary/30" />
          <Loader2 className="w-16 h-16 animate-spin text-primary absolute top-0 left-0 opacity-70" style={{animationDuration: '3s'}} />
        </div>
        <p className="text-muted-foreground">Loading gallery...</p>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh] text-center">
        <div className="bg-red-50 border border-red-100 rounded-lg p-8 shadow-sm max-w-md">
          <p className="text-red-500 mb-4 text-lg">{error}</p>
          <Button onClick={fetchImages} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }
  
  // Empty state
  if (images.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh] text-center p-4">
        <div className="bg-background border border-border rounded-xl p-8 shadow-sm max-w-md">
          <div className="bg-muted/30 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <FolderOpen className="w-12 h-12 text-muted-foreground/50" />
          </div>
          
          <h2 className="text-xl font-semibold mb-3">
            {searchTerm 
              ? 'No results found'
              : mode === 'gallery' 
                ? activeFilters.starred 
                  ? 'No starred images yet' 
                  : 'Your gallery is empty'
                : 'Trash is empty'
            }
          </h2>
          
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            {searchTerm 
              ? `No images matching "${searchTerm}" were found`
              : mode === 'gallery' 
                ? activeFilters.starred
                  ? 'Images you star will appear here for quick access'
                  : 'Generate some amazing images to start building your collection'
                : 'Items you delete will appear here for 30 days before being permanently removed'
            }
          </p>
          
          <div className="flex flex-wrap gap-3 justify-center">
            {searchTerm && (
              <Button onClick={clearSearch} variant="outline" className="gap-2">
                <X className="h-4 w-4" />
                Clear search
              </Button>
            )}
            
            {mode === 'gallery' && activeFilters.starred && !searchTerm && (
              <Button 
                onClick={() => setActiveFilters(prev => ({...prev, starred: false}))} 
                variant="outline" 
                className="gap-2"
              >
                <FolderOpen className="h-4 w-4" />
                View all images
              </Button>
            )}
            
            {mode === 'gallery' && !activeFilters.starred && !searchTerm && (
              <Button onClick={() => navigate('/')} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Create images
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="pb-20">
      {/* Gallery toolbar */}
      <div className={cn(
        "sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border p-4 flex flex-col gap-3",
        selectionMode === 'selecting' && "bg-primary/5"
      )}>
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Page title and count */}
            <div className="flex items-center mr-2">
              <h1 className="text-lg font-medium mr-2">
                {selectionMode === 'selecting' 
                  ? 'Select Images' 
                  : mode === 'gallery' 
                    ? 'Gallery' 
                    : 'Trash'
                }
              </h1>
              <span className={cn(
                "text-sm px-2.5 py-0.5 rounded-full",
                selectionMode === 'selecting'
                  ? "bg-primary/20 text-primary font-medium"
                  : "bg-muted/50 text-muted-foreground"
              )}>
                {selectedIds.length > 0
                  ? `${selectedIds.length} selected`
                  : `${filteredImages.length} ${mode === 'trash' ? 'items' : 'images'}`
                }
              </span>
              
              {/* Selection mode indicator */}
              {selectionMode === 'selecting' && (
                <span className="ml-2 text-xs text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full">
                  Selection Mode 
                  <span className="hidden sm:inline"> • Shift+click for range selection • Esc to cancel</span>
                </span>
              )}
            </div>
            
            {/* Filters for gallery mode */}
            {mode === 'gallery' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={activeFilters.starred || activeFilters.models.length > 0 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterOpen(!filterOpen)}
                      className="gap-2"
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="15" 
                        height="15" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      >
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                      </svg>
                      Filters
                      {(activeFilters.starred || activeFilters.models.length > 0) && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                          {(activeFilters.starred ? 1 : 0) + activeFilters.models.length}
                        </span>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Filter by star status or model</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* Search input */}
            <form 
              className="relative flex-1 max-w-md flex items-center gap-2"
              onClick={(e) => e.stopPropagation()} 
              onSubmit={(e) => {
                e.preventDefault(); // Prevent default form submission
                handleSearch(); // Use our custom handler instead
                return false;
              }}
            >
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text" 
                  placeholder="Search by prompt"
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                  }}
                  className="pl-8 pr-10 h-9 md:w-[200px] lg:w-[300px] border-muted focus:border-primary transition-colors"
                  onKeyDown={(e) => {
                    // Process Enter key to trigger search
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                      if (searchInput.trim()) {
                        handleSearch();
                      }
                      return false;
                    }
                  }}
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      clearSearch();
                    }}
                    className="absolute right-2 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/80 inline-flex items-center justify-center"
                    aria-label="Clear search"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <Button 
                type="submit" 
                size="sm"
                variant="secondary"
                className="h-9"
                disabled={!searchInput.trim()}
              >
                Search
              </Button>
            </form>
          </div>
          
          <div className="flex flex-wrap gap-2 items-center">
            {/* Selection actions */}
            {selectedIds.length > 0 ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </Button>
                
                {mode === 'gallery' && (
                  <>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleBulkAction('star')}
                            className="h-9 w-9 p-0"
                          >
                            <Star className="h-4 w-4 fill-current text-yellow-400" />
                            <span className="sr-only">Star</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Star selected</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleBulkAction('unstar')}
                            className="h-9 w-9 p-0"
                          >
                            <Star className="h-4 w-4" />
                            <span className="sr-only">Unstar</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Unstar selected</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleBulkAction('trash')}
                            className="h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Move to trash</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </>
                )}
                
                {mode === 'trash' && (
                  <>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleBulkAction('restore')}
                            className="h-9 w-9 p-0"
                          >
                            <RotateCcw className="h-4 w-4" />
                            <span className="sr-only">Restore</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Restore selected</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to permanently delete ${selectedIds.length} images? This action cannot be undone.`)) {
                                handleBulkAction('delete-permanent');
                              }
                            }}
                            className="h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash className="h-4 w-4" />
                            <span className="sr-only">Delete Permanently</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Delete permanently</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </>
                )}
              </>
            ) : (
              <>
                {selectionMode === 'selecting' ? (
                  <div className="flex items-center gap-2">
                    {/* Select All button */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={selectAll}
                            disabled={images.length === 0 || selectedIds.length === images.length}
                            className="gap-2"
                          >
                            <CheckSquare className="h-4 w-4" />
                            <span className="hidden sm:inline">Select All</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Select all visible images</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    {/* Clear Selection button */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedIds([])}
                            disabled={selectedIds.length === 0}
                            className="gap-2"
                          >
                            <SquareX className="h-4 w-4" />
                            <span className="hidden sm:inline">Clear Selection</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Clear current selection</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    {/* Exit Selection Mode button */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearSelection}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            Exit Selection
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Exit selection mode</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                ) : (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Enter selection mode
                            setSelectionMode('selecting');
                          }}
                          disabled={images.length === 0}
                          className="gap-2"
                        >
                          <CheckSquare className="h-4 w-4 mr-1" />
                          <span className="hidden sm:inline">Select</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">Enter selection mode</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </>
            )}
          </div>
        </div>
        
        {/* Filter panel */}
        {filterOpen && (
          <div className="px-1 py-3 mt-1 border-t border-border animate-in fade-in-50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Filter by</h3>
              <div className="flex items-center gap-2">
                {(activeFilters.models.length > 0 || activeFilters.starred) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear filters
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilterOpen(false)}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close filters</span>
                </Button>
              </div>
            </div>
            
            {/* Starred filter - shown at the top for prominence */}
            <div className="mb-4">
              <div className="flex items-center gap-2 h-10">
                <Button
                  variant={activeFilters.starred ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilters(prev => ({...prev, starred: !prev.starred}))}
                  className="gap-2 h-9"
                >
                  <Star className={cn(
                    "h-4 w-4", 
                    activeFilters.starred ? "fill-current text-yellow-400" : ""
                  )} />
                  {activeFilters.starred ? "Showing Starred Only" : "Show Starred Images"}
                </Button>
                
                {activeFilters.starred && (
                  <p className="text-xs text-muted-foreground">
                    Only showing images you've marked with a star
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {/* Models */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground mb-1.5">Models</h4>
                <div className="flex flex-wrap gap-1.5">
                  {filterOptions.models.map(model => (
                    <Button
                      key={model}
                      variant={activeFilters.models.includes(model) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleFilter('models', model)}
                      className={cn(
                        "h-7 px-2 text-xs rounded-full",
                        !activeFilters.models.includes(model) && (
                          model === "car-generator" ? "border-amber-200 text-amber-700 bg-amber-50/30" :
                          model === "gpt-image-1" ? "border-blue-200 text-blue-700 bg-blue-50/30" :
                          model === "imagen-3" ? "border-emerald-200 text-emerald-700 bg-emerald-50/30" :
                          model === "flux-pro" ? "border-violet-200 text-violet-700 bg-violet-50/30" : ""
                        )
                      )}
                    >
                      {model}
                    </Button>
                  ))}
                  {filterOptions.models.length === 0 && (
                    <p className="text-xs text-muted-foreground">No models found</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="bg-muted/50 px-1.5 py-0.5 rounded font-mono">
                {filteredImages.length}
              </span> 
              <span>
                {filteredImages.length === 1 ? 'result' : 'results'} 
                {(activeFilters.starred || activeFilters.models.length > 0) ? ' with applied filters' : ''}
              </span>
            </div>
          </div>
        )}
      </div>
      
      {/* Gallery grid */}
      <div className={cn(
        "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 p-6",
        selectionMode === 'selecting' && "cursor-pointer"
      )}>
        {filteredImages.map((image) => (
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
            onUpscale={() => handleUpscale(image)}
            onSelect={(id, shiftKey = false) => toggleSelection(id, shiftKey)}
            selected={selectedIds.includes(image.id)}
            selectionMode={selectionMode}
            onClick={(e) => {
              // Check if e exists (handle the case when it's undefined)
              if (!e) return;
              
              // In selection mode, clicking the card toggles selection
              if (selectionMode === 'selecting') {
                toggleSelection(image.id, e.shiftKey);
                return;
              }
              
              // Regular fullscreen view when not in selection mode
              const img = document.createElement('div');
              img.className = 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95';
              img.onclick = () => document.body.removeChild(img);
              
              const imgEl = document.createElement('img');
              imgEl.src = image.fullUrl;
              imgEl.className = 'max-h-[85vh] max-w-[90vw] object-contain';
              
              const caption = document.createElement('div');
              caption.className = 'mt-3 text-white/90 text-sm max-w-[80%] text-center';
              caption.textContent = image.prompt;
              
              img.appendChild(imgEl);
              img.appendChild(caption);
              document.body.appendChild(img);
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default SimpleGalleryPage;