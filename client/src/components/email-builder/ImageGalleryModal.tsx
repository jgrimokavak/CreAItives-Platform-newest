import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Image as ImageIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useEmailBuilder } from './EmailBuilderContext';

export const ImageGalleryModal: React.FC = () => {
  const { 
    showImageGallery, 
    setShowImageGallery, 
    selectedComponent, 
    updateComponent,
    emailComponents 
  } = useEmailBuilder();

  // Fetch images from gallery for image selection
  const { data: galleryImages = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/gallery'],
    enabled: showImageGallery
  });

  const selectImageFromGallery = (imageUrl: string) => {
    if (selectedComponent) {
      const component = emailComponents.find(c => c.id === selectedComponent);
      if (component && component.type === 'image') {
        updateComponent(selectedComponent, {
          content: { ...component.content, src: imageUrl }
        });
        setShowImageGallery(false);
      }
    }
  };

  return (
    <Dialog open={showImageGallery} onOpenChange={setShowImageGallery}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Galería de Imágenes
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowImageGallery(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[60vh]">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Cargando imágenes...</p>
              </div>
            </div>
          ) : galleryImages.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center text-gray-500">
                <ImageIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No hay imágenes disponibles</p>
                <p className="text-sm">Sube algunas imágenes a la galería para usarlas en tus emails</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {galleryImages.map((image: any) => (
                <Card 
                  key={image.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => selectImageFromGallery(image.url)}
                >
                  <CardContent className="p-2">
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-2">
                      <img
                        src={image.thumbUrl || image.url}
                        alt={image.prompt || 'Gallery image'}
                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-600 truncate">
                        {image.prompt || 'Sin descripción'}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{image.size}</span>
                        <span>{image.model}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setShowImageGallery(false)}
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};