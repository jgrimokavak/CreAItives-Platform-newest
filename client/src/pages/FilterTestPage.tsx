import React from 'react';
import { useFilterOptions } from '@/hooks/useFilterOptions';
import { 
  FilterContainer, 
  ModelFilter, 
  AspectRatioFilter, 
  ResolutionFilter,
  useFilters 
} from '@/components/gallery/FilterComponents';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';

const FilterTestPage: React.FC = () => {
  // Get filter options from API
  const {
    filterOptions,
    isLoading,
    error,
    refetch,
    models,
    aspectRatios,
    resolutions
  } = useFilterOptions();

  // Use the filter management hook
  const {
    filters,
    updateModels,
    updateAspectRatios,
    updateResolutions,
    clearAllFilters,
    activeFilterCount
  } = useFilters();

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Filter Components Test Page</h1>
          <p className="text-muted-foreground">
            Testing integration with <code className="bg-muted px-1 rounded">/api/gallery/filter-options</code>
          </p>
        </div>

        {/* API Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                API Status
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isLoading}
                  data-testid="button-refetch-api"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </CardTitle>
              <div className="flex items-center gap-2">
                {isLoading && (
                  <Badge variant="secondary" className="gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading
                  </Badge>
                )}
                {error && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Error
                  </Badge>
                )}
                {!isLoading && !error && (
                  <Badge variant="default" className="bg-green-600">
                    Connected
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">
                  <strong>API Error:</strong> {error.message}
                </p>
              </div>
            )}
            
            {!isLoading && !error && filterOptions && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-md">
                  <div className="text-2xl font-bold text-blue-600">{models.length}</div>
                  <div className="text-xs text-muted-foreground">AI Models</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-md">
                  <div className="text-2xl font-bold text-green-600">{aspectRatios.length}</div>
                  <div className="text-xs text-muted-foreground">Aspect Ratios</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-md">
                  <div className="text-2xl font-bold text-orange-600">{resolutions.length}</div>
                  <div className="text-xs text-muted-foreground">Resolution Tiers</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-md">
                  <div className="text-2xl font-bold text-purple-600">
                    Ready
                  </div>
                  <div className="text-xs text-muted-foreground">System Status</div>
                </div>
              </div>
            )}

            {!isLoading && !error && (
              <div className="text-xs text-muted-foreground">
                <strong>Endpoint:</strong> /api/gallery/filter-options
              </div>
            )}
          </CardContent>
        </Card>

        {/* Filter Components Demo */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Components with Real Data</CardTitle>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Interactive filter components connected to live API data
              </p>
              {activeFilterCount > 0 && (
                <Badge variant="secondary">
                  {activeFilterCount} active filter{activeFilterCount !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <FilterContainer
              onClearAll={clearAllFilters}
              activeFilterCount={activeFilterCount}
              data-testid="filter-container-test"
            >
              <ModelFilter
                value={filters.models}
                onChange={updateModels}
                options={models}
                data-testid="model-filter-test"
              />
              
              <AspectRatioFilter
                value={filters.aspectRatios}
                onChange={updateAspectRatios}
                options={aspectRatios}
                isLoading={isLoading}
                error={error}
                data-testid="aspect-ratio-filter-test"
              />
              
              <ResolutionFilter
                value={filters.resolutions}
                onChange={updateResolutions}
                options={resolutions}
                isLoading={isLoading}
                error={error}
                data-testid="resolution-filter-test"
              />
            </FilterContainer>
          </CardContent>
        </Card>

        {/* Filter State Debug */}
        <Card>
          <CardHeader>
            <CardTitle>Filter State (Debug Info)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Selected Models</h4>
                {filters.models.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {filters.models.map(model => (
                      <Badge key={model} variant="secondary" className="text-xs">
                        {model}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">None selected</p>
                )}
              </div>

              <div>
                <h4 className="font-medium mb-2">Selected Aspect Ratios</h4>
                {filters.aspectRatios.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {filters.aspectRatios.map(ratio => (
                      <Badge key={ratio} variant="secondary" className="text-xs">
                        {ratio}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">None selected</p>
                )}
              </div>

              <div>
                <h4 className="font-medium mb-2">Selected Resolutions</h4>
                {filters.resolutions.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {filters.resolutions.map(resolution => (
                      <Badge key={resolution} variant="secondary" className="text-xs">
                        {resolution}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">None selected</p>
                )}
              </div>

            </div>

            <Separator />

            <div className="bg-muted p-3 rounded-md">
              <h4 className="font-medium mb-2">Raw Filter Object</h4>
              <pre className="text-xs text-muted-foreground overflow-auto">
                {JSON.stringify(filters, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* API Response Debug */}
        {!isLoading && !error && filterOptions && (
          <Card>
            <CardHeader>
              <CardTitle>Raw API Response (Debug)</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-4 rounded-md overflow-auto max-h-96">
                {JSON.stringify(filterOptions, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default FilterTestPage;