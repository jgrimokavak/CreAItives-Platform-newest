import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { useEmailBuilder } from './EmailBuilderContext';
import { EmailComponent } from '@shared/email-types';
import { cn } from '@/lib/utils';

export const EmailCanvas: React.FC = () => {
  const { 
    emailComponents, 
    emailContent, 
    setEmailContent, 
    selectedComponent, 
    setSelectedComponent,
    removeComponent,
    reorderComponents,
    setShowImageGallery
  } = useEmailBuilder();

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const { source, destination } = result;
    if (source.index !== destination.index) {
      reorderComponents(source.index, destination.index);
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

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Constructor de Email</CardTitle>
          <Button 
            size="sm"
            variant="outline"
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
                onChange={(e) => setEmailContent({ subject: e.target.value })}
                placeholder="Asunto del email"
                className="font-semibold bg-white"
              />
            </div>

            {/* Draggable Components */}
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="email-components">
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={cn(
                      "min-h-[400px]",
                      snapshot.isDraggingOver && "bg-blue-50"
                    )}
                  >
                    {emailComponents.map((component, index) => (
                      <Draggable 
                        key={component.id} 
                        draggableId={component.id} 
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={cn(
                              "relative group border-2 border-transparent hover:border-blue-300 cursor-pointer",
                              selectedComponent === component.id && "border-blue-500 bg-blue-50",
                              snapshot.isDragging && "shadow-lg rotate-2"
                            )}
                            onClick={() => setSelectedComponent(component.id)}
                          >
                            {/* Drag Handle */}
                            <div 
                              {...provided.dragHandleProps}
                              className="absolute left-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-white rounded p-1 shadow-sm"
                            >
                              <GripVertical className="h-4 w-4 text-gray-400" />
                            </div>

                            {/* Delete Button */}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-white hover:bg-red-50 hover:text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeComponent(component.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>

                            {/* Component Content */}
                            <div 
                              className="p-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (component.type === 'image' && !component.content.src) {
                                  setSelectedComponent(component.id);
                                  setShowImageGallery(true);
                                }
                              }}
                            >
                              {renderEmailComponent(component)}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    
                    {/* Empty State */}
                    {emailComponents.length === 0 && (
                      <div className="flex items-center justify-center h-64 text-gray-500">
                        <div className="text-center">
                          <div className="text-sm font-medium">Tu email está vacío</div>
                          <div className="text-xs mt-1">Agrega elementos desde la barra lateral</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};