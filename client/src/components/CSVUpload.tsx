import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Upload, FileWarning, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors relative overflow-hidden
          ${dragActive ? 'border-primary bg-primary/10' : 'border-muted'}
          ${isLoading ? 'pointer-events-none opacity-60' : 'hover:bg-muted/50 hover:border-primary/50'}`}
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
        
        <div className="flex flex-col items-center justify-center py-6">
          <div className="bg-primary/10 rounded-full p-4 mb-4">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-medium mb-2">
            Upload your CSV file
          </h3>
          <p className="text-muted-foreground mb-2 max-w-lg mx-auto">
            Drag and drop your file here or click to browse. Your CSV must include car details like make, model, color, etc.
          </p>
          {/* Template button removed - now included at the top of the page */}
          <div className="flex flex-wrap gap-2 justify-center mb-2">
            {validColumns.map(col => (
              <span key={col} className="bg-muted px-2 py-1 rounded-md text-xs font-medium">{col}</span>
            ))}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-primary inline-block"></span>
              Max 5MB
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-primary inline-block"></span>
              Up to 50 cars
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-primary inline-block"></span>
              .csv format
            </span>
          </div>
        </div>
      </div>
      
      {validationResult && (
        <Card className={validationResult.isValid ? "border-green-200" : validationResult.errors.length > 0 ? "border-red-200" : "border-yellow-200"}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              {validationResult.isValid ? (
                <>
                  <div className="p-1.5 bg-green-100 rounded-full">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <span>CSV Ready for Processing</span>
                </>
              ) : (
                <>
                  <div className="p-1.5 bg-red-100 rounded-full">
                    <FileWarning className="h-5 w-5 text-red-600" />
                  </div>
                  <span>CSV Validation Issues</span>
                </>
              )}
            </CardTitle>
            {selectedFile && (
              <CardDescription className="flex flex-wrap gap-2 mt-1 items-center">
                <span className="font-medium">{selectedFile.name}</span>
                <div className="flex gap-2 text-xs">
                  <span className="bg-muted px-2 py-0.5 rounded">{Math.round(selectedFile.size / 1024)} KB</span>
                  <span className="bg-muted px-2 py-0.5 rounded">{validationResult.rowCount} cars</span>
                </div>
              </CardDescription>
            )}
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Status summary */}
            {validationResult.isValid ? (
              <div className="rounded-md bg-green-50 border border-green-100 p-3">
                <div className="flex">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div className="ml-3 w-full">
                    <p className="text-sm font-medium text-green-800">Ready to generate {validationResult.rowCount} car images</p>
                    <div className="mt-2 flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-200 flex items-center justify-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        </div>
                        <p className="text-xs text-green-700">Estimated time: ~{Math.ceil(validationResult.rowCount * 7 / 60)} minutes</p>
                      </div>
                      {validationResult.rowCount > 10 && (
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-green-200 flex items-center justify-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                          </div>
                          <p className="text-xs text-green-700">Images will be packaged in a ZIP file</p>
                        </div>
                      )}
                      {validationResult.warnings.length > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-yellow-200 flex items-center justify-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                          </div>
                          <p className="text-xs text-yellow-700">Some non-critical warnings found (see below)</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : validationResult.errors.length > 0 ? (
              <div className="rounded-md bg-red-50 border border-red-100 p-3">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">Cannot process CSV due to critical errors</p>
                    <p className="text-sm text-red-700 mt-1">Please fix the errors below and try again.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-md bg-yellow-50 border border-yellow-100 p-3">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-yellow-800">CSV has some non-critical warnings</p>
                    <p className="text-sm text-yellow-700 mt-1">You can continue, but be aware of the issues below.</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Error messages */}
            {validationResult.errors.length > 0 && (
              <div className="rounded-md bg-red-50 border border-red-100 p-3">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="ml-3 text-sm text-red-700 w-full">
                    <h3 className="font-medium">Critical Errors:</h3>
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
              <div className="rounded-md bg-yellow-50 border border-yellow-100 p-3">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <div className="ml-3 text-sm text-yellow-700 w-full">
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
                        <tr key={`row-${i}`}>
                          <td className="px-3 py-2">{i + 1}</td>
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
              <div className="pt-4">
                <Button 
                  className="w-full h-auto py-3 text-base"
                  onClick={handleUpload}
                  disabled={isLoading}
                  size="lg"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Processing your request...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Upload className="h-5 w-5" />
                      <span>Generate {validationResult.rowCount} Car {validationResult.rowCount === 1 ? 'Image' : 'Images'}</span>
                    </div>
                  )}
                </Button>
                
                {!isLoading && (
                  <div className="text-center text-xs text-muted-foreground mt-2">
                    Generation will take approximately {Math.ceil(validationResult.rowCount * 7 / 60)} minutes to complete
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CSVUpload;