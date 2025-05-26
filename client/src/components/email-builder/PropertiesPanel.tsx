import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sliders } from 'lucide-react';
import { useEmailBuilder } from './EmailBuilderContext';
import { EmailComponent } from '@shared/email-types';

export const PropertiesPanel: React.FC = () => {
  const { 
    selectedComponent, 
    emailComponents, 
    updateComponent,
    setShowImageGallery
  } = useEmailBuilder();

  if (!selectedComponent) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg">Propiedades</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-gray-500">
            <div className="text-sm">Selecciona un elemento</div>
            <div className="text-xs mt-1">para editar sus propiedades</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const component = emailComponents.find(c => c.id === selectedComponent);
  if (!component) return null;

  const updateContent = (updates: any) => {
    updateComponent(component.id, { content: { ...component.content, ...updates } });
  };

  const updateStyles = (updates: any) => {
    updateComponent(component.id, { styles: { ...component.styles, ...updates } });
  };

  const stripPx = (value: string) => {
    return value?.replace('px', '') || '0';
  };

  const addPx = (value: string) => {
    if (!value) return '0px';
    const num = parseInt(value);
    return isNaN(num) ? '0px' : `${num}px`;
  };

  const renderTextProperties = (component: EmailComponent) => (
    <div className="space-y-4">
      {/* Content */}
      <div>
        <Label className="font-semibold">Contenido</Label>
        <Textarea
          value={component.content.text || ''}
          onChange={(e) => updateContent({ text: e.target.value })}
          rows={3}
          className="mt-1"
        />
      </div>

      {/* Typography */}
      <div className="space-y-3">
        <Label className="font-medium text-sm">Tipografía</Label>
        
        <div className="space-y-2">
          <Label className="text-xs text-gray-600">Fuente</Label>
          <Select 
            value={component.styles.fontFamily || 'Arial, sans-serif'} 
            onValueChange={(value) => updateStyles({ fontFamily: value })}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Arial, sans-serif">Arial</SelectItem>
              <SelectItem value="Helvetica, sans-serif">Helvetica</SelectItem>
              <SelectItem value="Georgia, serif">Georgia</SelectItem>
              <SelectItem value="Times New Roman, serif">Times New Roman</SelectItem>
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
                    max={72}
                    min={8}
                    step={1}
                    className="w-full"
                  />
                  <div className="text-xs text-center text-gray-600">
                    {stripPx(component.styles.fontSize || '16px')}px
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-gray-600">Color</Label>
            <Input
              type="color"
              value={component.styles.color || '#000000'}
              onChange={(e) => updateStyles({ color: e.target.value })}
              className="h-9 w-full"
            />
          </div>
        </div>
      </div>

      {/* Spacing */}
      <div className="space-y-3">
        <Label className="font-medium text-sm">Espaciado</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs text-gray-600">Padding</Label>
            <Input
              value={stripPx(component.styles.padding || '15px')}
              onChange={(e) => updateStyles({ padding: addPx(e.target.value) })}
              placeholder="15"
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-gray-600">Margen</Label>
            <Input
              value={stripPx(component.styles.margin || '0px')}
              onChange={(e) => updateStyles({ margin: addPx(e.target.value) })}
              placeholder="0"
              className="h-9"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderImageProperties = (component: EmailComponent) => (
    <div className="space-y-4">
      {/* Image Source */}
      <div>
        <Label className="font-semibold">Imagen</Label>
        <div className="mt-2 space-y-2">
          <Input
            value={component.content.src || ''}
            onChange={(e) => updateContent({ src: e.target.value })}
            placeholder="URL de la imagen"
            className="h-9"
          />
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setShowImageGallery(true)}
          >
            Seleccionar de Galería
          </Button>
        </div>
      </div>

      {/* Alt Text */}
      <div>
        <Label className="text-sm">Texto alternativo</Label>
        <Input
          value={component.content.alt || ''}
          onChange={(e) => updateContent({ alt: e.target.value })}
          placeholder="Descripción de la imagen"
          className="h-9 mt-1"
        />
      </div>

      {/* Dimensions */}
      <div className="space-y-3">
        <Label className="font-medium text-sm">Dimensiones</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs text-gray-600">Ancho</Label>
            <Input
              value={component.content.width || '100%'}
              onChange={(e) => updateContent({ width: e.target.value })}
              placeholder="100%"
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-gray-600">Alto</Label>
            <Input
              value={component.content.height || 'auto'}
              onChange={(e) => updateContent({ height: e.target.value })}
              placeholder="auto"
              className="h-9"
            />
          </div>
        </div>
      </div>

      {/* Link */}
      <div>
        <Label className="text-sm">Enlace (opcional)</Label>
        <Input
          value={component.content.link || ''}
          onChange={(e) => updateContent({ link: e.target.value })}
          placeholder="https://..."
          className="h-9 mt-1"
        />
      </div>
    </div>
  );

  const renderButtonProperties = (component: EmailComponent) => (
    <div className="space-y-4">
      {/* Button Text */}
      <div>
        <Label className="font-semibold">Texto del botón</Label>
        <Input
          value={component.content.text || ''}
          onChange={(e) => updateContent({ text: e.target.value })}
          placeholder="Hacer Clic Aquí"
          className="h-9 mt-1"
        />
      </div>

      {/* Link */}
      <div>
        <Label className="text-sm">Enlace</Label>
        <Input
          value={component.content.href || ''}
          onChange={(e) => updateContent({ href: e.target.value })}
          placeholder="https://..."
          className="h-9 mt-1"
        />
      </div>

      {/* Colors */}
      <div className="space-y-3">
        <Label className="font-medium text-sm">Colores</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs text-gray-600">Fondo</Label>
            <Input
              type="color"
              value={component.styles.backgroundColor || '#1553ec'}
              onChange={(e) => updateStyles({ backgroundColor: e.target.value })}
              className="h-9 w-full"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-gray-600">Texto</Label>
            <Input
              type="color"
              value={component.styles.color || '#ffffff'}
              onChange={(e) => updateStyles({ color: e.target.value })}
              className="h-9 w-full"
            />
          </div>
        </div>
      </div>

      {/* Border Radius */}
      <div>
        <Label className="text-sm">Bordes redondeados</Label>
        <Input
          value={stripPx(component.styles.borderRadius || '6px')}
          onChange={(e) => updateStyles({ borderRadius: addPx(e.target.value) })}
          placeholder="6"
          className="h-9 mt-1"
        />
      </div>
    </div>
  );

  const renderSpacerProperties = (component: EmailComponent) => (
    <div className="space-y-4">
      {/* Height */}
      <div>
        <Label className="font-semibold">Altura</Label>
        <Slider
          value={[parseInt(stripPx(component.styles.height || '20px'))]}
          onValueChange={(value) => updateStyles({ height: `${value[0]}px` })}
          max={200}
          min={5}
          step={5}
          className="w-full mt-2"
        />
        <div className="text-xs text-center text-gray-600 mt-1">
          {stripPx(component.styles.height || '20px')}px
        </div>
      </div>

      {/* Background Color */}
      <div>
        <Label className="text-sm">Color de fondo</Label>
        <Input
          type="color"
          value={component.styles.backgroundColor || 'transparent'}
          onChange={(e) => updateStyles({ backgroundColor: e.target.value })}
          className="h-9 w-full mt-1"
        />
      </div>
    </div>
  );

  const renderComponentProperties = () => {
    switch (component.type) {
      case 'text':
        return renderTextProperties(component);
      case 'image':
        return renderImageProperties(component);
      case 'button':
        return renderButtonProperties(component);
      case 'spacer':
        return renderSpacerProperties(component);
      default:
        return <div className="text-gray-500">Propiedades no disponibles</div>;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Propiedades</span>
          <span className="text-xs font-normal bg-gray-100 px-2 py-1 rounded">
            {component.type}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 max-h-96 overflow-y-auto">
        {renderComponentProperties()}
      </CardContent>
    </Card>
  );
};