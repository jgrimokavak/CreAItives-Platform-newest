import * as React from "react";
import { Check, ChevronsUpDown, Sparkles, Zap, Brain } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

export interface AIComboboxProps {
  label: string;
  options: string[];
  onSelect: (value: string) => void;
  isLoading?: boolean;
}

export function AICombobox({ label, options, onSelect, isLoading = false }: AIComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");

  // Disable if no options or loading
  const isEmpty = options.length === 0;
  const isDisabled = isEmpty && !isLoading;
  
  // Random sparkle animation for the AI badge
  const [sparkleClass, setSparkleClass] = React.useState("animate-pulse");
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      const animations = ["animate-pulse", "animate-bounce", "animate-none"];
      const randomAnimation = animations[Math.floor(Math.random() * animations.length)];
      setSparkleClass(randomAnimation);
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col space-y-1.5 relative">
      <Label className="text-sm font-medium flex items-center text-purple-700">
        <Zap className="h-3.5 w-3.5 mr-1.5 text-purple-500" />
        {label}
        {isLoading && (
          <svg className="ml-2 h-3 w-3 animate-spin text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between relative bg-gradient-to-r from-violet-50 to-indigo-50 border-purple-200 ring-1 ring-inset ring-purple-100/70 hover:ring-purple-200 hover:from-violet-100 hover:to-indigo-100 hover:border-purple-300 text-purple-800 shadow-sm",
              isDisabled ? "opacity-50 cursor-not-allowed" : "",
              "focus:ring-2 focus:ring-purple-300 focus:border-purple-300 transition-all duration-200"
            )}
            disabled={isDisabled}
          >
            <div className="flex items-center">
              {value
                ? options.find((option) => option === value)
                : isEmpty
                ? "AI suggestions loading..."
                : "Select AI-powered suggestion"}
            </div>
            <div className="flex items-center">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mr-1 animate-pulse"></div>
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-purple-500" />
            </div>
            
            {/* AI highlight effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-400/5 via-blue-400/5 to-indigo-400/5 opacity-50 rounded-md pointer-events-none"></div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0 border-purple-200 bg-gradient-to-b from-white to-violet-50 shadow-lg shadow-purple-100/50 rounded-lg ring-1 ring-purple-200">
          <Command className="bg-transparent">
            <CommandInput 
              placeholder="Filter AI suggestions..." 
              className="border-purple-100 focus:ring-purple-200 text-purple-900" 
            />
            <CommandEmpty className="text-purple-500 flex items-center justify-center p-4">
              <Brain className="h-4 w-4 mr-2 opacity-70" />
              <span>No matching suggestions</span>
            </CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={(currentValue) => {
                    setValue(currentValue);
                    setOpen(false);
                    onSelect(currentValue);
                  }}
                  className="hover:bg-purple-100 data-[selected=true]:bg-purple-200 group transition-colors"
                >
                  <div className="flex items-center w-full">
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 text-purple-600",
                        value === option ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="group-hover:text-purple-800">{option}</span>
                    <Sparkles className="ml-auto h-3 w-3 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
      
      {/* AI Badge with animation */}
      <div className="absolute -top-2 right-1">
        <span className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 px-2 py-0.5 text-xs text-white font-medium shadow-sm">
          <Sparkles className={`h-3 w-3 mr-1 ${sparkleClass}`} />
          AI
        </span>
      </div>
    </div>
  );
}