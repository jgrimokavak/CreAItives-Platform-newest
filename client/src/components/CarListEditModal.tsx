import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ExternalLink, Plus, Database, RefreshCw, FileSpreadsheet } from "lucide-react";

interface CarListEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GOOGLE_SHEETS_URL = "https://docs.google.com/spreadsheets/d/1ftpeFWjClvZINpJMxae1qrNRS1a7XPKAC0FUGizfgzs/edit?usp=sharing";

export default function CarListEditModal({ open, onOpenChange }: CarListEditModalProps) {
  const handleOpenSheet = () => {
    window.open(GOOGLE_SHEETS_URL, '_blank', 'noopener,noreferrer');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span>Edit Car Database</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Instructions Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30">
                <Plus className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-green-800 dark:text-green-200 mb-1">
                  Adding New Cars
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Insert new rows at the bottom of the spreadsheet
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 mt-0.5">
                <FileSpreadsheet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="font-semibold text-blue-800 dark:text-blue-200">
                  Required Columns
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                    <span className="text-blue-700 dark:text-blue-300">Make</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                    <span className="text-blue-700 dark:text-blue-300">Model</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                    <span className="text-blue-700 dark:text-blue-300">Body Style</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                    <span className="text-blue-700 dark:text-blue-300">Trim</span>
                  </div>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 italic">
                  Values can be left empty but it is not recommended
                </p>
              </div>
            </div>
          </div>

          {/* Warning Section */}
          <div className="border-t pt-4">
            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
              </div>
              <div className="flex-1 space-y-3">
                <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                  Important Guidelines
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0"></div>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      <strong>Do not modify</strong> existing car entries to prevent data corruption
                    </p>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0"></div>
                    <div className="text-sm text-amber-700 dark:text-amber-300">
                      <p className="mb-1">After adding cars:</p>
                      <div className="flex items-center gap-2 text-xs bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded">
                        <RefreshCw className="h-3 w-3" />
                        <span>Push "Refresh Car Data" button and refresh the site</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleOpenSheet} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700">
            <ExternalLink className="h-4 w-4" />
            Open Google Sheet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}