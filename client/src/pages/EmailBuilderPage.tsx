import { useState, useCallback } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Type, Image, MousePointer, Minus, GripVertical, Save, Trash2, Mail } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface EmailComponent {
  id: string;
  type: 'text' | 'image' | 'button' | 'spacer';
  content: any;
  styles: Record<string, any>;
}

export default function EmailBuilderPage() {
  const [emailComponents, setEmailComponents] = useState<EmailComponent[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<EmailComponent | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Helper function to strip 'px' from values
  const stripPx = (value: string) => value.replace('px', '');

  // Add component function
  const addComponent = (type: 'text' | 'image' | 'button' | 'spacer') => {
    const newComponent: EmailComponent = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      content: getDefaultContent(type),
      styles: getDefaultStyles(type),
    };
    setEmailComponents(prev => [...prev, newComponent]);
    setSelectedComponent(newComponent);
  };

  const getDefaultContent = (type: string) => {
    switch (type) {
      case 'text':
        return { text: 'Edit this text' };
      case 'image':
        return { src: '', alt: 'Image description', width: '300', height: '200' };
      case 'button':
        return { text: 'Click Here', href: '#' };
      case 'spacer':
        return {};
      default:
        return {};
    }
  };

  const getDefaultStyles = (type: string) => {
    switch (type) {
      case 'text':
        return {
          fontSize: '16px',
          fontWeight: 'normal',
          color: '#000000',
          textAlign: 'left',
          paddingTop: '10px',
          paddingRight: '20px',
          paddingBottom: '10px',
          paddingLeft: '20px',
          marginTop: '0px',
          marginRight: '0px',
          marginBottom: '15px',
          marginLeft: '0px',
        };
      case 'image':
        return {
          width: '300px',
          height: '200px',
          paddingTop: '10px',
          paddingRight: '20px',
          paddingBottom: '10px',
          paddingLeft: '20px',
          marginTop: '0px',
          marginRight: '0px',
          marginBottom: '15px',
          marginLeft: '0px',
        };
      case 'button':
        return {
          backgroundColor: '#1553ec',
          color: '#ffffff',
          fontSize: '16px',
          fontWeight: 'bold',
          textAlign: 'center',
          borderRadius: '6px',
          paddingTop: '12px',
          paddingRight: '24px',
          paddingBottom: '12px',
          paddingLeft: '24px',
          marginTop: '0px',
          marginRight: '0px',
          marginBottom: '15px',
          marginLeft: '0px',
        };
      case 'spacer':
        return {
          height: '20px',
          marginTop: '0px',
          marginRight: '0px',
          marginBottom: '0px',
          marginLeft: '0px',
        };
      default:
        return {};
    }
  };

  const updateComponent = useCallback((id: string, updates: Partial<EmailComponent>) => {
    setEmailComponents(prev =>
      prev.map(comp => comp.id === id ? { ...comp, ...updates } : comp)
    );
    if (selectedComponent?.id === id) {
      setSelectedComponent(prev => prev ? { ...prev, ...updates } : null);
    }
  }, [selectedComponent]);

  const updateComponentContent = useCallback((id: string, content: any) => {
    updateComponent(id, { content });
  }, [updateComponent]);

  const updateComponentStyles = useCallback((id: string, styles: Record<string, any>) => {
    updateComponent(id, { styles: { ...selectedComponent?.styles, ...styles } });
  }, [updateComponent, selectedComponent]);

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setEmailComponents((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Sortable component wrapper
  const SortableEmailComponent = ({ component }: { component: EmailComponent }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: component.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`relative border-2 rounded-lg p-3 cursor-pointer transition-colors ${
          selectedComponent?.id === component.id 
            ? 'border-[#1553ec] bg-blue-50' 
            : 'border-gray-200 hover:border-gray-300'
        }`}
        onClick={() => setSelectedComponent(component)}
      >
        <div className="flex items-center gap-2 mb-2">
          <div
            {...attributes}
            {...listeners}
            className="flex items-center justify-center w-6 h-6 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium text-gray-600 capitalize">{component.type}</span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-6 w-6 p-0 text-gray-400 hover:text-red-500"
            onClick={(e) => {
              e.stopPropagation();
              setEmailComponents(prev => prev.filter(c => c.id !== component.id));
              if (selectedComponent?.id === component.id) {
                setSelectedComponent(null);
              }
            }}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
        <div className="pointer-events-none">
          {renderEmailComponent(component)}
        </div>
      </div>
    );
  };

  // Component rendering function
  const renderEmailComponent = (component: EmailComponent) => {
    const componentStyles = {
      ...component.styles,
      padding: `${component.styles.paddingTop || '0px'} ${component.styles.paddingRight || '0px'} ${component.styles.paddingBottom || '0px'} ${component.styles.paddingLeft || '0px'}`,
      margin: `${component.styles.marginTop || '0px'} ${component.styles.marginRight || '0px'} ${component.styles.marginBottom || '0px'} ${component.styles.marginLeft || '0px'}`,
    };

    switch (component.type) {
      case 'text':
        return (
          <div style={componentStyles} dangerouslySetInnerHTML={{ __html: component.content.text || '' }} />
        );
      case 'image':
        return (
          <img 
            src={component.content.src || ''} 
            alt={component.content.alt || ''} 
            style={componentStyles}
          />
        );
      case 'button':
        return (
          <div style={{ textAlign: component.styles.textAlign || 'center' }}>
            <a 
              href={component.content.href || '#'} 
              style={{
                ...componentStyles,
                display: component.styles.display || 'inline-block',
                textDecoration: 'none',
              }}
            >
              {component.content.text || 'Button'}
            </a>
          </div>
        );
      case 'spacer':
        return <div style={{ height: component.styles.height || '20px', ...componentStyles }} />;
      default:
        return null;
    }
  };

  // Properties panel rendering
  const renderComponentProperties = (component: EmailComponent | null) => {
    if (!component) {
      return (
        <div className="h-full flex items-center justify-center text-gray-500">
          <p>Select a component to edit its properties</p>
        </div>
      );
    }

    const updateContent = (updates: any) => updateComponentContent(component.id, { ...component.content, ...updates });
    const updateStyles = (updates: any) => updateComponentStyles(component.id, updates);

    switch (component.type) {
      case 'text':
        return (
          <div className="p-4 space-y-6">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Content</Label>
              <Textarea
                value={component.content.text || ''}
                onChange={(e) => updateContent({ text: e.target.value })}
                placeholder="Enter text content..."
                className="min-h-24"
              />
            </div>

            <Separator />

            {/* Typography Controls */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Typography</Label>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600">Font Size</Label>
                  <div className="flex items-center space-x-2">
                    <Slider
                      value={[parseInt(stripPx(component.styles.fontSize || '16px'))]}
                      onValueChange={(value) => updateStyles({ fontSize: `${value[0]}px` })}
                      max={48}
                      min={8}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-xs text-gray-500 w-8">
                      {stripPx(component.styles.fontSize || '16px')}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-gray-600">Font Weight</Label>
                  <Select value={component.styles.fontWeight || 'normal'} onValueChange={(value) => updateStyles({ fontWeight: value })}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="bold">Bold</SelectItem>
                      <SelectItem value="lighter">Light</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600">Text Color</Label>
                  <Input
                    type="color"
                    value={component.styles.color || '#000000'}
                    onChange={(e) => updateStyles({ color: e.target.value })}
                    className="h-8"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-gray-600">Text Align</Label>
                  <Select value={component.styles.textAlign || 'left'} onValueChange={(value) => updateStyles({ textAlign: value })}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Spacing Controls */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Spacing</Label>
              
              {/* Padding */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Padding</Label>
                <div className="grid grid-cols-4 gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-9 text-xs">
                        T: {stripPx(component.styles.paddingTop || '10px')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56">
                      <div className="space-y-2">
                        <Label className="text-sm">Padding Top</Label>
                        <Slider
                          value={[parseInt(stripPx(component.styles.paddingTop || '10px'))]}
                          onValueChange={(value) => updateStyles({ paddingTop: `${value[0]}px` })}
                          max={100}
                          min={0}
                          step={1}
                        />
                        <div className="text-center text-xs text-gray-500">
                          {stripPx(component.styles.paddingTop || '10px')}px
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-9 text-xs">
                        R: {stripPx(component.styles.paddingRight || '20px')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56">
                      <div className="space-y-2">
                        <Label className="text-sm">Padding Right</Label>
                        <Slider
                          value={[parseInt(stripPx(component.styles.paddingRight || '20px'))]}
                          onValueChange={(value) => updateStyles({ paddingRight: `${value[0]}px` })}
                          max={100}
                          min={0}
                          step={1}
                        />
                        <div className="text-center text-xs text-gray-500">
                          {stripPx(component.styles.paddingRight || '20px')}px
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-9 text-xs">
                        B: {stripPx(component.styles.paddingBottom || '10px')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56">
                      <div className="space-y-2">
                        <Label className="text-sm">Padding Bottom</Label>
                        <Slider
                          value={[parseInt(stripPx(component.styles.paddingBottom || '10px'))]}
                          onValueChange={(value) => updateStyles({ paddingBottom: `${value[0]}px` })}
                          max={100}
                          min={0}
                          step={1}
                        />
                        <div className="text-center text-xs text-gray-500">
                          {stripPx(component.styles.paddingBottom || '10px')}px
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-9 text-xs">
                        L: {stripPx(component.styles.paddingLeft || '20px')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56">
                      <div className="space-y-2">
                        <Label className="text-sm">Padding Left</Label>
                        <Slider
                          value={[parseInt(stripPx(component.styles.paddingLeft || '20px'))]}
                          onValueChange={(value) => updateStyles({ paddingLeft: `${value[0]}px` })}
                          max={100}
                          min={0}
                          step={1}
                        />
                        <div className="text-center text-xs text-gray-500">
                          {stripPx(component.styles.paddingLeft || '20px')}px
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Margin */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Margin</Label>
                <div className="grid grid-cols-4 gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-9 text-xs">
                        T: {stripPx(component.styles.marginTop || '0px')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56">
                      <div className="space-y-2">
                        <Label className="text-sm">Margin Top</Label>
                        <Slider
                          value={[parseInt(stripPx(component.styles.marginTop || '0px'))]}
                          onValueChange={(value) => updateStyles({ marginTop: `${value[0]}px` })}
                          max={100}
                          min={0}
                          step={1}
                        />
                        <div className="text-center text-xs text-gray-500">
                          {stripPx(component.styles.marginTop || '0px')}px
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-9 text-xs">
                        R: {stripPx(component.styles.marginRight || '0px')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56">
                      <div className="space-y-2">
                        <Label className="text-sm">Margin Right</Label>
                        <Slider
                          value={[parseInt(stripPx(component.styles.marginRight || '0px'))]}
                          onValueChange={(value) => updateStyles({ marginRight: `${value[0]}px` })}
                          max={100}
                          min={0}
                          step={1}
                        />
                        <div className="text-center text-xs text-gray-500">
                          {stripPx(component.styles.marginRight || '0px')}px
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-9 text-xs">
                        B: {stripPx(component.styles.marginBottom || '15px')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56">
                      <div className="space-y-2">
                        <Label className="text-sm">Margin Bottom</Label>
                        <Slider
                          value={[parseInt(stripPx(component.styles.marginBottom || '15px'))]}
                          onValueChange={(value) => updateStyles({ marginBottom: `${value[0]}px` })}
                          max={100}
                          min={0}
                          step={1}
                        />
                        <div className="text-center text-xs text-gray-500">
                          {stripPx(component.styles.marginBottom || '15px')}px
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-9 text-xs">
                        L: {stripPx(component.styles.marginLeft || '0px')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56">
                      <div className="space-y-2">
                        <Label className="text-sm">Margin Left</Label>
                        <Slider
                          value={[parseInt(stripPx(component.styles.marginLeft || '0px'))]}
                          onValueChange={(value) => updateStyles({ marginLeft: `${value[0]}px` })}
                          max={100}
                          min={0}
                          step={1}
                        />
                        <div className="text-center text-xs text-gray-500">
                          {stripPx(component.styles.marginLeft || '0px')}px
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          </div>
        );

      case 'image':
        return (
          <div className="p-4 space-y-6">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Image Settings</Label>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-gray-600">Image URL</Label>
                  <Input
                    value={component.content.src || ''}
                    onChange={(e) => updateContent({ src: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Alt Text</Label>
                  <Input
                    value={component.content.alt || ''}
                    onChange={(e) => updateContent({ alt: e.target.value })}
                    placeholder="Image description"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Dimensions */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Dimensions</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600">Width</Label>
                  <Input
                    value={stripPx(component.styles.width || '300px')}
                    onChange={(e) => updateStyles({ width: `${e.target.value}px` })}
                    placeholder="300"
                    className="h-8"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600">Height</Label>
                  <Input
                    value={stripPx(component.styles.height || '200px')}
                    onChange={(e) => updateStyles({ height: `${e.target.value}px` })}
                    placeholder="200"
                    className="h-8"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Spacing for Image - Same as Text */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Spacing</Label>
              
              {/* Padding */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Padding</Label>
                <div className="grid grid-cols-4 gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-9 text-xs">
                        T: {stripPx(component.styles.paddingTop || '10px')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56">
                      <div className="space-y-2">
                        <Label className="text-sm">Padding Top</Label>
                        <Slider
                          value={[parseInt(stripPx(component.styles.paddingTop || '10px'))]}
                          onValueChange={(value) => updateStyles({ paddingTop: `${value[0]}px` })}
                          max={100}
                          min={0}
                          step={1}
                        />
                        <div className="text-center text-xs text-gray-500">
                          {stripPx(component.styles.paddingTop || '10px')}px
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-9 text-xs">
                        R: {stripPx(component.styles.paddingRight || '20px')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56">
                      <div className="space-y-2">
                        <Label className="text-sm">Padding Right</Label>
                        <Slider
                          value={[parseInt(stripPx(component.styles.paddingRight || '20px'))]}
                          onValueChange={(value) => updateStyles({ paddingRight: `${value[0]}px` })}
                          max={100}
                          min={0}
                          step={1}
                        />
                        <div className="text-center text-xs text-gray-500">
                          {stripPx(component.styles.paddingRight || '20px')}px
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-9 text-xs">
                        B: {stripPx(component.styles.paddingBottom || '10px')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56">
                      <div className="space-y-2">
                        <Label className="text-sm">Padding Bottom</Label>
                        <Slider
                          value={[parseInt(stripPx(component.styles.paddingBottom || '10px'))]}
                          onValueChange={(value) => updateStyles({ paddingBottom: `${value[0]}px` })}
                          max={100}
                          min={0}
                          step={1}
                        />
                        <div className="text-center text-xs text-gray-500">
                          {stripPx(component.styles.paddingBottom || '10px')}px
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-9 text-xs">
                        L: {stripPx(component.styles.paddingLeft || '20px')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56">
                      <div className="space-y-2">
                        <Label className="text-sm">Padding Left</Label>
                        <Slider
                          value={[parseInt(stripPx(component.styles.paddingLeft || '20px'))]}
                          onValueChange={(value) => updateStyles({ paddingLeft: `${value[0]}px` })}
                          max={100}
                          min={0}
                          step={1}
                        />
                        <div className="text-center text-xs text-gray-500">
                          {stripPx(component.styles.paddingLeft || '20px')}px
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Margin */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Margin</Label>
                <div className="grid grid-cols-4 gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-9 text-xs">
                        T: {stripPx(component.styles.marginTop || '0px')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56">
                      <div className="space-y-2">
                        <Label className="text-sm">Margin Top</Label>
                        <Slider
                          value={[parseInt(stripPx(component.styles.marginTop || '0px'))]}
                          onValueChange={(value) => updateStyles({ marginTop: `${value[0]}px` })}
                          max={100}
                          min={0}
                          step={1}
                        />
                        <div className="text-center text-xs text-gray-500">
                          {stripPx(component.styles.marginTop || '0px')}px
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-9 text-xs">
                        R: {stripPx(component.styles.marginRight || '0px')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56">
                      <div className="space-y-2">
                        <Label className="text-sm">Margin Right</Label>
                        <Slider
                          value={[parseInt(stripPx(component.styles.marginRight || '0px'))]}
                          onValueChange={(value) => updateStyles({ marginRight: `${value[0]}px` })}
                          max={100}
                          min={0}
                          step={1}
                        />
                        <div className="text-center text-xs text-gray-500">
                          {stripPx(component.styles.marginRight || '0px')}px
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-9 text-xs">
                        B: {stripPx(component.styles.marginBottom || '15px')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56">
                      <div className="space-y-2">
                        <Label className="text-sm">Margin Bottom</Label>
                        <Slider
                          value={[parseInt(stripPx(component.styles.marginBottom || '15px'))]}
                          onValueChange={(value) => updateStyles({ marginBottom: `${value[0]}px` })}
                          max={100}
                          min={0}
                          step={1}
                        />
                        <div className="text-center text-xs text-gray-500">
                          {stripPx(component.styles.marginBottom || '15px')}px
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-9 text-xs">
                        L: {stripPx(component.styles.marginLeft || '0px')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56">
                      <div className="space-y-2">
                        <Label className="text-sm">Margin Left</Label>
                        <Slider
                          value={[parseInt(stripPx(component.styles.marginLeft || '0px'))]}
                          onValueChange={(value) => updateStyles({ marginLeft: `${value[0]}px` })}
                          max={100}
                          min={0}
                          step={1}
                        />
                        <div className="text-center text-xs text-gray-500">
                          {stripPx(component.styles.marginLeft || '0px')}px
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          </div>
        );

      case 'button':
        return (
          <div className="p-4 space-y-6">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Button Settings</Label>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-gray-600">Button Text</Label>
                  <Input
                    value={component.content.text || ''}
                    onChange={(e) => updateContent({ text: e.target.value })}
                    placeholder="Click Here"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Link URL</Label>
                  <Input
                    value={component.content.href || ''}
                    onChange={(e) => updateContent({ href: e.target.value })}
                    placeholder="https://example.com"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Button Style */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Styling</Label>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600">Background Color</Label>
                  <Input
                    type="color"
                    value={component.styles.backgroundColor || '#1553ec'}
                    onChange={(e) => updateStyles({ backgroundColor: e.target.value })}
                    className="h-8"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-gray-600">Text Color</Label>
                  <Input
                    type="color"
                    value={component.styles.color || '#ffffff'}
                    onChange={(e) => updateStyles({ color: e.target.value })}
                    className="h-8"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600">Font Size</Label>
                  <div className="flex items-center space-x-2">
                    <Slider
                      value={[parseInt(stripPx(component.styles.fontSize || '16px'))]}
                      onValueChange={(value) => updateStyles({ fontSize: `${value[0]}px` })}
                      max={32}
                      min={8}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-xs text-gray-500 w-8">
                      {stripPx(component.styles.fontSize || '16px')}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-gray-600">Font Weight</Label>
                  <Select value={component.styles.fontWeight || 'bold'} onValueChange={(value) => updateStyles({ fontWeight: value })}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="bold">Bold</SelectItem>
                      <SelectItem value="lighter">Light</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Border Radius</Label>
                <div className="flex items-center space-x-2">
                  <Slider
                    value={[parseInt(stripPx(component.styles.borderRadius || '6px'))]}
                    onValueChange={(value) => updateStyles({ borderRadius: `${value[0]}px` })}
                    max={50}
                    min={0}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-xs text-gray-500 w-8">
                    {stripPx(component.styles.borderRadius || '6px')}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Spacing for Button - Same structure */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Spacing</Label>
              
              {/* Padding */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Padding</Label>
                <div className="grid grid-cols-4 gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-9 text-xs">
                        T: {stripPx(component.styles.paddingTop || '12px')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56">
                      <div className="space-y-2">
                        <Label className="text-sm">Padding Top</Label>
                        <Slider
                          value={[parseInt(stripPx(component.styles.paddingTop || '12px'))]}
                          onValueChange={(value) => updateStyles({ paddingTop: `${value[0]}px` })}
                          max={50}
                          min={0}
                          step={1}
                        />
                        <div className="text-center text-xs text-gray-500">
                          {stripPx(component.styles.paddingTop || '12px')}px
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-9 text-xs">
                        R: {stripPx(component.styles.paddingRight || '24px')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56">
                      <div className="space-y-2">
                        <Label className="text-sm">Padding Right</Label>
                        <Slider
                          value={[parseInt(stripPx(component.styles.paddingRight || '24px'))]}
                          onValueChange={(value) => updateStyles({ paddingRight: `${value[0]}px` })}
                          max={50}
                          min={0}
                          step={1}
                        />
                        <div className="text-center text-xs text-gray-500">
                          {stripPx(component.styles.paddingRight || '24px')}px
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-9 text-xs">
                        B: {stripPx(component.styles.paddingBottom || '12px')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56">
                      <div className="space-y-2">
                        <Label className="text-sm">Padding Bottom</Label>
                        <Slider
                          value={[parseInt(stripPx(component.styles.paddingBottom || '12px'))]}
                          onValueChange={(value) => updateStyles({ paddingBottom: `${value[0]}px` })}
                          max={50}
                          min={0}
                          step={1}
                        />
                        <div className="text-center text-xs text-gray-500">
                          {stripPx(component.styles.paddingBottom || '12px')}px
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-9 text-xs">
                        L: {stripPx(component.styles.paddingLeft || '24px')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56">
                      <div className="space-y-2">
                        <Label className="text-sm">Padding Left</Label>
                        <Slider
                          value={[parseInt(stripPx(component.styles.paddingLeft || '24px'))]}
                          onValueChange={(value) => updateStyles({ paddingLeft: `${value[0]}px` })}
                          max={50}
                          min={0}
                          step={1}
                        />
                        <div className="text-center text-xs text-gray-500">
                          {stripPx(component.styles.paddingLeft || '24px')}px
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Margin */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Margin</Label>
                <div className="grid grid-cols-4 gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-9 text-xs">
                        T: {stripPx(component.styles.marginTop || '0px')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56">
                      <div className="space-y-2">
                        <Label className="text-sm">Margin Top</Label>
                        <Slider
                          value={[parseInt(stripPx(component.styles.marginTop || '0px'))]}
                          onValueChange={(value) => updateStyles({ marginTop: `${value[0]}px` })}
                          max={100}
                          min={0}
                          step={1}
                        />
                        <div className="text-center text-xs text-gray-500">
                          {stripPx(component.styles.marginTop || '0px')}px
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-9 text-xs">
                        R: {stripPx(component.styles.marginRight || '0px')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56">
                      <div className="space-y-2">
                        <Label className="text-sm">Margin Right</Label>
                        <Slider
                          value={[parseInt(stripPx(component.styles.marginRight || '0px'))]}
                          onValueChange={(value) => updateStyles({ marginRight: `${value[0]}px` })}
                          max={100}
                          min={0}
                          step={1}
                        />
                        <div className="text-center text-xs text-gray-500">
                          {stripPx(component.styles.marginRight || '0px')}px
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-9 text-xs">
                        B: {stripPx(component.styles.marginBottom || '15px')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56">
                      <div className="space-y-2">
                        <Label className="text-sm">Margin Bottom</Label>
                        <Slider
                          value={[parseInt(stripPx(component.styles.marginBottom || '15px'))]}
                          onValueChange={(value) => updateStyles({ marginBottom: `${value[0]}px` })}
                          max={100}
                          min={0}
                          step={1}
                        />
                        <div className="text-center text-xs text-gray-500">
                          {stripPx(component.styles.marginBottom || '15px')}px
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-9 text-xs">
                        L: {stripPx(component.styles.marginLeft || '0px')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56">
                      <div className="space-y-2">
                        <Label className="text-sm">Margin Left</Label>
                        <Slider
                          value={[parseInt(stripPx(component.styles.marginLeft || '0px'))]}
                          onValueChange={(value) => updateStyles({ marginLeft: `${value[0]}px` })}
                          max={100}
                          min={0}
                          step={1}
                        />
                        <div className="text-center text-xs text-gray-500">
                          {stripPx(component.styles.marginLeft || '0px')}px
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          </div>
        );

      case 'spacer':
        return (
          <div className="p-4 space-y-6">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Spacer Settings</Label>
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Height</Label>
                <div className="flex items-center space-x-2">
                  <Slider
                    value={[parseInt(stripPx(component.styles.height || '20px'))]}
                    onValueChange={(value) => updateStyles({ height: `${value[0]}px` })}
                    max={200}
                    min={5}
                    step={5}
                    className="flex-1"
                  />
                  <span className="text-xs text-gray-500 w-12">
                    {stripPx(component.styles.height || '20px')}px
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Margin only for spacer */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Margin</Label>
              <div className="grid grid-cols-4 gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-9 text-xs">
                      T: {stripPx(component.styles.marginTop || '0px')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56">
                    <div className="space-y-2">
                      <Label className="text-sm">Margin Top</Label>
                      <Slider
                        value={[parseInt(stripPx(component.styles.marginTop || '0px'))]}
                        onValueChange={(value) => updateStyles({ marginTop: `${value[0]}px` })}
                        max={100}
                        min={0}
                        step={1}
                      />
                      <div className="text-center text-xs text-gray-500">
                        {stripPx(component.styles.marginTop || '0px')}px
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-9 text-xs">
                      R: {stripPx(component.styles.marginRight || '0px')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56">
                    <div className="space-y-2">
                      <Label className="text-sm">Margin Right</Label>
                      <Slider
                        value={[parseInt(stripPx(component.styles.marginRight || '0px'))]}
                        onValueChange={(value) => updateStyles({ marginRight: `${value[0]}px` })}
                        max={100}
                        min={0}
                        step={1}
                      />
                      <div className="text-center text-xs text-gray-500">
                        {stripPx(component.styles.marginRight || '0px')}px
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-9 text-xs">
                      B: {stripPx(component.styles.marginBottom || '0px')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56">
                    <div className="space-y-2">
                      <Label className="text-sm">Margin Bottom</Label>
                      <Slider
                        value={[parseInt(stripPx(component.styles.marginBottom || '0px'))]}
                        onValueChange={(value) => updateStyles({ marginBottom: `${value[0]}px` })}
                        max={100}
                        min={0}
                        step={1}
                      />
                      <div className="text-center text-xs text-gray-500">
                        {stripPx(component.styles.marginBottom || '0px')}px
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-9 text-xs">
                      L: {stripPx(component.styles.marginLeft || '0px')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56">
                    <div className="space-y-2">
                      <Label className="text-sm">Margin Left</Label>
                      <Slider
                        value={[parseInt(stripPx(component.styles.marginLeft || '0px'))]}
                        onValueChange={(value) => updateStyles({ marginLeft: `${value[0]}px` })}
                        max={100}
                        min={0}
                        step={1}
                      />
                      <div className="text-center text-xs text-gray-500">
                        {stripPx(component.styles.marginLeft || '0px')}px
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="h-full flex items-center justify-center text-gray-500">
            <p>Select a component to edit its properties</p>
          </div>
        );
    }
  };

  // API mutation for generating preview
  const generatePreviewMutation = useMutation({
    mutationFn: async () => {
      const emailContent = {
        subject: 'Email Preview',
        components: emailComponents,
        globalStyles: {
          backgroundColor: '#ffffff',
          fontFamily: 'Roboto, Arial, sans-serif',
          primaryColor: '#1553ec',
          secondaryColor: '#001dd1'
        }
      };

      return apiRequest('/api/email/generate', {
        method: 'POST',
        body: JSON.stringify(emailContent),
      });
    },
    onSuccess: (data) => {
      // Open preview in new window
      const previewWindow = window.open('', '_blank');
      if (previewWindow) {
        previewWindow.document.write(data.html);
        previewWindow.document.close();
      }
      toast({
        title: "Preview Generated",
        description: "Email preview opened in new window",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate email preview",
        variant: "destructive",
      });
    }
  });

  const handleGeneratePreview = () => {
    generatePreviewMutation.mutate();
  };

  const handleSaveTemplate = () => {
    toast({
      title: "Template Saved",
      description: "Your email template has been saved successfully",
    });
  };

  // Main component JSX return
  return (
    <div className="h-full flex bg-gray-50">
      {/* Left Sidebar - Component Toolbox */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Components</h2>
        </div>
        
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {/* Text Component */}
            <div
              className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => addComponent('text')}
            >
              <Type className="w-5 h-5 text-[#1553ec]" />
              <span className="text-sm font-medium text-gray-700">Text</span>
            </div>
            
            {/* Image Component */}
            <div
              className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => addComponent('image')}
            >
              <Image className="w-5 h-5 text-[#1553ec]" />
              <span className="text-sm font-medium text-gray-700">Image</span>
            </div>
            
            {/* Button Component */}
            <div
              className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => addComponent('button')}
            >
              <MousePointer className="w-5 h-5 text-[#1553ec]" />
              <span className="text-sm font-medium text-gray-700">Button</span>
            </div>
            
            {/* Spacer Component */}
            <div
              className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => addComponent('spacer')}
            >
              <Minus className="w-5 h-5 text-[#1553ec]" />
              <span className="text-sm font-medium text-gray-700">Spacer</span>
            </div>
          </div>
        </ScrollArea>
        
        <div className="p-4 border-t border-gray-200">
          <Button 
            onClick={handleGeneratePreview}
            className="w-full bg-[#1553ec] hover:bg-[#001dd1] text-white"
            disabled={emailComponents.length === 0 || generatePreviewMutation.isPending}
          >
            {generatePreviewMutation.isPending ? 'Generating...' : 'Generate Preview'}
          </Button>
        </div>
      </div>

      {/* Center - Email Builder Canvas */}
      <div className="flex-1 flex flex-col">
        <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <h1 className="text-xl font-semibold text-gray-900">Email Builder</h1>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveTemplate}
              disabled={emailComponents.length === 0}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Template
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEmailComponents([])}
              disabled={emailComponents.length === 0}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          </div>
        </div>
        
        <ScrollArea className="flex-1 p-6">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white border border-gray-200 rounded-lg min-h-96 p-6">
              {emailComponents.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500 py-20">
                  <div className="text-center">
                    <Mail className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-lg font-medium">Start building your email</p>
                    <p className="text-sm text-gray-400">Add components from the sidebar to get started</p>
                  </div>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                  modifiers={[restrictToVerticalAxis]}
                >
                  <SortableContext items={emailComponents.map(c => c.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-4">
                      {emailComponents.map((component) => (
                        <SortableEmailComponent key={component.id} component={component} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Right Sidebar - Properties Panel */}
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Properties</h2>
        </div>
        
        <ScrollArea className="flex-1">
          {renderComponentProperties(selectedComponent)}
        </ScrollArea>
      </div>
    </div>
  );
}