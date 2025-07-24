import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface EnabledPagesResponse {
  enabledPages: string[];
}

export function useEnabledPages() {
  const { data, isLoading } = useQuery<EnabledPagesResponse>({
    queryKey: ['/api/page-settings/enabled'],
    queryFn: () => apiRequest('/api/page-settings/enabled'),
    retry: false,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return {
    enabledPages: data?.enabledPages || [],
    isLoading,
    isPageEnabled: (pageKey: string) => data?.enabledPages.includes(pageKey) ?? true,
  };
}