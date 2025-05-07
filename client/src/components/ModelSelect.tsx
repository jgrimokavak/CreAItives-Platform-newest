import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { modelCatalog, type ModelKey } from "@/lib/modelCatalog";
import { getModelColors, getModelSelectStyles } from "@/lib/modelColors";
import ModelBadge from "@/components/ModelBadge";

interface ModelSelectProps {
  value: ModelKey;
  onChange: (value: ModelKey) => void;
}

const ModelSelect: React.FC<ModelSelectProps> = ({ value, onChange }) => {
  const selectedColors = getModelSelectStyles(value);
  
  return (
    <Select
      value={value}
      onValueChange={(val: ModelKey) => onChange(val)}
    >
      <SelectTrigger 
        className="w-full font-semibold focus:ring-1 focus:ring-primary/50 transition-colors"
        style={{
          borderColor: selectedColors.trigger.borderColor,
          backgroundColor: selectedColors.trigger.backgroundColor,
        }}
      >
        <SelectValue placeholder="Select model">
          <div className="flex items-center">
            <ModelBadge modelKey={value} withLabel={false} size="sm" className="mr-2" />
            {modelCatalog[value].label}
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(modelCatalog).map(([key, info]) => {
          const modelKey = key as ModelKey;
          const colors = getModelSelectStyles(modelKey);
          
          return (
            <SelectItem 
              key={modelKey} 
              value={modelKey}
              className="flex items-center py-2 cursor-pointer transition-colors hover:bg-muted"
            >
              <div className="flex items-center">
                <ModelBadge modelKey={modelKey} className="mr-2" size="sm" />
                <div className="flex flex-col">
                  <span className="font-medium">{info.label}</span>
                  <span className="text-xs text-muted-foreground">{info.description}</span>
                </div>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};

export default ModelSelect;