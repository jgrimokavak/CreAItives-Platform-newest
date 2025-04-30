// Export all UI components from here
export { Button } from './button';
export { Card, CardContent } from './card';
export { Checkbox } from './checkbox';
export { Progress } from './progress';

// Custom Tooltip wrapper
import { 
  Tooltip as TooltipPrimitive,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from './tooltip';

export const Tooltip = ({ 
  children, 
  content 
}: { 
  children: React.ReactElement; 
  content: string 
}) => (
  <TooltipPrimitive>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent>{content}</TooltipContent>
  </TooltipPrimitive>
);

// Custom Spinner component
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import React from 'react';

export const Spinner = ({ className }: { className?: string }) => {
  return (
    <Loader2 className={cn('animate-spin', className)} />
  );
};