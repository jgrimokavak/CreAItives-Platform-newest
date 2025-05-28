import { useState, useEffect, useRef, createContext } from 'react';
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
  Mail
} from 'lucide-react';

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

  // MJML Compilation Effect
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

    compileToMjml();
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
        return { src: '', alt: 'Image description' };
      case 'button':
        return { text: 'Click here', href: '#' };
      case 'spacer':
        return { height: '20px' };
      default:
        return {};
    }
  };

  const getDefaultStyles = (type: string) => {
    switch (type) {
      case 'text':
        return {
          fontSize: '16px',
          color: '#000000',
          textAlign: 'left',
          padding: '15px'
        };
      case 'image':
        return {
          width: '600px',
          padding: '15px'
        };
      case 'button':
        return {
          backgroundColor: '#1553ec',
          color: '#ffffff',
          padding: '15px',
          borderRadius: '6px',
          textAlign: 'center',
          margin: '15px'
        };
      case 'spacer':
        return {
          height: '20px'
        };
      default:
        return {};
    }
  };

  const removeComponent = (id: string) => {
    setEmailComponents(prev => prev.filter(c => c.id !== id));
    if (selectedComponent === id) {
      setSelectedComponent(null);
    }
  };

  const updateComponent = (id: string, field: string, value: any) => {
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
  };

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
    switch (component.type) {
      case 'text':
        return (
          <div style={{
            fontFamily: 'Arial, sans-serif',
            fontSize: component.styles?.fontSize || '16px',
            lineHeight: '1.6',
            textAlign: component.styles?.textAlign || 'left',
            color: component.styles?.color || '#000000',
            padding: component.styles?.padding || '10px 25px'
          }}>
            {component.content.text}
          </div>
        );
      case 'image':
        return (
          <div style={{ 
            fontSize: '0px',
            padding: component.styles?.padding || '10px 25px',
            textAlign: 'center'
          }}>
            {component.content.src ? (
              <img 
                src={component.content.src} 
                alt={component.content.alt}
                style={{ 
                  border: '0',
                  height: 'auto',
                  lineHeight: '100%',
                  outline: 'none',
                  textDecoration: 'none',
                  width: component.styles?.width || '600px',
                  maxWidth: '100%'
                }}
              />
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
        return (
          <div style={{ 
            fontSize: '0px',
            padding: component.styles?.margin || '10px 25px',
            wordBreak: 'break-word',
            textAlign: component.styles?.textAlign || 'center'
          }}>
            <table
              style={{
                borderCollapse: 'separate',
                lineHeight: '100%'
              }}
              align="center"
              border={0}
              cellPadding={0}
              cellSpacing={0}
            >
              <tbody>
                <tr>
                  <td
                    style={{
                      border: 'none',
                      borderRadius: component.styles?.borderRadius || '6px',
                      cursor: 'auto',
                      background: component.styles?.backgroundColor || '#1553ec'
                    }}
                    align="center"
                    valign="middle"
                  >
                    <a
                      href={component.content.href || '#'}
                      style={{
                        display: 'inline-block',
                        background: component.styles?.backgroundColor || '#1553ec',
                        color: component.styles?.color || '#ffffff',
                        fontFamily: 'Arial, sans-serif',
                        fontSize: '13px',
                        fontWeight: 'normal',
                        lineHeight: '120%',
                        margin: '0',
                        textDecoration: 'none',
                        textTransform: 'none',
                        padding: '10px 25px',
                        borderRadius: component.styles?.borderRadius || '6px'
                      }}
                      target="_blank"
                    >
                      {component.content.text}
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      case 'spacer':
        return (
          <div style={{ 
            height: component.styles?.height || '20px',
            lineHeight: component.styles?.height || '20px'
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

    switch (component.type) {
      case 'text':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="text-content">Text Content</Label>
              <Input
                id="text-content"
                value={component.content.text}
                onChange={(e) => updateComponent(component.id, 'content', { text: e.target.value })}
                placeholder="Enter your text"
              />
            </div>
            <div>
              <Label htmlFor="text-size">Font Size</Label>
              <Select 
                value={component.styles.fontSize} 
                onValueChange={(value) => updateComponent(component.id, 'styles', { fontSize: value })}
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
            <div>
              <Label htmlFor="text-color">Text Color</Label>
              <Input
                id="text-color"
                type="color"
                value={component.styles.color}
                onChange={(e) => updateComponent(component.id, 'styles', { color: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="text-align">Text Alignment</Label>
              <Select 
                value={component.styles.textAlign} 
                onValueChange={(value) => updateComponent(component.id, 'styles', { textAlign: value })}
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
        );

      case 'image':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="image-src">Image URL</Label>
              <Input
                id="image-src"
                value={component.content.src}
                onChange={(e) => updateComponent(component.id, 'content', { src: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div>
              <Label htmlFor="image-alt">Alt Text</Label>
              <Input
                id="image-alt"
                value={component.content.alt}
                onChange={(e) => updateComponent(component.id, 'content', { alt: e.target.value })}
                placeholder="Describe the image"
              />
            </div>
            <div>
              <Label htmlFor="image-width">Width (px)</Label>
              <Input
                id="image-width"
                value={component.styles.width?.replace('px', '') || '600'}
                onChange={(e) => updateComponent(component.id, 'styles', { width: e.target.value + 'px' })}
                placeholder="600"
              />
            </div>
          </div>
        );

      case 'button':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="button-text">Button Text</Label>
              <Input
                id="button-text"
                value={component.content.text}
                onChange={(e) => updateComponent(component.id, 'content', { text: e.target.value })}
                placeholder="Click here"
              />
            </div>
            <div>
              <Label htmlFor="button-href">Link URL</Label>
              <Input
                id="button-href"
                value={component.content.href}
                onChange={(e) => updateComponent(component.id, 'content', { href: e.target.value })}
                placeholder="https://example.com"
              />
            </div>
            <div>
              <Label htmlFor="button-bg">Background Color</Label>
              <Input
                id="button-bg"
                type="color"
                value={component.styles.backgroundColor}
                onChange={(e) => updateComponent(component.id, 'styles', { backgroundColor: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="button-color">Text Color</Label>
              <Input
                id="button-color"
                type="color"
                value={component.styles.color}
                onChange={(e) => updateComponent(component.id, 'styles', { color: e.target.value })}
              />
            </div>
          </div>
        );

      case 'spacer':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="spacer-height">Height: {component.styles.height}</Label>
              <Slider
                value={[parseInt(component.styles.height?.replace('px', '') || '20')]}
                onValueChange={(values) => updateComponent(component.id, 'styles', { height: `${values[0]}px` })}
                max={100}
                min={5}
                step={5}
                className="w-full"
              />
            </div>
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