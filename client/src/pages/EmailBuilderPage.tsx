import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Download, Eye, Sparkles, FileText, Gift, Newspaper } from 'lucide-react';
import { cn } from '@/lib/utils';

// Email template definitions in Spanish for KAVAK
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
  type: 'text' | 'image' | 'button' | 'spacer' | 'background' | 'column';
  content: any;
  styles: Record<string, any>;
}

export default function EmailBuilderPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [emailContent, setEmailContent] = useState({
    subject: '',
    header: '',
    body: '',
    cta: ''
  });
  const [activeTab, setActiveTab] = useState('templates');

  const handleTemplateSelect = (templateId: string) => {
    const template = emailTemplates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setEmailContent(template.content);
      setActiveTab('builder');
    }
  };

  const generateEmailHTML = () => {
    const template = emailTemplates.find(t => t.id === selectedTemplate);
    const primaryColor = template?.color || '#1553ec';
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${emailContent.subject}</title>
    <style>
        body { margin: 0; padding: 0; font-family: 'Roboto', 'Helvetica', Arial, sans-serif; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background-color: ${primaryColor}; color: #ffffff; padding: 40px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
        .content { padding: 40px 20px; }
        .content h2 { color: #333333; font-size: 24px; margin-bottom: 20px; }
        .content p { color: #666666; font-size: 16px; line-height: 1.6; margin-bottom: 20px; }
        .cta-button { display: inline-block; background-color: ${primaryColor}; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 20px; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666666; font-size: 14px; }
        .logo { max-width: 150px; height: auto; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${emailContent.header}</h1>
        </div>
        <div class="content">
            <p>${emailContent.body}</p>
            <a href="#" class="cta-button">${emailContent.cta}</a>
        </div>
        <div class="footer">
            <p>KAVAK - Tu experiencia automotriz</p>
            <p>© 2025 KAVAK. Todos los derechos reservados.</p>
        </div>
    </div>
</body>
</html>`;
  };

  const handleExportHTML = () => {
    const html = generateEmailHTML();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kavak-email-${selectedTemplate}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Mail className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Email CreAItor</h1>
              <p className="text-sm text-gray-500">Crea emails profesionales con IA para KAVAK</p>
            </div>
          </div>
          
          {selectedTemplate && (
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                Vista previa
              </Button>
              <Button onClick={handleExportHTML} size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar HTML
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="templates" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Plantillas</span>
            </TabsTrigger>
            <TabsTrigger value="builder" disabled={!selectedTemplate} className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4" />
              <span>Editor</span>
            </TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    <p className="text-sm text-gray-600 text-center">
                      {template.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Builder Tab */}
          <TabsContent value="builder" className="mt-6">
            {selectedTemplate && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Email Editor */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Sparkles className="h-5 w-5 text-blue-600" />
                      <span>Editor de Contenido</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="subject">Asunto del Email</Label>
                      <Input
                        id="subject"
                        value={emailContent.subject}
                        onChange={(e) => setEmailContent(prev => ({ ...prev, subject: e.target.value }))}
                        placeholder="Escribe el asunto del email"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="header">Encabezado Principal</Label>
                      <Input
                        id="header"
                        value={emailContent.header}
                        onChange={(e) => setEmailContent(prev => ({ ...prev, header: e.target.value }))}
                        placeholder="Título principal del email"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="body">Contenido Principal</Label>
                      <Textarea
                        id="body"
                        value={emailContent.body}
                        onChange={(e) => setEmailContent(prev => ({ ...prev, body: e.target.value }))}
                        placeholder="Escribe el contenido principal del email"
                        rows={4}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="cta">Texto del Botón</Label>
                      <Input
                        id="cta"
                        value={emailContent.cta}
                        onChange={(e) => setEmailContent(prev => ({ ...prev, cta: e.target.value }))}
                        placeholder="Texto del botón de acción"
                      />
                    </div>
                    
                    <Button className="w-full mt-4">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generar con IA
                    </Button>
                  </CardContent>
                </Card>

                {/* Email Preview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Eye className="h-5 w-5 text-green-600" />
                      <span>Vista Previa</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
                      <div 
                        className="max-w-sm mx-auto bg-white rounded-lg shadow-sm overflow-hidden"
                        style={{ minHeight: '300px' }}
                      >
                        {/* Email Header */}
                        <div 
                          className="p-6 text-white text-center"
                          style={{ backgroundColor: emailTemplates.find(t => t.id === selectedTemplate)?.color }}
                        >
                          <h2 className="text-lg font-bold">{emailContent.header}</h2>
                        </div>
                        
                        {/* Email Content */}
                        <div className="p-6">
                          <p className="text-gray-700 text-sm mb-4">{emailContent.body}</p>
                          <button 
                            className="w-full py-2 px-4 rounded text-white font-medium text-sm"
                            style={{ backgroundColor: emailTemplates.find(t => t.id === selectedTemplate)?.color }}
                          >
                            {emailContent.cta}
                          </button>
                        </div>
                        
                        {/* Email Footer */}
                        <div className="p-4 bg-gray-100 text-center">
                          <p className="text-xs text-gray-600">KAVAK - Tu experiencia automotriz</p>
                        </div>
                      </div>
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