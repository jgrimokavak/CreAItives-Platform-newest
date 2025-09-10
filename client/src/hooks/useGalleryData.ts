import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

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
  sourceThumb?: string;
  sourceImage?: string;
  starred?: boolean;
  deletedAt: string | null;
}

interface GalleryFilters {
  models?: string[];
  aspectRatios?: string[];
  resolutions?: string[];
  dateRange?: {
    from?: Date;
    to?: Date;
  };
}

interface GalleryOptions {
  starred?: boolean;
  trash?: boolean;
  searchQuery?: string;
  filters?: GalleryFilters;
}

interface GalleryResponse {
  items: GalleryImage[];
  nextCursor: string | null;
  totalCount: number;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Build URL search parameters for gallery API
 */
const buildGalleryParams = (
  options: GalleryOptions & { cursor?: string; limit?: number }
): URLSearchParams => {
  const params = new URLSearchParams();
  
  // Add basic options
  if (options.starred) params.append('starred', 'true');
  if (options.trash) params.append('trash', 'true');
  if (options.searchQuery && options.searchQuery.trim() !== '') {
    params.append('q', options.searchQuery.trim());
  }
  if (options.cursor) params.append('cursor', options.cursor);
  if (options.limit) params.append('limit', options.limit.toString());
  
  // Add filter parameters
  if (options.filters) {
    const { models, aspectRatios, resolutions, dateRange } = options.filters;
    
    if (models && models.length > 0) {
      params.append('models', models.join(','));
    }
    if (aspectRatios && aspectRatios.length > 0) {
      params.append('aspectRatios', aspectRatios.join(','));
    }
    if (resolutions && resolutions.length > 0) {
      params.append('resolutions', resolutions.join(','));
    }
    if (dateRange?.from) {
      params.append('dateFrom', dateRange.from.toISOString());
    }
    if (dateRange?.to) {
      params.append('dateTo', dateRange.to.toISOString());
    }
  }
  
  return params;
};

/**
 * Generate a stable query key for gallery data
 */
const getGalleryQueryKey = (options: GalleryOptions) => {
  const baseKey = '/api/gallery';
  
  // Create a deterministic key based on options
  const keyData = {
    starred: options.starred || false,
    trash: options.trash || false,
    searchQuery: options.searchQuery || '',
    filters: {
      models: options.filters?.models?.sort() || [],
      aspectRatios: options.filters?.aspectRatios?.sort() || [],
      resolutions: options.filters?.resolutions?.sort() || [],
      dateRange: {
        from: options.filters?.dateRange?.from?.toISOString() || null,
        to: options.filters?.dateRange?.to?.toISOString() || null,
      }
    }
  };
  
  return [baseKey, keyData];
};

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook for fetching gallery data with pagination support
 */
export function useGalleryData(
  options: GalleryOptions,
  enabled: boolean = true
) {
  const itemsPerPage = 50;
  
  const query = useInfiniteQuery<GalleryResponse, Error>({
    queryKey: getGalleryQueryKey(options),
    queryFn: async ({ pageParam }) => {
      const params = buildGalleryParams({
        ...options,
        cursor: pageParam as string | undefined,
        limit: itemsPerPage
      });
      
      const url = `/api/gallery?${params.toString()}`;
      return apiRequest(url);
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  });
  
  // Flatten all pages into a single array
  const allImages = query.data?.pages.flatMap(page => page.items) || [];
  const totalCount = query.data?.pages[0]?.totalCount || 0;
  
  return {
    // Data
    images: allImages,
    totalCount,
    
    // State
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isFetching: query.isFetching,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    
    // Actions
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
    
    // Query object for advanced usage
    query,
  };
}

/**
 * Hook for getting just the total count (useful for filter badges)
 */
export function useGalleryCount(
  options: GalleryOptions,
  enabled: boolean = true
) {
  const query = useQuery<{ totalCount: number }, Error>({
    queryKey: [...getGalleryQueryKey(options), 'count'],
    queryFn: async () => {
      const params = buildGalleryParams({ ...options, limit: 1 });
      const url = `/api/gallery?${params.toString()}`;
      const response = await apiRequest(url);
      return { totalCount: response.totalCount };
    },
    enabled,
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  });
  
  return {
    totalCount: query.data?.totalCount || 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ============================================================================
// TYPES EXPORT FOR USE IN COMPONENTS
// ============================================================================

export type { GalleryImage, GalleryOptions, GalleryFilters, GalleryResponse };