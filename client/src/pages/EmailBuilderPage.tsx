import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Download, Eye, Sparkles, FileText, Gift, Newspaper, Loader2, Plus, Trash2, Image } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// Email template definitions for KAVAK
const emailTemplates = [
  {
    id: 'welcome',
    name: 'Email de Bienvenida',
    description: 'Mensaje de bienvenida para nuevos usuarios de KAVAK',
    icon: <Mail className="h-6 w-6" />,
    color: '#1553ec',
    content: {
      subject: '¡Bienvenido a KAVAK! Tu experiencia automotriz comienza aquí',
      header: 'Bienvenido a la familia KAVAK',
      body: 'Gracias por unirte a nosotros. Estamos emocionados de acompañarte en tu próxima aventura automotriz.',
      cta: 'Explorar Vehículos'
    }
  },
  {
    id: 'offer',
    name: 'Oferta por tu Auto',
    description: 'Email promocional con una oferta especial por el vehículo del cliente',
    icon: <Gift className="h-6 w-6" />,
    color: '#001dd1',
    content: {
      subject: '¡Tenemos una oferta especial por tu auto!',
      header: 'Oferta exclusiva para ti',
      body: 'Hemos evaluado tu vehículo y tenemos una propuesta que te va a encantar. No dejes pasar esta oportunidad.',
      cta: 'Ver Mi Oferta'
    }
  },
  {
    id: 'newsletter',
    name: 'Newsletter',
    description: 'Boletín informativo con las últimas novedades de KAVAK',
    icon: <Newspaper className="h-6 w-6" />,
    color: '#1553ec',
    content: {
      subject: 'KAVAK Newsletter - Las mejores ofertas y novedades',
      header: 'Novedades KAVAK',
      body: 'Descubre las últimas ofertas, nuevos modelos y noticias del mundo automotriz.',
      cta: 'Leer Más'
    }
  }
];

interface EmailComponent {
  id: string;
  type: 'text' | 'image' | 'button' | 'spacer';
  content: any;
  styles: Record<string, any>;
}

const componentTypes = [
  { type: 'text', name: 'Texto', icon: <FileText className="h-4 w-4" />, description: 'Párrafo de texto' },
  { type: 'image', name: 'Imagen', icon: <Image className="h-4 w-4" />, description: 'Imagen o logo' },
  { type: 'button', name: 'Botón', icon: <Mail className="h-4 w-4" />, description: 'Botón de acción' },
  { type: 'spacer', name: 'Espaciador', icon: <Plus className="h-4 w-4" />, description: 'Espacio en blanco' }
];

export default function EmailBuilderPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [emailComponents, setEmailComponents] = useState<EmailComponent[]>([]);
  const [emailContent, setEmailContent] = useState({
    subject: '',
    header: '',
    body: '',
    cta: ''
  });
  const [activeTab, setActiveTab] = useState('templates');
  const [isGenerating, setIsGenerating] = useState(false);
  const [tone, setTone] = useState<'professional' | 'friendly' | 'urgent' | 'promotional'>('friendly');
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const { toast } = useToast();

  const handleTemplateSelect = (templateId: string) => {
    const template = emailTemplates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setEmailContent(template.content);
      
      // Initialize with template components
      setEmailComponents([
        {
          id: 'header-1',
          type: 'text',
          content: { text: template.content.header },
          styles: { 
            padding: '20px', 
            backgroundColor: template.color, 
            color: '#ffffff', 
            fontSize: '24px', 
            fontWeight: 'bold', 
            textAlign: 'center' 
          }
        },
        {
          id: 'body-1',
          type: 'text',
          content: { text: template.content.body },
          styles: { padding: '20px', fontSize: '16px', lineHeight: '1.6' }
        },
        {
          id: 'cta-1',
          type: 'button',
          content: { text: template.content.cta, href: '#' },
          styles: { 
            backgroundColor: template.color, 
            color: '#ffffff', 
            padding: '15px 30px', 
            borderRadius: '8px', 
            textAlign: 'center', 
            margin: '20px auto',
            display: 'inline-block',
            textDecoration: 'none'
          }
        }
      ]);
      
      setActiveTab('builder');
    }
  };

  const addComponent = (componentType: string) => {
    const template = emailTemplates.find(t => t.id === selectedTemplate);
    const templateColor = template?.color || '#1553ec';
    
    const newComponent: EmailComponent = {
      id: `${componentType}-${Date.now()}`,
      type: componentType as any,
      content: getDefaultContent(componentType),
      styles: getDefaultStyles(componentType, templateColor)
    };
    setEmailComponents([...emailComponents, newComponent]);
  };

  const updateComponent = (id: string, updates: Partial<EmailComponent>) => {
    setEmailComponents(prev => 
      prev.map(comp => comp.id === id ? { ...comp, ...updates } : comp)
    );
  };

  const removeComponent = (id: string) => {
    setEmailComponents(prev => prev.filter(comp => comp.id !== id));
    if (selectedComponent === id) {
      setSelectedComponent(null);
    }
  };

  const getDefaultContent = (type: string) => {
    switch (type) {
      case 'text':
        return { text: 'Nuevo párrafo de texto. Haz clic para editar.' };
      case 'image':
        return { src: '', alt: 'Imagen', width: '100%' };
      case 'button':
        return { text: 'Hacer Clic Aquí', href: '#' };
      case 'spacer':
        return { height: '20px' };
      default:
        return {};
    }
  };

  const getDefaultStyles = (type: string, templateColor: string) => {
    switch (type) {
      case 'text':
        return { padding: '15px 20px', fontSize: '16px', lineHeight: '1.6' };
      case 'image':
        return { textAlign: 'center', padding: '10px', maxWidth: '100%' };
      case 'button':
        return { 
          backgroundColor: templateColor, 
          color: '#ffffff', 
          padding: '12px 24px', 
          borderRadius: '6px', 
          textAlign: 'center', 
          margin: '10px auto',
          display: 'inline-block',
          textDecoration: 'none'
        };
      case 'spacer':
        return { height: '20px', backgroundColor: 'transparent' };
      default:
        return {};
    }
  };

  const handleGenerateContent = async () => {
    if (!selectedTemplate) {
      toast({
        title: "Selecciona una plantilla",
        description: "Por favor selecciona una plantilla antes de generar contenido.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/email/generate-content', {
        method: 'POST',
        body: JSON.stringify({
          templateType: selectedTemplate,
          brand: 'KAVAK',
          tone: tone
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setEmailContent({
          subject: data.content.subject || '',
          header: data.content.header || '',
          body: data.content.body || '',
          cta: data.content.cta || ''
        });
        
        // Update components with AI-generated content
        setEmailComponents(prev => prev.map(comp => {
          if (comp.id === 'header-1') {
            return { ...comp, content: { ...comp.content, text: data.content.header } };
          }
          if (comp.id === 'body-1') {
            return { ...comp, content: { ...comp.content, text: data.content.body } };
          }
          if (comp.id === 'cta-1') {
            return { ...comp, content: { ...comp.content, text: data.content.cta } };
          }
          return comp;
        }));
        
        toast({
          title: "¡Contenido generado!",
          description: "El contenido del email ha sido generado con IA.",
        });
      } else {
        throw new Error(data.error || 'Error al generar contenido');
      }
    } catch (error) {
      console.error('Error generating content:', error);
      toast({
        title: "Error al generar",
        description: "Hubo un problema generando el contenido. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const renderEmailComponent = (component: EmailComponent) => {
    switch (component.type) {
      case 'text':
        return <div style={component.styles}>{component.content.text}</div>;
      case 'image':
        return component.content.src ? (
          <img 
            src={component.content.src} 
            alt={component.content.alt} 
            style={{ ...component.styles, maxWidth: '100%' }}
          />
        ) : (
          <div style={{ ...component.styles, border: '2px dashed #ccc', minHeight: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="text-gray-500">Click para agregar imagen</span>
          </div>
        );
      case 'button':
        return (
          <div style={{ textAlign: 'center', padding: '10px' }}>
            <a href={component.content.href} style={component.styles}>
              {component.content.text}
            </a>
          </div>
        );
      case 'spacer':
        return <div style={component.styles}></div>;
      default:
        return null;
    }
  };

  const renderComponentProperties = (component: EmailComponent) => {
    const updateContent = (updates: any) => {
      updateComponent(component.id, { content: { ...component.content, ...updates } });
    };

    const updateStyles = (updates: any) => {
      updateComponent(component.id, { styles: { ...component.styles, ...updates } });
    };

    switch (component.type) {
      case 'text':
        return (
          <div className="space-y-3">
            <div>
              <Label>Texto</Label>
              <Textarea
                value={component.content.text}
                onChange={(e) => updateContent({ text: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label>Tamaño de Fuente</Label>
              <Input
                value={component.styles.fontSize || '16px'}
                onChange={(e) => updateStyles({ fontSize: e.target.value })}
              />
            </div>
            <div>
              <Label>Color de Texto</Label>
              <Input
                type="color"
                value={component.styles.color || '#000000'}
                onChange={(e) => updateStyles({ color: e.target.value })}
              />
            </div>
          </div>
        );
      case 'button':
        return (
          <div className="space-y-3">
            <div>
              <Label>Texto del Botón</Label>
              <Input
                value={component.content.text}
                onChange={(e) => updateContent({ text: e.target.value })}
              />
            </div>
            <div>
              <Label>Enlace</Label>
              <Input
                value={component.content.href}
                onChange={(e) => updateContent({ href: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>Color de Fondo</Label>
              <Input
                type="color"
                value={component.styles.backgroundColor || '#1553ec'}
                onChange={(e) => updateStyles({ backgroundColor: e.target.value })}
              />
            </div>
          </div>
        );
      case 'image':
        return (
          <div className="space-y-3">
            <div>
              <Label>URL de la Imagen</Label>
              <Input
                value={component.content.src}
                onChange={(e) => updateContent({ src: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>Texto Alternativo</Label>
              <Input
                value={component.content.alt}
                onChange={(e) => updateContent({ alt: e.target.value })}
              />
            </div>
          </div>
        );
      case 'spacer':
        return (
          <div>
            <Label>Altura</Label>
            <Input
              value={component.styles.height || '20px'}
              onChange={(e) => updateStyles({ height: e.target.value })}
            />
          </div>
        );
      default:
        return null;
    }
  };

  const generateEmailHTML = () => {
    const template = emailTemplates.find(t => t.id === selectedTemplate);
    const primaryColor = template?.color || '#1553ec';
    
    const componentsHTML = emailComponents.map(component => {
      const styleString = Object.entries(component.styles)
        .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
        .join('; ');

      switch (component.type) {
        case 'text':
          return `<div style="${styleString}">${component.content.text}</div>`;
        case 'image':
          return component.content.src 
            ? `<div style="text-align: center; padding: 10px;"><img src="${component.content.src}" alt="${component.content.alt}" style="${styleString}" /></div>`
            : '';
        case 'button':
          return `<div style="text-align: center; padding: 10px;"><a href="${component.content.href}" style="${styleString}">${component.content.text}</a></div>`;
        case 'spacer':
          return `<div style="${styleString}"></div>`;
        default:
          return '';
      }
    }).join('');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${emailContent.subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Roboto', 'Helvetica', Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        ${componentsHTML}
        <div style="padding: 30px 20px; text-align: center; color: #666666; font-size: 14px; background-color: #f8f9fa; border-top: 1px solid #e9ecef;">
            <p style="margin: 5px 0;"><strong>KAVAK</strong> - Tu experiencia automotriz</p>
            <p style="margin: 5px 0;">© ${new Date().getFullYear()} KAVAK. Todos los derechos reservados.</p>
            <p style="font-size: 12px; color: #999; margin: 5px 0;">
                Este email fue generado con Email CreAItor
            </p>
        </div>
    </div>
</body>
</html>`;
  };

  const handlePreviewEmail = async () => {
    try {
      const response = await fetch('/api/email/generate-html', {
        method: 'POST',
        body: JSON.stringify({
          subject: emailContent.subject,
          header: emailContent.header,
          body: emailContent.body,
          cta: emailContent.cta,
          templateType: selectedTemplate
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(data.html);
          newWindow.document.close();
        }
        
        toast({
          title: "Vista previa generada",
          description: "Se ha abierto la vista previa del email en una nueva ventana.",
        });
      } else {
        throw new Error(data.error || 'Error al generar vista previa');
      }
    } catch (error) {
      console.error('Error generating preview:', error);
      toast({
        title: "Error en vista previa",
        description: "No se pudo generar la vista previa del email.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Email CreAItor</h1>
          <p className="text-gray-600">Crea emails profesionales para KAVAK con inteligencia artificial</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="templates">1. Plantillas</TabsTrigger>
            <TabsTrigger value="builder" disabled={!selectedTemplate}>2. Constructor</TabsTrigger>
            <TabsTrigger value="preview" disabled={!selectedTemplate}>3. Vista Previa</TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates" className="mt-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Selecciona una Plantilla</h2>
              <p className="text-gray-600">Comienza eligiendo una plantilla para tu email de KAVAK</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {emailTemplates.map((template) => (
                <Card 
                  key={template.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-lg border-2",
                    selectedTemplate === template.id 
                      ? "border-blue-500 bg-blue-50" 
                      : "border-gray-200 hover:border-gray-300"
                  )}
                  onClick={() => handleTemplateSelect(template.id)}
                >
                  <CardHeader className="text-center pb-4">
                    <div 
                      className="w-16 h-16 rounded-full mx-auto flex items-center justify-center text-white mb-4"
                      style={{ backgroundColor: template.color }}
                    >
                      {template.icon}
                    </div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 text-center mb-4">
                      {template.description}
                    </p>
                    {selectedTemplate === template.id && (
                      <div className="text-center">
                        <Button size="sm" onClick={() => setActiveTab('builder')}>
                          Continuar →
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Builder Tab */}
          <TabsContent value="builder" className="mt-6">
            {selectedTemplate && (
              <div className="grid grid-cols-12 gap-6" style={{ height: 'calc(100vh - 300px)' }}>
                {/* Components Sidebar */}
                <div className="col-span-3">
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle className="text-lg">Herramientas</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* AI Generation */}
                      <div className="space-y-3 pb-4 border-b">
                        <Label className="font-semibold">Generación con IA</Label>
                        <Select value={tone} onValueChange={(value: any) => setTone(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="friendly">Amigable</SelectItem>
                            <SelectItem value="professional">Profesional</SelectItem>
                            <SelectItem value="urgent">Urgente</SelectItem>
                            <SelectItem value="promotional">Promocional</SelectItem>
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
                          Generar Contenido
                        </Button>
                      </div>

                      {/* Component Library */}
                      <div className="space-y-3">
                        <Label className="font-semibold">Agregar Componentes</Label>
                        <div className="space-y-2">
                          {componentTypes.map((componentType) => (
                            <Button
                              key={componentType.type}
                              variant="outline"
                              className="w-full justify-start"
                              onClick={() => addComponent(componentType.type)}
                            >
                              {componentType.icon}
                              <span className="ml-2">{componentType.name}</span>
                            </Button>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Email Builder Canvas */}
                <div className="col-span-6">
                  <Card className="h-full">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Constructor de Email</CardTitle>
                        <Button 
                          onClick={() => setActiveTab('preview')}
                          size="sm"
                        >
                          Vista Previa →
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="h-full overflow-y-auto bg-gray-100 p-4">
                        <div className="max-w-lg mx-auto bg-white rounded-lg shadow-sm border">
                          {/* Email Subject */}
                          <div className="p-4 border-b bg-gray-50">
                            <Input
                              value={emailContent.subject}
                              onChange={(e) => setEmailContent(prev => ({ ...prev, subject: e.target.value }))}
                              placeholder="Asunto del email"
                              className="font-semibold bg-white"
                            />
                          </div>

                          {/* Dynamic Components */}
                          <div>
                            {emailComponents.map((component) => (
                              <div
                                key={component.id}
                                className={cn(
                                  "relative group border-2 border-transparent hover:border-blue-300 cursor-pointer",
                                  selectedComponent === component.id && "border-blue-500 bg-blue-50"
                                )}
                                onClick={() => setSelectedComponent(component.id)}
                              >
                                {renderEmailComponent(component)}

                                {/* Component Controls */}
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeComponent(component.id);
                                    }}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Email Footer */}
                          <div className="p-4 bg-gray-100 text-center border-t">
                            <p className="text-xs text-gray-600">KAVAK - Tu experiencia automotriz</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Properties Panel */}
                <div className="col-span-3">
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle className="text-lg">Propiedades</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedComponent ? (
                        <div className="space-y-4">
                          {renderComponentProperties(emailComponents.find(c => c.id === selectedComponent)!)}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">Selecciona un componente para editarlo</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="mt-6">
            {selectedTemplate && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">Vista Previa Final</h3>
                  <div className="flex space-x-3">
                    <Button onClick={handlePreviewEmail} variant="outline">
                      <Eye className="h-4 w-4 mr-2" />
                      Abrir en Nueva Ventana
                    </Button>
                    <Button onClick={() => {
                      const htmlContent = generateEmailHTML();
                      const blob = new Blob([htmlContent], { type: 'text/html' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `email-kavak-${selectedTemplate}.html`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}>
                      <Download className="h-4 w-4 mr-2" />
                      Descargar HTML
                    </Button>
                  </div>
                </div>
                
                <Card>
                  <CardContent className="p-8">
                    <div className="max-w-2xl mx-auto bg-white border rounded-lg overflow-hidden shadow-lg">
                      <div dangerouslySetInnerHTML={{ __html: generateEmailHTML() }} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}