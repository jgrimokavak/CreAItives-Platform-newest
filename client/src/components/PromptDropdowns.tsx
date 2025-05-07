import { AICombobox } from "@/components/ui/ai-combobox";

// Interface for prompt suggestions
export interface PromptSuggestions {
  imageTypes: string[];
  cameraPositions: string[];
  lightingStyles: string[];
  colorPalettes: string[];
}

// Default empty suggestions
export const emptySuggestions: PromptSuggestions = {
  imageTypes: [],
  cameraPositions: [],
  lightingStyles: [],
  colorPalettes: []
};

interface PromptDropdownsProps {
  suggestions: PromptSuggestions;
  onChange: (field: keyof PromptSuggestions, value: string) => void;
  isLoading?: boolean;
}

export function PromptDropdowns({ 
  suggestions, 
  onChange, 
  isLoading = false 
}: PromptDropdownsProps) {
  return (
    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5 mt-4 p-5 relative overflow-hidden bg-gradient-to-r from-violet-50 via-indigo-50 to-purple-50 rounded-lg border border-purple-200 shadow-sm">
      {/* Animated background pattern */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,rgba(255,255,255,0.6),rgba(255,255,255,0.9))] opacity-50"></div>
      
      {/* Subtle "AI" text in background */}
      <div className="absolute right-3 bottom-1 opacity-5">
        <div className="text-8xl font-black text-purple-800">AI</div>
      </div>
      
      {/* Soft glow effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-violet-500/5 via-purple-500/5 to-indigo-500/5 blur-xl"></div>
      
      {/* Content container with z-index to show above effects */}
      <div className="sm:col-span-2 -mt-1 mb-2 relative z-10">
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
          Smart suggestions that enhance your prompt with style elements specifically optimized for this model
        </p>
      </div>
      
      <AICombobox 
        label="Image Type" 
        options={suggestions.imageTypes} 
        onSelect={v => onChange("imageTypes", v)} 
        isLoading={isLoading}
      />
      <AICombobox 
        label="Camera Position" 
        options={suggestions.cameraPositions} 
        onSelect={v => onChange("cameraPositions", v)} 
        isLoading={isLoading}
      />
      <AICombobox 
        label="Lighting Style" 
        options={suggestions.lightingStyles} 
        onSelect={v => onChange("lightingStyles", v)} 
        isLoading={isLoading}
      />
      <AICombobox 
        label="Color Palette" 
        options={suggestions.colorPalettes} 
        onSelect={v => onChange("colorPalettes", v)}
        isLoading={isLoading} 
      />
    </div>
  );
}