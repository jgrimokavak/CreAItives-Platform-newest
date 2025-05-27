import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Download, Eye, Sparkles, FileText, Gift, Newspaper, Loader2, Plus, Trash2, Image, Upload, Save, Sliders, GripVertical, Maximize, AlignCenter, AlignLeft, AlignRight, Square, Link, Type, Minus, Settings, Palette, Link2 } from 'lucide-react';
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
  { type: 'text', name: 'Text', icon: <FileText className="h-4 w-4" />, description: 'Text paragraph' },
  { type: 'image', name: 'Image', icon: <Image className="h-4 w-4" />, description: 'Image or logo' },
  { type: 'button', name: 'Button', icon: <Mail className="h-4 w-4" />, description: 'Action button' },
  { type: 'spacer', name: 'Spacer', icon: <Plus className="h-4 w-4" />, description: 'Blank space' }
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
  
  // Ref to capture the live builder HTML
  const builderRef = useRef<HTMLDivElement>(null);

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

  // Helper function to generate clean standalone HTML from builder components
  const getBuilderHtml = () => {
    // Convert React components to clean HTML strings
    const componentsHTML = emailComponents.map(component => {
      const styleString = Object.entries(component.styles)
        .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
        .join('; ');

      switch (component.type) {
        case 'text':
          return `<div style="${styleString}">${component.content.text || ''}</div>`;
        case 'image':
          return component.content.src 
            ? `<div style="display: flex; justify-content: ${component.styles.textAlign === 'left' ? 'flex-start' : component.styles.textAlign === 'right' ? 'flex-end' : 'center'}; margin: 0; padding: 0; padding-top: ${component.styles.paddingTop || '0px'}; padding-right: ${component.styles.paddingRight || '0px'}; padding-bottom: ${component.styles.paddingBottom || '0px'}; padding-left: ${component.styles.paddingLeft || '0px'};"><img src="${component.content.src}" alt="${component.content.alt || ''}" style="max-width: ${component.styles.maxWidth || '100%'}; width: ${component.styles.width || 'auto'}; height: ${component.styles.height || 'auto'}; border: ${component.styles.border || 'none'}; border-radius: ${component.styles.borderRadius || '0px'};" /></div>`
            : '';
        case 'button':
          return `<div style="display: flex; justify-content: ${component.styles.textAlign === 'left' ? 'flex-start' : component.styles.textAlign === 'right' ? 'flex-end' : 'center'}; margin: 0; padding: 0; padding-top: ${component.styles.paddingTop || '0px'}; padding-right: ${component.styles.paddingRight || '0px'}; padding-bottom: ${component.styles.paddingBottom || '0px'}; padding-left: ${component.styles.paddingLeft || '0px'};"><a href="${component.content.href || '#'}" style="${styleString}">${component.content.text || 'Click here'}</a></div>`;
        case 'spacer':
          return `<div style="${styleString}"></div>`;
        default:
          return '';
      }
    }).join('\n');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${emailContent.subject}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; font-family: 'Roboto', 'Helvetica', Arial, sans-serif; background-color: #f5f5f5; }
  </style>
</head>
<body>
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    ${componentsHTML}
    <div style="padding: 30px 20px; text-align: center; color: #666666; font-size: 14px; background-color: #f8f9fa; border-top: 1px solid #e9ecef;">
      <p style="margin: 5px 0;"><strong>KAVAK</strong> - Tu experiencia automotriz</p>
      <p style="margin: 5px 0;">© ${new Date().getFullYear()} KAVAK. Todos los derechos reservados.</p>
      <p style="font-size: 12px; color: #999; margin: 5px 0;">Este email fue generado con Email CreAItor</p>
    </div>
  </div>
</body>
</html>`;
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
          <div style={{
            // Use flexbox for proper alignment control
            display: 'flex',
            justifyContent: 
              componentStyles.textAlign === 'left' ? 'flex-start' :
              componentStyles.textAlign === 'right' ? 'flex-end' : 'center',
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
            <img 
              src={component.content.src} 
              alt={component.content.alt} 
              style={{ 
                // When Auto Size is ON: use natural dimensions, no object-fit
                width: componentStyles.autoSize === 'true' ? 'auto' : (componentStyles.width || '400px'),
                height: componentStyles.autoSize === 'true' ? 'auto' : (componentStyles.height || '300px'),
                // Object Fit only applies when Auto Size is OFF
                objectFit: componentStyles.autoSize === 'true' ? undefined : (componentStyles.objectFit || 'cover'),
                borderRadius: componentStyles.borderRadius || '0px',
                borderWidth: componentStyles.borderWidth || '0px',
                borderStyle: componentStyles.borderWidth && parseInt(stripPx(componentStyles.borderWidth)) > 0 ? 'solid' : 'none',
                borderColor: componentStyles.borderColor || '#e5e7eb',
                opacity: componentStyles.opacity || '1',
                // Only limit max-width when Auto Size is ON to prevent overflow
                maxWidth: componentStyles.autoSize === 'true' ? '100%' : undefined,
                display: 'block'
              }}
            />
          </div>
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
            display: 'flex',
            justifyContent: 
              componentStyles.textAlign === 'left' ? 'flex-start' :
              componentStyles.textAlign === 'right' ? 'flex-end' : 'center',
            margin: 0,
            padding: 0,
            // External margin - space OUTSIDE the button container
            marginTop: componentStyles.marginTop || '0px',
            marginRight: componentStyles.marginRight || '0px',
            marginBottom: componentStyles.marginBottom || '0px',
            marginLeft: componentStyles.marginLeft || '0px',
          }}>
            <a 
              href={component.content.href || '#'} 
              style={{ 
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                // Internal padding - space INSIDE the button around the text
                paddingTop: componentStyles.paddingTop || '12px',
                paddingRight: componentStyles.paddingRight || '24px',
                paddingBottom: componentStyles.paddingBottom || '12px',
                paddingLeft: componentStyles.paddingLeft || '24px',
                borderRadius: componentStyles.borderRadius || '4px',
                color: componentStyles.color || '#ffffff',
                backgroundColor: componentStyles.backgroundColor || '#1553ec',
                opacity: componentStyles.opacity || '1',
                fontFamily: componentStyles.fontFamily || 'Helvetica, sans-serif',
                fontSize: componentStyles.fontSize || '16px',
                fontWeight: componentStyles.fontWeight || 'bold',
                width: componentStyles.width || 'auto',
                height: componentStyles.height || '40px',
                borderWidth: componentStyles.borderWidth || '0px',
                borderStyle: componentStyles.borderWidth && parseInt(stripPx(componentStyles.borderWidth)) > 0 ? 'solid' : 'none',
                borderColor: componentStyles.borderColor || '#1553ec',
                boxSizing: 'border-box',
                transition: 'all 0.2s ease',
                // Ensure text is always centered
                textAlign: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                // Prevent text from shifting when padding changes
                minHeight: 'fit-content'
              }}
            >
              {component.content.text || 'Button'}
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
    <div className="space-y-6">
      <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-800 px-3 py-1.5 rounded-full">
        <Square className="w-4 h-4" />
        <span className="text-sm font-semibold">Spacing</span>
      </div>
      
      <div className="space-y-6">
        {/* Padding Controls */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Internal Padding</Label>
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
              Reset all
            </Button>
          </div>
          
          <div className="space-y-4">
            {[
              { key: 'paddingTop', label: 'Top' },
              { key: 'paddingRight', label: 'Right' },
              { key: 'paddingBottom', label: 'Bottom' },
              { key: 'paddingLeft', label: 'Left' }
            ].map(({ key, label }) => {
              const currentValue = component.styles[key];
              const displayValue = currentValue !== undefined ? stripPx(currentValue) : stripPx(defaultPadding);
              
              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">{label}</Label>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {displayValue}px
                    </span>
                  </div>
                  <Slider
                    value={[parseInt(displayValue)]}
                    onValueChange={(value) => updateStyles({ [key]: `${value[0]}px` })}
                    max={100}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>0px</span>
                    <span>100px</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Margin Controls */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">External Margin</Label>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => updateStyles({ 
                marginTop: '0px', 
                marginRight: '0px', 
                marginBottom: '0px', 
                marginLeft: '0px' 
              })}
              className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
            >
              Reset all
            </Button>
          </div>
          
          <div className="space-y-4">
            {[
              { key: 'marginTop', label: 'Top' },
              { key: 'marginRight', label: 'Right' },
              { key: 'marginBottom', label: 'Bottom' },
              { key: 'marginLeft', label: 'Left' }
            ].map(({ key, label }) => {
              const currentValue = component.styles[key];
              const displayValue = currentValue !== undefined ? stripPx(currentValue) : stripPx(defaultMargin);
              
              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">{label}</Label>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {displayValue}px
                    </span>
                  </div>
                  <Slider
                    value={[parseInt(displayValue)]}
                    onValueChange={(value) => updateStyles({ [key]: `${value[0]}px` })}
                    max={100}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>0px</span>
                    <span>100px</span>
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
      <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1.5 rounded-full">
        <Type className="w-4 h-4" />
        <span className="text-sm font-semibold">Typography</span>
      </div>
      
      {/* Font Family */}
      <div className="space-y-2">
        <Label className="text-xs text-gray-600 uppercase tracking-wide">Font</Label>
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
          <Label className="text-xs text-gray-600 uppercase tracking-wide">Size</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full h-9 justify-between">
                {stripPx(component.styles.fontSize || '16px')}px
                <Sliders className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Font size</Label>
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
          <Label className="text-xs text-gray-600 uppercase tracking-wide">Weight</Label>
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
        <Label className="text-xs text-gray-600 uppercase tracking-wide">Styles</Label>
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
          <Label className="text-xs text-gray-600 uppercase tracking-wide">Line height</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full h-9 justify-between">
                {component.styles.lineHeight || '1.6'}
                <Sliders className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Line height</Label>
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
            <Label className="text-xs text-gray-600 uppercase tracking-wide">Alignment</Label>
            <Select 
              value={component.styles.textAlign || 'left'} 
              onValueChange={(value) => updateStyles({ textAlign: value })}
            >
              <SelectTrigger className="h-9 w-full">
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
        )}
      </div>
    </div>
  );

  const renderLayoutControls = (component: EmailComponent, updateStyles: (updates: any) => void) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="font-medium text-sm">Dimensions & Borders</Label>
        <div className="text-xs text-gray-500">Visual structure</div>
      </div>
      
      {/* Width Control */}
      <div className="space-y-2">
        <Label className="text-xs text-gray-600 uppercase tracking-wide">Max width</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full h-9 justify-between">
              {component.styles.maxWidth || '100%'}
              <Sliders className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Max width</Label>
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
                  placeholder="100% or 600px"
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Border Controls */}
      <div className="space-y-3">
        <Label className="text-xs text-gray-600 uppercase tracking-wide">Borders</Label>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs text-gray-500">Border color</Label>
            <div className="flex items-center space-x-2">
              <Input
                type="color"
                value={component.styles.borderColor || '#e5e7eb'}
                onChange={(e) => updateStyles({ borderColor: e.target.value })}
                className="w-12 h-8 p-1"
              />
              <span className="text-xs text-gray-600">Border</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs text-gray-500">Border width</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full h-8 justify-between text-xs">
                  {stripPx(component.styles.borderWidth || '0px')}px
                  <Sliders className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56">
                <div className="space-y-2">
                  <Label className="text-sm">Border width</Label>
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
          <Label className="text-xs text-gray-500">Border radius</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full h-9 justify-between">
                {stripPx(component.styles.borderRadius || '0px')}px
                <Sliders className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56">
              <div className="space-y-2">
                <Label className="text-sm">Border radius</Label>
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
        <Label className="font-medium text-sm">Colors</Label>
        <div className="text-xs text-gray-500">Appearance</div>
      </div>
      
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs text-gray-600 uppercase tracking-wide">Text color</Label>
            <div className="flex items-center space-x-2">
              <Input
                type="color"
                value={component.styles.color || '#000000'}
                onChange={(e) => updateStyles({ color: e.target.value })}
                className="w-12 h-8 p-1 rounded border"
              />
              <span className="text-xs text-gray-600">Text</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs text-gray-600 uppercase tracking-wide">Background color</Label>
            <div className="flex items-center space-x-2">
              <Input
                type="color"
                value={component.styles.backgroundColor || '#ffffff'}
                onChange={(e) => updateStyles({ backgroundColor: e.target.value })}
                className="w-12 h-8 p-1 rounded border"
              />
              <span className="text-xs text-gray-600">Background</span>
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
          <div className="h-full flex flex-col space-y-6">
            {/* Content Section */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full">
                <Type className="w-4 h-4" />
                <span className="text-sm font-semibold">Content</span>
              </div>
              
              <div className="space-y-3">
                <Textarea
                  value={component.content.text || ''}
                  onChange={(e) => updateContent({ text: e.target.value })}
                  rows={4}
                  className="resize-none text-sm"
                  placeholder="Enter your text content here..."
                />
                <p className="text-xs text-gray-500">This is the main text content that will appear in your email</p>
              </div>
            </div>

            {/* Typography Section */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1.5 rounded-full">
                <Type className="w-4 h-4" />
                <span className="text-sm font-semibold">Typography</span>
              </div>
              
              {/* Font Family */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Font Family</Label>
                <Select 
                  value={component.styles.fontFamily || 'Helvetica, sans-serif'} 
                  onValueChange={(value) => updateStyles({ fontFamily: value })}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Helvetica, sans-serif">Helvetica</SelectItem>
                    <SelectItem value="Roboto, sans-serif">Roboto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Font Size & Weight */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Font Size</Label>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {stripPx(component.styles.fontSize || '16px')}px
                    </span>
                  </div>
                  <Slider
                    value={[parseInt(stripPx(component.styles.fontSize || '16px'))]}
                    onValueChange={(value) => updateStyles({ fontSize: `${value[0]}px` })}
                    max={72}
                    min={8}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>8px</span>
                    <span>72px</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Font Weight</Label>
                  <Select 
                    value={component.styles.fontWeight || 'normal'} 
                    onValueChange={(value) => updateStyles({ fontWeight: value })}
                  >
                    <SelectTrigger className="h-10 w-full">
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
              <div className="space-y-3">
                <Label className="text-sm font-medium">Text Styles</Label>
                <div className="flex gap-2">
                  <Button
                    variant={component.styles.fontStyle === 'italic' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateStyles({ 
                      fontStyle: component.styles.fontStyle === 'italic' ? 'normal' : 'italic' 
                    })}
                    className="h-10 w-12 font-bold italic"
                    title="Italic"
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
                    className="h-10 w-12 font-bold underline"
                    title="Underline"
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
                    className="h-10 w-12 font-bold line-through"
                    title="Strikethrough"
                  >
                    S
                  </Button>
                </div>
              </div>

              {/* Line Height */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Line Height</Label>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {component.styles.lineHeight || '1.6'}
                  </span>
                </div>
                <Slider
                  value={[parseFloat(component.styles.lineHeight || '1.6')]}
                  onValueChange={(value) => updateStyles({ lineHeight: value[0].toString() })}
                  max={3}
                  min={0.8}
                  step={0.1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>0.8</span>
                  <span>3.0</span>
                </div>
              </div>

              {/* Text Alignment */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Text Alignment</Label>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    { value: 'left', label: 'Left', icon: <AlignLeft className="w-3 h-3" /> },
                    { value: 'center', label: 'Center', icon: <AlignCenter className="w-3 h-3" /> },
                    { value: 'right', label: 'Right', icon: <AlignRight className="w-3 h-3" /> },
                    { value: 'justify', label: 'Justify', icon: <AlignCenter className="w-3 h-3" /> }
                  ].map((align) => (
                    <Button
                      key={align.value}
                      variant={component.styles.textAlign === align.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateStyles({ textAlign: align.value })}
                      className="h-8 flex items-center justify-center gap-1 text-xs"
                      title={align.label}
                    >
                      {align.icon}
                      {align.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Colors Section */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-red-100 text-red-800 px-3 py-1.5 rounded-full">
                <Palette className="w-4 h-4" />
                <span className="text-sm font-semibold">Colors</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Text Color</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="color"
                      value={component.styles.color || '#000000'}
                      onChange={(e) => updateStyles({ color: e.target.value })}
                      className="w-12 h-10 p-1 rounded border"
                    />
                    <span className="text-xs text-gray-600 flex-1">Text</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Background Color</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="color"
                      value={component.styles.backgroundColor || '#ffffff'}
                      onChange={(e) => updateStyles({ backgroundColor: e.target.value })}
                      className="w-12 h-10 p-1 rounded border"
                    />
                    <span className="text-xs text-gray-600 flex-1">Background</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Spacing Section */}
            {renderSpacingControls(component, updateStyles, '15px', '0px')}
          </div>
        );

      case 'image':
        return (
          <div className="h-full flex flex-col space-y-6">
            {/* Image Source Section */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full">
                <Image className="w-4 h-4" />
                <span className="text-sm font-semibold">Image Source</span>
              </div>
              
              <div className="space-y-3">
                <Input
                  value={component.content.src || ''}
                  onChange={(e) => updateContent({ src: e.target.value })}
                  placeholder="Paste image URL here..."
                  className="h-10 text-sm"
                />
                
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowImageGallery(true)}
                    className="h-9 border-dashed hover:bg-blue-50"
                    title="Select from gallery"
                  >
                    <Image className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 border-dashed hover:bg-green-50"
                    title="Upload image"
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 border-dashed hover:bg-purple-50"
                    title="Generate with AI"
                  >
                    <Sparkles className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600 uppercase tracking-wide">Alt text (accessibility)</Label>
                  <Input
                    value={component.content.alt || ''}
                    onChange={(e) => updateContent({ alt: e.target.value })}
                    placeholder="Describe the image..."
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Size & Dimensions Section */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1.5 rounded-full">
                <Maximize className="w-4 h-4" />
                <span className="text-sm font-semibold">Size & Dimensions</span>
              </div>

              {/* Auto Size Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                <div className="flex flex-col">
                  <Label className="text-sm font-medium">Auto Size</Label>
                  <span className="text-xs text-gray-500">Use image's natural dimensions</span>
                </div>
                <Button
                  variant={component.styles.autoSize === 'true' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateStyles({ 
                    autoSize: component.styles.autoSize === 'true' ? 'false' : 'true'
                  })}
                  className="h-8"
                >
                  {component.styles.autoSize === 'true' ? 'ON' : 'OFF'}
                </Button>
              </div>

              {/* Width Control - Only when Auto Size is OFF */}
              <div className={`space-y-3 ${component.styles.autoSize === 'true' ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Width</Label>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {component.styles.autoSize === 'true' ? 'Auto' : `${stripPx(component.styles.width || '400px')}px`}
                  </span>
                </div>
                <Slider
                  value={[parseInt(stripPx(component.styles.width || '400px'))]}
                  onValueChange={(value) => updateStyles({ width: `${value[0]}px` })}
                  max={800}
                  min={50}
                  step={10}
                  className="w-full"
                  disabled={component.styles.autoSize === 'true'}
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>50px</span>
                  <span>800px</span>
                </div>
                {component.styles.autoSize === 'true' && (
                  <p className="text-xs text-yellow-600">Disabled when Auto Size is ON</p>
                )}
              </div>

              {/* Height Control - Only when Auto Size is OFF */}
              <div className={`space-y-3 ${component.styles.autoSize === 'true' ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Height</Label>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {component.styles.autoSize === 'true' ? 'Auto' : `${stripPx(component.styles.height || '300px')}px`}
                  </span>
                </div>
                <Slider
                  value={[parseInt(stripPx(component.styles.height || '300px'))]}
                  onValueChange={(value) => updateStyles({ height: `${value[0]}px` })}
                  max={600}
                  min={50}
                  step={10}
                  className="w-full"
                  disabled={component.styles.autoSize === 'true'}
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>50px</span>
                  <span>600px</span>
                </div>
                {component.styles.autoSize === 'true' && (
                  <p className="text-xs text-yellow-600">Disabled when Auto Size is ON</p>
                )}
              </div>

              {/* Object Fit Control - Only when Auto Size is OFF */}
              <div className={`space-y-3 ${component.styles.autoSize === 'true' ? 'opacity-50 pointer-events-none' : ''}`}>
                <Label className="text-sm font-medium">Object Fit</Label>
                <Select 
                  value={component.styles.objectFit || 'cover'} 
                  onValueChange={(value) => updateStyles({ objectFit: value })}
                  disabled={component.styles.autoSize === 'true'}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contain">Contain - Fit entire image</SelectItem>
                    <SelectItem value="cover">Cover - Fill area, crop if needed</SelectItem>
                    <SelectItem value="fill">Fill - Stretch to fit</SelectItem>
                    <SelectItem value="none">None - Original size</SelectItem>
                    <SelectItem value="scale-down">Scale-down - Smaller of none/contain</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  {component.styles.autoSize === 'true' 
                    ? 'Ignored when Auto Size is ON' 
                    : 'How the image fills the bounding box'}
                </p>
              </div>
            </div>

            {/* Alignment Section */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-800 px-3 py-1.5 rounded-full">
                <AlignCenter className="w-4 h-4" />
                <span className="text-sm font-semibold">Alignment</span>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'left', label: 'Left', icon: <AlignLeft className="w-4 h-4" /> },
                  { value: 'center', label: 'Center', icon: <AlignCenter className="w-4 h-4" /> },
                  { value: 'right', label: 'Right', icon: <AlignRight className="w-4 h-4" /> }
                ].map((align) => (
                  <Button
                    key={align.value}
                    variant={component.styles.textAlign === align.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateStyles({ textAlign: align.value })}
                    className="h-10 flex flex-col items-center justify-center gap-1"
                  >
                    {align.icon}
                    <span className="text-xs">{align.label}</span>
                  </Button>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                Controls how the image box is positioned within its container (always active)
              </p>
            </div>

            {/* Link Section */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-800 px-3 py-1.5 rounded-full">
                <Link className="w-4 h-4" />
                <span className="text-sm font-semibold">Link (Optional)</span>
              </div>
              
              <Input
                value={component.content.link || ''}
                onChange={(e) => updateContent({ link: e.target.value })}
                placeholder="https://example.com"
                className="h-10 text-sm"
              />
              <p className="text-xs text-gray-500">Make the image clickable by adding a link</p>
            </div>

            {/* Borders Section */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-full">
                <Square className="w-4 h-4" />
                <span className="text-sm font-semibold">Borders</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Border Color</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="color"
                      value={component.styles.borderColor || '#e5e7eb'}
                      onChange={(e) => updateStyles({ borderColor: e.target.value })}
                      className="w-12 h-8 p-1 rounded border"
                    />
                    <span className="text-xs text-gray-600 flex-1">Border</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Border Width</Label>
                  <div className="space-y-2">
                    <Slider
                      value={[parseInt(stripPx(component.styles.borderWidth || '0px'))]}
                      onValueChange={(value) => updateStyles({ 
                        borderWidth: `${value[0]}px`,
                        borderStyle: value[0] > 0 ? 'solid' : 'none'
                      })}
                      max={10}
                      min={0}
                      step={1}
                      className="w-full"
                    />
                    <div className="text-center text-xs text-gray-500">
                      {stripPx(component.styles.borderWidth || '0px')}px
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Border Radius</Label>
                  <div className="space-y-2">
                    <Slider
                      value={[parseInt(stripPx(component.styles.borderRadius || '0px'))]}
                      onValueChange={(value) => updateStyles({ borderRadius: `${value[0]}px` })}
                      max={50}
                      min={0}
                      step={1}
                      className="w-full"
                    />
                    <div className="text-center text-xs text-gray-500">
                      {stripPx(component.styles.borderRadius || '0px')}px
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Transparency</Label>
                  <div className="space-y-2">
                    <Slider
                      value={[parseFloat(component.styles.opacity || '1') * 100]}
                      onValueChange={(value) => updateStyles({ opacity: (value[0] / 100).toString() })}
                      max={100}
                      min={0}
                      step={5}
                      className="w-full"
                    />
                    <div className="text-center text-xs text-gray-500">
                      {Math.round(parseFloat(component.styles.opacity || '1') * 100)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Spacing Section */}
            {renderSpacingControls(component, updateStyles, '10px', '0px')}
          </div>
        );

      case 'button':
        return (
          <div className="h-full flex flex-col space-y-6">
            {/* General Section */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full">
                <Settings className="w-4 h-4" />
                <span className="text-sm font-semibold">General</span>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Button Text</Label>
                  <Input
                    value={component.content.text || ''}
                    onChange={(e) => updateContent({ text: e.target.value })}
                    placeholder="Enter button text..."
                    className="h-10"
                  />
                  <p className="text-xs text-gray-500">The text that appears on the button</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Link URL</Label>
                  <Input
                    value={component.content.href || ''}
                    onChange={(e) => updateContent({ href: e.target.value })}
                    placeholder="https://example.com"
                    className="h-10"
                  />
                  <p className="text-xs text-gray-500">Where the button links when clicked</p>
                </div>
              </div>
            </div>

            {/* Typography Section */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1.5 rounded-full">
                <Type className="w-4 h-4" />
                <span className="text-sm font-semibold">Typography</span>
              </div>
              
              {/* Font Family */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Font Family</Label>
                <Select 
                  value={component.styles.fontFamily || 'Helvetica, sans-serif'} 
                  onValueChange={(value) => updateStyles({ fontFamily: value })}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Helvetica, sans-serif">Helvetica</SelectItem>
                    <SelectItem value="Roboto, sans-serif">Roboto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Font Size & Weight */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Font Size</Label>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {stripPx(component.styles.fontSize || '16px')}px
                    </span>
                  </div>
                  <Slider
                    value={[parseInt(stripPx(component.styles.fontSize || '16px'))]}
                    onValueChange={(value) => updateStyles({ fontSize: `${value[0]}px` })}
                    max={32}
                    min={10}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>10px</span>
                    <span>32px</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Font Weight</Label>
                  <Select 
                    value={component.styles.fontWeight || 'bold'} 
                    onValueChange={(value) => updateStyles({ fontWeight: value })}
                  >
                    <SelectTrigger className="h-10 w-full">
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

              {/* Text Color */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Text Color</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    type="color"
                    value={component.styles.color || '#ffffff'}
                    onChange={(e) => updateStyles({ color: e.target.value })}
                    className="w-12 h-10 p-1 rounded border"
                  />
                  <span className="text-xs text-gray-600 flex-1">Button text color</span>
                </div>
              </div>
            </div>

            {/* Size & Layout Section */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-full">
                <Maximize className="w-4 h-4" />
                <span className="text-sm font-semibold">Size & Layout</span>
              </div>
              
              {/* Width & Height */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Width</Label>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {component.styles.width === 'auto' ? 'Auto' : 
                       component.styles.width === '100%' ? 'Full' : 
                       stripPx(component.styles.width || '200px') + 'px'}
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Button
                        variant={component.styles.width === 'auto' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          if (component.styles.width === 'auto') {
                            updateStyles({ width: '200px' }); // Return to manual control
                          } else {
                            updateStyles({ width: 'auto' });
                          }
                        }}
                        className="h-8 text-xs flex-1"
                      >
                        Auto
                      </Button>
                      <Button
                        variant={component.styles.width === '100%' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          if (component.styles.width === '100%') {
                            updateStyles({ width: '200px' }); // Return to manual control
                          } else {
                            updateStyles({ width: '100%' });
                          }
                        }}
                        className="h-8 text-xs flex-1"
                      >
                        Full
                      </Button>
                    </div>
                    <Slider
                      value={[parseInt(stripPx(component.styles.width || '200px'))]}
                      onValueChange={(value) => updateStyles({ width: `${value[0]}px` })}
                      max={600}
                      min={100}
                      step={10}
                      className="w-full xl:h-6"
                      disabled={component.styles.width === 'auto' || component.styles.width === '100%'}
                    />
                    <div className="flex justify-between text-xs xl:text-sm text-gray-400">
                      <span>100px</span>
                      <span>600px</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Height</Label>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {stripPx(component.styles.height || '40px')}px
                    </span>
                  </div>
                  <Slider
                    value={[parseInt(stripPx(component.styles.height || '40px'))]}
                    onValueChange={(value) => updateStyles({ height: `${value[0]}px` })}
                    max={80}
                    min={30}
                    step={2}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>30px</span>
                    <span>80px</span>
                  </div>
                </div>
              </div>

              {/* Alignment */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Alignment</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'left', label: 'Left', icon: <AlignLeft className="w-4 h-4" /> },
                    { value: 'center', label: 'Center', icon: <AlignCenter className="w-4 h-4" /> },
                    { value: 'right', label: 'Right', icon: <AlignRight className="w-4 h-4" /> }
                  ].map((align) => (
                    <Button
                      key={align.value}
                      variant={component.styles.textAlign === align.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateStyles({ textAlign: align.value })}
                      className="h-10 flex flex-col items-center justify-center gap-1"
                    >
                      {align.icon}
                      <span className="text-xs">{align.label}</span>
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  Controls how the button is positioned within its container (text stays centered inside button)
                </p>
              </div>
            </div>

            {/* Styling Section */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-800 px-3 py-1.5 rounded-full">
                <Square className="w-4 h-4" />
                <span className="text-sm font-semibold">Styling</span>
              </div>
              
              {/* Background Color & Transparency */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Background Color</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="color"
                      value={component.styles.backgroundColor || '#1553ec'}
                      onChange={(e) => updateStyles({ backgroundColor: e.target.value })}
                      className="w-12 h-10 p-1 rounded border"
                    />
                    <span className="text-xs text-gray-600 flex-1">Button background color</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Background Opacity</Label>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {Math.round((parseFloat(component.styles.opacity || '1') * 100))}%
                    </span>
                  </div>
                  <Slider
                    value={[Math.round((parseFloat(component.styles.opacity || '1') * 100))]}
                    onValueChange={(value) => updateStyles({ opacity: (value[0] / 100).toString() })}
                    max={100}
                    min={0}
                    step={5}
                    className="w-full xl:h-6"
                  />
                  <div className="flex justify-between text-xs xl:text-sm text-gray-400">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>

              {/* Border Radius */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Border Radius</Label>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {stripPx(component.styles.borderRadius || '4px')}px
                  </span>
                </div>
                <Slider
                  value={[parseInt(stripPx(component.styles.borderRadius || '4px'))]}
                  onValueChange={(value) => updateStyles({ borderRadius: `${value[0]}px` })}
                  max={64}
                  min={0}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>0px</span>
                  <span>64px</span>
                </div>
              </div>

              {/* Border */}
              <div className="space-y-4">
                <Label className="text-sm font-medium">Border</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Border Color</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="color"
                        value={component.styles.borderColor || '#1553ec'}
                        onChange={(e) => updateStyles({ borderColor: e.target.value })}
                        className="w-12 h-10 p-1 rounded border"
                      />
                      <span className="text-xs text-gray-600 flex-1">Border</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">Border Width</Label>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {stripPx(component.styles.borderWidth || '0px')}px
                      </span>
                    </div>
                    <Slider
                      value={[parseInt(stripPx(component.styles.borderWidth || '0px'))]}
                      onValueChange={(value) => updateStyles({ 
                        borderWidth: `${value[0]}px`,
                        borderStyle: value[0] > 0 ? 'solid' : 'none'
                      })}
                      max={10}
                      min={0}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>0px</span>
                      <span>10px</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Spacing Section */}
            {renderSpacingControls(component, updateStyles, '12px', '10px')}
          </div>
        );

      case 'spacer':
        return (
          <div className="h-full flex flex-col space-y-6">
            {/* Size & Layout */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1.5 rounded-full">
                <Maximize className="w-4 h-4" />
                <span className="text-sm font-semibold">Size & Layout</span>
              </div>
              
              {/* Height Control */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Height</Label>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {stripPx(component.styles.height || '20px')}px
                  </span>
                </div>
                <Slider
                  value={[parseInt(stripPx(component.styles.height || '20px'))]}
                  onValueChange={(value) => updateStyles({ height: `${value[0]}px` })}
                  max={500}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>1px</span>
                  <span>500px</span>
                </div>
                <p className="text-xs text-gray-500">Controls the vertical space this component creates</p>
              </div>

              {/* Width Control */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Width</Label>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {component.styles.width === '100%' ? 'Full' : stripPx(component.styles.width || '100%')}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={component.styles.width === '100%' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateStyles({ 
                      width: '100%',
                      marginLeft: 'auto',
                      marginRight: 'auto'
                    })}
                    className="flex-1 h-9"
                  >
                    Full Width
                  </Button>
                  <Button
                    variant={component.styles.width !== '100%' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      const alignment = component.styles.textAlign || 'center';
                      const marginSettings = alignment === 'left' 
                        ? { marginLeft: '0', marginRight: 'auto' }
                        : alignment === 'right'
                        ? { marginLeft: 'auto', marginRight: '0' }
                        : { marginLeft: 'auto', marginRight: 'auto' };
                      
                      updateStyles({ 
                        width: '300px',
                        ...marginSettings
                      });
                    }}
                    className="flex-1 h-9"
                  >
                    Custom
                  </Button>
                </div>
                {component.styles.width !== '100%' && (
                  <div className="space-y-2">
                    <Slider
                      value={[parseInt(stripPx(component.styles.width || '300px'))]}
                      onValueChange={(value) => updateStyles({ width: `${value[0]}px` })}
                      max={600}
                      min={50}
                      step={10}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>50px</span>
                      <span>600px</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Appearance */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-800 px-3 py-1.5 rounded-full">
                <Palette className="w-4 h-4" />
                <span className="text-sm font-semibold">Appearance</span>
              </div>
              
              {/* Background Color */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Background Color</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    type="color"
                    value={component.styles.backgroundColor || '#ffffff'}
                    onChange={(e) => updateStyles({ backgroundColor: e.target.value })}
                    className="w-12 h-10 p-1 rounded border"
                  />
                  <span className="text-xs text-gray-600 flex-1">Make spacer visible with background</span>
                </div>
              </div>

              {/* Transparency */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Transparency</Label>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {Math.round((parseFloat(component.styles.opacity || '1') * 100))}%
                  </span>
                </div>
                <Slider
                  value={[Math.round((parseFloat(component.styles.opacity || '1') * 100))]}
                  onValueChange={(value) => updateStyles({ opacity: (value[0] / 100).toString() })}
                  max={100}
                  min={0}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>

            {/* Borders */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-full">
                <Square className="w-4 h-4" />
                <span className="text-sm font-semibold">Borders</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Border Color</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="color"
                      value={component.styles.borderColor || '#e5e7eb'}
                      onChange={(e) => updateStyles({ borderColor: e.target.value })}
                      className="w-12 h-8 p-1 rounded border"
                    />
                    <span className="text-xs text-gray-600 flex-1">Border</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Border Width</Label>
                  <div className="space-y-2">
                    <Slider
                      value={[parseInt(stripPx(component.styles.borderWidth || '0px'))]}
                      onValueChange={(value) => updateStyles({ 
                        borderWidth: `${value[0]}px`,
                        borderStyle: value[0] > 0 ? 'solid' : 'none'
                      })}
                      max={10}
                      min={0}
                      step={1}
                      className="w-full"
                    />
                    <div className="text-center text-xs text-gray-500">
                      {stripPx(component.styles.borderWidth || '0px')}px
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Border Radius</Label>
                <div className="space-y-2">
                  <Slider
                    value={[parseInt(stripPx(component.styles.borderRadius || '0px'))]}
                    onValueChange={(value) => updateStyles({ borderRadius: `${value[0]}px` })}
                    max={50}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                  <div className="text-center text-xs text-gray-500">
                    {stripPx(component.styles.borderRadius || '0px')}px
                  </div>
                </div>
              </div>
            </div>

            {/* Alignment */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-800 px-3 py-1.5 rounded-full">
                <AlignCenter className="w-4 h-4" />
                <span className="text-sm font-semibold">Alignment</span>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'left', label: 'Left', icon: <AlignLeft className="w-4 h-4" /> },
                  { value: 'center', label: 'Center', icon: <AlignCenter className="w-4 h-4" /> },
                  { value: 'right', label: 'Right', icon: <AlignRight className="w-4 h-4" /> }
                ].map((align) => (
                  <Button
                    key={align.value}
                    variant={component.styles.textAlign === align.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      if (component.styles.width === '100%') {
                        // Full width - only update textAlign, keep margins as auto
                        updateStyles({ 
                          textAlign: align.value,
                          marginLeft: 'auto',
                          marginRight: 'auto'
                        });
                      } else {
                        // Custom width - apply proper alignment margins
                        const marginSettings = align.value === 'left' 
                          ? { marginLeft: '0', marginRight: 'auto' }
                          : align.value === 'right'
                          ? { marginLeft: 'auto', marginRight: '0' }
                          : { marginLeft: 'auto', marginRight: 'auto' };
                        
                        updateStyles({ 
                          textAlign: align.value,
                          ...marginSettings
                        });
                      }
                    }}
                    className="h-10 flex flex-col items-center justify-center gap-1"
                  >
                    {align.icon}
                    <span className="text-xs">{align.label}</span>
                  </Button>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                {component.styles.width === '100%' 
                  ? 'Alignment disabled for full width spacers' 
                  : 'Controls how the spacer is positioned within its container'}
              </p>
            </div>

            {/* Margin Controls Only */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-full">
                <Sliders className="w-4 h-4" />
                <span className="text-sm font-semibold">Margin</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {['Top', 'Right', 'Bottom', 'Left'].map((dir) => {
                  const key = `margin${dir}`;
                  const defaultVal = '0px';
                  return (
                    <Popover key={key}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="h-9 text-xs justify-between">
                          {dir}: {stripPx(component.styles[key] || defaultVal)}px
                          <Sliders className="h-3 w-3" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64">
                        <div className="space-y-3">
                          <Label className="text-sm font-medium">Margin {dir}</Label>
                          <Slider
                            value={[parseInt(stripPx(component.styles[key] || defaultVal))]}
                            onValueChange={(value) => updateStyles({ [key]: `${value[0]}px` })}
                            max={100}
                            min={0}
                            step={1}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>0px</span>
                            <span>{stripPx(component.styles[key] || defaultVal)}px</span>
                            <span>100px</span>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500">
                External spacing around the spacer element
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };



  const handlePreviewEmail = () => {
    const html = getBuilderHtml();
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      toast({
        title: "Vista previa generada",
        description: "Se ha abierto la vista previa del email en una nueva ventana.",
      });
    } else {
      toast({
        title: "Error en vista previa",
        description: "No se pudo abrir la ventana de vista previa.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Email CreAItor</h1>
          <p className="text-gray-600">Create professional emails for KAVAK with artificial intelligence</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="templates">1. Templates</TabsTrigger>
            <TabsTrigger value="builder" disabled={!selectedTemplate}>2. Builder</TabsTrigger>
            <TabsTrigger value="preview" disabled={!selectedTemplate}>3. Preview</TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates" className="mt-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Select a Template</h2>
              <p className="text-gray-600">Start by choosing a template for your KAVAK email</p>
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
                          Continue →
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
              <div className="flex gap-3" style={{ height: 'calc(100vh - 300px)' }}>
                {/* Components Sidebar */}
                <div className="w-1/5 xl:w-[20%] flex-shrink-0">
                  <Card className="h-full flex flex-col">
                    <CardHeader className="flex-shrink-0">
                      <CardTitle className="text-lg">Tools</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto space-y-6">
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
                          disabled={!templateName.trim()}
                          variant="secondary"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Email Builder Canvas */}
                <div className="flex-1">
                  <Card className="h-full flex flex-col">
                    <CardHeader className="flex-shrink-0">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Email Builder</CardTitle>
                        <Button 
                          onClick={() => setActiveTab('preview')}
                          size="sm"
                        >
                          Preview →
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 flex flex-col">
                      <div className="flex-1 overflow-y-auto bg-gray-100 p-4 flex justify-center">
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
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Properties Panel */}
                <div className="w-1/3 xl:w-[35%] flex-shrink-0">
                  <Card className="h-full">
                    <CardHeader className="bg-white border-b sticky top-0 z-10">
                      <CardTitle className="text-lg">Properties</CardTitle>
                    </CardHeader>
                    <div className="flex-1 overflow-y-auto" style={{ height: 'calc(100vh - 380px)' }}>
                      <CardContent className="p-4">
                        {selectedComponent ? (
                          <div className="space-y-4">
                            {renderComponentProperties(emailComponents.find(c => c.id === selectedComponent)!)}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm">Select a component to edit it</p>
                        )}
                      </CardContent>
                    </div>
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
                  <h3 className="text-xl font-semibold">Final Preview</h3>
                  <div className="flex space-x-3">
                    <Button onClick={handlePreviewEmail} variant="outline">
                      <Eye className="h-4 w-4 mr-2" />
                      Open in New Window
                    </Button>
                    <Button onClick={() => {
                      const html = getBuilderHtml();
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
                    }}>
                      <Download className="h-4 w-4 mr-2" />
                      Download HTML
                    </Button>
                  </div>
                </div>
                
                <Card>
                  <CardContent className="p-8">
                    <div className="max-w-2xl mx-auto bg-white border rounded-lg overflow-hidden shadow-lg">
                      {/* Live preview using the same components as builder */}
                      <div className="w-full max-w-[600px] bg-white mx-auto">
                        <div className="p-4 border-b bg-gray-50">
                          <div className="font-semibold">{emailContent.subject}</div>
                        </div>
                        {emailComponents.map((component) => (
                          <div key={component.id}>
                            {renderEmailComponent(component)}
                          </div>
                        ))}
                        <div className="p-8 text-center text-gray-600 text-sm bg-gray-50 border-t">
                          <p className="mb-1"><strong>KAVAK</strong> - Tu experiencia automotriz</p>
                          <p className="mb-1">© {new Date().getFullYear()} KAVAK. Todos los derechos reservados.</p>
                          <p className="text-xs text-gray-500">Este email fue generado con Email CreAItor</p>
                        </div>
                      </div>
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
            <div className="bg-white rounded-lg p-6 xl:p-8 max-w-6xl xl:max-w-7xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 xl:mb-6">
                <h3 className="text-lg xl:text-xl font-semibold">Select Image from Gallery</h3>
                <Button
                  variant="outline"
                  onClick={() => setShowImageGallery(false)}
                  className="xl:px-6"
                >
                  Close
                </Button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4 xl:gap-6">
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
                        Select
                      </Button>
                    </div>
                  </div>
                )) || (
                  <div className="col-span-full text-center py-8">
                    <p className="text-gray-500">No images in gallery</p>
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