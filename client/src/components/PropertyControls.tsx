// Standardized Property Controls - Consistent UI across all components
import { memo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { PropertyDefinition } from '@/lib/propertyRegistry';

interface PropertyControlProps {
  property: PropertyDefinition;
  value: any;
  onChange: (value: any) => void;
}

// Color picker with hex input and swatch
const ColorControl = memo(({ property, value, onChange }: PropertyControlProps) => (
  <div className="space-y-2">
    <Label htmlFor={property.key}>{property.label}</Label>
    <div className="flex gap-2 items-center">
      <input
        id={property.key}
        type="color"
        value={value || property.defaultValue || '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="w-12 h-8 rounded border border-gray-300 cursor-pointer"
      />
      <Input
        value={value || property.defaultValue || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={property.placeholder || '#000000'}
        className="flex-1 font-mono text-sm"
      />
    </div>
    {property.tooltip && (
      <p className="text-xs text-gray-500">{property.tooltip}</p>
    )}
  </div>
));

// Number control with slider on top and input below
const NumberControl = memo(({ property, value, onChange }: PropertyControlProps) => {
  const numValue = parseFloat(value) || property.defaultValue || property.min || 0;
  const displayValue = property.unit ? `${numValue}${property.unit}` : numValue.toString();
  
  return (
    <div className="space-y-2">
      <Label htmlFor={property.key}>{property.label}</Label>
      {property.min !== undefined && property.max !== undefined && (
        <div className="px-2">
          <Slider
            value={[numValue]}
            onValueChange={(values) => {
              const newValue = property.unit ? `${values[0]}${property.unit}` : values[0];
              onChange(newValue);
            }}
            min={property.min}
            max={property.max}
            step={property.step || 1}
            className="w-full"
          />
        </div>
      )}
      <Input
        id={property.key}
        type="number"
        value={numValue}
        onChange={(e) => {
          const newValue = property.unit ? `${e.target.value}${property.unit}` : e.target.value;
          onChange(newValue);
        }}
        min={property.min}
        max={property.max}
        step={property.step}
        placeholder={property.placeholder}
        className="w-full"
      />
      <div className="text-xs text-gray-500">
        Current: {displayValue}
      </div>
      {property.tooltip && (
        <p className="text-xs text-gray-500">{property.tooltip}</p>
      )}
    </div>
  );
});

// Slider control with numeric input
const SliderControl = memo(({ property, value, onChange }: PropertyControlProps) => {
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/px$/, '')) : (value || property.defaultValue || property.min || 0);
  const displayValue = property.unit ? `${numValue}${property.unit}` : numValue.toString();
  
  return (
    <div className="space-y-2">
      <Label htmlFor={property.key}>{property.label}: {displayValue}</Label>
      <div className="px-2">
        <Slider
          value={[numValue]}
          onValueChange={(values) => {
            const newValue = property.unit ? `${values[0]}${property.unit}` : values[0];
            onChange(newValue);
          }}
          min={property.min || 0}
          max={property.max || 100}
          step={property.step || 1}
          className="w-full"
        />
      </div>
      <Input
        id={property.key}
        type="number"
        value={numValue}
        onChange={(e) => {
          const newValue = property.unit ? `${e.target.value}${property.unit}` : e.target.value;
          onChange(newValue);
        }}
        min={property.min}
        max={property.max}
        step={property.step}
        className="w-full"
      />
      {property.tooltip && (
        <p className="text-xs text-gray-500">{property.tooltip}</p>
      )}
    </div>
  );
});

// Select/dropdown control - always vertical
const SelectControl = memo(({ property, value, onChange }: PropertyControlProps) => (
  <div className="space-y-2">
    <Label htmlFor={property.key}>{property.label}</Label>
    <Select value={value || property.defaultValue || ''} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={property.placeholder} />
      </SelectTrigger>
      <SelectContent>
        {property.options?.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    {property.tooltip && (
      <p className="text-xs text-gray-500">{property.tooltip}</p>
    )}
  </div>
));

// Box model control for padding/margin (T/R/B/L in single row)
const BoxModelControl = memo(({ property, value, onChange }: PropertyControlProps) => {
  // Parse value like "10px 25px" or "10px 25px 10px 25px"
  const parseBoxModel = (val: string) => {
    if (!val) return { top: '', right: '', bottom: '', left: '' };
    const parts = val.split(' ').map(p => p.trim());
    
    if (parts.length === 1) {
      return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] };
    } else if (parts.length === 2) {
      return { top: parts[0], right: parts[1], bottom: parts[0], left: parts[1] };
    } else if (parts.length === 4) {
      return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] };
    }
    return { top: parts[0] || '', right: parts[1] || '', bottom: parts[2] || '', left: parts[3] || '' };
  };

  const buildBoxModel = (top: string, right: string, bottom: string, left: string) => {
    // Smart formatting
    if (top === right && right === bottom && bottom === left) {
      return top;
    } else if (top === bottom && left === right) {
      return `${top} ${right}`;
    } else {
      return `${top} ${right} ${bottom} ${left}`;
    }
  };

  const boxValues = parseBoxModel(value || property.defaultValue || '');

  const updateBoxValue = (side: string, val: string) => {
    const newValues = { ...boxValues, [side]: val };
    const newValue = buildBoxModel(newValues.top, newValues.right, newValues.bottom, newValues.left);
    onChange(newValue);
  };

  return (
    <div className="space-y-2">
      <Label>{property.label}</Label>
      <div className="space-y-2">
        {/* All sides input */}
        <Input
          value={value || property.defaultValue || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={property.placeholder || '10px 25px'}
          className="w-full"
        />
        
        {/* Individual sides in box layout */}
        <div className="grid grid-cols-4 gap-1 text-xs">
          <div className="text-center">
            <label className="block text-gray-600 mb-1">T</label>
            <Input
              value={boxValues.top}
              onChange={(e) => updateBoxValue('top', e.target.value)}
              placeholder="0"
              className="h-8 text-xs text-center"
            />
          </div>
          <div className="text-center">
            <label className="block text-gray-600 mb-1">R</label>
            <Input
              value={boxValues.right}
              onChange={(e) => updateBoxValue('right', e.target.value)}
              placeholder="0"
              className="h-8 text-xs text-center"
            />
          </div>
          <div className="text-center">
            <label className="block text-gray-600 mb-1">B</label>
            <Input
              value={boxValues.bottom}
              onChange={(e) => updateBoxValue('bottom', e.target.value)}
              placeholder="0"
              className="h-8 text-xs text-center"
            />
          </div>
          <div className="text-center">
            <label className="block text-gray-600 mb-1">L</label>
            <Input
              value={boxValues.left}
              onChange={(e) => updateBoxValue('left', e.target.value)}
              placeholder="0"
              className="h-8 text-xs text-center"
            />
          </div>
        </div>
      </div>
      {property.tooltip && (
        <p className="text-xs text-gray-500">{property.tooltip}</p>
      )}
    </div>
  );
});

// Toggle/checkbox control - left aligned with label right
const ToggleControl = memo(({ property, value, onChange }: PropertyControlProps) => (
  <div className="space-y-2">
    <div className="flex items-center space-x-2">
      <Switch
        id={property.key}
        checked={value === true || value === 'true'}
        onCheckedChange={(checked) => onChange(checked)}
      />
      <Label htmlFor={property.key} className="text-sm">
        {property.label}
      </Label>
    </div>
    {property.tooltip && (
      <p className="text-xs text-gray-500">{property.tooltip}</p>
    )}
  </div>
));

// Text input control - label above, vertical stacking
const TextControl = memo(({ property, value, onChange }: PropertyControlProps) => (
  <div className="space-y-2">
    <Label htmlFor={property.key}>{property.label}</Label>
    <Input
      id={property.key}
      value={value || property.defaultValue || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={property.placeholder}
      className="w-full"
    />
    {property.tooltip && (
      <p className="text-xs text-gray-500">{property.tooltip}</p>
    )}
  </div>
));

// Textarea control - vertical stacking
const TextareaControl = memo(({ property, value, onChange }: PropertyControlProps) => (
  <div className="space-y-2">
    <Label htmlFor={property.key}>{property.label}</Label>
    <textarea
      id={property.key}
      value={value || property.defaultValue || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={property.placeholder}
      className="w-full p-2 border border-gray-300 rounded-md resize-none min-h-[80px]"
    />
    {property.tooltip && (
      <p className="text-xs text-gray-500">{property.tooltip}</p>
    )}
  </div>
));

// URL input control - enhanced text input for URLs
const UrlControl = memo(({ property, value, onChange }: PropertyControlProps) => (
  <div className="space-y-2">
    <Label htmlFor={property.key}>{property.label}</Label>
    <Input
      id={property.key}
      type="url"
      value={value || property.defaultValue || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={property.placeholder || 'https://example.com'}
      className="w-full"
    />
    {property.tooltip && (
      <p className="text-xs text-gray-500">{property.tooltip}</p>
    )}
  </div>
));

// Main property control component - auto-generates correct control type
export const PropertyControl = memo(({ property, value, onChange }: PropertyControlProps) => {
  switch (property.type) {
    case 'color':
      return <ColorControl property={property} value={value} onChange={onChange} />;
    case 'number':
      return <NumberControl property={property} value={value} onChange={onChange} />;
    case 'slider':
      return <SliderControl property={property} value={value} onChange={onChange} />;
    case 'select':
      return <SelectControl property={property} value={value} onChange={onChange} />;
    case 'boxModel':
      return <BoxModelControl property={property} value={value} onChange={onChange} />;
    case 'toggle':
      return <ToggleControl property={property} value={value} onChange={onChange} />;
    case 'textarea':
      return <TextareaControl property={property} value={value} onChange={onChange} />;
    case 'url':
      return <UrlControl property={property} value={value} onChange={onChange} />;
    case 'text':
    default:
      return <TextControl property={property} value={value} onChange={onChange} />;
  }
});

PropertyControl.displayName = 'PropertyControl';

// Component names for display names
ColorControl.displayName = 'ColorControl';
NumberControl.displayName = 'NumberControl';
SliderControl.displayName = 'SliderControl';
SelectControl.displayName = 'SelectControl';
BoxModelControl.displayName = 'BoxModelControl';
ToggleControl.displayName = 'ToggleControl';
TextControl.displayName = 'TextControl';
TextareaControl.displayName = 'TextareaControl';
UrlControl.displayName = 'UrlControl';