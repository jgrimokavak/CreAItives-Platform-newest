import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { emptySuggestions, PromptSuggestions } from '@/components/PromptDropdowns';
import { ModelKey } from '@/lib/modelCatalog';

/**
 * Custom hook to fetch prompt suggestions based on user input
 */
export function usePromptSuggestions(prompt: string, modelKey: ModelKey) {
  const [suggestions, setSuggestions] = useState<PromptSuggestions>(emptySuggestions);
  const [isLoading, setIsLoading] = useState(false);
  
  // Debounce the prompt to avoid excessive API calls
  const debouncedPrompt = useDebounce(prompt, 600);

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
  
  // Trigger fetch when debounced prompt changes
  useEffect(() => {
    if (debouncedPrompt) {
      fetchSuggestions(debouncedPrompt, modelKey);
    } else {
      setSuggestions(emptySuggestions);
    }
  }, [debouncedPrompt, modelKey, fetchSuggestions]);
  
  return { suggestions, isLoading };
}