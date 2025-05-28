import { useState, useRef, useEffect, createContext, useContext } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Mail, Type, Image, MousePointer, Space, Sparkles, 
  Loader2, Save, Download, Eye, Gift, Settings,
  GripVertical, Trash2, AlignLeft, AlignCenter, AlignRight,
  Bold, Italic, Underline
} from "lucide-react";
import { cn } from "@/lib/utils";

// Email Component Interface
interface EmailComponent {
  id: string;
  type: 'text' | 'image' | 'button' | 'spacer';
  content: any;
  styles: Record<string, any>;
}

// Email Content State
interface EmailContent {
  subject: string;
  components: EmailComponent[];
}

// Email Templates
const emailTemplates = [
  {
    id: 'kavak-promo',
    name: 'KAVAK Promocional',
    description: 'Template promocional para ofertas especiales',
    icon: <Gift className="h-8 w-8" />,
    color: '#1553ec',
    tags: ['promocional', 'ofertas']
  },
  {
    id: 'kavak-welcome',
    name: 'KAVAK Bienvenida',
    description: 'Template de bienvenida para nuevos usuarios',
    icon: <Mail className="h-8 w-8" />,
    color: '#10b981',
    tags: ['bienvenida', 'onboarding']
  },
  {
    id: 'kavak-newsletter',
    name: 'KAVAK Newsletter',
    description: 'Template para newsletters informativos',
    icon: <Type className="h-8 w-8" />,
    color: '#8b5cf6',
    tags: ['newsletter', 'informativo']
  }
];

// Component Types for Tools Panel
const componentTypes = [
  { type: 'text', name: 'Text', icon: <Type className="h-4 w-4" /> },
  { type: 'image', name: 'Image', icon: <Image className="h-4 w-4" /> },
  { type: 'button', name: 'Button', icon: <MousePointer className="h-4 w-4" /> },
  { type: 'spacer', name: 'Spacer', icon: <Space className="h-4 w-4" /> }
];

// Editing Context for conditional rendering
const EditingContext = createContext(false);

export default function EmailBuilderPage() {
  const { toast } = useToast();
  
  // State Management
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [emailContent, setEmailContent] = useState<EmailContent>({
    subject: '',
    components: []
  });
  const [emailComponents, setEmailComponents] = useState<EmailComponent[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [tone, setTone] = useState('professional');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
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

        if (response.ok) {
          const data = await response.json();
          console.log('Generated MJML:', data.mjml);
          if (data.html) {
            setMjmlPreviewHtml(data.html);
          } else {
            console.warn('No HTML returned from MJML compilation');
            setMjmlPreviewHtml(`
              <div style="padding: 40px; text-align: center; color: #dc2626; border: 2px solid #fecaca; background: #fef2f2; border-radius: 8px; margin: 20px;">
                <h3>Preview Error</h3>
                <p>Unable to compile email preview. Please check your components.</p>
              </div>
            `);
          }
        } else {
          console.error('Failed to compile MJML - server error');
          setMjmlPreviewHtml(`
            <div style="padding: 40px; text-align: center; color: #dc2626; border: 2px solid #fecaca; background: #fef2f2; border-radius: 8px; margin: 20px;">
              <h3>Server Error</h3>
              <p>Unable to connect to email compilation service.</p>
            </div>
          `);
        }
      } catch (error) {
        console.error('Error compiling MJML:', error);
      }
    };

    compileToMjml();
  }, [emailContent, emailComponents]);

  // Template Selection
  const selectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    setEmailContent(prev => ({ 
      ...prev, 
      subject: `KAVAK - ${emailTemplates.find(t => t.id === templateId)?.name || 'Email'}` 
    }));
    setEmailComponents([]);
    setSelectedComponent(null);
    setShowTemplates(false);
  };

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
          padding: '15px',
          margin: '0px'
        };
      case 'image':
        return {
          width: '100%',
          padding: '15px',
          margin: '0px'
        };
      case 'button':
        return {
          backgroundColor: '#1553ec',
          color: '#ffffff',
          padding: '12px 24px',
          margin: '15px',
          borderRadius: '6px',
          textAlign: 'center'
        };
      case 'spacer':
        return {
          height: '20px',
          backgroundColor: 'transparent'
        };
      default:
        return {};
    }
  };

  // Drag and Drop Handler
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setEmailComponents((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Component Deletion
  const deleteComponent = (id: string) => {
    setEmailComponents(prev => prev.filter(c => c.id !== id));
    if (selectedComponent === id) {
      setSelectedComponent(null);
    }
  };

  // Component Update
  const updateComponent = (id: string, updates: Partial<EmailComponent>) => {
    setEmailComponents(prev => prev.map(c => 
      c.id === id ? { ...c, ...updates } : c
    ));
  };

  // Sortable Component Wrapper
  const SortableEmailComponent = ({ component }: { component: EmailComponent }) => {
    const isEditing = useContext(EditingContext);
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
        className={cn(
          "relative group",
          selectedComponent === component.id && "ring-2 ring-blue-500"
        )}
        onClick={() => setSelectedComponent(component.id)}
      >
        {isEditing && (
          <div className="absolute top-0 right-0 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="destructive"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                deleteComponent(component.id);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 w-6 p-0 cursor-grab"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-3 w-3" />
            </Button>
          </div>
        )}
        {renderEmailComponent(component)}
      </div>
    );
  };

  // Email Component Renderer
  const renderEmailComponent = (component: EmailComponent) => {
    switch (component.type) {
      case 'text':
        return (
          <div style={{ ...component.styles }}>
            {component.content.text}
          </div>
        );
      case 'image':
        return (
          <div style={{ padding: component.styles.padding, margin: component.styles.margin }}>
            {component.content.src ? (
              <img 
                src={component.content.src} 
                alt={component.content.alt}
                style={{ width: component.styles.width }}
              />
            ) : (
              <div className="bg-gray-200 p-8 text-center text-gray-500 rounded">
                <Image className="h-8 w-8 mx-auto mb-2" />
                <p>Add image URL in properties</p>
              </div>
            )}
          </div>
        );
      case 'button':
        return (
          <div style={{ textAlign: component.styles.textAlign, padding: component.styles.margin }}>
            <a
              href={component.content.href}
              style={{
                display: 'inline-block',
                backgroundColor: component.styles.backgroundColor,
                color: component.styles.color,
                padding: component.styles.padding,
                borderRadius: component.styles.borderRadius,
                textDecoration: 'none'
              }}
            >
              {component.content.text}
            </a>
          </div>
        );
      case 'spacer':
        return (
          <div style={{ 
            height: component.styles.height,
            backgroundColor: component.styles.backgroundColor 
          }} />
        );
      default:
        return null;
    }
  };

  // Component Properties Renderer
  const renderComponentProperties = (component: EmailComponent) => {
    if (!component) return null;

    const updateStyles = (updates: any) => {
      updateComponent(component.id, { styles: { ...component.styles, ...updates } });
    };

    const updateContent = (updates: any) => {
      updateComponent(component.id, { content: { ...component.content, ...updates } });
    };

    return (
      <div className="space-y-4">
        <div className="pb-2 border-b">
          <Label className="font-semibold capitalize">{component.type} Properties</Label>
        </div>

        {/* Content Properties */}
        {component.type === 'text' && (
          <div className="space-y-3">
            <div>
              <Label>Text Content</Label>
              <Textarea
                value={component.content.text}
                onChange={(e) => updateContent({ text: e.target.value })}
                placeholder="Enter your text"
                className="mt-1"
              />
            </div>
          </div>
        )}

        {component.type === 'image' && (
          <div className="space-y-3">
            <div>
              <Label>Image URL</Label>
              <Input
                value={component.content.src}
                onChange={(e) => updateContent({ src: e.target.value })}
                placeholder="https://example.com/image.jpg"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Alt Text</Label>
              <Input
                value={component.content.alt}
                onChange={(e) => updateContent({ alt: e.target.value })}
                placeholder="Image description"
                className="mt-1"
              />
            </div>
          </div>
        )}

        {component.type === 'button' && (
          <div className="space-y-3">
            <div>
              <Label>Button Text</Label>
              <Input
                value={component.content.text}
                onChange={(e) => updateContent({ text: e.target.value })}
                placeholder="Click here"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Link URL</Label>
              <Input
                value={component.content.href}
                onChange={(e) => updateContent({ href: e.target.value })}
                placeholder="https://example.com"
                className="mt-1"
              />
            </div>
          </div>
        )}

        {component.type === 'spacer' && (
          <div>
            <Label>Height</Label>
            <Input
              value={component.styles.height}
              onChange={(e) => updateStyles({ height: e.target.value })}
              placeholder="20px"
              className="mt-1"
            />
          </div>
        )}

        {/* Style Properties */}
        <div className="pt-2 border-t">
          <Label className="font-semibold">Styling</Label>
          
          {(component.type === 'text' || component.type === 'button') && (
            <div className="mt-3 space-y-3">
              <div>
                <Label>Text Color</Label>
                <Input
                  type="color"
                  value={component.styles.color}
                  onChange={(e) => updateStyles({ color: e.target.value })}
                  className="mt-1 h-10"
                />
              </div>
              
              {component.type === 'text' && (
                <div>
                  <Label>Font Size</Label>
                  <Input
                    value={component.styles.fontSize}
                    onChange={(e) => updateStyles({ fontSize: e.target.value })}
                    placeholder="16px"
                    className="mt-1"
                  />
                </div>
              )}

              {component.type === 'button' && (
                <div>
                  <Label>Background Color</Label>
                  <Input
                    type="color"
                    value={component.styles.backgroundColor}
                    onChange={(e) => updateStyles({ backgroundColor: e.target.value })}
                    className="mt-1 h-10"
                  />
                </div>
              )}
            </div>
          )}

          <div className="mt-3 space-y-3">
            <div>
              <Label>Padding</Label>
              <Input
                value={component.styles.padding}
                onChange={(e) => updateStyles({ padding: e.target.value })}
                placeholder="15px"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>Margin</Label>
              <Input
                value={component.styles.margin}
                onChange={(e) => updateStyles({ margin: e.target.value })}
                placeholder="0px"
                className="mt-1"
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Generate Content with AI
  const handleGenerateContent = async () => {
    setIsGenerating(true);
    try {
      // Mock AI generation for now
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const generatedComponent: EmailComponent = {
        id: `text-${Date.now()}`,
        type: 'text',
        content: { text: `Generated ${tone} content for KAVAK email campaign` },
        styles: getDefaultStyles('text')
      };
      
      setEmailComponents(prev => [...prev, generatedComponent]);
      
      toast({
        title: "Content Generated",
        description: "AI-generated content has been added to your email.",
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate content. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Save Template
  const saveTemplate = () => {
    toast({
      title: "Template Saved",
      description: `Template "${templateName}" has been saved successfully.`,
    });
    setTemplateName('');
  };

  // Export Functions
  const getBuilderHtml = () => {
    if (!builderRef.current) return '';
    return builderRef.current.innerHTML;
  };

  const handlePreviewEmail = () => {
    const html = mjmlPreviewHtml || getBuilderHtml();
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(html);
      newWindow.document.close();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Fixed Tools Panel - Left Side */}
      <div className="w-80 bg-white border-r border-gray-200 flex-shrink-0 h-screen sticky top-0">
        <Card className="h-full flex flex-col border-0 rounded-none">
          <CardHeader className="flex-shrink-0 border-b">
            <CardTitle className="text-lg">Tools</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-6 p-4">
            {/* Templates Access */}
            <div className="space-y-3 pb-4 border-b">
              <Label className="font-semibold">Templates</Label>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => setShowTemplates(true)}
              >
                <Gift className="h-4 w-4 mr-2" />
                Choose Template
              </Button>
            </div>

            {/* AI Generation */}
            <div className="space-y-3 pb-4 border-b">
              <Label className="font-semibold">AI Generation</Label>
              <Select value={tone} onValueChange={(value: any) => setTone(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="promotional">Promotional</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                className="w-full" 
                onClick={handleGenerateContent}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Generate Content
              </Button>
            </div>

            {/* Component Library */}
            <div className="space-y-3">
              <Label className="font-semibold">Add Components</Label>
              <div className="space-y-2">
                {componentTypes.map((componentType) => (
                  <Button
                    key={componentType.type}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => addComponent(componentType.type)}
                    disabled={!selectedTemplate}
                  >
                    {componentType.icon}
                    <span className="ml-2">{componentType.name}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Template Saving */}
            <div className="space-y-3 pt-4 border-t">
              <Label className="font-semibold">Save Template</Label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Template name"
              />
              <Button 
                className="w-full" 
                onClick={saveTemplate}
                disabled={!templateName.trim() || !selectedTemplate}
                variant="secondary"
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Central Workspace */}
      <div className="flex-1 min-h-screen">
        {selectedTemplate ? (
          /* Email Builder Workspace */
          <div className="p-6 max-w-4xl mx-auto">
            {/* Email Builder Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Email Builder</h2>
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
                    a.download = `email-kavak-${selectedTemplate}.html`;
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
                      <div ref={builderRef} className="w-full max-w-[600px] bg-white rounded-lg shadow-sm border">
                        {/* Email Subject */}
                        <div className="p-4 border-b bg-gray-50">
                          <Input
                            value={emailContent.subject}
                            onChange={(e) => setEmailContent(prev => ({ ...prev, subject: e.target.value }))}
                            placeholder="Email subject"
                            className="font-semibold bg-white"
                          />
                        </div>

                        {/* Dynamic Components with Drag & Drop */}
                        <div>
                          {emailComponents.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                              <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                              <p>Add components to start building your email</p>
                              <p className="text-sm mt-2">🚀 Drag and drop to reorder</p>
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
                                <div className="space-y-1">
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

                        {/* Email Footer */}
                        <div className="p-4 bg-gray-100 text-center border-t">
                          <p className="text-xs text-gray-600">KAVAK - Tu experiencia automotriz</p>
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
        ) : (
          /* Template Selection Placeholder */
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Mail className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Choose a Template</h3>
              <p className="text-gray-500 mb-4">Select a template from the Tools panel to start building your email</p>
              <Button onClick={() => setShowTemplates(true)} variant="outline">
                <Gift className="h-4 w-4 mr-2" />
                Browse Templates
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Fixed Properties Panel - Right Side */}
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

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 xl:p-8 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Choose Email Template</h3>
              <Button
                variant="outline"
                onClick={() => setShowTemplates(false)}
              >
                Close
              </Button>
            </div>
            
            <div className="text-center mb-8">
              <p className="text-gray-600">Select a professionally designed template to get started</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {emailTemplates.map((template) => (
                <Card 
                  key={template.id} 
                  className={`cursor-pointer transition-all duration-200 ${
                    selectedTemplate === template.id ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'
                  }`}
                  onClick={() => selectTemplate(template.id)}
                >
                  <CardContent className="p-4">
                    <div className="aspect-[4/3] bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg mb-4 flex items-center justify-center">
                      <div 
                        className="w-16 h-16 rounded-full flex items-center justify-center text-white"
                        style={{ backgroundColor: template.color }}
                      >
                        {template.icon}
                      </div>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">{template.name}</h3>
                    <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {template.tags.map((tag) => (
                        <span 
                          key={tag} 
                          className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}