import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, Download, Share2 } from 'lucide-react';
import { useEmailBuilder } from './EmailBuilderContext';

export const PreviewPane: React.FC = () => {
  const { 
    emailComponents, 
    emailContent, 
    setEmailContent,
    saveTemplate 
  } = useEmailBuilder();

  const [templateName, setTemplateName] = React.useState('');

  const generateEmailHTML = () => {
    const componentHTML = emailComponents.map(component => {
      switch (component.type) {
        case 'text':
          return `<div style="${Object.entries(component.styles).map(([key, value]) => `${key}: ${value}`).join('; ')}">${component.content.text}</div>`;
        case 'image':
          return component.content.src ? 
            `<img src="${component.content.src}" alt="${component.content.alt}" style="${Object.entries(component.styles).map(([key, value]) => `${key}: ${value}`).join('; ')}; max-width: 100%;" />` :
            `<div style="${Object.entries(component.styles).map(([key, value]) => `${key}: ${value}`).join('; ')}; border: 2px dashed #ccc; min-height: 100px; display: flex; align-items: center; justify-content: center;"><span style="color: #666;">Imagen no disponible</span></div>`;
        case 'button':
          return `<div style="text-align: center; padding: 10px;"><a href="${component.content.href}" style="${Object.entries(component.styles).map(([key, value]) => `${key}: ${value}`).join('; ')}">${component.content.text}</a></div>`;
        case 'spacer':
          return `<div style="${Object.entries(component.styles).map(([key, value]) => `${key}: ${value}`).join('; ')}"></div>`;
        default:
          return '';
      }
    }).join('');

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${emailContent.subject}</title>
    <style>
        body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5; }
        .email-container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .email-subject { padding: 20px; background-color: #f8f9fa; border-bottom: 1px solid #e9ecef; font-weight: bold; }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-subject">${emailContent.subject}</div>
        <div class="email-content">
            ${componentHTML}
        </div>
    </div>
</body>
</html>`;
  };

  const handlePreviewEmail = () => {
    const htmlContent = generateEmailHTML();
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    URL.revokeObjectURL(url);
  };

  const handleDownloadHTML = () => {
    const htmlContent = generateEmailHTML();
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-kavak-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveTemplate = async () => {
    if (templateName.trim()) {
      await saveTemplate(templateName);
      setTemplateName('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Vista Previa Final</h3>
        <div className="flex space-x-3">
          <Button onClick={handlePreviewEmail} variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            Abrir en Nueva Ventana
          </Button>
          <Button onClick={handleDownloadHTML} size="sm">
            <Download className="h-4 w-4 mr-2" />
            Descargar HTML
          </Button>
        </div>
      </div>
      
      {/* Preview Container */}
      <Card>
        <CardContent className="p-8">
          <div className="max-w-2xl mx-auto bg-white border rounded-lg overflow-hidden shadow-lg">
            {/* Subject Line */}
            <div className="p-4 bg-gray-50 border-b">
              <div className="text-sm text-gray-600">Asunto:</div>
              <div className="font-semibold">{emailContent.subject || 'Sin asunto'}</div>
            </div>
            
            {/* Email Content */}
            <div className="bg-white">
              <div dangerouslySetInnerHTML={{ __html: generateEmailHTML().match(/<div class="email-content">([\s\S]*?)<\/div>/)?.[1] || '' }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Template Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Guardar como Plantilla</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Nombre de la plantilla</Label>
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Mi plantilla personalizada"
              className="mt-1"
            />
          </div>
          <Button 
            onClick={handleSaveTemplate}
            disabled={!templateName.trim()}
            className="w-full"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Guardar Plantilla
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};