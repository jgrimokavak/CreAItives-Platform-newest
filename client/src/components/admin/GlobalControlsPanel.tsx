import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { 
  CalendarIcon,
  Filter,
  X,
  Users,
  Shield,
  Activity,
  Check,
  Settings
} from 'lucide-react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';

interface GlobalControlsPanelProps {
  onFiltersChange: (filters: {
    dateFrom?: Date;
    dateTo?: Date;
    roleFilter?: string;
    statusFilter?: string;
    domainFilter?: string;
    activatedFilter?: string;
  }) => void;
  initialFilters?: {
    dateFrom?: Date;
    dateTo?: Date;
    roleFilter?: string;
    statusFilter?: string;
    domainFilter?: string;
    activatedFilter?: string;
  };
}

export default function GlobalControlsPanel({ 
  onFiltersChange, 
  initialFilters = {} 
}: GlobalControlsPanelProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: initialFilters.dateFrom,
    to: initialFilters.dateTo,
  });
  
  const [activeFilters, setActiveFilters] = useState({
    roleFilter: initialFilters.roleFilter || '',
    statusFilter: initialFilters.statusFilter || '',
    domainFilter: initialFilters.domainFilter || '',
    activatedFilter: initialFilters.activatedFilter || '',
  });

  // Update URL parameters when filters change
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // Update date parameters
    if (dateRange?.from) {
      params.set('dateFrom', dateRange.from.toISOString());
    } else {
      params.delete('dateFrom');
    }
    
    if (dateRange?.to) {
      params.set('dateTo', dateRange.to.toISOString());
    } else {
      params.delete('dateTo');
    }
    
    // Update filter parameters
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    
    // Update URL without reload
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    window.history.replaceState({}, '', newUrl);
    
    // Notify parent of changes
    onFiltersChange({
      dateFrom: dateRange?.from,
      dateTo: dateRange?.to,
      ...activeFilters,
    });
  }, [dateRange, activeFilters, onFiltersChange]);

  // Load filters from URL on component mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    const dateFrom = params.get('dateFrom');
    const dateTo = params.get('dateTo');
    
    setDateRange({
      from: dateFrom ? new Date(dateFrom) : undefined,
      to: dateTo ? new Date(dateTo) : undefined,
    });
    
    setActiveFilters({
      roleFilter: params.get('roleFilter') || '',
      statusFilter: params.get('statusFilter') || '',
      domainFilter: params.get('domainFilter') || '',
      activatedFilter: params.get('activatedFilter') || '',
    });
  }, []);

  const handleFilterToggle = (filterType: string, value: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterType]: prev[filterType as keyof typeof prev] === value ? '' : value,
    }));
  };

  const clearAllFilters = () => {
    setDateRange({ from: undefined, to: undefined });
    setActiveFilters({
      roleFilter: '',
      statusFilter: '',
      domainFilter: '',
      activatedFilter: '',
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (dateRange?.from || dateRange?.to) count++;
    count += Object.values(activeFilters).filter(Boolean).length;
    return count;
  };

  const formatDateRange = () => {
    if (!dateRange?.from) return "Select date range";
    if (!dateRange.to) return format(dateRange.from, "dd/MM/yyyy");
    return `${format(dateRange.from, "dd/MM/yyyy")} - ${format(dateRange.to, "dd/MM/yyyy")}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Global Controls</span>
            {getActiveFilterCount() > 0 && (
              <Badge variant="secondary">
                {getActiveFilterCount()} active filter{getActiveFilterCount() > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          {getActiveFilterCount() > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              <X className="w-4 h-4 mr-1" />
              Clear All
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Date Range Picker */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Date Range (Joined)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formatDateRange()}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Segment Chips */}
          <div className="space-y-4">
            {/* Role Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center space-x-1">
                <Shield className="w-4 h-4" />
                <span>Role</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={activeFilters.roleFilter === 'user' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleFilterToggle('roleFilter', 'user')}
                  className="h-8"
                >
                  <Users className="w-3 h-3 mr-1" />
                  Users
                  {activeFilters.roleFilter === 'user' && <Check className="w-3 h-3 ml-1" />}
                </Button>
                <Button
                  variant={activeFilters.roleFilter === 'admin' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleFilterToggle('roleFilter', 'admin')}
                  className="h-8"
                >
                  <Shield className="w-3 h-3 mr-1" />
                  Admins
                  {activeFilters.roleFilter === 'admin' && <Check className="w-3 h-3 ml-1" />}
                </Button>
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center space-x-1">
                <Activity className="w-4 h-4" />
                <span>Status</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={activeFilters.statusFilter === 'active' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleFilterToggle('statusFilter', 'active')}
                  className="h-8"
                >
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                  Active
                  {activeFilters.statusFilter === 'active' && <Check className="w-3 h-3 ml-1" />}
                </Button>
                <Button
                  variant={activeFilters.statusFilter === 'inactive' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleFilterToggle('statusFilter', 'inactive')}
                  className="h-8"
                >
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-2" />
                  Inactive
                  {activeFilters.statusFilter === 'inactive' && <Check className="w-3 h-3 ml-1" />}
                </Button>
              </div>
            </div>

            {/* Activation Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center space-x-1">
                <Check className="w-4 h-4" />
                <span>Activation</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={activeFilters.activatedFilter === 'activated' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleFilterToggle('activatedFilter', 'activated')}
                  className="h-8"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Activated
                  {activeFilters.activatedFilter === 'activated' && <Check className="w-3 h-3 ml-1" />}
                </Button>
                <Button
                  variant={activeFilters.activatedFilter === 'not_activated' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleFilterToggle('activatedFilter', 'not_activated')}
                  className="h-8"
                >
                  <X className="w-3 h-3 mr-1" />
                  Not Activated
                  {activeFilters.activatedFilter === 'not_activated' && <Check className="w-3 h-3 ml-1" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Active Filters Summary */}
          {getActiveFilterCount() > 0 && (
            <div className="pt-4 border-t">
              <div className="text-sm text-muted-foreground mb-2">Active Filters:</div>
              <div className="flex flex-wrap gap-1">
                {dateRange?.from && (
                  <Badge variant="secondary" className="text-xs">
                    <CalendarIcon className="w-3 h-3 mr-1" />
                    {formatDateRange()}
                  </Badge>
                )}
                {activeFilters.roleFilter && (
                  <Badge variant="secondary" className="text-xs">
                    Role: {activeFilters.roleFilter}
                  </Badge>
                )}
                {activeFilters.statusFilter && (
                  <Badge variant="secondary" className="text-xs">
                    Status: {activeFilters.statusFilter}
                  </Badge>
                )}
                {activeFilters.activatedFilter && (
                  <Badge variant="secondary" className="text-xs">
                    Activation: {activeFilters.activatedFilter.replace('_', ' ')}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}