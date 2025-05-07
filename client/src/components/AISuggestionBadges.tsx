import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { cn } from "@/lib/utils";

// Interface for prompt suggestions
export interface PromptSuggestions {
  imageTypes: string[];
  cameraPositions: string[];
  lightingStyles: string[];
  colorPalettes: string[]; // Keeping in type but not displaying
}

// Default empty suggestions
export const emptySuggestions: PromptSuggestions = {
  imageTypes: [],
  cameraPositions: [],
  lightingStyles: [],
  colorPalettes: []
};

// Map category keys to user-friendly display names
const categoryLabels: Record<keyof PromptSuggestions, string> = {
  imageTypes: "Image Type",
  cameraPositions: "Camera Position",
  lightingStyles: "Lighting Style",
  colorPalettes: "Color Palette"
};

// Define which categories to actually display (excluding colorPalettes)
const visibleCategories: (keyof PromptSuggestions)[] = [
  "imageTypes",
  "cameraPositions",
  "lightingStyles"
];

interface AISuggestionBadgesProps {
  suggestions: PromptSuggestions;
  onSuggestionSelect: (value: string) => void;
  isLoading?: boolean;
}

export function AISuggestionBadges({ 
  suggestions, 
  onSuggestionSelect, 
  isLoading = false 
}: AISuggestionBadgesProps) {
  // Track which suggestions have been selected (to remove them)
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  
  // Handle suggestion selection
  const handleSelect = (suggestion: string): void => {
    // Add to selected set so we can hide it
    setSelectedSuggestions(prev => {
      const newSet = new Set(prev);
      newSet.add(suggestion);
      return newSet;
    });
    
    // Send to parent component to add to prompt
    onSuggestionSelect(suggestion);
  };
  
  return (
    <div className="space-y-6 mt-4 p-5 relative overflow-hidden bg-gradient-to-r from-violet-50 via-indigo-50 to-purple-50 rounded-lg border border-purple-200 shadow-sm">
      {/* Animated background pattern */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,rgba(255,255,255,0.6),rgba(255,255,255,0.9))] opacity-50"></div>
      
      {/* Soft glow effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-violet-500/5 via-purple-500/5 to-indigo-500/5 blur-xl"></div>
      
      {/* Header */}
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-medium text-purple-800 flex items-center">
            <span className="bg-gradient-to-r from-purple-500 to-indigo-500 p-1.5 rounded-md mr-2 shadow-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                <path d="M12 1V5M12 19V23M4.22 4.22L7.05 7.05M16.95 16.95L19.78 19.78M1 12H5M19 12H23M4.22 19.78L7.05 16.95M16.95 7.05L19.78 4.22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            AI-powered Prompt Suggestions
          </h3>
          <div className="inline-flex items-center rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500 mr-1 animate-pulse"></span>
            Active
          </div>
        </div>
        <p className="text-xs text-slate-600 mt-1 relative z-10 pl-9">
          Click any suggestion to enhance your prompt. Suggestions are tailored to your input and selected model.
        </p>
      </div>
      
      {/* Render only visible categories */}
      {visibleCategories.map(category => {
        const values = suggestions[category];
        // Filter out suggestions that have already been selected
        const availableSuggestions = values.filter((v: string) => !selectedSuggestions.has(v));
        
        // Skip empty categories
        if (availableSuggestions.length === 0 && !isLoading) return null;
        
        return (
          <div key={category} className="relative z-10">
            <div className="flex items-center mb-2">
              <h4 className="text-sm font-medium text-purple-700">{categoryLabels[category]}</h4>
              {isLoading && (
                <Loader2 className="ml-2 h-3 w-3 animate-spin text-purple-600" />
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
              {isLoading && availableSuggestions.length === 0 ? (
                // Loading placeholders
                Array(3).fill(0).map((_, i) => (
                  <div 
                    key={`loading-${i}`}
                    className="h-7 bg-purple-100/80 animate-pulse rounded-full w-20"
                  />
                ))
              ) : (
                // Actual suggestion badges (without sparkle icon)
                availableSuggestions.map((suggestion: string) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSelect(suggestion)}
                    className={cn(
                      "px-3 py-1 rounded-full text-sm font-medium transition-all",
                      "bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 border border-purple-200",
                      "hover:from-purple-200 hover:to-indigo-200 hover:border-purple-300 hover:shadow-sm",
                      "active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-300"
                    )}
                  >
                    {suggestion}
                  </button>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}