import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEmailBuilder } from './EmailBuilderContext';

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

export const TemplateSelector: React.FC = () => {
  const { selectedTemplate, handleTemplateSelect } = useEmailBuilder();

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-gray-900">Constructor de Emails KAVAK</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Crea emails profesionales con IA. Selecciona una plantilla para comenzar.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {emailTemplates.map((template) => (
          <Card 
            key={template.id}
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedTemplate === template.id 
                ? 'ring-2 ring-blue-500 shadow-lg' 
                : 'hover:shadow-md'
            }`}
            onClick={() => handleTemplateSelect(template.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <div 
                  className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: template.color }}
                />
              </div>
              <p className="text-sm text-gray-600">{template.description}</p>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {/* Preview */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div 
                    className="text-center text-white text-sm font-semibold py-2 px-3 rounded"
                    style={{ backgroundColor: template.color }}
                  >
                    {template.content.header}
                  </div>
                  <div className="text-xs text-gray-700 leading-relaxed">
                    {template.content.body.substring(0, 80)}...
                  </div>
                  <div className="text-center">
                    <span 
                      className="inline-block text-white text-xs py-1 px-3 rounded"
                      style={{ backgroundColor: template.color }}
                    >
                      {template.content.cta}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">
                    Email Marketing
                  </Badge>
                  {selectedTemplate === template.id && (
                    <Badge className="text-xs bg-blue-500">
                      Seleccionado
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedTemplate && (
        <div className="text-center">
          <p className="text-green-600 font-medium">
            ✓ Plantilla seleccionada. Continúa al constructor para personalizar tu email.
          </p>
        </div>
      )}
    </div>
  );
};