import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Download, 
  FileDown, 
  AlertTriangle,
  Users,
  Filter,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ExportDialogProps {
  selectedIds: string[];
  currentFilters?: any;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_EXPORT_ROWS = 1000; // Hard cap on export rows

export default function ExportDialog({ 
  selectedIds, 
  currentFilters = {}, 
  isOpen, 
  onOpenChange 
}: ExportDialogProps) {
  const { toast } = useToast();
  const [exportType, setExportType] = useState<'selected' | 'filtered'>('selected');
  const [isExporting, setIsExporting] = useState(false);

  const exportMutation = useMutation({
    mutationFn: async (data: { type: 'selected' | 'filtered' }) => {
      const payload = {
        maxRows: MAX_EXPORT_ROWS,
        ...(data.type === 'selected' 
          ? { userIds: selectedIds }
          : { filters: currentFilters }
        ),
      };
      
      return apiRequest('/api/admin/users/export', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (data) => {
      // Create and download CSV
      const csv = convertToCSV(data.data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      toast({
        title: 'Export Completed',
        description: `Successfully exported ${data.count} users`,
      });
      
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Export Failed',
        description: error.message || 'Failed to export users',
        variant: 'destructive',
      });
    },
    onSettled: () => setIsExporting(false),
  });

  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape values that contain commas or quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ];
    
    return csvRows.join('\n');
  };

  const handleExport = () => {
    if (exportType === 'selected' && selectedIds.length === 0) {
      toast({
        title: 'No Users Selected',
        description: 'Please select users to export or switch to filtered export',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    exportMutation.mutate({ type: exportType });
  };

  const estimatedRows = exportType === 'selected' ? selectedIds.length : 'Unknown';
  const isOverLimit = exportType === 'selected' && selectedIds.length > MAX_EXPORT_ROWS;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileDown className="w-5 h-5" />
            <span>Export Users</span>
          </DialogTitle>
          <DialogDescription>
            Export user data to CSV format for analysis or reporting
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Type Selection */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Export Type</Label>
            <RadioGroup value={exportType} onValueChange={(value: 'selected' | 'filtered') => setExportType(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="selected" id="selected" />
                <Label htmlFor="selected" className="flex-1">
                  <Card className="cursor-pointer border-2 hover:border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <Users className="w-5 h-5 text-blue-600" />
                        <div>
                          <div className="font-medium">Selected Rows</div>
                          <div className="text-sm text-muted-foreground">
                            Export {selectedIds.length} currently selected user{selectedIds.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <RadioGroupItem value="filtered" id="filtered" />
                <Label htmlFor="filtered" className="flex-1">
                  <Card className="cursor-pointer border-2 hover:border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <Filter className="w-5 h-5 text-blue-600" />
                        <div>
                          <div className="font-medium">Current Filters</div>
                          <div className="text-sm text-muted-foreground">
                            Export all users matching current search and filter criteria
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Export Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Export Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Estimated Rows:</span>
                <span className={isOverLimit ? 'text-red-600 font-medium' : 'font-medium'}>
                  {estimatedRows}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Maximum Allowed:</span>
                <span className="font-medium">{MAX_EXPORT_ROWS}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Format:</span>
                <span className="font-medium">CSV</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Includes:</span>
                <div className="text-right">
                  <div className="font-medium">Basic Info, Activity Stats</div>
                  <div className="text-xs text-muted-foreground">No sensitive data</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Safety Warnings */}
          {isOverLimit && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-800">
                Your selection exceeds the maximum export limit of {MAX_EXPORT_ROWS} rows. 
                Please reduce your selection or refine your filters.
              </AlertDescription>
            </Alert>
          )}

          {exportType === 'filtered' && (
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                Filtered exports may return more data than expected. The system will enforce the 
                {MAX_EXPORT_ROWS} row limit and fail if exceeded.
              </AlertDescription>
            </Alert>
          )}

          {/* Export Notice */}
          <Alert>
            <CheckCircle className="w-4 h-4" />
            <AlertDescription>
              <strong>Export Info:</strong> This export will be logged with your user ID and 
              timestamp for security purposes. All data is exported in CSV format for easy use 
              in spreadsheet applications.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Maximum {MAX_EXPORT_ROWS} rows per export
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleExport}
              disabled={isExporting || isOverLimit || !reason.trim()}
            >
              {isExporting ? (
                <>
                  <Download className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}