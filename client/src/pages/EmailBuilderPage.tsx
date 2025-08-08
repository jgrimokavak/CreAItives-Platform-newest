import { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Type, Image, MousePointer, Space, Trash2, GripVertical, Eye, Download } from 'lucide-react';
import { getPropertiesForComponent, getGroupedProperties, getGroupsForComponent } from '@/lib/propertyRegistry';
import { PropertyControl } from '@/components/PropertyControls';
import { PropertyGroup } from '@/components/PropertyGroup';

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

export default function EmailBuilderPage() {
  const [emailComponents, setEmailComponents] = useState<EmailComponent[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [mjmlPreviewHtml, setMjmlPreviewHtml] = useState('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const builderRef = useRef<HTMLDivElement>(null);

  // Debounced MJML compilation
  useEffect(() => {
    const timer = setTimeout(() => {
      compileToMjml();
    }, 300);

    return () => clearTimeout(timer);
  }, [emailComponents, emailSubject]);

  const compileToMjml = async () => {
    if (emailComponents.length === 0) {
      setMjmlPreviewHtml('');
      return;
    }

    setIsPreviewLoading(true);
    try {
      const response = await fetch('/api/email/compile-mjml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: emailSubject,
          components: emailComponents
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMjmlPreviewHtml(data.html);
      }
    } catch (error) {
      console.error('Error compiling MJML:', error);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const addComponent = useCallback((type: 'text' | 'image' | 'button' | 'spacer') => {
    const id = `${type}-${Date.now()}`;
    const properties = getPropertiesForComponent(type);
    
    // Get default values from property registry
    const styles: any = {};
    const content: any = {};
    
    properties.forEach(prop => {
      if (prop.group === 'content' || prop.group === 'action') {
        content[prop.key] = prop.defaultValue;
      } else {
        styles[prop.key] = prop.defaultValue;
      }
    });

    const newComponent: EmailComponent = {
      id,
      type,
      content,
      styles
    };

    setEmailComponents(prev => [...prev, newComponent]);
    setSelectedComponent(id);
  }, []);

  const updateComponent = useCallback((id: string, field: 'content' | 'styles', updates: Record<string, any>) => {
    setEmailComponents(prev => prev.map(comp => 
      comp.id === id 
        ? { ...comp, [field]: { ...comp[field], ...updates } }
        : comp
    ));
  }, []);

  const removeComponent = useCallback((id: string) => {
    setEmailComponents(prev => prev.filter(c => c.id !== id));
    if (selectedComponent === id) {
      setSelectedComponent(null);
    }
  }, [selectedComponent]);



  const EmailComponentItem = ({ component }: { component: EmailComponent }) => {
    return (
      <div
        className={`group relative border rounded-lg p-4 mb-2 cursor-pointer transition-all ${
          selectedComponent === component.id
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-200 hover:border-gray-300'
        }`}
        onClick={() => setSelectedComponent(component.id)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium capitalize">{component.type}</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              removeComponent(component.id);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-2">
          {renderEmailComponent(component)}
        </div>
      </div>
    );
  };

  const renderEmailComponent = (component: EmailComponent) => {
    switch (component.type) {
      case 'text':
        return (
          <div
            style={{
              fontFamily: component.styles?.fontFamily || 'Arial, sans-serif',
              fontSize: component.styles?.fontSize || '16px',
              fontWeight: component.styles?.fontWeight || 'normal',
              fontStyle: component.styles?.fontStyle || 'normal',
              lineHeight: component.styles?.lineHeight || '1.6',
              letterSpacing: component.styles?.letterSpacing || 'normal',
              textTransform: component.styles?.textTransform || 'none',
              textDecoration: component.styles?.textDecoration || 'none',
              color: component.styles?.color || '#000000',
              backgroundColor: component.styles?.backgroundColor || 'transparent',
              textAlign: component.styles?.textAlign || 'left',
              verticalAlign: component.styles?.verticalAlign || 'top',
              padding: component.styles?.padding || '10px 25px',
              paddingTop: component.styles?.paddingTop,
              paddingBottom: component.styles?.paddingBottom,
              paddingLeft: component.styles?.paddingLeft,
              paddingRight: component.styles?.paddingRight,
              border: component.styles?.border,
              borderTop: component.styles?.borderTop,
              borderBottom: component.styles?.borderBottom,
              borderLeft: component.styles?.borderLeft,
              borderRight: component.styles?.borderRight,
              borderRadius: component.styles?.borderRadius,
              width: component.styles?.width,
              height: component.styles?.height,
            }}
          >
            {component.content?.text || 'Enter your text here...'}
          </div>
        );
      case 'image':
        return (
          <div
            style={{
              textAlign: component.styles?.align || 'center',
              padding: component.styles?.padding || '10px 25px',
              paddingTop: component.styles?.paddingTop,
              paddingBottom: component.styles?.paddingBottom,
              paddingLeft: component.styles?.paddingLeft,
              paddingRight: component.styles?.paddingRight,
              backgroundColor: component.styles?.containerBackgroundColor || 'transparent',
            }}
          >
            {component.content?.src ? (
              <img
                src={component.content.src}
                alt={component.content?.alt || ''}
                title={component.content?.title || ''}
                style={{
                  width: component.styles?.width || '600px',
                  height: component.styles?.height || 'auto',
                  border: component.styles?.border || '',
                  borderTop: component.styles?.borderTop,
                  borderBottom: component.styles?.borderBottom,
                  borderLeft: component.styles?.borderLeft,
                  borderRight: component.styles?.borderRight,
                  borderRadius: component.styles?.borderRadius || '',
                  maxWidth: component.styles?.fluidOnMobile === 'true' ? '100%' : undefined,
                }}
              />
            ) : (
              <div
                style={{
                  width: component.styles?.width || '600px',
                  height: component.styles?.height || '200px',
                  backgroundColor: '#f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: component.styles?.border || '2px dashed #ccc',
                  borderTop: component.styles?.borderTop,
                  borderBottom: component.styles?.borderBottom,
                  borderLeft: component.styles?.borderLeft,
                  borderRight: component.styles?.borderRight,
                  borderRadius: component.styles?.borderRadius || '',
                  maxWidth: component.styles?.fluidOnMobile === 'true' ? '100%' : undefined,
                }}
              >
                <span style={{ color: '#666' }}>No image selected</span>
              </div>
            )}
          </div>
        );
      case 'button':
        return (
          <div
            style={{
              textAlign: component.styles?.align || 'center',
              padding: component.styles?.padding || '10px 25px',
              paddingTop: component.styles?.paddingTop,
              paddingBottom: component.styles?.paddingBottom,
              paddingLeft: component.styles?.paddingLeft,
              paddingRight: component.styles?.paddingRight,
              backgroundColor: component.styles?.containerBackgroundColor || 'transparent',
            }}
          >
            <button
              style={{
                fontFamily: component.styles?.fontFamily || 'Arial, sans-serif',
                fontSize: component.styles?.fontSize || '16px',
                fontWeight: component.styles?.fontWeight || 'normal',
                fontStyle: component.styles?.fontStyle || 'normal',
                lineHeight: component.styles?.lineHeight || '1.6',
                letterSpacing: component.styles?.letterSpacing || 'normal',
                textTransform: component.styles?.textTransform || 'none',
                textDecoration: component.styles?.textDecoration || 'none',
                color: component.styles?.color || '#ffffff',
                backgroundColor: component.styles?.backgroundColor || '#1553ec',
                border: component.styles?.border || 'none',
                borderTop: component.styles?.borderTop,
                borderBottom: component.styles?.borderBottom,
                borderLeft: component.styles?.borderLeft,
                borderRight: component.styles?.borderRight,
                borderRadius: component.styles?.borderRadius || '6px',
                padding: component.styles?.innerPadding || '12px 24px',
                cursor: 'pointer',
                display: 'inline-block',
                width: component.styles?.width || 'auto',
                height: component.styles?.height || 'auto',
                textAlign: component.styles?.textAlign || 'center',
                verticalAlign: component.styles?.verticalAlign || 'middle',
              }}
            >
              {component.content?.text || 'Button Text'}
            </button>
          </div>
        );
      case 'spacer':
        return (
          <div
            style={{
              height: component.styles?.height || '20px',
              backgroundColor: component.styles?.containerBackgroundColor || 'transparent',
              padding: component.styles?.padding || '',
              paddingTop: component.styles?.paddingTop,
              paddingBottom: component.styles?.paddingBottom,
              paddingLeft: component.styles?.paddingLeft,
              paddingRight: component.styles?.paddingRight,
              border: component.styles?.border,
              borderTop: component.styles?.borderTop,
              borderBottom: component.styles?.borderBottom,
              borderLeft: component.styles?.borderLeft,
              borderRight: component.styles?.borderRight,
              borderRadius: component.styles?.borderRadius,
              width: component.styles?.width || '100%',
            }}
          />
        );
      default:
        return null;
    }
  };

  const renderComponentProperties = (component: EmailComponent) => {
    if (!component) return null;

    const groupedProperties = getGroupedProperties(component.type);
    const groups = getGroupsForComponent(component.type);

    const updateProperty = (propertyKey: string, value: any) => {
      const properties = getPropertiesForComponent(component.type);
      const property = properties.find(p => p.key === propertyKey);
      
      if (!property) return;
      
      if (property.group === 'content' || property.group === 'action') {
        updateComponent(component.id, 'content', { [propertyKey]: value });
      } else {
        updateComponent(component.id, 'styles', { [propertyKey]: value });
      }
    };

    const getPropertyValue = (propertyKey: string) => {
      const properties = getPropertiesForComponent(component.type);
      const property = properties.find(p => p.key === propertyKey);
      
      if (!property) return '';
      
      if (property.group === 'content' || property.group === 'action') {
        return component.content?.[propertyKey] ?? property.defaultValue;
      } else {
        return component.styles?.[propertyKey] ?? property.defaultValue;
      }
    };

    return (
      <div className="space-y-4">
        {groups.map(group => {
          const groupProperties = groupedProperties[group.key] || [];
          if (groupProperties.length === 0) return null;

          return (
            <PropertyGroup key={group.key} title={group.label} defaultOpen={false}>
              <div className="space-y-4">
                {groupProperties.map(property => (
                  <PropertyControl
                    key={property.key}
                    property={property}
                    value={getPropertyValue(property.key)}
                    onChange={(value) => updateProperty(property.key, value)}
                  />
                ))}
              </div>
            </PropertyGroup>
          );
        })}
      </div>
    );
  };

  const handlePreviewEmail = () => {
    if (mjmlPreviewHtml) {
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(mjmlPreviewHtml);
        newWindow.document.close();
      }
    }
  };

  const handleDownloadHtml = async () => {
    if (mjmlPreviewHtml) {
      const blob = new Blob([mjmlPreviewHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `email-${emailSubject || 'template'}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const selectedComponentData = selectedComponent 
    ? emailComponents.find(c => c.id === selectedComponent)
    : null;

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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Email Builder</h1>
            <div className="flex gap-2">
              <Button
                onClick={handlePreviewEmail}
                variant="outline"
                disabled={!mjmlPreviewHtml}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button
                onClick={handleDownloadHtml}
                disabled={!mjmlPreviewHtml}
              >
                <Download className="h-4 w-4 mr-2" />
                Download HTML
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex min-h-0">
          {/* Builder Area */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-2xl mx-auto">
              <Card>
                <CardHeader>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Email Subject"
                    className="text-xl font-semibold border-none outline-none bg-transparent placeholder-gray-400"
                  />
                </CardHeader>
                <Separator />
                <CardContent className="p-0">
                  <div ref={builderRef} className="min-h-[400px] p-6">
                    {emailComponents.length === 0 ? (
                      <div className="text-center text-gray-500 py-20">
                        <p className="text-lg">Start building your email</p>
                        <p className="text-sm">Add components from the panel on the left</p>
                      </div>
                    ) : (
                      <>
                        {emailComponents.map(component => (
                          <EmailComponentItem
                            key={component.id}
                            component={component}
                          />
                        ))}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Properties Panel - Right Side */}
          <div className="w-80 bg-white border-l border-gray-200 flex-shrink-0 h-full sticky top-0">
            <Tabs defaultValue="properties" className="h-full flex flex-col">
              <div className="flex-shrink-0 border-b">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="properties">Properties</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
              </div>
              
              <div className="flex-1 min-h-0">
                <TabsContent value="properties" className="h-full mt-0">
                  <ScrollArea className="h-full">
                    <div className="p-4">
                      {selectedComponentData ? (
                        <div>
                          <h3 className="text-lg font-semibold mb-4 capitalize">
                            {selectedComponentData.type} Properties
                          </h3>
                          {renderComponentProperties(selectedComponentData)}
                        </div>
                      ) : (
                        <div className="text-center text-gray-500 py-10">
                          <p>Select a component to edit its properties</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="preview" className="h-full mt-0">
                  <div className="h-full flex flex-col">
                    {isPreviewLoading ? (
                      <div className="flex-1 flex items-center justify-center">
                        <p className="text-gray-500">Generating preview...</p>
                      </div>
                    ) : mjmlPreviewHtml ? (
                      <iframe
                        srcDoc={mjmlPreviewHtml}
                        className="flex-1 w-full border-0"
                        title="Email Preview"
                      />
                    ) : (
                      <div className="flex-1 flex items-center justify-center">
                        <p className="text-gray-500">Add components to see preview</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}