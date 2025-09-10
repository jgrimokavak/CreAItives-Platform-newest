import * as React from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Toggle } from '@/components/ui/toggle';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { 
  Calendar as CalendarIcon, 
  ChevronDown, 
  X, 
  Filter,
  Monitor,
  Smartphone,
  Tablet,
  Tv,
  Sparkles,
  Clock,
  Settings2,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { useFilterOptions } from '@/hooks/useFilterOptions';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface ModelFilterProps {
  value: string[];
  onChange: (value: string[]) => void;
  options: FilterOption[];
  className?: string;
}

export interface AspectRatioFilterProps {
  value: string[];
  onChange: (value: string[]) => void;
  options?: FilterOption[];
  isLoading?: boolean;
  error?: Error | null;
  className?: string;
}

export interface ResolutionFilterProps {
  value: string[];
  onChange: (value: string[]) => void;
  options?: FilterOption[];
  isLoading?: boolean;
  error?: Error | null;
  className?: string;
}

export interface DateRangeFilterProps {
  value: DateRange | undefined;
  onChange: (value: DateRange | undefined) => void;
  className?: string;
}

export interface FilterContainerProps {
  children: React.ReactNode;
  onClearAll?: () => void;
  activeFilterCount?: number;
  className?: string;
}

// ============================================================================
// LOADING SKELETON COMPONENTS
// ============================================================================

const FilterLoadingSkeleton: React.FC<{ title: string; icon: React.ReactNode }> = ({ title, icon }) => (
  <div className="flex flex-col gap-2">
    <Button
      variant="outline"
      disabled
      className="justify-between h-9 px-3 text-sm"
    >
      <div className="flex items-center gap-2">
        {icon}
        <span>{title}</span>
        <Skeleton className="h-4 w-8" />
      </div>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </Button>
  </div>
);

const FilterErrorState: React.FC<{ title: string; icon: React.ReactNode; onRetry?: () => void }> = ({ title, icon, onRetry }) => (
  <div className="flex flex-col gap-2">
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="justify-between h-9 px-3 text-sm border-destructive/20 bg-destructive/5"
        >
          <div className="flex items-center gap-2">
            {icon}
            <span>{title}</span>
            <Badge variant="destructive" className="h-5 px-1.5 text-xs">
              Error
            </Badge>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load {title.toLowerCase()}. 
              {onRetry && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRetry}
                  className="mt-2 h-6 px-2 text-xs"
                >
                  Try again
                </Button>
              )}
            </AlertDescription>
          </Alert>
        </div>
      </PopoverContent>
    </Popover>
  </div>
);

// ============================================================================
// MODEL FILTER COMPONENT
// ============================================================================

export const ModelFilter: React.FC<ModelFilterProps> = ({
  value,
  onChange,
  options,
  className
}) => {
  const handleToggleModel = (modelValue: string) => {
    const newValue = value.includes(modelValue)
      ? value.filter(v => v !== modelValue)
      : [...value, modelValue];
    onChange(newValue);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const selectedCount = value.length;
  const hasSelection = selectedCount > 0;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'justify-between h-9 px-3 text-sm',
              hasSelection && 'border-primary bg-primary/5'
            )}
            data-testid="button-model-filter"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span>Models</span>
              {hasSelection && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {selectedCount}
                </Badge>
              )}
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start" data-testid="popover-model-filter">
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">AI Models</h4>
              {hasSelection && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="h-6 px-2 text-xs"
                  data-testid="button-clear-models"
                >
                  Clear all
                </Button>
              )}
            </div>
            
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {options.map((option) => (
                <div
                  key={option.value}
                  className="flex items-center space-x-3 px-2 py-1.5 hover:bg-muted/50 rounded-md cursor-pointer"
                  onClick={() => handleToggleModel(option.value)}
                  data-testid={`checkbox-model-${option.value}`}
                >
                  <Checkbox
                    checked={value.includes(option.value)}
                    onChange={() => handleToggleModel(option.value)}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-sm">{option.label}</span>
                    {typeof option.count === 'number' && (
                      <Badge variant="outline" className="h-5 px-1.5 text-xs">
                        {option.count.toLocaleString()}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {options.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No models available
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

// ============================================================================
// ASPECT RATIO FILTER COMPONENT
// ============================================================================

export const AspectRatioFilter: React.FC<AspectRatioFilterProps> = ({
  value,
  onChange,
  options,
  isLoading = false,
  error = null,
  className
}) => {
  const handleToggleRatio = (ratioValue: string) => {
    const newValue = value.includes(ratioValue)
      ? value.filter(v => v !== ratioValue)
      : [...value, ratioValue];
    onChange(newValue);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const selectedCount = value.length;
  const hasSelection = selectedCount > 0;
  const aspectRatioOptions = options || [];

  // Loading state
  if (isLoading) {
    return (
      <FilterLoadingSkeleton 
        title="Aspect Ratio" 
        icon={<Monitor className="h-4 w-4" />} 
      />
    );
  }

  // Error state
  if (error) {
    return (
      <FilterErrorState 
        title="Aspect Ratio" 
        icon={<Monitor className="h-4 w-4" />} 
      />
    );
  }

  const getIcon = (ratio: string) => {
    switch (ratio) {
      case '16:9':
      case '21:9':
        return <Monitor className="h-3.5 w-3.5" />;
      case '9:16':
        return <Smartphone className="h-3.5 w-3.5" />;
      case '1:1':
        return <Tablet className="h-3.5 w-3.5" />;
      case '4:3':
      case '3:2':
        return <Tv className="h-3.5 w-3.5" />;
      default:
        return <Monitor className="h-3.5 w-3.5" />;
    }
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'justify-between h-9 px-3 text-sm',
              hasSelection && 'border-primary bg-primary/5'
            )}
            data-testid="button-aspect-ratio-filter"
          >
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              <span>Aspect Ratio</span>
              {hasSelection && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {selectedCount}
                </Badge>
              )}
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start" data-testid="popover-aspect-ratio-filter">
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Aspect Ratios</h4>
              {hasSelection && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="h-6 px-2 text-xs"
                  data-testid="button-clear-aspect-ratios"
                >
                  Clear all
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {aspectRatioOptions.map((option) => (
                <Toggle
                  key={option.value}
                  pressed={value.includes(option.value)}
                  onPressedChange={() => handleToggleRatio(option.value)}
                  variant="outline"
                  className="justify-start h-auto p-3 data-[state=on]:bg-primary/10 data-[state=on]:border-primary"
                  data-testid={`toggle-aspect-ratio-${option.value}`}
                >
                  <div className="flex items-center gap-2">
                    {getIcon(option.value)}
                    <div className="text-left flex-1">
                      <div className="text-xs font-medium">{option.value}</div>
                      <div className="text-xs text-muted-foreground">
                        {option.label.replace(option.value, '').trim()}
                      </div>
                    </div>
                    {typeof option.count === 'number' && option.count > 0 && (
                      <Badge variant="outline" className="h-4 px-1 text-xs">
                        {option.count > 999 ? `${Math.floor(option.count/1000)}k` : option.count}
                      </Badge>
                    )}
                  </div>
                </Toggle>
              ))}
            </div>
            
            {aspectRatioOptions.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No aspect ratios available
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

// ============================================================================
// RESOLUTION FILTER COMPONENT
// ============================================================================

export const ResolutionFilter: React.FC<ResolutionFilterProps> = ({
  value,
  onChange,
  options,
  isLoading = false,
  error = null,
  className
}) => {
  const handleToggleResolution = (resolutionValue: string) => {
    const newValue = value.includes(resolutionValue)
      ? value.filter(v => v !== resolutionValue)
      : [...value, resolutionValue];
    onChange(newValue);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const selectedCount = value.length;
  const hasSelection = selectedCount > 0;
  const resolutionOptions = options || [];

  // Loading state
  if (isLoading) {
    return (
      <FilterLoadingSkeleton 
        title="Resolution" 
        icon={<Settings2 className="h-4 w-4" />} 
      />
    );
  }

  // Error state
  if (error) {
    return (
      <FilterErrorState 
        title="Resolution" 
        icon={<Settings2 className="h-4 w-4" />} 
      />
    );
  }

  const getQualityColor = (resolution: string) => {
    switch (resolution) {
      case 'standard':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'high':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'ultra':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case '4k':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'justify-between h-9 px-3 text-sm',
              hasSelection && 'border-primary bg-primary/5'
            )}
            data-testid="button-resolution-filter"
          >
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              <span>Resolution</span>
              {hasSelection && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {selectedCount}
                </Badge>
              )}
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start" data-testid="popover-resolution-filter">
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Resolution Tiers</h4>
              {hasSelection && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="h-6 px-2 text-xs"
                  data-testid="button-clear-resolutions"
                >
                  Clear all
                </Button>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
              {resolutionOptions.map((option) => (
                <div key={option.value} className="flex items-center gap-1">
                  <Toggle
                    pressed={value.includes(option.value)}
                    onPressedChange={() => handleToggleResolution(option.value)}
                    variant="outline"
                    className={cn(
                      'h-8 px-3 text-xs font-medium',
                      value.includes(option.value) && getQualityColor(option.value)
                    )}
                    data-testid={`toggle-resolution-${option.value}`}
                  >
                    {option.label}
                  </Toggle>
                  {typeof option.count === 'number' && option.count > 0 && (
                    <Badge variant="outline" className="h-5 px-1 text-xs">
                      {option.count > 999 ? `${Math.floor(option.count/1000)}k` : option.count}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
            
            {resolutionOptions.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No resolution tiers available
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

// ============================================================================
// DATE RANGE FILTER COMPONENT
// ============================================================================

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  value,
  onChange,
  className
}) => {
  const handleClear = () => {
    onChange(undefined);
  };

  const hasSelection = value?.from || value?.to;

  const formatDateRange = (dateRange: DateRange | undefined) => {
    if (!dateRange?.from) return 'Select dates';
    if (!dateRange.to) return format(dateRange.from, 'MMM dd, yyyy');
    return `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd, yyyy')}`;
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'justify-between h-9 px-3 text-sm',
              hasSelection && 'border-primary bg-primary/5'
            )}
            data-testid="button-date-range-filter"
          >
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              <span className="truncate max-w-[140px]">
                {formatDateRange(value)}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start" data-testid="popover-date-range-filter">
          <div className="space-y-3">
            {hasSelection && (
              <div className="p-3 pb-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Date Range</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClear}
                    className="h-6 px-2 text-xs"
                    data-testid="button-clear-date-range"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}
            
            <Calendar
              mode="range"
              defaultMonth={value?.from}
              selected={value}
              onSelect={onChange}
              numberOfMonths={2}
              className="p-3"
              data-testid="calendar-date-range"
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

// ============================================================================
// FILTER CONTAINER COMPONENT
// ============================================================================

export const FilterContainer: React.FC<FilterContainerProps> = ({
  children,
  onClearAll,
  activeFilterCount = 0,
  className
}) => {
  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className={cn(
      'bg-background/95 backdrop-blur-sm border-b border-border',
      'sticky top-0 z-20 p-4',
      className
    )}>
      <div className="flex flex-col gap-3">
        {/* Header with title and clear all button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium text-sm">Filters</h3>
            {hasActiveFilters && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {activeFilterCount} active
              </Badge>
            )}
          </div>
          
          {hasActiveFilters && onClearAll && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="h-7 px-2 text-xs gap-1.5"
              data-testid="button-clear-all-filters"
            >
              <X className="h-3 w-3" />
              Clear all
            </Button>
          )}
        </div>

        {/* Filter components container */}
        <div className="flex flex-wrap gap-2 items-center">
          {children}
        </div>

        {/* Mobile responsive helper text */}
        <div className="text-xs text-muted-foreground sm:hidden">
          Tap filters to customize your view
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// UTILITY HOOK FOR MANAGING ALL FILTERS
// ============================================================================

export interface AllFilters {
  models: string[];
  aspectRatios: string[];
  resolutions: string[];
  dateRange: DateRange | undefined;
}

export const useFilters = (initialFilters?: Partial<AllFilters>) => {
  const [filters, setFilters] = React.useState<AllFilters>({
    models: [],
    aspectRatios: [],
    resolutions: [],
    dateRange: undefined,
    ...initialFilters
  });

  const updateModels = (models: string[]) => {
    setFilters(prev => ({ ...prev, models }));
  };

  const updateAspectRatios = (aspectRatios: string[]) => {
    setFilters(prev => ({ ...prev, aspectRatios }));
  };

  const updateResolutions = (resolutions: string[]) => {
    setFilters(prev => ({ ...prev, resolutions }));
  };

  const updateDateRange = (dateRange: DateRange | undefined) => {
    setFilters(prev => ({ ...prev, dateRange }));
  };

  const clearAllFilters = () => {
    setFilters({
      models: [],
      aspectRatios: [],
      resolutions: [],
      dateRange: undefined
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.models.length > 0) count++;
    if (filters.aspectRatios.length > 0) count++;
    if (filters.resolutions.length > 0) count++;
    if (filters.dateRange?.from || filters.dateRange?.to) count++;
    return count;
  };

  return {
    filters,
    updateModels,
    updateAspectRatios,
    updateResolutions,
    updateDateRange,
    clearAllFilters,
    activeFilterCount: getActiveFilterCount()
  };
};

