import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { modelCatalog, type ModelKey } from "@/lib/modelCatalog";

interface ModelSelectProps {
  value: ModelKey;
  onChange: (value: ModelKey) => void;
}

const ModelSelect: React.FC<ModelSelectProps> = ({ value, onChange }) => {
  return (
    <Select
      value={value}
      onValueChange={(val: ModelKey) => onChange(val)}
    >
      <SelectTrigger className="w-full font-semibold focus:ring-1 focus:ring-primary/50">
        <SelectValue placeholder="Select model" />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(modelCatalog).map(([key, info]) => (
          <SelectItem key={key} value={key}>
            {info.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default ModelSelect;