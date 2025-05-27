import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Download, Eye, Sparkles, FileText, Gift, Newspaper, Loader2, Plus, Trash2, Image, Upload, Save, Sliders, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const { toast } = useToast();

  // Fetch images from gallery for image selection
  const { data: galleryImages = [] } = useQuery({
    queryKey: ['/api/gallery'],
    enabled: showImageGallery
  });

  // Helper functions for px handling
  const stripPx = (value: string) => {
    return value?.replace('px', '') || '0';
  };

  const addPx = (value: string) => {
    if (!value) return '0px';
    const num = parseInt(value);
    return isNaN(num) ? '0px' : `${num}px`;
  };

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end for reordering components
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setEmailComponents((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

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
        return { 
          text: 'Nuevo párrafo de texto. Haz clic para editar.',
          fontFamily: 'Arial, sans-serif',
          fontSize: '16px',
          fontWeight: 'normal',
          color: '#000000',
          lineHeight: '1.6',
          textAlign: 'left',
          backgroundColor: 'transparent',
          borderRadius: '0px',
          maxWidth: '100%',
          display: 'block'
        };
      case 'image':
        return { 
          src: '', 
          alt: 'Imagen', 
          width: '100%',
          height: 'auto',
          objectFit: 'cover',
          alignment: 'center',
          borderRadius: '0px',
          link: ''
        };
      case 'button':
        return { 
          text: 'Hacer Clic Aquí', 
          href: '#',
          fontFamily: 'Arial, sans-serif',
          fontSize: '16px',
          fontWeight: 'bold',
          textColor: '#ffffff',
          backgroundColor: '#1553ec',
          borderColor: '#1553ec',
          borderWidth: '0px',
          borderRadius: '6px',
          alignment: 'center',
          display: 'inline-block'
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

  const getDefaultStyles = (type: string, templateColor: string) => {
    switch (type) {
      case 'text':
        return { 
          padding: '15px 20px',
          margin: '0px',
          fontFamily: 'Arial, sans-serif',
          fontSize: '16px',
          fontWeight: 'normal',
          color: '#000000',
          lineHeight: '1.6',
          textAlign: 'left',
          backgroundColor: 'transparent',
          borderRadius: '0px',
          maxWidth: '100%',
          display: 'block'
        };
      case 'image':
        return { 
          padding: '10px',
          margin: '0px',
          textAlign: 'center',
          width: '100%',
          height: 'auto',
          objectFit: 'cover',
          borderRadius: '0px',
          display: 'block'
        };
      case 'button':
        return { 
          padding: '12px 24px',
          margin: '10px auto',
          fontFamily: 'Arial, sans-serif',
          fontSize: '16px',
          fontWeight: 'bold',
          color: '#ffffff',
          backgroundColor: templateColor,
          borderColor: templateColor,
          borderWidth: '0px',
          borderRadius: '6px',
          textAlign: 'center',
          display: 'inline-block',
          textDecoration: 'none'
        };
      case 'spacer':
        return { 
          height: '20px', 
          backgroundColor: 'transparent',
          margin: '0px'
        };
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

  const saveTemplate = async () => {
    if (!templateName.trim()) {
      toast({
        title: "Nombre requerido",
        description: "Por favor ingresa un nombre para la plantilla.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/email/save-template', {
        method: 'POST',
        body: JSON.stringify({
          name: templateName,
          subject: emailContent.subject,
          content: JSON.stringify({
            components: emailComponents,
            emailContent: emailContent
          }),
          isTemplate: true
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "¡Plantilla guardada!",
          description: `La plantilla "${templateName}" se ha guardado correctamente.`,
        });
        setTemplateName('');
      } else {
        throw new Error(data.error || 'Error al guardar plantilla');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Error al guardar",
        description: "No se pudo guardar la plantilla. Inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  };

  const selectImageFromGallery = (imageUrl: string) => {
    if (selectedComponent) {
      const component = emailComponents.find(c => c.id === selectedComponent);
      if (component && component.type === 'image') {
        updateComponent(selectedComponent, {
          content: { ...component.content, src: imageUrl }
        });
        setShowImageGallery(false);
        toast({
          title: "Imagen agregada",
          description: "La imagen se ha agregado al componente.",
        });
      }
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
        className={cn(
          "relative group border-2 border-transparent hover:border-blue-200 rounded-lg transition-all",
          selectedComponent === component.id && "border-blue-500 bg-blue-50/30"
        )}
        onClick={() => setSelectedComponent(component.id)}
      >
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="absolute left-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10 bg-white rounded p-1 shadow-sm border"
        >
          <GripVertical className="h-4 w-4 text-gray-500" />
        </div>

        {/* Delete button */}
        <Button
          variant="destructive"
          size="sm"
          className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 h-6 w-6 p-0"
          onClick={(e) => {
            e.stopPropagation();
            removeComponent(component.id);
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>

        {/* Component content */}
        <div className="overflow-hidden" style={{ margin: 0, padding: 0 }}>
          {renderEmailComponent(component)}
        </div>
      </div>
    );
  };

  // Helper function to clean and apply styles, ensuring zero values are respected
  const cleanStyles = (styles: Record<string, any>) => {
    const cleaned: Record<string, any> = {};
    Object.entries(styles).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        cleaned[key] = value;
      }
    });
    return cleaned;
  };

  const renderEmailComponent = (component: EmailComponent) => {
    const componentStyles = cleanStyles(component.styles);
    
    switch (component.type) {
      case 'text':
        return (
          <div 
            style={{
              ...componentStyles,
              margin: 0, // Reset default margin
              padding: 0, // Reset default padding
              // Apply component-specific spacing
              paddingTop: componentStyles.paddingTop || '0px',
              paddingRight: componentStyles.paddingRight || '0px',
              paddingBottom: componentStyles.paddingBottom || '0px',
              paddingLeft: componentStyles.paddingLeft || '0px',
              marginTop: componentStyles.marginTop || '0px',
              marginRight: componentStyles.marginRight || '0px',
              marginBottom: componentStyles.marginBottom || '0px',
              marginLeft: componentStyles.marginLeft || '0px',
            }}
          >
            {component.content.text}
          </div>
        );
      case 'image':
        return component.content.src ? (
          <img 
            src={component.content.src} 
            alt={component.content.alt} 
            style={{ 
              ...componentStyles, 
              maxWidth: '100%',
              margin: 0,
              padding: 0,
              paddingTop: componentStyles.paddingTop || '0px',
              paddingRight: componentStyles.paddingRight || '0px',
              paddingBottom: componentStyles.paddingBottom || '0px',
              paddingLeft: componentStyles.paddingLeft || '0px',
              marginTop: componentStyles.marginTop || '0px',
              marginRight: componentStyles.marginRight || '0px',
              marginBottom: componentStyles.marginBottom || '0px',
              marginLeft: componentStyles.marginLeft || '0px',
            }}
          />
        ) : (
          <div style={{ 
            ...componentStyles, 
            border: '2px dashed #ccc', 
            minHeight: '100px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: 0,
            padding: 0,
            paddingTop: componentStyles.paddingTop || '0px',
            paddingRight: componentStyles.paddingRight || '0px',
            paddingBottom: componentStyles.paddingBottom || '0px',
            paddingLeft: componentStyles.paddingLeft || '0px',
            marginTop: componentStyles.marginTop || '0px',
            marginRight: componentStyles.marginRight || '0px',
            marginBottom: componentStyles.marginBottom || '0px',
            marginLeft: componentStyles.marginLeft || '0px',
          }}>
            <span className="text-gray-500">Click para agregar imagen</span>
          </div>
        );
      case 'button':
        return (
          <div style={{ 
            textAlign: componentStyles.textAlign || 'center',
            margin: 0,
            padding: 0,
            paddingTop: componentStyles.paddingTop || '0px',
            paddingRight: componentStyles.paddingRight || '0px',
            paddingBottom: componentStyles.paddingBottom || '0px',
            paddingLeft: componentStyles.paddingLeft || '0px',
            marginTop: componentStyles.marginTop || '0px',
            marginRight: componentStyles.marginRight || '0px',
            marginBottom: componentStyles.marginBottom || '0px',
            marginLeft: componentStyles.marginLeft || '0px',
          }}>
            <a href={component.content.href} style={componentStyles}>
              {component.content.text}
            </a>
          </div>
        );
      case 'spacer':
        return (
          <div style={{
            ...componentStyles,
            margin: 0,
            padding: 0,
            paddingTop: componentStyles.paddingTop || '0px',
            paddingRight: componentStyles.paddingRight || '0px',
            paddingBottom: componentStyles.paddingBottom || '0px',
            paddingLeft: componentStyles.paddingLeft || '0px',
            marginTop: componentStyles.marginTop || '0px',
            marginRight: componentStyles.marginRight || '0px',
            marginBottom: componentStyles.marginBottom || '0px',
            marginLeft: componentStyles.marginLeft || '0px',
          }}></div>
        );
      default:
        return null;
    }
  };

  // Unified property components for consistency
  const renderSpacingControls = (component: EmailComponent, updateStyles: (updates: any) => void, defaultPadding = '15px', defaultMargin = '0px') => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="font-medium text-sm">Espaciado</Label>
        <div className="text-xs text-gray-500">Márgenes y padding</div>
      </div>
      
      <div className="space-y-4">
        {/* Padding Controls */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-semibold text-gray-700">PADDING INTERNO</Label>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => updateStyles({ 
                paddingTop: '0px', 
                paddingRight: '0px', 
                paddingBottom: '0px', 
                paddingLeft: '0px' 
              })}
              className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
            >
              Resetear todo
            </Button>
          </div>
          
          <div className="space-y-3">
            {[
              { key: 'paddingTop', label: 'Superior (T)', dir: 'Top' },
              { key: 'paddingRight', label: 'Derecho (R)', dir: 'Right' },
              { key: 'paddingBottom', label: 'Inferior (B)', dir: 'Bottom' },
              { key: 'paddingLeft', label: 'Izquierdo (L)', dir: 'Left' }
            ].map(({ key, label, dir }) => {
              const currentValue = component.styles[key];
              const displayValue = currentValue !== undefined ? stripPx(currentValue) : stripPx(defaultPadding);
              
              return (
                <div key={key} className="flex items-center space-x-3">
                  <Label className="text-xs text-gray-600 w-20 text-left">{label}</Label>
                  <div className="flex-1">
                    <Slider
                      value={[parseInt(displayValue)]}
                      onValueChange={(value) => updateStyles({ [key]: `${value[0]}px` })}
                      max={100}
                      min={0}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  <div className="w-12 text-right">
                    <span className="text-xs font-mono text-gray-700">{displayValue}px</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Margin Controls */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-semibold text-blue-700">MARGEN EXTERNO</Label>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => updateStyles({ 
                marginTop: '0px', 
                marginRight: '0px', 
                marginBottom: '0px', 
                marginLeft: '0px' 
              })}
              className="h-6 px-2 text-xs text-blue-500 hover:text-blue-700"
            >
              Resetear todo
            </Button>
          </div>
          
          <div className="space-y-3">
            {[
              { key: 'marginTop', label: 'Superior (T)', dir: 'Top' },
              { key: 'marginRight', label: 'Derecho (R)', dir: 'Right' },
              { key: 'marginBottom', label: 'Inferior (B)', dir: 'Bottom' },
              { key: 'marginLeft', label: 'Izquierdo (L)', dir: 'Left' }
            ].map(({ key, label, dir }) => {
              const currentValue = component.styles[key];
              const displayValue = currentValue !== undefined ? stripPx(currentValue) : stripPx(defaultMargin);
              
              return (
                <div key={key} className="flex items-center space-x-3">
                  <Label className="text-xs text-gray-600 w-20 text-left">{label}</Label>
                  <div className="flex-1">
                    <Slider
                      value={[parseInt(displayValue)]}
                      onValueChange={(value) => updateStyles({ [key]: `${value[0]}px` })}
                      max={100}
                      min={0}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  <div className="w-12 text-right">
                    <span className="text-xs font-mono text-gray-700">{displayValue}px</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  const renderTypographyControls = (component: EmailComponent, updateStyles: (updates: any) => void, includeAlign = true) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="font-medium text-sm">Tipografía</Label>
        <div className="text-xs text-gray-500">Formato de texto</div>
      </div>
      
      {/* Font Family */}
      <div className="space-y-2">
        <Label className="text-xs text-gray-600 uppercase tracking-wide">Fuente</Label>
        <Select 
          value={component.styles.fontFamily || 'Helvetica, sans-serif'} 
          onValueChange={(value) => updateStyles({ fontFamily: value })}
        >
          <SelectTrigger className="h-9 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Helvetica, sans-serif">Helvetica</SelectItem>
            <SelectItem value="Roboto, sans-serif">Roboto</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Font Size & Weight */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs text-gray-600 uppercase tracking-wide">Tamaño</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full h-9 justify-between">
                {stripPx(component.styles.fontSize || '16px')}px
                <Sliders className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Tamaño de fuente</Label>
                <Slider
                  value={[parseInt(stripPx(component.styles.fontSize || '16px'))]}
                  onValueChange={(value) => updateStyles({ fontSize: `${value[0]}px` })}
                  max={72}
                  min={8}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>8px</span>
                  <span>{stripPx(component.styles.fontSize || '16px')}px</span>
                  <span>72px</span>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-gray-600 uppercase tracking-wide">Peso</Label>
          <Select 
            value={component.styles.fontWeight || 'normal'} 
            onValueChange={(value) => updateStyles({ fontWeight: value })}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="bold">Bold</SelectItem>
              <SelectItem value="lighter">Lighter</SelectItem>
              <SelectItem value="bolder">Bolder</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Text Style Toggles */}
      <div className="space-y-2">
        <Label className="text-xs text-gray-600 uppercase tracking-wide">Estilos</Label>
        <div className="flex gap-2">
          <Button
            variant={component.styles.fontStyle === 'italic' ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateStyles({ 
              fontStyle: component.styles.fontStyle === 'italic' ? 'normal' : 'italic' 
            })}
            className="h-8 px-3 text-xs font-bold italic"
          >
            I
          </Button>
          <Button
            variant={component.styles.textDecoration?.includes('underline') ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              const currentDecoration = component.styles.textDecoration || '';
              const hasUnderline = currentDecoration.includes('underline');
              let newDecoration = currentDecoration.replace('underline', '').trim();
              if (!hasUnderline) {
                newDecoration = newDecoration ? `${newDecoration} underline` : 'underline';
              }
              updateStyles({ textDecoration: newDecoration || 'none' });
            }}
            className="h-8 px-3 text-xs font-bold underline"
          >
            U
          </Button>
          <Button
            variant={component.styles.textDecoration?.includes('line-through') ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              const currentDecoration = component.styles.textDecoration || '';
              const hasStrikethrough = currentDecoration.includes('line-through');
              let newDecoration = currentDecoration.replace('line-through', '').trim();
              if (!hasStrikethrough) {
                newDecoration = newDecoration ? `${newDecoration} line-through` : 'line-through';
              }
              updateStyles({ textDecoration: newDecoration || 'none' });
            }}
            className="h-8 px-3 text-xs font-bold line-through"
          >
            S
          </Button>
        </div>
      </div>

      {/* Line Height & Alignment */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs text-gray-600 uppercase tracking-wide">Altura línea</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full h-9 justify-between">
                {component.styles.lineHeight || '1.6'}
                <Sliders className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Altura de línea</Label>
                <Slider
                  value={[parseFloat(component.styles.lineHeight || '1.6')]}
                  onValueChange={(value) => updateStyles({ lineHeight: value[0].toString() })}
                  max={3}
                  min={0.8}
                  step={0.1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0.8</span>
                  <span>{component.styles.lineHeight || '1.6'}</span>
                  <span>3.0</span>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        {includeAlign && (
          <div className="space-y-2">
            <Label className="text-xs text-gray-600 uppercase tracking-wide">Alineación</Label>
            <Select 
              value={component.styles.textAlign || 'left'} 
              onValueChange={(value) => updateStyles({ textAlign: value })}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Izquierda</SelectItem>
                <SelectItem value="center">Centro</SelectItem>
                <SelectItem value="right">Derecha</SelectItem>
                <SelectItem value="justify">Justificado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );

  const renderLayoutControls = (component: EmailComponent, updateStyles: (updates: any) => void) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="font-medium text-sm">Dimensiones y Bordes</Label>
        <div className="text-xs text-gray-500">Estructura visual</div>
      </div>
      
      {/* Width Control */}
      <div className="space-y-2">
        <Label className="text-xs text-gray-600 uppercase tracking-wide">Ancho máximo</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full h-9 justify-between">
              {component.styles.maxWidth || '100%'}
              <Sliders className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Ancho máximo</Label>
              <div className="space-y-2">
                <Slider
                  value={[parseInt(stripPx(component.styles.maxWidth || '100%')) || 100]}
                  onValueChange={(value) => updateStyles({ maxWidth: `${value[0]}%` })}
                  max={100}
                  min={10}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>10%</span>
                  <span>{component.styles.maxWidth || '100%'}</span>
                  <span>100%</span>
                </div>
              </div>
              <div className="pt-2 border-t">
                <Input
                  value={component.styles.maxWidth || '100%'}
                  onChange={(e) => updateStyles({ maxWidth: e.target.value })}
                  placeholder="100% o 600px"
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Border Controls */}
      <div className="space-y-3">
        <Label className="text-xs text-gray-600 uppercase tracking-wide">Bordes</Label>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs text-gray-500">Color del borde</Label>
            <div className="flex items-center space-x-2">
              <Input
                type="color"
                value={component.styles.borderColor || '#e5e7eb'}
                onChange={(e) => updateStyles({ borderColor: e.target.value })}
                className="w-12 h-8 p-1"
              />
              <span className="text-xs text-gray-600">Borde</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs text-gray-500">Grosor del borde</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full h-8 justify-between text-xs">
                  {stripPx(component.styles.borderWidth || '0px')}px
                  <Sliders className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56">
                <div className="space-y-2">
                  <Label className="text-sm">Grosor del borde</Label>
                  <Slider
                    value={[parseInt(stripPx(component.styles.borderWidth || '0px'))]}
                    onValueChange={(value) => updateStyles({ 
                      borderWidth: `${value[0]}px`,
                      borderStyle: value[0] > 0 ? 'solid' : 'none'
                    })}
                    max={10}
                    min={0}
                    step={1}
                  />
                  <div className="text-center text-xs text-gray-500">
                    {stripPx(component.styles.borderWidth || '0px')}px
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-gray-500">Radio del borde</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full h-9 justify-between">
                {stripPx(component.styles.borderRadius || '0px')}px
                <Sliders className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56">
              <div className="space-y-2">
                <Label className="text-sm">Radio del borde</Label>
                <Slider
                  value={[parseInt(stripPx(component.styles.borderRadius || '0px'))]}
                  onValueChange={(value) => updateStyles({ borderRadius: `${value[0]}px` })}
                  max={50}
                  min={0}
                  step={1}
                />
                <div className="text-center text-xs text-gray-500">
                  {stripPx(component.styles.borderRadius || '0px')}px
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );

  const renderColorControls = (component: EmailComponent, updateStyles: (updates: any) => void) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="font-medium text-sm">Colores</Label>
        <div className="text-xs text-gray-500">Apariencia</div>
      </div>
      
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs text-gray-600 uppercase tracking-wide">Color del texto</Label>
            <div className="flex items-center space-x-2">
              <Input
                type="color"
                value={component.styles.color || '#000000'}
                onChange={(e) => updateStyles({ color: e.target.value })}
                className="w-12 h-8 p-1 rounded border"
              />
              <span className="text-xs text-gray-600">Texto</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs text-gray-600 uppercase tracking-wide">Color de fondo</Label>
            <div className="flex items-center space-x-2">
              <Input
                type="color"
                value={component.styles.backgroundColor || '#ffffff'}
                onChange={(e) => updateStyles({ backgroundColor: e.target.value })}
                className="w-12 h-8 p-1 rounded border"
              />
              <span className="text-xs text-gray-600">Fondo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

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
          <div className="h-full flex flex-col space-y-4">
            {/* Content */}
            <div className="space-y-2">
              <Label className="font-medium text-sm">Contenido</Label>
              <Textarea
                value={component.content.text || ''}
                onChange={(e) => updateContent({ text: e.target.value })}
                rows={3}
                className="resize-none"
                placeholder="Ingresa tu texto aquí..."
              />
            </div>

            {/* Typography */}
            {renderTypographyControls(component, updateStyles, true)}

            {/* Colors */}
            {renderColorControls(component, updateStyles)}

            {/* Spacing */}
            {renderSpacingControls(component, updateStyles, '15px', '0px')}

            {/* Layout */}
            {renderLayoutControls(component, updateStyles)}
          </div>
        );

      case 'image':
        return (
          <div className="h-full flex flex-col space-y-4">
            {/* Image Source */}
            <div className="space-y-3">
              <Label className="font-medium text-sm">Fuente de Imagen</Label>
              <div className="space-y-2">
                <Input
                  value={component.content.src || ''}
                  onChange={(e) => updateContent({ src: e.target.value })}
                  placeholder="https://..."
                  className="h-9"
                />
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowImageGallery(true)}
                    className="h-9 text-xs"
                  >
                    <Image className="h-3 w-3 mr-1" />
                    Galería
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs"
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    Subir
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Generar
                  </Button>
                </div>
              </div>
            </div>

            {/* Alt Text */}
            <div className="space-y-2">
              <Label className="font-medium text-sm">Propiedades</Label>
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Texto alternativo</Label>
                <Input
                  value={component.content.alt || ''}
                  onChange={(e) => updateContent({ alt: e.target.value })}
                  placeholder="Descripción de la imagen"
                  className="h-9"
                />
              </div>
            </div>

            {/* Dimensions */}
            <div className="space-y-3">
              <Label className="font-medium text-sm">Dimensiones</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600">Ancho</Label>
                  <Input
                    value={component.styles.width || '100%'}
                    onChange={(e) => updateStyles({ width: e.target.value })}
                    placeholder="100%"
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600">Alto</Label>
                  <Input
                    value={component.styles.height || 'auto'}
                    onChange={(e) => updateStyles({ height: e.target.value })}
                    placeholder="auto"
                    className="h-9"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600">Ajuste de objeto</Label>
                  <Select 
                    value={component.styles.objectFit || 'cover'} 
                    onValueChange={(value) => updateStyles({ objectFit: value })}
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contain">Contain</SelectItem>
                      <SelectItem value="cover">Cover</SelectItem>
                      <SelectItem value="fill">Fill</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600">Alineación</Label>
                  <Select 
                    value={component.styles.textAlign || 'center'} 
                    onValueChange={(value) => updateStyles({ textAlign: value })}
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Izquierda</SelectItem>
                      <SelectItem value="center">Centro</SelectItem>
                      <SelectItem value="right">Derecha</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Link */}
            <div className="space-y-2">
              <Label className="text-xs text-gray-600">Enlace (opcional)</Label>
              <Input
                value={component.content.link || ''}
                onChange={(e) => updateContent({ link: e.target.value })}
                placeholder="https://..."
                className="h-9"
              />
            </div>

            {/* Spacing */}
            {renderSpacingControls(component, updateStyles, '10px', '0px')}

            {/* Layout */}
            {renderLayoutControls(component, updateStyles)}
          </div>
        );

      case 'button':
        return (
          <div className="h-full flex flex-col space-y-4">
            {/* Content */}
            <div className="space-y-3">
              <Label className="font-medium text-sm">Contenido</Label>
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Texto del botón</Label>
                <Input
                  value={component.content.text || ''}
                  onChange={(e) => updateContent({ text: e.target.value })}
                  placeholder="Texto del botón"
                  className="h-9"
                />
                <Label className="text-xs text-gray-600">Enlace</Label>
                <Input
                  value={component.content.href || ''}
                  onChange={(e) => updateContent({ href: e.target.value })}
                  placeholder="https://..."
                  className="h-9"
                />
              </div>
            </div>

            {/* Typography (Button-specific) */}
            <div className="space-y-3">
              <Label className="font-medium text-sm">Tipografía</Label>
              
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Fuente</Label>
                <Select 
                  value={component.styles.fontFamily || 'Helvetica, sans-serif'} 
                  onValueChange={(value) => updateStyles({ fontFamily: value })}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Helvetica, sans-serif">Helvetica</SelectItem>
                    <SelectItem value="Roboto, sans-serif">Roboto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600">Tamaño</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full h-9 justify-between">
                        {stripPx(component.styles.fontSize || '16px')}px
                        <Sliders className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64">
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Tamaño de fuente</Label>
                        <Slider
                          value={[parseInt(stripPx(component.styles.fontSize || '16px'))]}
                          onValueChange={(value) => updateStyles({ fontSize: `${value[0]}px` })}
                          max={48}
                          min={8}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>8px</span>
                          <span>{stripPx(component.styles.fontSize || '16px')}px</span>
                          <span>48px</span>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-gray-600">Peso</Label>
                  <Select 
                    value={component.styles.fontWeight || 'bold'} 
                    onValueChange={(value) => updateStyles({ fontWeight: value })}
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="bold">Bold</SelectItem>
                      <SelectItem value="lighter">Lighter</SelectItem>
                      <SelectItem value="bolder">Bolder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Colors (Button-specific) */}
            <div className="space-y-3">
              <Label className="font-medium text-sm">Colores</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600">Color de texto</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="color"
                      value={component.styles.color || '#ffffff'}
                      onChange={(e) => updateStyles({ color: e.target.value })}
                      className="w-12 h-8 p-1"
                    />
                    <span className="text-xs">Texto</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600">Fondo</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="color"
                      value={component.styles.backgroundColor || '#1553ec'}
                      onChange={(e) => updateStyles({ backgroundColor: e.target.value })}
                      className="w-12 h-8 p-1"
                    />
                    <span className="text-xs">Fondo</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Border */}
            <div className="space-y-3">
              <Label className="font-medium text-sm">Borde</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600">Color</Label>
                  <Input
                    type="color"
                    value={component.styles.borderColor || '#1553ec'}
                    onChange={(e) => updateStyles({ borderColor: e.target.value })}
                    className="w-12 h-8 p-1"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600">Grosor</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full h-9 justify-between">
                        {stripPx(component.styles.borderWidth || '0px')}px
                        <Sliders className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56">
                      <div className="space-y-2">
                        <Label className="text-sm">Grosor del borde</Label>
                        <Slider
                          value={[parseInt(stripPx(component.styles.borderWidth || '0px'))]}
                          onValueChange={(value) => updateStyles({ borderWidth: `${value[0]}px` })}
                          max={10}
                          min={0}
                          step={1}
                        />
                        <div className="text-center text-xs text-gray-500">
                          {stripPx(component.styles.borderWidth || '0px')}px
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* Spacing */}
            {renderSpacingControls(component, updateStyles, '12px', '10px')}

            {/* Layout */}
            <div className="space-y-3">
              <Label className="font-medium text-sm">Layout</Label>
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Alineación</Label>
                <Select 
                  value={component.styles.textAlign || 'center'} 
                  onValueChange={(value) => updateStyles({ textAlign: value })}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Izquierda</SelectItem>
                    <SelectItem value="center">Centro</SelectItem>
                    <SelectItem value="right">Derecha</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Display</Label>
                <Select 
                  value={component.styles.display || 'inline-block'} 
                  onValueChange={(value) => updateStyles({ display: value })}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inline-block">Inline-block</SelectItem>
                    <SelectItem value="block">Block</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 'spacer':
        return (
          <div className="h-full flex flex-col space-y-4">
            {/* Height */}
            <div className="space-y-3">
              <Label className="font-medium text-sm">Propiedades</Label>
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Altura del espaciador</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full h-9 justify-between">
                      {stripPx(component.styles.height || '20px')}px
                      <Sliders className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64">
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Altura del espaciador</Label>
                      <Slider
                        value={[parseInt(stripPx(component.styles.height || '20px'))]}
                        onValueChange={(value) => updateStyles({ height: `${value[0]}px` })}
                        max={200}
                        min={5}
                        step={5}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>5px</span>
                        <span>{stripPx(component.styles.height || '20px')}px</span>
                        <span>200px</span>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Colors */}
            <div className="space-y-3">
              <Label className="font-medium text-sm">Colores</Label>
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Color de fondo (opcional)</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    type="color"
                    value={component.styles.backgroundColor || '#ffffff'}
                    onChange={(e) => updateStyles({ backgroundColor: e.target.value })}
                    className="w-12 h-8 p-1"
                  />
                  <span className="text-xs">Fondo</span>
                </div>
              </div>
            </div>

            {/* Spacing (Simplified for spacer) */}
            <div className="space-y-3">
              <Label className="font-medium text-sm">Espaciado</Label>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600">Margin</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Top', 'Bottom'].map((dir) => {
                      const key = `margin${dir}`;
                      const defaultVal = '0px';
                      return (
                        <Popover key={key}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="h-9 text-xs">
                              {dir[0]}: {stripPx(component.styles[key] || defaultVal)}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56">
                            <div className="space-y-2">
                              <Label className="text-sm">Margin {dir}</Label>
                              <Slider
                                value={[parseInt(stripPx(component.styles[key] || defaultVal))]}
                                onValueChange={(value) => updateStyles({ [key]: `${value[0]}px` })}
                                max={100}
                                min={0}
                                step={1}
                              />
                              <div className="text-center text-xs text-gray-500">
                                {stripPx(component.styles[key] || defaultVal)}px
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
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

                      {/* Template Saving */}
                      <div className="space-y-3 pt-4 border-t">
                        <Label className="font-semibold">Guardar Plantilla</Label>
                        <Input
                          value={templateName}
                          onChange={(e) => setTemplateName(e.target.value)}
                          placeholder="Nombre de la plantilla"
                        />
                        <Button 
                          className="w-full" 
                          onClick={saveTemplate}
                          disabled={!templateName.trim()}
                          variant="secondary"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Guardar
                        </Button>
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

                          {/* Dynamic Components with Drag & Drop */}
                          <div>
                            {emailComponents.length === 0 ? (
                              <div className="text-center py-8 text-gray-500">
                                <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <p>Agrega componentes para comenzar a construir tu email</p>
                                <p className="text-sm mt-2">🚀 Arrastra y suelta para reordenar</p>
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

        {/* Image Gallery Modal */}
        {showImageGallery && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Seleccionar Imagen de la Galería</h3>
                <Button
                  variant="outline"
                  onClick={() => setShowImageGallery(false)}
                >
                  Cerrar
                </Button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {galleryImages?.items?.map((image: any) => (
                  <div
                    key={image.id}
                    className="relative cursor-pointer group border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                    onClick={() => selectImageFromGallery(image.url)}
                  >
                    <img
                      src={image.thumbUrl || image.url}
                      alt={image.prompt}
                      className="w-full h-32 object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                      <Button className="opacity-0 group-hover:opacity-100 transition-opacity">
                        Seleccionar
                      </Button>
                    </div>
                  </div>
                )) || (
                  <div className="col-span-full text-center py-8">
                    <p className="text-gray-500">No hay imágenes en la galería</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}