import { useState, useEffect, useRef, createContext, useCallback, memo } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { 
  Type, 
  Image, 
  MousePointer, 
  Space, 
  Trash2, 
  GripVertical, 
  Eye, 
  Download, 
  Settings,
  Mail,
  ChevronDown
} from 'lucide-react';

// Property group component - defined outside main component to prevent re-creation
const PropertyGroup = memo(({ title, children, defaultOpen = false }: { 
  title: string; 
  children: React.ReactNode; 
  defaultOpen?: boolean 
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="font-medium text-sm">{title}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="p-3 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
});

PropertyGroup.displayName = 'PropertyGroup';

// Types for MJML Editor
interface EmailComponent {
  id: string;
  type: 'text' | 'image' | 'button' | 'spacer';
  content: any;
  styles: Record<string, any>;
}

interface EmailContent {
  subject: string;
  components: EmailComponent[];
}

const EditingContext = createContext(false);

export default function EmailBuilderPage() {
  const { toast } = useToast();
  
  // Pure MJML Editor State
  const [emailContent, setEmailContent] = useState<EmailContent>({
    subject: '',
    components: []
  });
  const [emailComponents, setEmailComponents] = useState<EmailComponent[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [mjmlPreviewHtml, setMjmlPreviewHtml] = useState<string>('');

  // Refs
  const builderRef = useRef<HTMLDivElement>(null);

  // Drag and Drop Sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Debounced MJML Compilation Effect
  useEffect(() => {
    const compileToMjml = async () => {
      try {
        console.log('Compiling MJML to HTML');
        
        const response = await fetch('/api/email/compile-mjml', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subject: emailContent.subject,
            components: emailComponents
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        console.log('Generated MJML:', data.mjml);
        
        if (data.success && data.html) {
          setMjmlPreviewHtml(data.html);
        } else {
          console.error('MJML compilation failed:', data.errors);
        }
      } catch (error) {
        console.error('Failed to compile MJML:', error);
      }
    };

    // Debounce MJML compilation to avoid running on every keystroke
    const timeoutId = setTimeout(compileToMjml, 300);
    
    return () => clearTimeout(timeoutId);
  }, [emailContent, emailComponents]);

  // Component Management
  const addComponent = (type: string) => {
    const newComponent: EmailComponent = {
      id: `${type}-${Date.now()}`,
      type: type as any,
      content: getDefaultContent(type),
      styles: getDefaultStyles(type)
    };
    
    setEmailComponents(prev => [...prev, newComponent]);
  };

  const getDefaultContent = (type: string) => {
    switch (type) {
      case 'text':
        return { text: 'Add your text here' };
      case 'image':
        return { src: '', alt: 'Image description', title: '', href: '', rel: '' };
      case 'button':
        return { text: 'Click here', href: '#', title: '', rel: '', target: '_self' };
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
          // Typography
          fontFamily: 'Arial, sans-serif',
          fontSize: '16px',
          fontWeight: 'normal',
          fontStyle: 'normal',
          lineHeight: '1.6',
          letterSpacing: 'normal',
          textTransform: 'none',
          textDecoration: 'none',
          // Colors & Background
          color: '#000000',
          backgroundColor: 'transparent',
          // Alignment
          textAlign: 'left',
          verticalAlign: 'top',
          // Spacing & Padding
          padding: '10px 25px'
        };
      case 'image':
        return {
          // Sizing
          width: '600px',
          height: 'auto',
          fluidOnMobile: 'false',
          // Borders
          border: '',
          borderRadius: '',
          // Colors & Background
          containerBackgroundColor: 'transparent',
          // Alignment
          align: 'center',
          // Spacing & Padding
          padding: '10px 25px'
        };
      case 'button':
        return {
          // Typography
          fontFamily: 'Arial, sans-serif',
          fontSize: '16px',
          fontWeight: 'normal',
          fontStyle: 'normal',
          lineHeight: '1.6',
          letterSpacing: 'normal',
          textTransform: 'none',
          textDecoration: 'none',
          // Colors & Background
          backgroundColor: '#1553ec',
          color: '#ffffff',
          containerBackgroundColor: 'transparent',
          // Borders
          border: '',
          borderTop: '',
          borderBottom: '',
          borderLeft: '',
          borderRight: '',
          borderRadius: '6px',
          // Sizing
          width: '',
          height: '',
          // Alignment
          align: 'center',
          textAlign: 'center',
          verticalAlign: 'middle',
          // Spacing & Padding
          padding: '10px 25px'
        };
      case 'spacer':
        return {
          // Sizing
          height: '20px',
          // Colors & Background
          containerBackgroundColor: 'transparent',
          // Spacing & Padding
          padding: ''
        };
      default:
        return {};
    }
  };

  const removeComponent = useCallback((id: string) => {
    setEmailComponents(prev => prev.filter(c => c.id !== id));
    if (selectedComponent === id) {
      setSelectedComponent(null);
    }
  }, [selectedComponent]);

  const updateComponent = useCallback((id: string, field: string, value: any) => {
    setEmailComponents(prev => prev.map(comp => 
      comp.id === id 
        ? {
            ...comp,
            [field]: field === 'content' 
              ? { ...comp.content, ...value }
              : field === 'styles'
              ? { ...comp.styles, ...value }
              : value
          }
        : comp
    ));
  }, []);

  // Drag and Drop Handler
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setEmailComponents((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Sortable Component Wrapper
  const SortableEmailComponent = ({ component }: { component: EmailComponent }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
    } = useSortable({ id: component.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`group relative ${selectedComponent === component.id ? 'ring-2 ring-blue-500' : ''}`}
        onClick={() => setSelectedComponent(component.id)}
      >
        <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex gap-1">
            <button
              {...attributes}
              {...listeners}
              className="p-1 bg-gray-800 text-white rounded text-xs hover:bg-gray-700"
            >
              <GripVertical className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeComponent(component.id);
              }}
              className="p-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
        {renderEmailComponent(component)}
      </div>
    );
  };

  // Pure MJML Component Renderer - matches MJML output exactly
  const renderEmailComponent = (component: EmailComponent) => {
    // Helper to build padding styles from individual properties
    const buildPaddingStyle = (styles: any) => {
      if (styles?.padding) return styles.padding;
      
      const paddingParts = [];
      const top = styles?.paddingTop || '0';
      const right = styles?.paddingRight || '0';
      const bottom = styles?.paddingBottom || '0';
      const left = styles?.paddingLeft || '0';
      
      if (top === right && right === bottom && bottom === left && top !== '0') {
        return top;
      }
      if (top === bottom && left === right) {
        return `${top} ${right}`;
      }
      return `${top} ${right} ${bottom} ${left}`;
    };

    switch (component.type) {
      case 'text':
        return (
          <div style={{
            fontFamily: component.styles?.fontFamily || 'Arial, sans-serif',
            fontSize: component.styles?.fontSize || '16px',
            fontWeight: component.styles?.fontWeight || 'normal',
            fontStyle: component.styles?.fontStyle || 'normal',
            lineHeight: component.styles?.lineHeight || '1.6',
            letterSpacing: component.styles?.letterSpacing || 'normal',
            textAlign: component.styles?.textAlign || 'left',
            textTransform: component.styles?.textTransform || 'none',
            textDecoration: component.styles?.textDecoration || 'none',
            color: component.styles?.color || '#000000',
            backgroundColor: component.styles?.backgroundColor || 'transparent',
            padding: buildPaddingStyle(component.styles) || '10px 25px',
            verticalAlign: component.styles?.verticalAlign || 'top'
          }}>
            {component.content?.text || ''}
          </div>
        );
        
      case 'image':
        const containerAlign = component.styles?.align || 'center';
        const imagePadding = buildPaddingStyle(component.styles) || '10px 25px';
        
        return (
          <div style={{ 
            fontSize: '0px',
            padding: imagePadding,
            textAlign: containerAlign,
            backgroundColor: component.styles?.containerBackgroundColor || 'transparent'
          }}>
            {component.content?.src ? (
              component.content?.href ? (
                <a href={component.content.href} target="_blank" rel={component.content?.rel || 'noopener'}>
                  <img 
                    src={component.content.src} 
                    alt={component.content?.alt || ''}
                    title={component.content?.title || ''}
                    style={{ 
                      border: component.styles?.border || '0',
                      borderRadius: component.styles?.borderRadius || '0',
                      height: component.styles?.height || 'auto',
                      lineHeight: '100%',
                      outline: 'none',
                      textDecoration: 'none',
                      width: component.styles?.width || '600px',
                      maxWidth: '100%'
                    }}
                  />
                </a>
              ) : (
                <img 
                  src={component.content.src} 
                  alt={component.content?.alt || ''}
                  title={component.content?.title || ''}
                  style={{ 
                    border: component.styles?.border || '0',
                    borderRadius: component.styles?.borderRadius || '0',
                    height: component.styles?.height || 'auto',
                    lineHeight: '100%',
                    outline: 'none',
                    textDecoration: 'none',
                    width: component.styles?.width || '600px',
                    maxWidth: '100%'
                  }}
                />
              )
            ) : (
              <div style={{
                padding: '20px',
                textAlign: 'center',
                color: '#9ca3af',
                backgroundColor: '#f9fafb',
                border: '1px dashed #d1d5db',
                fontFamily: 'Arial, sans-serif',
                fontSize: '14px'
              }}>
                [Image placeholder - Add image URL in properties]
              </div>
            )}
          </div>
        );
        
      case 'button':
        const buttonPadding = buildPaddingStyle(component.styles) || '10px 25px';
        const buttonAlign = component.styles?.align || 'center';
        const textAlign = component.styles?.textAlign || 'center';
        
        // Build border style from individual border properties
        let borderStyle = component.styles?.border || 'none';
        if (!component.styles?.border && (component.styles?.borderTop || component.styles?.borderRight || component.styles?.borderBottom || component.styles?.borderLeft)) {
          const borderParts = [
            component.styles?.borderTop || 'none',
            component.styles?.borderRight || 'none', 
            component.styles?.borderBottom || 'none',
            component.styles?.borderLeft || 'none'
          ];
          borderStyle = borderParts.join(' ');
        }
        
        return (
          <div style={{ 
            fontSize: '0px',
            padding: buttonPadding,
            wordBreak: 'break-word',
            textAlign: buttonAlign,
            backgroundColor: component.styles?.containerBackgroundColor || 'transparent'
          }}>
            <table
              style={{
                borderCollapse: 'separate',
                lineHeight: '100%',
                width: component.styles?.width || 'auto'
              }}
              align={buttonAlign}
              border={0}
              cellPadding={0}
              cellSpacing={0}
            >
              <tbody>
                <tr>
                  <td
                    style={{
                      border: borderStyle,
                      borderRadius: component.styles?.borderRadius || '6px',
                      cursor: 'auto',
                      background: component.styles?.backgroundColor || '#1553ec',
                      height: component.styles?.height || 'auto'
                    }}
                    align={textAlign}
                    valign={component.styles?.verticalAlign || 'middle'}
                  >
                    <a
                      href={component.content?.href || '#'}
                      style={{
                        display: 'inline-block',
                        background: component.styles?.backgroundColor || '#1553ec',
                        color: component.styles?.color || '#ffffff',
                        fontFamily: component.styles?.fontFamily || 'Arial, sans-serif',
                        fontSize: component.styles?.fontSize || '16px',
                        fontWeight: component.styles?.fontWeight || 'normal',
                        fontStyle: component.styles?.fontStyle || 'normal',
                        lineHeight: component.styles?.lineHeight || '120%',
                        letterSpacing: component.styles?.letterSpacing || 'normal',
                        textTransform: component.styles?.textTransform || 'none',
                        textDecoration: component.styles?.textDecoration || 'none',
                        margin: '0',
                        padding: '10px 25px',
                        borderRadius: component.styles?.borderRadius || '6px',
                        textAlign: textAlign
                      }}
                      target={component.content?.target || '_self'}
                      rel={component.content?.rel || ''}
                      title={component.content?.title || ''}
                    >
                      {component.content?.text || 'Click here'}
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        );
        
      case 'spacer':
        const spacerPadding = buildPaddingStyle(component.styles) || '0';
        
        return (
          <div style={{ 
            height: component.styles?.height || '20px',
            lineHeight: component.styles?.height || '20px',
            fontSize: '0px',
            padding: spacerPadding,
            backgroundColor: component.styles?.containerBackgroundColor || 'transparent'
          }}>
            &#8202;
          </div>
        );
        
      default:
        return null;
    }
  };

  // Component Properties Panel

  const renderComponentProperties = (component: EmailComponent) => {
    if (!component) return null;

    const updateStyles = (updates: Record<string, any>) => {
      updateComponent(component.id, 'styles', updates);
    };

    const updateContent = (updates: Record<string, any>) => {
      updateComponent(component.id, 'content', updates);
    };

    switch (component.type) {
      case 'text':
        return (
          <div className="space-y-4">
            {/* Content Group */}
            <PropertyGroup title="Content" defaultOpen={false}>
              <div>
                <Label htmlFor="text-content">Text Content</Label>
                <textarea
                  id="text-content"
                  value={component.content?.text || ''}
                  onChange={(e) => updateContent({ text: e.target.value })}
                  placeholder="Enter your text"
                  className="w-full p-2 border border-gray-300 rounded-md resize-none min-h-[80px]"
                />
              </div>
            </PropertyGroup>

            {/* Typography Group */}
            <PropertyGroup title="Typography">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="font-family">Font Family</Label>
                  <Select 
                    value={component.styles?.fontFamily || 'Arial, sans-serif'} 
                    onValueChange={(value) => updateStyles({ fontFamily: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                      <SelectItem value="Helvetica, sans-serif">Helvetica</SelectItem>
                      <SelectItem value="Georgia, serif">Georgia</SelectItem>
                      <SelectItem value="Times, serif">Times</SelectItem>
                      <SelectItem value="Verdana, sans-serif">Verdana</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="font-size">Font Size</Label>
                  <Select 
                    value={component.styles?.fontSize || '16px'} 
                    onValueChange={(value) => updateStyles({ fontSize: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12px">12px</SelectItem>
                      <SelectItem value="14px">14px</SelectItem>
                      <SelectItem value="16px">16px</SelectItem>
                      <SelectItem value="18px">18px</SelectItem>
                      <SelectItem value="20px">20px</SelectItem>
                      <SelectItem value="24px">24px</SelectItem>
                      <SelectItem value="28px">28px</SelectItem>
                      <SelectItem value="32px">32px</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="font-weight">Font Weight</Label>
                  <Select 
                    value={component.styles?.fontWeight || 'normal'} 
                    onValueChange={(value) => updateStyles({ fontWeight: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="bold">Bold</SelectItem>
                      <SelectItem value="lighter">Lighter</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="300">300</SelectItem>
                      <SelectItem value="400">400</SelectItem>
                      <SelectItem value="500">500</SelectItem>
                      <SelectItem value="600">600</SelectItem>
                      <SelectItem value="700">700</SelectItem>
                      <SelectItem value="900">900</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="font-style">Font Style</Label>
                  <Select 
                    value={component.styles?.fontStyle || 'normal'} 
                    onValueChange={(value) => updateStyles({ fontStyle: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="italic">Italic</SelectItem>
                      <SelectItem value="oblique">Oblique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="line-height">Line Height</Label>
                  <Input
                    id="line-height"
                    value={component.styles?.lineHeight || '1.6'}
                    onChange={(e) => updateStyles({ lineHeight: e.target.value })}
                    placeholder="1.6"
                  />
                </div>
                <div>
                  <Label htmlFor="letter-spacing">Letter Spacing</Label>
                  <Input
                    id="letter-spacing"
                    value={component.styles?.letterSpacing || 'normal'}
                    onChange={(e) => updateStyles({ letterSpacing: e.target.value })}
                    placeholder="normal"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="text-transform">Text Transform</Label>
                  <Select 
                    value={component.styles?.textTransform || 'none'} 
                    onValueChange={(value) => updateStyles({ textTransform: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="uppercase">Uppercase</SelectItem>
                      <SelectItem value="lowercase">Lowercase</SelectItem>
                      <SelectItem value="capitalize">Capitalize</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="text-decoration">Text Decoration</Label>
                  <Select 
                    value={component.styles?.textDecoration || 'none'} 
                    onValueChange={(value) => updateStyles({ textDecoration: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="underline">Underline</SelectItem>
                      <SelectItem value="overline">Overline</SelectItem>
                      <SelectItem value="line-through">Line Through</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </PropertyGroup>

            {/* Colors & Background Group */}
            <PropertyGroup title="Colors & Background">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="text-color">Text Color</Label>
                  <Input
                    id="text-color"
                    type="color"
                    value={component.styles?.color || '#000000'}
                    onChange={(e) => updateStyles({ color: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="background-color">Background Color</Label>
                  <Input
                    id="background-color"
                    type="color"
                    value={component.styles?.backgroundColor || '#ffffff'}
                    onChange={(e) => updateStyles({ backgroundColor: e.target.value })}
                  />
                </div>
              </div>
            </PropertyGroup>

            {/* Alignment Group */}
            <PropertyGroup title="Alignment">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="text-align">Text Alignment</Label>
                  <Select 
                    value={component.styles?.textAlign || 'left'} 
                    onValueChange={(value) => updateStyles({ textAlign: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                      <SelectItem value="justify">Justify</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="vertical-align">Vertical Alignment</Label>
                  <Select 
                    value={component.styles?.verticalAlign || 'top'} 
                    onValueChange={(value) => updateStyles({ verticalAlign: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top">Top</SelectItem>
                      <SelectItem value="middle">Middle</SelectItem>
                      <SelectItem value="bottom">Bottom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </PropertyGroup>

            {/* Spacing & Padding Group */}
            <PropertyGroup title="Spacing & Padding">
              <div>
                <Label htmlFor="padding">Padding (all sides)</Label>
                <Input
                  id="padding"
                  value={component.styles?.padding || '10px 25px'}
                  onChange={(e) => updateStyles({ padding: e.target.value })}
                  placeholder="10px 25px"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="padding-top">Padding Top</Label>
                  <Input
                    id="padding-top"
                    value={component.styles?.paddingTop || ''}
                    onChange={(e) => updateStyles({ paddingTop: e.target.value })}
                    placeholder="10px"
                  />
                </div>
                <div>
                  <Label htmlFor="padding-bottom">Padding Bottom</Label>
                  <Input
                    id="padding-bottom"
                    value={component.styles?.paddingBottom || ''}
                    onChange={(e) => updateStyles({ paddingBottom: e.target.value })}
                    placeholder="10px"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="padding-left">Padding Left</Label>
                  <Input
                    id="padding-left"
                    value={component.styles?.paddingLeft || ''}
                    onChange={(e) => updateStyles({ paddingLeft: e.target.value })}
                    placeholder="25px"
                  />
                </div>
                <div>
                  <Label htmlFor="padding-right">Padding Right</Label>
                  <Input
                    id="padding-right"
                    value={component.styles?.paddingRight || ''}
                    onChange={(e) => updateStyles({ paddingRight: e.target.value })}
                    placeholder="25px"
                  />
                </div>
              </div>
            </PropertyGroup>
          </div>
        );

      case 'image':
        return (
          <div className="space-y-4">
            {/* Content Group */}
            <PropertyGroup title="Content" defaultOpen={false}>
              <div>
                <Label htmlFor="image-src">Image URL</Label>
                <Input
                  id="image-src"
                  value={component.content?.src || ''}
                  onChange={(e) => updateContent({ src: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div>
                <Label htmlFor="image-alt">Alt Text</Label>
                <Input
                  id="image-alt"
                  value={component.content?.alt || ''}
                  onChange={(e) => updateContent({ alt: e.target.value })}
                  placeholder="Describe the image"
                />
              </div>
              <div>
                <Label htmlFor="image-title">Title</Label>
                <Input
                  id="image-title"
                  value={component.content?.title || ''}
                  onChange={(e) => updateContent({ title: e.target.value })}
                  placeholder="Image title"
                />
              </div>
            </PropertyGroup>

            {/* Link/Action Group */}
            <PropertyGroup title="Link/Action">
              <div>
                <Label htmlFor="image-href">Link URL</Label>
                <Input
                  id="image-href"
                  value={component.content?.href || ''}
                  onChange={(e) => updateContent({ href: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <Label htmlFor="image-rel">Rel Attribute</Label>
                <Input
                  id="image-rel"
                  value={component.content?.rel || ''}
                  onChange={(e) => updateContent({ rel: e.target.value })}
                  placeholder="nofollow, noopener"
                />
              </div>
            </PropertyGroup>

            {/* Sizing Group */}
            <PropertyGroup title="Sizing">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="image-width">Width</Label>
                  <Input
                    id="image-width"
                    value={component.styles?.width || '600px'}
                    onChange={(e) => updateStyles({ width: e.target.value })}
                    placeholder="600px"
                  />
                </div>
                <div>
                  <Label htmlFor="image-height">Height</Label>
                  <Input
                    id="image-height"
                    value={component.styles?.height || ''}
                    onChange={(e) => updateStyles({ height: e.target.value })}
                    placeholder="auto"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="fluid-on-mobile"
                  checked={component.styles?.fluidOnMobile === 'true'}
                  onChange={(e) => updateStyles({ fluidOnMobile: e.target.checked ? 'true' : 'false' })}
                />
                <Label htmlFor="fluid-on-mobile">Fluid on Mobile</Label>
              </div>
            </PropertyGroup>

            {/* Borders Group */}
            <PropertyGroup title="Borders">
              <div>
                <Label htmlFor="image-border">Border</Label>
                <Input
                  id="image-border"
                  value={component.styles?.border || ''}
                  onChange={(e) => updateStyles({ border: e.target.value })}
                  placeholder="1px solid #000"
                />
              </div>
              <div>
                <Label htmlFor="image-border-radius">Border Radius</Label>
                <Input
                  id="image-border-radius"
                  value={component.styles?.borderRadius || ''}
                  onChange={(e) => updateStyles({ borderRadius: e.target.value })}
                  placeholder="4px"
                />
              </div>
            </PropertyGroup>

            {/* Colors & Background Group */}
            <PropertyGroup title="Colors & Background">
              <div>
                <Label htmlFor="container-bg-color">Container Background Color</Label>
                <Input
                  id="container-bg-color"
                  type="color"
                  value={component.styles?.containerBackgroundColor || '#ffffff'}
                  onChange={(e) => updateStyles({ containerBackgroundColor: e.target.value })}
                />
              </div>
            </PropertyGroup>

            {/* Alignment Group */}
            <PropertyGroup title="Alignment">
              <div>
                <Label htmlFor="image-align">Alignment</Label>
                <Select 
                  value={component.styles?.align || 'center'} 
                  onValueChange={(value) => updateStyles({ align: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </PropertyGroup>

            {/* Spacing & Padding Group */}
            <PropertyGroup title="Spacing & Padding">
              <div>
                <Label htmlFor="image-padding">Padding (all sides)</Label>
                <Input
                  id="image-padding"
                  value={component.styles?.padding || '10px 25px'}
                  onChange={(e) => updateStyles({ padding: e.target.value })}
                  placeholder="10px 25px"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="image-padding-top">Padding Top</Label>
                  <Input
                    id="image-padding-top"
                    value={component.styles?.paddingTop || ''}
                    onChange={(e) => updateStyles({ paddingTop: e.target.value })}
                    placeholder="10px"
                  />
                </div>
                <div>
                  <Label htmlFor="image-padding-bottom">Padding Bottom</Label>
                  <Input
                    id="image-padding-bottom"
                    value={component.styles?.paddingBottom || ''}
                    onChange={(e) => updateStyles({ paddingBottom: e.target.value })}
                    placeholder="10px"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="image-padding-left">Padding Left</Label>
                  <Input
                    id="image-padding-left"
                    value={component.styles?.paddingLeft || ''}
                    onChange={(e) => updateStyles({ paddingLeft: e.target.value })}
                    placeholder="25px"
                  />
                </div>
                <div>
                  <Label htmlFor="image-padding-right">Padding Right</Label>
                  <Input
                    id="image-padding-right"
                    value={component.styles?.paddingRight || ''}
                    onChange={(e) => updateStyles({ paddingRight: e.target.value })}
                    placeholder="25px"
                  />
                </div>
              </div>
            </PropertyGroup>
          </div>
        );

      case 'button':
        return (
          <div className="space-y-4">
            {/* Content Group */}
            <PropertyGroup title="Content" defaultOpen={false}>
              <div>
                <Label htmlFor="button-text">Button Text</Label>
                <Input
                  id="button-text"
                  value={component.content?.text || 'Click here'}
                  onChange={(e) => updateContent({ text: e.target.value })}
                  placeholder="Click here"
                />
              </div>
              <div>
                <Label htmlFor="button-title">Title</Label>
                <Input
                  id="button-title"
                  value={component.content?.title || ''}
                  onChange={(e) => updateContent({ title: e.target.value })}
                  placeholder="Button title"
                />
              </div>
            </PropertyGroup>

            {/* Typography Group */}
            <PropertyGroup title="Typography">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="button-font-family">Font Family</Label>
                  <Select 
                    value={component.styles?.fontFamily || 'Arial, sans-serif'} 
                    onValueChange={(value) => updateStyles({ fontFamily: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                      <SelectItem value="Helvetica, sans-serif">Helvetica</SelectItem>
                      <SelectItem value="Georgia, serif">Georgia</SelectItem>
                      <SelectItem value="Times, serif">Times</SelectItem>
                      <SelectItem value="Verdana, sans-serif">Verdana</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="button-font-size">Font Size</Label>
                  <Select 
                    value={component.styles?.fontSize || '16px'} 
                    onValueChange={(value) => updateStyles({ fontSize: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12px">12px</SelectItem>
                      <SelectItem value="14px">14px</SelectItem>
                      <SelectItem value="16px">16px</SelectItem>
                      <SelectItem value="18px">18px</SelectItem>
                      <SelectItem value="20px">20px</SelectItem>
                      <SelectItem value="24px">24px</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="button-font-weight">Font Weight</Label>
                  <Select 
                    value={component.styles?.fontWeight || 'normal'} 
                    onValueChange={(value) => updateStyles({ fontWeight: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="bold">Bold</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="300">300</SelectItem>
                      <SelectItem value="400">400</SelectItem>
                      <SelectItem value="500">500</SelectItem>
                      <SelectItem value="600">600</SelectItem>
                      <SelectItem value="700">700</SelectItem>
                      <SelectItem value="900">900</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="button-font-style">Font Style</Label>
                  <Select 
                    value={component.styles?.fontStyle || 'normal'} 
                    onValueChange={(value) => updateStyles({ fontStyle: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="italic">Italic</SelectItem>
                      <SelectItem value="oblique">Oblique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="button-letter-spacing">Letter Spacing</Label>
                  <Input
                    id="button-letter-spacing"
                    value={component.styles?.letterSpacing || 'normal'}
                    onChange={(e) => updateStyles({ letterSpacing: e.target.value })}
                    placeholder="normal"
                  />
                </div>
                <div>
                  <Label htmlFor="button-line-height">Line Height</Label>
                  <Input
                    id="button-line-height"
                    value={component.styles?.lineHeight || '1.6'}
                    onChange={(e) => updateStyles({ lineHeight: e.target.value })}
                    placeholder="1.6"
                  />
                </div>
                <div>
                  <Label htmlFor="button-text-transform">Text Transform</Label>
                  <Select 
                    value={component.styles?.textTransform || 'none'} 
                    onValueChange={(value) => updateStyles({ textTransform: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="uppercase">Uppercase</SelectItem>
                      <SelectItem value="lowercase">Lowercase</SelectItem>
                      <SelectItem value="capitalize">Capitalize</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="button-text-decoration">Text Decoration</Label>
                <Select 
                  value={component.styles?.textDecoration || 'none'} 
                  onValueChange={(value) => updateStyles({ textDecoration: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="underline">Underline</SelectItem>
                    <SelectItem value="overline">Overline</SelectItem>
                    <SelectItem value="line-through">Line Through</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </PropertyGroup>

            {/* Colors & Background Group */}
            <PropertyGroup title="Colors & Background">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="button-bg-color">Background Color</Label>
                  <Input
                    id="button-bg-color"
                    type="color"
                    value={component.styles?.backgroundColor || '#1553ec'}
                    onChange={(e) => updateStyles({ backgroundColor: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="button-text-color">Text Color</Label>
                  <Input
                    id="button-text-color"
                    type="color"
                    value={component.styles?.color || '#ffffff'}
                    onChange={(e) => updateStyles({ color: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="button-container-bg">Container Background Color</Label>
                <Input
                  id="button-container-bg"
                  type="color"
                  value={component.styles?.containerBackgroundColor || '#ffffff'}
                  onChange={(e) => updateStyles({ containerBackgroundColor: e.target.value })}
                />
              </div>
            </PropertyGroup>

            {/* Borders Group */}
            <PropertyGroup title="Borders">
              <div>
                <Label htmlFor="button-border">Border (all sides)</Label>
                <Input
                  id="button-border"
                  value={component.styles?.border || ''}
                  onChange={(e) => updateStyles({ border: e.target.value })}
                  placeholder="1px solid #000"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="button-border-top">Border Top</Label>
                  <Input
                    id="button-border-top"
                    value={component.styles?.borderTop || ''}
                    onChange={(e) => updateStyles({ borderTop: e.target.value })}
                    placeholder="1px solid #000"
                  />
                </div>
                <div>
                  <Label htmlFor="button-border-bottom">Border Bottom</Label>
                  <Input
                    id="button-border-bottom"
                    value={component.styles?.borderBottom || ''}
                    onChange={(e) => updateStyles({ borderBottom: e.target.value })}
                    placeholder="1px solid #000"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="button-border-left">Border Left</Label>
                  <Input
                    id="button-border-left"
                    value={component.styles?.borderLeft || ''}
                    onChange={(e) => updateStyles({ borderLeft: e.target.value })}
                    placeholder="1px solid #000"
                  />
                </div>
                <div>
                  <Label htmlFor="button-border-right">Border Right</Label>
                  <Input
                    id="button-border-right"
                    value={component.styles?.borderRight || ''}
                    onChange={(e) => updateStyles({ borderRight: e.target.value })}
                    placeholder="1px solid #000"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="button-border-radius">Border Radius</Label>
                <Input
                  id="button-border-radius"
                  value={component.styles?.borderRadius || '6px'}
                  onChange={(e) => updateStyles({ borderRadius: e.target.value })}
                  placeholder="6px"
                />
              </div>
            </PropertyGroup>

            {/* Sizing Group */}
            <PropertyGroup title="Sizing">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="button-width">Width</Label>
                  <Input
                    id="button-width"
                    value={component.styles?.width || 'auto'}
                    onChange={(e) => updateStyles({ width: e.target.value })}
                    placeholder="auto"
                  />
                </div>
                <div>
                  <Label htmlFor="button-height">Height</Label>
                  <Input
                    id="button-height"
                    value={component.styles?.height || 'auto'}
                    onChange={(e) => updateStyles({ height: e.target.value })}
                    placeholder="auto"
                  />
                </div>
              </div>
            </PropertyGroup>

            {/* Alignment Group */}
            <PropertyGroup title="Alignment">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="button-align">Button Alignment</Label>
                  <Select 
                    value={component.styles?.align || 'center'} 
                    onValueChange={(value) => updateStyles({ align: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="button-text-align">Text Alignment</Label>
                  <Select 
                    value={component.styles?.textAlign || 'center'} 
                    onValueChange={(value) => updateStyles({ textAlign: value })}
                  >
                    <SelectTrigger>
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
              <div>
                <Label htmlFor="button-vertical-align">Vertical Alignment</Label>
                <Select 
                  value={component.styles?.verticalAlign || 'middle'} 
                  onValueChange={(value) => updateStyles({ verticalAlign: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="top">Top</SelectItem>
                    <SelectItem value="middle">Middle</SelectItem>
                    <SelectItem value="bottom">Bottom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </PropertyGroup>

            {/* Spacing & Padding Group */}
            <PropertyGroup title="Spacing & Padding">
              <div>
                <Label htmlFor="button-padding">Padding (all sides)</Label>
                <Input
                  id="button-padding"
                  value={component.styles?.padding || '10px 25px'}
                  onChange={(e) => updateStyles({ padding: e.target.value })}
                  placeholder="10px 25px"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="button-padding-top">Padding Top</Label>
                  <Input
                    id="button-padding-top"
                    value={component.styles?.paddingTop || ''}
                    onChange={(e) => updateStyles({ paddingTop: e.target.value })}
                    placeholder="10px"
                  />
                </div>
                <div>
                  <Label htmlFor="button-padding-bottom">Padding Bottom</Label>
                  <Input
                    id="button-padding-bottom"
                    value={component.styles?.paddingBottom || ''}
                    onChange={(e) => updateStyles({ paddingBottom: e.target.value })}
                    placeholder="10px"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="button-padding-left">Padding Left</Label>
                  <Input
                    id="button-padding-left"
                    value={component.styles?.paddingLeft || ''}
                    onChange={(e) => updateStyles({ paddingLeft: e.target.value })}
                    placeholder="25px"
                  />
                </div>
                <div>
                  <Label htmlFor="button-padding-right">Padding Right</Label>
                  <Input
                    id="button-padding-right"
                    value={component.styles?.paddingRight || ''}
                    onChange={(e) => updateStyles({ paddingRight: e.target.value })}
                    placeholder="25px"
                  />
                </div>
              </div>
            </PropertyGroup>

            {/* Link/Action Group */}
            <PropertyGroup title="Link/Action">
              <div>
                <Label htmlFor="button-href">Link URL</Label>
                <Input
                  id="button-href"
                  value={component.content?.href || '#'}
                  onChange={(e) => updateContent({ href: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="button-rel">Rel Attribute</Label>
                  <Input
                    id="button-rel"
                    value={component.content?.rel || ''}
                    onChange={(e) => updateContent({ rel: e.target.value })}
                    placeholder="nofollow, noopener"
                  />
                </div>
                <div>
                  <Label htmlFor="button-target">Target</Label>
                  <Select 
                    value={component.content?.target || '_self'} 
                    onValueChange={(value) => updateContent({ target: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_self">Same Window</SelectItem>
                      <SelectItem value="_blank">New Window</SelectItem>
                      <SelectItem value="_parent">Parent Frame</SelectItem>
                      <SelectItem value="_top">Top Frame</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </PropertyGroup>
          </div>
        );

      case 'spacer':
        return (
          <div className="space-y-4">
            {/* Sizing Group */}
            <PropertyGroup title="Sizing" defaultOpen={false}>
              <div>
                <Label htmlFor="spacer-height">Height: {component.styles?.height || '20px'}</Label>
                <Slider
                  value={[parseInt(component.styles?.height?.replace('px', '') || '20')]}
                  onValueChange={(values) => updateStyles({ height: `${values[0]}px` })}
                  max={100}
                  min={5}
                  step={5}
                  className="w-full"
                />
              </div>
              <div>
                <Label htmlFor="spacer-height-input">Height (manual input)</Label>
                <Input
                  id="spacer-height-input"
                  value={component.styles?.height || '20px'}
                  onChange={(e) => updateStyles({ height: e.target.value })}
                  placeholder="20px"
                />
              </div>
            </PropertyGroup>

            {/* Colors & Background Group */}
            <PropertyGroup title="Colors & Background">
              <div>
                <Label htmlFor="spacer-container-bg">Container Background Color</Label>
                <Input
                  id="spacer-container-bg"
                  type="color"
                  value={component.styles?.containerBackgroundColor || '#ffffff'}
                  onChange={(e) => updateStyles({ containerBackgroundColor: e.target.value })}
                />
              </div>
            </PropertyGroup>

            {/* Spacing & Padding Group */}
            <PropertyGroup title="Spacing & Padding">
              <div>
                <Label htmlFor="spacer-padding">Padding (all sides)</Label>
                <Input
                  id="spacer-padding"
                  value={component.styles?.padding || ''}
                  onChange={(e) => updateStyles({ padding: e.target.value })}
                  placeholder="0px"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="spacer-padding-top">Padding Top</Label>
                  <Input
                    id="spacer-padding-top"
                    value={component.styles?.paddingTop || ''}
                    onChange={(e) => updateStyles({ paddingTop: e.target.value })}
                    placeholder="0px"
                  />
                </div>
                <div>
                  <Label htmlFor="spacer-padding-bottom">Padding Bottom</Label>
                  <Input
                    id="spacer-padding-bottom"
                    value={component.styles?.paddingBottom || ''}
                    onChange={(e) => updateStyles({ paddingBottom: e.target.value })}
                    placeholder="0px"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="spacer-padding-left">Padding Left</Label>
                  <Input
                    id="spacer-padding-left"
                    value={component.styles?.paddingLeft || ''}
                    onChange={(e) => updateStyles({ paddingLeft: e.target.value })}
                    placeholder="0px"
                  />
                </div>
                <div>
                  <Label htmlFor="spacer-padding-right">Padding Right</Label>
                  <Input
                    id="spacer-padding-right"
                    value={component.styles?.paddingRight || ''}
                    onChange={(e) => updateStyles({ paddingRight: e.target.value })}
                    placeholder="0px"
                  />
                </div>
              </div>
            </PropertyGroup>
          </div>
        );

      default:
        return null;
    }
  };

  // Helper Functions
  const handlePreviewEmail = () => {
    if (mjmlPreviewHtml) {
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(mjmlPreviewHtml);
        newWindow.document.close();
      }
    }
  };

  const getBuilderHtml = () => {
    if (builderRef.current) {
      return builderRef.current.innerHTML;
    }
    return '';
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Tools Panel - Left Side */}
      <div className="w-64 bg-white border-r border-gray-200 flex-shrink-0 h-screen sticky top-0">
        <Card className="h-full flex flex-col border-0 rounded-none">
          <CardHeader className="flex-shrink-0 border-b">
            <CardTitle className="text-lg">Components</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4">
            <div className="space-y-3">
              <Button 
                onClick={() => addComponent('text')} 
                variant="outline" 
                className="w-full justify-start"
              >
                <Type className="h-4 w-4 mr-2" />
                Text
              </Button>
              <Button 
                onClick={() => addComponent('image')} 
                variant="outline" 
                className="w-full justify-start"
              >
                <Image className="h-4 w-4 mr-2" />
                Image
              </Button>
              <Button 
                onClick={() => addComponent('button')} 
                variant="outline" 
                className="w-full justify-start"
              >
                <MousePointer className="h-4 w-4 mr-2" />
                Button
              </Button>
              <Button 
                onClick={() => addComponent('spacer')} 
                variant="outline" 
                className="w-full justify-start"
              >
                <Space className="h-4 w-4 mr-2" />
                Spacer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Central Workspace - Pure MJML Editor */}
      <div className="flex-1 min-h-screen">
        <div className="p-6 max-w-4xl mx-auto">
          {/* Email Builder Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Pure MJML Editor</h2>
              <div className="flex gap-3">
                <Button onClick={handlePreviewEmail} variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  Open Preview
                </Button>
                <Button onClick={() => {
                  const html = mjmlPreviewHtml || getBuilderHtml();
                  const blob = new Blob([html], { type: 'text/html' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `mjml-email.html`;
                  a.click();
                  URL.revokeObjectURL(url);
                  
                  toast({
                    title: "HTML descargado",
                    description: "El archivo HTML ha sido descargado exitosamente.",
                  });
                }} size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download HTML
                </Button>
              </div>
            </div>

            {/* Email Builder Canvas */}
            <Card className="w-full">
              <CardContent className="p-0">
                <div className="bg-gray-100 p-6 flex justify-center">
                  <EditingContext.Provider value={true}>
                    <div ref={builderRef} className="w-full max-w-[600px] bg-white">
                      {/* Email Subject - Optional */}
                      {emailContent.subject && (
                        <div className="p-4 border-b bg-gray-50">
                          <Input
                            value={emailContent.subject}
                            onChange={(e) => setEmailContent(prev => ({ ...prev, subject: e.target.value }))}
                            placeholder="Email subject"
                            className="font-semibold bg-white"
                          />
                        </div>
                      )}

                      {/* Pure MJML Canvas - Blank by default */}
                      <div style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#ffffff' }}>
                        {emailComponents.length === 0 ? (
                          <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300">
                            <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p>Blank MJML Canvas</p>
                            <p className="text-sm mt-2">Add components to start building</p>
                          </div>
                        ) : (
                          <DndContext 
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                          >
                            <SortableContext 
                              items={emailComponents.map(c => c.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              <div>
                                {emailComponents.map((component) => (
                                  <SortableEmailComponent 
                                    key={component.id} 
                                    component={component} 
                                  />
                                ))}
                              </div>
                            </SortableContext>
                          </DndContext>
                        )}
                      </div>
                    </div>
                  </EditingContext.Provider>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Live MJML Preview Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Live MJML Preview</h2>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-green-600">Real-time compilation</span>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={async () => {
                    console.log('=== TESTING MJML CLIENT/SERVER COMMUNICATION ===');
                    try {
                      const response = await fetch('/api/email/test-mjml');
                      const data = await response.json();
                      console.log('Test MJML response:', data);
                      console.log('Test HTML length:', data.html?.length);
                      console.log('Test HTML preview:', data.html?.substring(0, 200) + '...');
                      if (data.html) {
                        setMjmlPreviewHtml(data.html);
                        console.log('✅ Test HTML successfully set in preview state');
                      } else {
                        console.error('❌ No HTML in test response');
                      }
                    } catch (error) {
                      console.error('❌ Test fetch failed:', error);
                    }
                  }}
                >
                  Test MJML
                </Button>
              </div>
            </div>
            
            <Card className="w-full">
              <CardContent className="p-6">
                <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
                  <p className="text-xs text-blue-700">
                    ✨ This shows the actual MJML-compiled HTML that will be exported - exactly what your recipients will see
                  </p>
                </div>
                <div className="flex justify-center w-full">
                  <div className="w-full max-w-[600px]">
                    <div 
                      className="bg-white border rounded overflow-hidden shadow-lg min-h-[200px]"
                      dangerouslySetInnerHTML={{ 
                        __html: mjmlPreviewHtml || '<div style="padding: 40px; text-align: center; color: #9ca3af; font-family: Arial, sans-serif;">Add components above to see your email preview</div>' 
                      }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Properties Panel - Right Side */}
      <div className="w-80 bg-white border-l border-gray-200 flex-shrink-0 h-screen sticky top-0">
        <Card className="h-full flex flex-col border-0 rounded-none">
          <CardHeader className="flex-shrink-0 border-b">
            <CardTitle className="text-lg">Properties</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4">
            {selectedComponent ? (
              <div className="space-y-4">
                {renderComponentProperties(emailComponents.find(c => c.id === selectedComponent)!)}
              </div>
            ) : (
              <div className="text-center py-8">
                <Settings className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 text-sm">Select a component to edit its properties</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}