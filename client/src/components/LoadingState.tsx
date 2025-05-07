import { Sparkles, Wand2 } from "lucide-react";

export default function LoadingState() {
  return (
    <div className="text-center p-8 bg-muted/30 rounded-xl border border-primary/10 flex flex-col items-center justify-center h-full w-full">
      <div className="mb-6 relative w-20 h-20 flex items-center justify-center">
        {/* Pulsing background */}
        <div className="absolute inset-0 bg-primary/5 rounded-full"></div>
        
        {/* Spinning border */}
        <div className="absolute inset-0 border-3 border-primary/20 border-dashed rounded-full animate-spin"></div>
        
        {/* Icon */}
        <div className="relative bg-primary/10 rounded-full p-4 z-10">
          <Wand2 className="h-12 w-12 text-primary/70" strokeWidth={1.5} />
        </div>
        
        {/* Decorative sparkles */}
        <Sparkles className="absolute -top-2 -right-1 h-6 w-6 text-primary animate-pulse" />
        <Sparkles className="absolute bottom-0 -left-1 h-4 w-4 text-primary animate-pulse delay-75" />
      </div>
      
      <h3 className="text-lg font-medium mb-2 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/80">
        Generating your images
      </h3>
      
      <div className="max-w-md mx-auto">
        <p className="text-muted-foreground text-sm">
          Please wait while the AI creates your images
        </p>
        
        {/* Animated progress dots */}
        <div className="flex justify-center mt-4 space-x-1.5">
          <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce"></div>
          <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce delay-150"></div>
          <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce delay-300"></div>
        </div>
      </div>
    </div>
  );
}
