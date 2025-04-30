import React, { useState } from 'react';
import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { FixedSizeGrid as Grid } from 'react-window';
import { useEditor } from '@/context/EditorContext';
import {
  Button,
  Card,
  CardContent,
  Checkbox,
  Spinner,
  Tooltip,
} from '@/components/ui';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  Star,
  Trash2,
  FolderOpen,
  Download,
  PenTool,
  RotateCcw,
  Loader2,
} from 'lucide-react';
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

const GalleryPage: React.FC<GalleryPageProps> = ({ mode = 'gallery' }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const { setMode, setSourceImages } = useEditor();
  
  // Calculate dimensions
  const viewportWidth = 
    typeof window !== 'undefined' ? 
    window.innerWidth - (window.innerWidth < 768 ? 40 : 300) : 
    1000;
  const columnWidth = Math.min(300, Math.max(250, viewportWidth / Math.floor(viewportWidth / 280)));
  const columnCount = Math.floor(viewportWidth / columnWidth);
  
  // Fetch images
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ['/api/gallery', { starred: showStarredOnly, trash: mode === 'trash' }],
    queryFn: async ({ pageParam = null }) => {
      const params = new URLSearchParams();
      if (pageParam) params.append('cursor', pageParam);
      if (showStarredOnly) params.append('starred', 'true');
      if (mode === 'trash') params.append('trash', 'true');
      
      return apiRequest(`/api/gallery?${params.toString()}`);
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });
  
  // Flatten pages of items into a single array
  const images = data ? 
    data.pages.flatMap((page) => page.items) as GalleryImage[] : 
    [];
    
  // Calculate grid dimensions
  const rowCount = Math.ceil(images.length / columnCount);
  
  // Update image mutations
  const starMutation = useMutation({
    mutationFn: async ({ id, starred }: { id: string; starred: boolean }) => 
      apiRequest(`/api/image/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ starred }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
    },
  });
  
  const trashMutation = useMutation({
    mutationFn: async ({ id, trash }: { id: string; trash: boolean }) => 
      apiRequest(`/api/image/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteToTrash: trash, restoreFromTrash: !trash }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
      setSelectedIds([]);
    },
  });
  
  const bulkStarMutation = useMutation({
    mutationFn: async ({ ids, starred }: { ids: string[]; starred: boolean }) => 
      apiRequest('/api/images/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, starred }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
    },
  });
  
  const bulkTrashMutation = useMutation({
    mutationFn: async ({ ids, trash }: { ids: string[]; trash: boolean }) => 
      apiRequest('/api/images/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, deleteToTrash: trash, restoreFromTrash: !trash }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
      setSelectedIds([]);
    },
  });
  
  // Handle edits
  const handleEdit = (image: GalleryImage) => {
    setMode('edit');
    setSourceImages([image.fullUrl]);
    navigate('/');
  };
  
  // Download image
  const handleDownload = async (image: GalleryImage) => {
    try {
      const response = await fetch(image.fullUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `image-${image.id.substring(0, 8)}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      toast({
        title: 'Download failed',
        description: 'Could not download the image',
        variant: 'destructive',
      });
    }
  };
  
  // Toggle selection
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };
  
  // Select all images
  const selectAll = () => {
    setSelectedIds(images.map((img) => img.id));
  };
  
  // Clear selection
  const clearSelection = () => {
    setSelectedIds([]);
  };
  
  // Cell renderer for virtualized grid
  const Cell = ({ columnIndex, rowIndex, style }: any) => {
    const index = rowIndex * columnCount + columnIndex;
    if (index >= images.length) return null;
    
    const image = images[index];
    const isSelected = selectedIds.includes(image.id);
    
    return (
      <div style={style} className="p-2">
        <Card className={cn(
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
              loading="lazy"
              onClick={() => toggleSelection(image.id)}
            />
            
            <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {mode === 'gallery' ? (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="w-8 h-8 rounded-full bg-white/80 hover:bg-white"
                    onClick={() => starMutation.mutate({ id: image.id, starred: !image.starred })}
                  >
                    <Star 
                      className={cn("w-4 h-4", image.starred ? "fill-yellow-400 text-yellow-400" : "")} 
                    />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="w-8 h-8 rounded-full bg-white/80 hover:bg-white"
                    onClick={() => trashMutation.mutate({ id: image.id, trash: true })}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <Button
                  variant="secondary"
                  size="icon"
                  className="w-8 h-8 rounded-full bg-white/80 hover:bg-white"
                  onClick={() => trashMutation.mutate({ id: image.id, trash: false })}
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
                  <Tooltip content="Edit this image">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-7 h-7 p-0"
                      onClick={() => handleEdit(image)}
                    >
                      <PenTool className="w-4 h-4" />
                    </Button>
                  </Tooltip>
                )}
                
                <Tooltip content="Download">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-7 h-7 p-0"
                    onClick={() => handleDownload(image)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </Tooltip>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };
  
  // Loading state
  if (status === 'pending') {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
                    onClick={() => bulkStarMutation.mutate({ ids: selectedIds, starred: true })}
                    disabled={bulkStarMutation.isPending}
                  >
                    {bulkStarMutation.isPending ? (
                      <Spinner className="w-4 h-4 mr-2" />
                    ) : (
                      <Star className="w-4 h-4 mr-2" />
                    )}
                    <span>Star</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => bulkTrashMutation.mutate({ ids: selectedIds, trash: true })}
                    disabled={bulkTrashMutation.isPending}
                  >
                    {bulkTrashMutation.isPending ? (
                      <Spinner className="w-4 h-4 mr-2" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    <span>Move to Trash</span>
                  </Button>
                </>
              )}
              
              {mode === 'trash' && (
                <Button
                  variant="outline"
                  onClick={() => bulkTrashMutation.mutate({ ids: selectedIds, trash: false })}
                  disabled={bulkTrashMutation.isPending}
                >
                  {bulkTrashMutation.isPending ? (
                    <Spinner className="w-4 h-4 mr-2" />
                  ) : (
                    <RotateCcw className="w-4 h-4 mr-2" />
                  )}
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
      
      {/* Image grid with virtualization */}
      <div className="border border-slate-200 rounded-lg bg-slate-50 min-h-[70vh]">
        {images.length > 0 && (
          <Grid
            columnCount={columnCount}
            columnWidth={columnWidth}
            height={800}
            rowCount={rowCount}
            rowHeight={320}
            width={viewportWidth}
            itemData={images}
          >
            {Cell}
          </Grid>
        )}
        
        {/* Load more button */}
        {hasNextPage && (
          <div className="flex justify-center p-4">
            <Button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              variant="outline"
            >
              {isFetchingNextPage ? (
                <>
                  <Spinner className="mr-2" />
                  Loading...
                </>
              ) : (
                'Load More'
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GalleryPage;