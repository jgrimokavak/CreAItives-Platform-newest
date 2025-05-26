import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  EmailBuilderProvider,
  TemplateSelector,
  ComponentSidebar,
  EmailCanvas,
  PropertiesPanel,
  PreviewPane,
  ImageGalleryModal,
  useEmailBuilder
} from '@/components/email-builder';

const EmailBuilderContent: React.FC = () => {
  const { selectedTemplate } = useEmailBuilder();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <Tabs defaultValue="templates" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="templates">Plantillas</TabsTrigger>
            <TabsTrigger value="builder" disabled={!selectedTemplate}>
              Constructor
            </TabsTrigger>
            <TabsTrigger value="preview" disabled={!selectedTemplate}>
              Vista Previa
            </TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates" className="mt-6">
            <TemplateSelector />
          </TabsContent>

          {/* Builder Tab */}
          <TabsContent value="builder" className="mt-6">
            {selectedTemplate && (
              <div className="grid grid-cols-12 gap-6" style={{ height: 'calc(100vh - 300px)' }}>
                {/* Components Sidebar */}
                <div className="col-span-3">
                  <ComponentSidebar />
                </div>

                {/* Email Canvas */}
                <div className="col-span-6">
                  <EmailCanvas />
                </div>

                {/* Properties Panel */}
                <div className="col-span-3">
                  <PropertiesPanel />
                </div>
              </div>
            )}
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="mt-6">
            {selectedTemplate && <PreviewPane />}
          </TabsContent>
        </Tabs>

        {/* Image Gallery Modal */}
        <ImageGalleryModal />
      </div>
    </div>
  );
};

export default function EmailBuilderPage() {
  return (
    <EmailBuilderProvider>
      <EmailBuilderContent />
    </EmailBuilderProvider>
  );
}