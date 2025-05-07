import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Upload, FileWarning, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import Papa from 'papaparse';

interface CSVValidationResult {
  isValid: boolean;
  data: any[];
  rowCount: number;
  errors: string[];
  warnings: string[];
  hasUnknownColumns: boolean;
  unknownColumns: string[];
}

interface CSVUploadProps {
  onUpload: (file: File) => void;
  isLoading: boolean;
}

const CSVUpload: React.FC<CSVUploadProps> = ({ onUpload, isLoading }) => {
  const { toast } = useToast();
  const [dragActive, setDragActive] = useState(false);
  const [validationResult, setValidationResult] = useState<CSVValidationResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Known valid columns for car generation CSV
  const validColumns = [
    'make', 'model', 'body_style', 'trim', 'year', 'color', 'background', 'aspect_ratio'
  ];
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      validateCSVFile(file);
    }
  };
  
  // Handle drag events
  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  // Handle drop event
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      validateCSVFile(file);
    }
  };
  
  // Validate the CSV file
  const validateCSVFile = (file: File) => {
    console.log(`Validating CSV file: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);
    
    // Check file type - only allow CSV files
    if (!file.name.toLowerCase().endsWith('.csv')) {
      console.error(`Invalid file type: ${file.type}, expected CSV`);
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file with the .csv extension",
        variant: "destructive"
      });
      return;
    }
    
    // Check file size - 5MB limit
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      console.error(`File too large: ${file.size} bytes, max allowed: ${MAX_FILE_SIZE} bytes`);
      toast({
        title: "File too large",
        description: "CSV file must be less than 5MB",
        variant: "destructive"
      });
      return;
    }
    
    console.log(`File passed initial validation, starting CSV parsing...`);
    
    // Parse and validate the CSV content
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        console.log(`Papa Parse complete - Found ${results.data.length} rows`);
        console.log(`Headers found:`, results.meta.fields);
        
        if (results.errors.length > 0) {
          console.error(`Papa Parse errors:`, results.errors);
        }
        
        const data = results.data as any[];
        const errors: string[] = [];
        const warnings: string[] = [];
        
        // Check if we have data
        if (data.length === 0) {
          const error = "CSV file contains no data rows";
          console.error(error);
          errors.push(error);
        }
        
        // Check row limit (max 50)
        if (data.length > 50) {
          const error = `CSV contains ${data.length} rows, which exceeds the maximum limit of 50 rows`;
          console.error(error);
          errors.push(error);
        }
        
        // Check for unknown columns
        const fileColumns = results.meta.fields || [];
        const unknownColumns = fileColumns.filter(col => 
          !validColumns.includes(col.toLowerCase())
        );
        
        if (unknownColumns.length > 0) {
          const warning = `Unknown columns detected: ${unknownColumns.join(', ')}. These will be ignored.`;
          console.warn(warning);
          warnings.push(warning);
        }
        
        // Check if we have required columns (at least make and model)
        const hasMake = fileColumns.some(col => col.toLowerCase() === 'make');
        const hasModel = fileColumns.some(col => col.toLowerCase() === 'model');
        
        if (!hasMake) {
          const warning = "'make' column not found in CSV. Cars will be generated without make details.";
          console.warn(warning);
          warnings.push(warning);
        }
        
        if (!hasModel) {
          const warning = "'model' column not found in CSV. Cars will be generated without model details.";
          console.warn(warning);
          warnings.push(warning);
        }
        
        // Log sample data for debugging
        console.log(`Sample data (first row):`, data.length > 0 ? data[0] : 'No data');
        
        // Set validation result
        const validationResult = {
          isValid: errors.length === 0,
          data: data.slice(0, 10), // Preview first 10 rows only
          rowCount: data.length,
          errors,
          warnings,
          hasUnknownColumns: unknownColumns.length > 0,
          unknownColumns
        };
        
        console.log(`Validation result:`, validationResult);
        setValidationResult(validationResult);
        
        // Store the file if valid
        if (errors.length === 0) {
          console.log(`CSV validation successful, storing file for upload`);
          setSelectedFile(file);
        } else {
          console.error(`CSV validation failed: ${errors.join(', ')}`);
          setSelectedFile(null);
        }
      },
      error: (error) => {
        console.error(`Papa Parse error:`, error);
        toast({
          title: "CSV parsing error",
          description: error.message,
          variant: "destructive"
        });
        setSelectedFile(null);
        setValidationResult(null);
      }
    });
  };
  
  // Handle upload button click
  const handleUpload = () => {
    if (selectedFile) {
      console.log(`Initiating upload for file: ${selectedFile.name}, size: ${selectedFile.size} bytes`);
      onUpload(selectedFile);
    } else {
      console.error('Upload attempted but no file is selected');
    }
  };
  
  return (
    <div className="space-y-4">
      <div 
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors relative overflow-hidden
          ${dragActive ? 'border-primary bg-primary/10' : 'border-border'}
          ${isLoading ? 'pointer-events-none opacity-60' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-upload')?.click()}
      >
        <input
          id="file-upload"
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
          disabled={isLoading}
        />
        
        <div className="flex flex-col items-center justify-center py-4">
          <Upload className="h-10 w-10 text-muted-foreground mb-2" />
          <p className="text-lg font-medium">
            Drag and drop your CSV file here, or click to browse
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            CSV must contain columns such as make, model, body_style, trim, year, color, background (white/hub), 
            aspect_ratio (1:1,16:9,9:16,4:3,3:4)
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Maximum file size: 5MB • Maximum 50 rows
          </p>
        </div>
      </div>
      
      {validationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {validationResult.isValid ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  CSV File Validated
                </>
              ) : (
                <>
                  <FileWarning className="h-5 w-5 text-red-500 mr-2" />
                  CSV Validation Failed
                </>
              )}
            </CardTitle>
            {selectedFile && (
              <CardDescription>
                {selectedFile.name} • {Math.round(selectedFile.size / 1024)} KB • {validationResult.rowCount} rows
              </CardDescription>
            )}
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Error messages */}
            {validationResult.errors.length > 0 && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  <div className="ml-3 text-sm text-red-700">
                    <h3 className="font-medium">Errors:</h3>
                    <ul className="mt-1 list-disc list-inside space-y-1">
                      {validationResult.errors.map((error, i) => (
                        <li key={`error-${i}`}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            
            {/* Warning messages */}
            {validationResult.warnings.length > 0 && (
              <div className="rounded-md bg-yellow-50 p-4">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-yellow-400" />
                  <div className="ml-3 text-sm text-yellow-700">
                    <h3 className="font-medium">Warnings:</h3>
                    <ul className="mt-1 list-disc list-inside space-y-1">
                      {validationResult.warnings.map((warning, i) => (
                        <li key={`warning-${i}`}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            
            {/* Preview data table */}
            {validationResult.data.length > 0 && (
              <div>
                <Label className="font-medium mb-2 block">Preview (first 10 rows):</Label>
                <div className="border rounded-md overflow-auto max-h-60">
                  <table className="min-w-full divide-y divide-border text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Row</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                        {Object.keys(validationResult.data[0]).map((col) => (
                          <th 
                            key={col} 
                            className={`px-3 py-2 text-left font-medium ${
                              validationResult.unknownColumns.includes(col) 
                                ? 'text-yellow-500'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {validationResult.data.map((row, i) => (
                        <tr key={`row-${i}`} className="hover:bg-muted/50">
                          <td className="px-3 py-2 font-medium">{i + 1}</td>
                          <td className="px-3 py-2">
                            {i === 0 && (
                              <Badge 
                                variant="outline" 
                                className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                              >
                                Processing
                              </Badge>
                            )}
                            {i === 1 && (
                              <Badge 
                                variant="outline" 
                                className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
                              >
                                Completed
                              </Badge>
                            )}
                            {i === 2 && (
                              <Badge 
                                variant="outline" 
                                className="bg-red-50 text-red-700 hover:bg-red-100 border-red-200"
                              >
                                Failed
                              </Badge>
                            )}
                            {i > 2 && (
                              <Badge 
                                variant="outline" 
                                className="bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200"
                              >
                                Pending
                              </Badge>
                            )}
                          </td>
                          {Object.keys(validationResult.data[0]).map((col) => (
                            <td 
                              key={`${i}-${col}`} 
                              className={`px-3 py-2 ${
                                validationResult.unknownColumns.includes(col) 
                                  ? 'text-yellow-500'
                                  : ''
                              }`}
                            >
                              {row[col] || ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* Upload button */}
            {validationResult.isValid && selectedFile && (
              <div className="pt-2">
                <Button 
                  className="w-full" 
                  onClick={handleUpload}
                  disabled={isLoading}
                >
                  {isLoading ? "Processing..." : `Start Batch Generation (${validationResult.rowCount} car images)`}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CSVUpload;