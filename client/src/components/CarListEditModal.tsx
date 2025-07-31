import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ExternalLink } from "lucide-react";

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Edit Car Database
          </DialogTitle>
          <DialogDescription className="text-left space-y-3">
            <div>
              <p className="font-medium mb-2">You can add new cars to the database:</p>
              <ul className="text-sm space-y-1 ml-4">
                <li>• To add: Insert new rows at the bottom</li>
                <li>• Required columns: Make, Model, Body Style, Trim (values can be left empty but it is not recommended)</li>
              </ul>
            </div>
            
            <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-orange-800 dark:text-orange-200 mb-1">Important:</p>
                  <ul className="text-orange-700 dark:text-orange-300 space-y-1">
                    <li>• Do not modify existing car entries</li>
                    <li>• After adding cars, push the "Refresh Car Data" button and refresh the site</li>
                  </ul>
                </div>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleOpenSheet} className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            Open Sheet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}