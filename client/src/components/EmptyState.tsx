import { Image as ImageIcon, Sparkles, ArrowLeft } from "lucide-react";

export default function EmptyState() {
  return (
    <div className="text-center py-8 bg-muted/30 rounded-xl border border-border/50 flex flex-col items-center justify-center w-full h-full">
      <div className="mb-5 relative w-16 h-16 flex items-center justify-center">
        <div className="absolute inset-0 bg-primary/5 rounded-full animate-pulse"></div>
        <div className="relative bg-primary/10 rounded-full p-4">
          <ImageIcon className="h-8 w-8 text-primary/70" strokeWidth={1.5} />
        </div>
        <Sparkles className="absolute -top-2 -right-2 h-4 w-4 text-primary animate-pulse" />
      </div>
      
      <h3 className="text-base font-medium mb-2">No images generated yet</h3>
      
      <div className="max-w-md mx-auto space-y-2 px-4">
        <p className="text-muted-foreground text-xs">
          Use the form on the left to create or edit images
        </p>
        
        <div className="flex justify-center">
          <div className="flex items-center text-xs text-primary/80 animate-pulse">
            <ArrowLeft className="h-3 w-3 mr-1" />
            <span>Select options to begin</span>
          </div>
        </div>
      </div>
    </div>
  );
}
