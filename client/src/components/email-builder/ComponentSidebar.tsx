import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Image, Mail, Plus, Wand2 } from 'lucide-react';
import { useEmailBuilder } from './EmailBuilderContext';

const componentTypes = [
  { type: 'text', name: 'Texto', icon: <FileText className="h-4 w-4" />, description: 'Párrafo de texto' },
  { type: 'image', name: 'Imagen', icon: <Image className="h-4 w-4" />, description: 'Imagen o logo' },
  { type: 'button', name: 'Botón', icon: <Mail className="h-4 w-4" />, description: 'Botón de acción' },
  { type: 'spacer', name: 'Espaciador', icon: <Plus className="h-4 w-4" />, description: 'Espacio en blanco' }
];

export const ComponentSidebar: React.FC = () => {
  const { tone, setTone, generateContent, isGenerating, addComponent } = useEmailBuilder();

  return (
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
            onClick={generateContent}
            disabled={isGenerating}
            className="w-full"
            size="sm"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Generando...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                Generar Contenido
              </>
            )}
          </Button>
        </div>

        {/* Component Types */}
        <div className="space-y-3">
          <Label className="font-semibold">Agregar Elementos</Label>
          <div className="grid gap-2">
            {componentTypes.map((componentType) => (
              <Button
                key={componentType.type}
                variant="outline"
                size="sm"
                onClick={() => addComponent(componentType.type)}
                className="justify-start h-auto p-3 text-left"
              >
                <div className="flex items-start space-x-3 w-full">
                  <div className="flex-shrink-0 mt-0.5">
                    {componentType.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">
                      {componentType.name}
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      {componentType.description}
                    </div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3 pt-4 border-t">
          <Label className="font-semibold text-xs text-gray-600">Acciones Rápidas</Label>
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => addComponent('text')}
            >
              <FileText className="h-3 w-3 mr-2" />
              Agregar Párrafo
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => addComponent('button')}
            >
              <Mail className="h-3 w-3 mr-2" />
              Agregar CTA
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};