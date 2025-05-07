import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface NavTabsProps {
  currentTab: string;
  onChange: (tab: string) => void;
  tabs: {
    value: string;
    label: string;
  }[];
  className?: string;
}

export default function NavTabs({ currentTab, onChange, tabs, className }: NavTabsProps) {
  return (
    <div className={cn("flex w-full", className)}>
      <div className="w-full flex rounded-md bg-muted p-1 overflow-hidden">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={cn(
              "flex-1 text-sm py-2 px-3 rounded-md font-medium text-center transition-colors",
              currentTab === tab.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground/80 hover:bg-background/10"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface TabContentProps {
  value: string;
  currentTab: string;
  children: ReactNode;
}

export function TabContent({ value, currentTab, children }: TabContentProps) {
  if (value !== currentTab) return null;
  return <div className="mt-0">{children}</div>;
}