import { useState, useEffect, useCallback, useRef } from 'react';
import { emptySuggestions, PromptSuggestions } from '@/components/PromptDropdowns';
import { ModelKey } from '@/lib/modelCatalog';

/**
 * Custom hook to fetch prompt suggestions based on user input
 * with built-in debouncing to avoid excessive API calls
 */
export function usePromptSuggestions(prompt: string, modelKey: ModelKey) {
  const [suggestions, setSuggestions] = useState<PromptSuggestions>(emptySuggestions);
  const [isLoading, setIsLoading] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  
  // Fetch suggestions API call
  const fetchSuggestions = useCallback(async (text: string, model: ModelKey) => {
    if (text.length < 3) {
      setSuggestions(emptySuggestions);
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/prompt-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, model }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }
      
      const data = await response.json();
      setSuggestions(data);
    } catch (error) {
      console.error('Error fetching prompt suggestions:', error);
      // Reset to empty suggestions on error
      setSuggestions(emptySuggestions);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Trigger fetch with debouncing when prompt changes
  useEffect(() => {
    // Clear any existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    if (!prompt || prompt.length < 3) {
      setSuggestions(emptySuggestions);
      setIsLoading(false);
      return;
    }
    
    // Only show loading state if we're going to actually fetch
    setIsLoading(true);
    
    // Set a new timer for debouncing
    debounceTimer.current = setTimeout(() => {
      fetchSuggestions(prompt, modelKey);
    }, 600); // 600ms debounce time
    
    // Cleanup on unmount or prompt/model change
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [prompt, modelKey, fetchSuggestions]);
  
  return { suggestions, isLoading };
}