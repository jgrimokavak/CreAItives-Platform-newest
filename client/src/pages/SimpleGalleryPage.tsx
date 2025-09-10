import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useEditor } from '@/context/EditorContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useFilterOptions } from '@/hooks/useFilterOptions';
import { useGalleryData, type GalleryImage as GalleryImageType, type GalleryOptions, type GalleryFilters } from '@/hooks/useGalleryData';
import { queryClient } from '@/lib/queryClient';
import { Loader2, FolderOpen, Star, Trash2, RotateCcw, Trash, Search, X, Sparkles, CheckSquare, SquareX, Image } from 'lucide-react';
import { cn } from '@/lib/utils';
import ImageCard from '@/components/ImageCard';
import { 
  FilterContainer, 
  ModelFilter, 
  AspectRatioFilter, 
  ResolutionFilter, 
  DateRangeFilter,
  useFilters,
  AllFilters
} from '@/components/gallery/FilterComponents';
import { DateRange } from 'react-day-picker';

interface GalleryPageProps {
  mode?: 'gallery' | 'trash';
}

// Use GalleryImage type from the useGalleryData hook
type GalleryImage = GalleryImageType;

// Compact number formatter for large counts
const formatCompactNumber = (num: number): string => {
  if (num < 1000) return num.toString();
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(num);
};

const SimpleGalleryPage: React.FC<GalleryPageProps> = ({ mode = 'gallery' }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState(''); // This will be used for actual searching
  const [selectionMode, setSelectionMode] = useState<'none' | 'selecting'>('none');
  const [starred, setStarred] = useState(false); // Separate starred state for existing functionality
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const { setMode, setSourceImages } = useEditor();
  
  // Initialize filters from URL parameters
  const getInitialFiltersFromURL = (): Partial<AllFilters> => {
    const params = new URLSearchParams(window.location.search);
    
    return {
      models: params.get('models')?.split(',').filter(Boolean) || [],
      aspectRatios: params.get('aspectRatios')?.split(',').filter(Boolean) || [],
      resolutions: params.get('resolutions')?.split(',').filter(Boolean) || [],
      dateRange: (() => {
        const from = params.get('dateFrom');
        const to = params.get('dateTo');
        if (from || to) {
          return {
            from: from ? new Date(from) : undefined,
            to: to ? new Date(to) : undefined,
          };
        }
        return undefined;
      })()
    };
  };
  
  // Filter state management with URL synchronization
  const filterState = useFilters(getInitialFiltersFromURL());
  const { filters, updateModels, updateAspectRatios, updateResolutions, updateDateRange, clearAllFilters, activeFilterCount } = filterState;
  
  // Filter options data
  const { filterOptions, isLoading: filtersLoading, error: filtersError, models, aspectRatios, resolutions } = useFilterOptions();
  
  // Gallery data using React Query
  const galleryOptions: GalleryOptions = {
    starred,
    trash: mode === 'trash',
    searchQuery: searchTerm,
    filters: {
      models: filters.models,
      aspectRatios: filters.aspectRatios,
      resolutions: filters.resolutions,
      dateRange: filters.dateRange
    }
  };
  
  const {
    images,
    totalCount,
    isLoading,
    isError: hasError,
    error: galleryError,
    isFetching,
    isFetchingNextPage: loadingMore,
    hasNextPage,
    fetchNextPage,
    refetch: refetchGallery
  } = useGalleryData(galleryOptions);
  
  // Convert React Query error to string for compatibility
  const errorMessage = hasError && galleryError ? galleryError.message : null;
  
  // URL synchronization: Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // Update filter parameters
    if (filters.models.length > 0) {
      params.set('models', filters.models.join(','));
    } else {
      params.delete('models');
    }
    
    if (filters.aspectRatios.length > 0) {
      params.set('aspectRatios', filters.aspectRatios.join(','));
    } else {
      params.delete('aspectRatios');
    }
    
    if (filters.resolutions.length > 0) {
      params.set('resolutions', filters.resolutions.join(','));
    } else {
      params.delete('resolutions');
    }
    
    if (filters.dateRange?.from) {
      params.set('dateFrom', filters.dateRange.from.toISOString());
    } else {
      params.delete('dateFrom');
    }
    
    if (filters.dateRange?.to) {
      params.set('dateTo', filters.dateRange.to.toISOString());
    } else {
      params.delete('dateTo');
    }
    
    // Preserve existing search and mode parameters
    if (searchTerm) {
      params.set('q', searchTerm);
    } else {
      params.delete('q');
    }
    
    if (starred) {
      params.set('starred', 'true');
    } else {
      params.delete('starred');
    }
    
    // Update URL without triggering a page reload
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
  }, [filters, searchTerm, starred]);
  
  // Initialize search and starred from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSearch = params.get('q');
    const urlStarred = params.get('starred') === 'true';
    
    if (urlSearch) {
      setSearchInput(urlSearch);
      setSearchTerm(urlSearch);
    }
    
    if (urlStarred) {
      setStarred(true);
    }
  }, []);
  
  
  // Handle search submission
  const handleSearch = () => {
    setSearchTerm(searchInput.trim());
  };
  
  // Handle search clear
  const clearSearch = () => {
    setSearchInput('');
    setSearchTerm('');
  };
  
  // Handle loading next page with React Query
  const loadNextPage = () => {
    if (hasNextPage && !loadingMore) {
      fetchNextPage();
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
      const allImageIds = images.map(img => img.id);
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
  
  // Select all visible images
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
      
      // Optimistic update will be handled by React Query cache invalidation
      
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
      if (starred && !newStarredState) {
        console.log('Refreshing gallery after unstarring in starred mode');
        queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
      }
      
      toast({
        title: newStarredState ? 'Image starred' : 'Image unmarked',
        description: newStarredState 
          ? 'The image has been added to your starred items' 
          : 'The image has been removed from your starred items'
      });
    } catch (error) {
      console.error('Error starring image:', error);
      
      // Error will trigger a refetch via React Query
      
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
      // Optimistic updates will be handled by React Query cache invalidation
      
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
      queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
      
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
      // Optimistic updates will be handled by React Query cache invalidation
      
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
      queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
      
      toast({
        variant: 'destructive',
        title: 'Action failed',
        description: 'There was a problem updating the images.'
      });
    }
  };
  
  // Clear all filters and reset search
  const handleClearAllFilters = () => {
    clearAllFilters();
    setSearchInput('');
    setSearchTerm('');
    setStarred(false);
  };
  

  // All filtering is handled server-side by React Query
  
  // Total active filter count including starred state
  const totalActiveFilterCount = activeFilterCount + (starred ? 1 : 0);
  
  // Handle gallery updates from websocket events
  useEffect(() => {
    const handleWebSocketMessage = (ev: Event) => {
      // Invalidate and refetch gallery data when new images are created
      queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
    };
    
    // Listen for custom events that we'll dispatch when websocket messages arrive
    window.addEventListener('gallery-updated', handleWebSocketMessage);
    
    return () => {
      window.removeEventListener('gallery-updated', handleWebSocketMessage);
    };
  }, []);
  
  // Keyboard shortcuts
  useEffect(() => {
    // Global keyboard event handler
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape key to exit selection mode
      if (e.key === 'Escape' && selectionMode === 'selecting') {
        clearSelection();
      }
      
      // Ctrl/Cmd + A to select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && images.length > 0) {
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
  }, [selectionMode, images.length, clearSelection, selectAll]);
  
  // Loading state - show loading for initial load only, not for filter changes
  if (isLoading && images.length === 0) {
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
  if (errorMessage) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh] text-center">
        <div className="bg-red-50 border border-red-100 rounded-lg p-8 shadow-sm max-w-md">
          <p className="text-red-500 mb-4 text-lg">{errorMessage}</p>
          <Button onClick={() => refetchGallery()} className="gap-2">
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
                ? starred 
                  ? 'No starred images yet' 
                  : 'Your gallery is empty'
                : 'Trash is empty'
            }
          </h2>
          
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            {searchTerm 
              ? `No images matching "${searchTerm}" were found`
              : mode === 'gallery' 
                ? starred
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
            
            {mode === 'gallery' && starred && !searchTerm && (
              <Button 
                onClick={() => setStarred(false)} 
                variant="outline" 
                className="gap-2"
              >
                <FolderOpen className="h-4 w-4" />
                View all images
              </Button>
            )}
            
            {mode === 'gallery' && !starred && !searchTerm && (
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
        selectionMode === 'selecting' && "bg-primary/5",
        isFetching && "opacity-75 transition-opacity"
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
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span 
                      className={cn(
                        "text-sm px-2.5 py-0.5 rounded-full flex items-center gap-1.5",
                        selectionMode === 'selecting'
                          ? "bg-primary/20 text-primary font-medium"
                          : "bg-muted/50 text-muted-foreground"
                      )}
                      data-testid="text-count"
                      title={`${totalCount} ${mode === 'trash' ? 'items' : 'images'} total`}
                      aria-live="polite"
                    >
                      {/* Context-aware icon */}
                      {selectionMode === 'selecting' ? (
                        <CheckSquare className="h-3.5 w-3.5" />
                      ) : mode === 'trash' ? (
                        <Trash2 className="h-3.5 w-3.5" />
                      ) : starred ? (
                        <Star className="h-3.5 w-3.5 fill-current" />
                      ) : (
                        <Image className="h-3.5 w-3.5" />
                      )}
                      
                      {/* Content based on context */}
                      {selectionMode === 'selecting' ? (
                        selectedIds.length > 0 
                          ? `${selectedIds.length}/${formatCompactNumber(totalCount)}`
                          : formatCompactNumber(totalCount)
                      ) : (
                        formatCompactNumber(totalCount)
                      )}
                      
                      {/* Results indicator when filtered */}
                      {(searchTerm || starred) && selectionMode !== 'selecting' && (
                        <span className="text-xs opacity-70">• results</span>
                      )}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="start">
                    <div className="text-xs space-y-1">
                      <div className="font-medium">
                        {totalCount.toLocaleString()} {mode === 'trash' ? 'items' : 'images'} total
                      </div>
                      <div className="text-muted-foreground">
                        {images.length} loaded on this page
                      </div>
                      {(searchTerm || starred) && (
                        <div className="text-muted-foreground border-t border-border pt-1 mt-1">
                          <div>Filtered by:</div>
                          {searchTerm && <div>• Search: "{searchTerm.length > 20 ? searchTerm.substring(0, 20) + '...' : searchTerm}"</div>}
                          {starred && <div>• Starred images only</div>}
                          {mode === 'trash' && <div>• Trash items</div>}
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {/* Selection mode indicator */}
              {selectionMode === 'selecting' && (
                <span className="ml-2 text-xs text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full">
                  Selection Mode 
                  <span className="hidden sm:inline"> • Shift+click for range selection • Esc to cancel</span>
                </span>
              )}
            </div>
            
            {/* Starred toggle for quick access */}
            {mode === 'gallery' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={starred ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStarred(!starred)}
                      className="gap-2"
                      data-testid="button-starred-toggle"
                    >
                      <Star className={cn(
                        "h-4 w-4", 
                        starred ? "fill-current text-yellow-400" : ""
                      )} />
                      {starred ? 'Starred Only' : 'Show Starred'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Toggle starred images filter</TooltipContent>
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
        
      </div>
      
      {/* Comprehensive Filter Bar */}
      {mode === 'gallery' && (
        <FilterContainer
          onClearAll={handleClearAllFilters}
          activeFilterCount={totalActiveFilterCount}
          className="border-b"
          data-testid="filter-container"
        >
          <ModelFilter
            value={filters.models}
            onChange={updateModels}
            options={models}
            data-testid="filter-models"
          />
          <AspectRatioFilter
            value={filters.aspectRatios}
            onChange={updateAspectRatios}
            options={aspectRatios}
            isLoading={filtersLoading}
            error={filtersError}
            data-testid="filter-aspect-ratios"
          />
          <ResolutionFilter
            value={filters.resolutions}
            onChange={updateResolutions}
            options={resolutions}
            isLoading={filtersLoading}
            error={filtersError}
            data-testid="filter-resolutions"
          />
          <DateRangeFilter
            value={filters.dateRange}
            onChange={updateDateRange}
            data-testid="filter-date-range"
          />
          {/* Starred toggle integrated into filters */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={starred ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStarred(!starred)}
                  className={cn(
                    "h-9 px-3 text-sm gap-2",
                    starred && "border-primary bg-primary/10"
                  )}
                  data-testid="filter-starred"
                >
                  <Star className={cn(
                    "h-4 w-4", 
                    starred ? "fill-current text-yellow-400" : ""
                  )} />
                  <span>Starred</span>
                  {starred && (
                    <span className="h-5 px-1.5 text-xs bg-primary/20 rounded-full">
                      Active
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Show only starred images</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </FilterContainer>
      )}
      
      {/* Gallery grid */}
      <div className={cn(
        "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 p-6",
        selectionMode === 'selecting' && "cursor-pointer"
      )}>
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
      
      {/* Pagination controls */}
      {hasNextPage && (
        <div className="flex flex-col items-center gap-4 p-6 border-t border-border mt-6">
          {/* Page info */}
          <div className="text-sm text-muted-foreground text-center">
            {images.length} of {totalCount} images loaded
            {hasNextPage && ` • More available`}
          </div>
          
          {/* Load more button */}
          {hasNextPage && (
            <Button
              onClick={loadNextPage}
              disabled={loadingMore}
              variant="outline"
              size="lg"
              className="gap-2 min-w-[140px]"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  Load More
                  <span className="text-xs opacity-70">(up to 50 more)</span>
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default SimpleGalleryPage;