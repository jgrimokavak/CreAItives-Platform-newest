import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface FilterOptionItem {
  key: string;
  count: number;
  label?: string;
}

export interface DateRangeData {
  earliest: string;
  latest: string;
}

export interface FilterOptionsResponse {
  models: FilterOptionItem[];
  aspectRatios: FilterOptionItem[];
  resolutions: FilterOptionItem[];
  dateRange: DateRangeData | null;
}

// Transform API response to component-friendly format
export interface TransformedFilterOptions {
  models: Array<{
    value: string;
    label: string;
    count: number;
  }>;
  aspectRatios: Array<{
    value: string;
    label: string;
    count: number;
  }>;
  resolutions: Array<{
    value: string;
    label: string;
    count: number;
  }>;
  dateRange: DateRangeData | null;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Transform model key to user-friendly label
 */
const formatModelLabel = (modelKey: string): string => {
  // Handle common model key patterns
  if (modelKey.includes('/')) {
    const [provider, model] = modelKey.split('/');
    
    // Handle specific cases
    switch (modelKey) {
      case 'google/nano-banana':
        return 'Google Nano Banana';
      case 'black-forest-labs/flux-schnell':
        return 'FLUX Schnell';
      case 'black-forest-labs/flux-dev':
        return 'FLUX Dev';
      case 'black-forest-labs/flux-pro':
        return 'FLUX Pro';
      case 'stability-ai/stable-diffusion-xl':
        return 'Stable Diffusion XL';
      case 'stability-ai/stable-diffusion-3':
        return 'Stable Diffusion 3';
      case 'openai/dall-e-3':
        return 'DALL-E 3';
      case 'openai/dall-e-2':
        return 'DALL-E 2';
      case 'midjourney/midjourney':
        return 'Midjourney';
      default:
        // General formatting: capitalize provider and model names
        const formattedProvider = provider.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        const formattedModel = model.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        return `${formattedProvider} ${formattedModel}`;
    }
  }
  
  // If no slash, just capitalize each word
  return modelKey.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

/**
 * Transform resolution key to user-friendly label
 */
const formatResolutionLabel = (resolutionKey: string): string => {
  switch (resolutionKey) {
    case 'standard':
      return 'Standard';
    case 'high':
      return 'High';
    case 'ultra':
      return 'Ultra';
    case '4k':
      return '4K';
    default:
      return resolutionKey.charAt(0).toUpperCase() + resolutionKey.slice(1);
  }
};

/**
 * Transform API response to component-friendly format
 */
const transformFilterOptions = (data: FilterOptionsResponse): TransformedFilterOptions => {
  return {
    models: data.models.map(item => ({
      value: item.key,
      label: formatModelLabel(item.key),
      count: item.count,
    })),
    aspectRatios: data.aspectRatios.map(item => ({
      value: item.key,
      label: item.label || item.key, // Use provided label or fallback to key
      count: item.count,
    })),
    resolutions: data.resolutions.map(item => ({
      value: item.key,
      label: formatResolutionLabel(item.key),
      count: item.count,
    })),
    dateRange: data.dateRange,
  };
};

// ============================================================================
// CUSTOM HOOK
// ============================================================================

export function useFilterOptions() {
  const query = useQuery<FilterOptionsResponse, Error>({
    queryKey: ['/api/gallery/filter-options'],
    queryFn: () => apiRequest('/api/gallery/filter-options'),
    retry: 1,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    refetchOnWindowFocus: false,
  });

  // Transform data when available
  const transformedData = query.data ? transformFilterOptions(query.data) : null;

  return {
    // Raw data
    data: query.data,
    // Transformed data ready for components
    filterOptions: transformedData,
    // Loading state
    isLoading: query.isLoading,
    // Error state
    error: query.error,
    isError: query.isError,
    // Refetch function
    refetch: query.refetch,
    // Individual option getters with fallbacks
    models: transformedData?.models || [],
    aspectRatios: transformedData?.aspectRatios || [],
    resolutions: transformedData?.resolutions || [],
    dateRange: transformedData?.dateRange || null,
  };
}

// ============================================================================
// LOADING SKELETON DATA
// ============================================================================

export const SKELETON_FILTER_OPTIONS: TransformedFilterOptions = {
  models: [
    { value: 'loading-1', label: 'Loading...', count: 0 },
    { value: 'loading-2', label: 'Loading...', count: 0 },
    { value: 'loading-3', label: 'Loading...', count: 0 },
  ],
  aspectRatios: [
    { value: 'loading-1', label: 'Loading...', count: 0 },
    { value: 'loading-2', label: 'Loading...', count: 0 },
  ],
  resolutions: [
    { value: 'loading-1', label: 'Loading...', count: 0 },
    { value: 'loading-2', label: 'Loading...', count: 0 },
  ],
  dateRange: null,
};