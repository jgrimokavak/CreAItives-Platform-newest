import { Sparkles, Wand2 } from "lucide-react";

export default function LoadingState() {
  return (
    <div className="text-center py-16 bg-muted/30 rounded-xl border border-primary/10 flex flex-col items-center justify-center">
      <div className="mb-8 relative w-24 h-24 flex items-center justify-center">
        {/* Pulsing background */}
        <div className="absolute inset-0 bg-primary/5 rounded-full"></div>
        
        {/* Spinning border */}
        <div className="absolute inset-0 border-4 border-primary/20 border-dashed rounded-full animate-spin"></div>
        
        {/* Icon */}
        <div className="relative bg-primary/10 rounded-full p-5 z-10">
          <Wand2 className="h-14 w-14 text-primary/70" strokeWidth={1.5} />
        </div>
        
        {/* Decorative sparkles */}
        <Sparkles className="absolute -top-3 -right-2 h-7 w-7 text-primary animate-pulse" />
        <Sparkles className="absolute bottom-0 -left-1 h-5 w-5 text-primary animate-pulse delay-75" />
      </div>
      
      <h3 className="text-xl font-semibold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/80">
        Creating your AI images
      </h3>
      
      <div className="max-w-md mx-auto">
        <p className="text-muted-foreground text-sm">
          Our AI is crafting your images. This generally takes 15-30 seconds depending on complexity.
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
