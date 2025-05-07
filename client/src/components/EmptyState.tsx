import { Image as ImageIcon, Sparkles, ArrowLeft } from "lucide-react";

export default function EmptyState() {
  return (
    <div className="text-center py-8 bg-muted/30 rounded-xl border border-border/50 flex flex-col items-center justify-center w-full">
      <div className="mb-5 relative w-20 h-20 flex items-center justify-center">
        <div className="absolute inset-0 bg-primary/5 rounded-full animate-pulse"></div>
        <div className="relative bg-primary/10 rounded-full p-5">
          <ImageIcon className="h-10 w-10 text-primary/70" strokeWidth={1.5} />
        </div>
        <Sparkles className="absolute -top-2 -right-2 h-5 w-5 text-primary animate-pulse" />
      </div>
      
      <h3 className="text-lg font-medium mb-3">Your generated images will appear here</h3>
      
      <div className="max-w-md mx-auto space-y-3 px-4">
        <p className="text-muted-foreground text-sm">
          Fill out the form on the left to create new images or edit existing ones
        </p>
        
        <div className="flex justify-center">
          <div className="flex items-center text-sm text-primary/80 animate-pulse">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            <span>Use the form to get started</span>
          </div>
        </div>
      </div>
    </div>
  );
}
