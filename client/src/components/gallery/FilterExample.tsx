import * as React from 'react';
import {
  FilterContainer,
  ModelFilter,
  AspectRatioFilter,
  ResolutionFilter,
  useFilters,
  FilterOption
} from './FilterComponents';

// Example usage of the filter components
const FilterExample: React.FC = () => {
  // Example model options with counts (this would come from an API in real usage)
  const modelOptions: FilterOption[] = [
    { value: 'google/nano-banana', label: 'Imagen-4', count: 145 },
    { value: 'openai/dall-e-3', label: 'DALL-E 3', count: 89 },
    { value: 'stability-ai/sdxl', label: 'SDXL', count: 234 },
    { value: 'midjourney/v6', label: 'Midjourney v6', count: 67 },
    { value: 'car-generator', label: 'Car Generator', count: 23 },
  ];

  // Use the custom hook to manage all filter states
  const {
    filters,
    updateModels,
    updateAspectRatios,
    updateResolutions,
    clearAllFilters,
    activeFilterCount
  } = useFilters();

  // This would be called when filters change to update the gallery
  React.useEffect(() => {
    console.log('Filters updated:', filters);
    // In real usage, this would trigger a gallery refresh with new filters
  }, [filters]);

  return (
    <div className="min-h-screen bg-background">
      <FilterContainer 
        onClearAll={clearAllFilters}
        activeFilterCount={activeFilterCount}
      >
        <ModelFilter
          value={filters.models}
          onChange={updateModels}
          options={modelOptions}
        />
        
        <AspectRatioFilter
          value={filters.aspectRatios}
          onChange={updateAspectRatios}
        />
        
        <ResolutionFilter
          value={filters.resolutions}
          onChange={updateResolutions}
        />
      </FilterContainer>

      {/* Example content area */}
      <div className="p-8">
        <h2 className="text-2xl font-bold mb-4">Filter Demo</h2>
        <p className="text-muted-foreground mb-6">
          This is an example of how the filter components work together. 
          Try clicking the filter buttons above to see the state changes.
        </p>
        
        {/* Display current filter state */}
        <div className="bg-muted/30 rounded-lg p-4">
          <h3 className="font-medium mb-2">Current Filters:</h3>
          <pre className="text-sm text-muted-foreground">
            {JSON.stringify(filters, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default FilterExample;