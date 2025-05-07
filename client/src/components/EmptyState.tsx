import { Image as ImageIcon, Sparkles, ArrowUp } from "lucide-react";

export default function EmptyState() {
  return (
    <div className="text-center py-12 bg-muted/30 rounded-xl border border-border/50 flex flex-col items-center justify-center">
      <div className="mb-6 relative w-24 h-24 flex items-center justify-center">
        <div className="absolute inset-0 bg-primary/5 rounded-full animate-pulse"></div>
        <div className="relative bg-primary/10 rounded-full p-6">
          <ImageIcon className="h-12 w-12 text-primary/70" strokeWidth={1.5} />
        </div>
        <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-primary animate-pulse" />
      </div>
      
      <h3 className="text-xl font-medium mb-3">Ready to create</h3>
      
      <div className="max-w-md mx-auto space-y-4 px-4">
        <p className="text-muted-foreground text-sm">
          Describe what you want to create in the prompt field above, 
          then click the Create Images button to generate AI images.
        </p>
        
        <div className="flex justify-center">
          <div className="flex items-center text-sm text-primary/80 animate-bounce">
            <ArrowUp className="h-4 w-4 mr-1.5" />
            <span>Start by filling out the form above</span>
          </div>
        </div>
      </div>
    </div>
  );
}
