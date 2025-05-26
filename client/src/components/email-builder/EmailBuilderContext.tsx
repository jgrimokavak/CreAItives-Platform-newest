import React, { createContext, useContext, useState, useCallback } from 'react';
import { EmailComponent, EmailContent, EmailBuilderState } from '@shared/email-types';
import { useToast } from '@/hooks/use-toast';

interface EmailBuilderContextType extends EmailBuilderState {
  // Actions
  setSelectedTemplate: (template: string | null) => void;
  setEmailComponents: (components: EmailComponent[]) => void;
  setEmailContent: (content: Partial<EmailBuilderState['emailContent']>) => void;
  setSelectedComponent: (componentId: string | null) => void;
  setTone: (tone: EmailBuilderState['tone']) => void;
  
  // Component operations
  addComponent: (componentType: string) => void;
  updateComponent: (id: string, updates: Partial<EmailComponent>) => void;
  removeComponent: (id: string) => void;
  reorderComponents: (startIndex: number, endIndex: number) => void;
  
  // Template operations
  handleTemplateSelect: (templateId: string) => void;
  generateContent: () => Promise<void>;
  saveTemplate: (templateName: string) => Promise<void>;
  
  // State flags
  isGenerating: boolean;
  showImageGallery: boolean;
  setShowImageGallery: (show: boolean) => void;
}

const EmailBuilderContext = createContext<EmailBuilderContextType | undefined>(undefined);

export const useEmailBuilder = () => {
  const context = useContext(EmailBuilderContext);
  if (!context) {
    throw new Error('useEmailBuilder must be used within EmailBuilderProvider');
  }
  return context;
};

const emailTemplates = [
  {
    id: 'welcome',
    name: 'Bienvenida',
    description: 'Email de bienvenida para nuevos usuarios',
    color: '#1553ec',
    content: {
      subject: 'Bienvenido a KAVAK',
      header: '¡Bienvenido a KAVAK!',
      body: 'Estamos emocionados de tenerte con nosotros. Tu viaje hacia el auto perfecto comienza aquí.',
      cta: 'Explorar Autos'
    }
  },
  {
    id: 'promotion',
    name: 'Promoción',
    description: 'Email promocional con ofertas especiales',
    color: '#e74c3c',
    content: {
      subject: 'Oferta Especial KAVAK',
      header: '¡Oferta Limitada!',
      body: 'Encuentra increíbles descuentos en nuestros autos seminuevos. No te pierdas esta oportunidad única.',
      cta: 'Ver Ofertas'
    }
  },
  {
    id: 'newsletter',
    name: 'Newsletter',
    description: 'Newsletter mensual con novedades',
    color: '#27ae60',
    content: {
      subject: 'Newsletter KAVAK - Novedades del Mes',
      header: 'Novedades del Mes',
      body: 'Descubre las últimas noticias, consejos y nuevos autos que llegaron a nuestra plataforma.',
      cta: 'Leer Más'
    }
  }
];

export const EmailBuilderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [emailComponents, setEmailComponents] = useState<EmailComponent[]>([]);
  const [emailContent, setEmailContentState] = useState({
    subject: '',
    header: '',
    body: '',
    cta: ''
  });
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [tone, setTone] = useState<EmailBuilderState['tone']>('friendly');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);
  
  const { toast } = useToast();

  const setEmailContent = useCallback((updates: Partial<EmailBuilderState['emailContent']>) => {
    setEmailContentState(prev => ({ ...prev, ...updates }));
  }, []);

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

  const addComponent = useCallback((componentType: string) => {
    const template = emailTemplates.find(t => t.id === selectedTemplate);
    const templateColor = template?.color || '#1553ec';
    
    const newComponent: EmailComponent = {
      id: `${componentType}-${Date.now()}`,
      type: componentType as any,
      content: getDefaultContent(componentType),
      styles: getDefaultStyles(componentType, templateColor)
    };
    setEmailComponents(prev => [...prev, newComponent]);
  }, [selectedTemplate]);

  const updateComponent = useCallback((id: string, updates: Partial<EmailComponent>) => {
    setEmailComponents(prev => 
      prev.map(comp => comp.id === id ? { ...comp, ...updates } : comp)
    );
  }, []);

  const removeComponent = useCallback((id: string) => {
    setEmailComponents(prev => prev.filter(comp => comp.id !== id));
    if (selectedComponent === id) {
      setSelectedComponent(null);
    }
  }, [selectedComponent]);

  const reorderComponents = useCallback((startIndex: number, endIndex: number) => {
    setEmailComponents(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  }, []);

  const handleTemplateSelect = useCallback((templateId: string) => {
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
    }
  }, [setEmailContent]);

  const generateContent = useCallback(async () => {
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
  }, [selectedTemplate, tone, toast, setEmailContent]);

  const saveTemplate = useCallback(async (templateName: string) => {
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
  }, [emailContent, emailComponents, toast]);

  const value: EmailBuilderContextType = {
    // State
    selectedTemplate,
    emailComponents,
    emailContent,
    selectedComponent,
    tone,
    isGenerating,
    showImageGallery,
    
    // Setters
    setSelectedTemplate,
    setEmailComponents,
    setEmailContent,
    setSelectedComponent,
    setTone,
    setShowImageGallery,
    
    // Actions
    addComponent,
    updateComponent,
    removeComponent,
    reorderComponents,
    handleTemplateSelect,
    generateContent,
    saveTemplate
  };

  return (
    <EmailBuilderContext.Provider value={value}>
      {children}
    </EmailBuilderContext.Provider>
  );
};