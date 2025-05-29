// MJML Component Attribute Schema Registry
// This defines all supported MJML attributes for each component type

export interface MJMLAttributeDefinition {
  key: string;
  label: string;
  type: 'text' | 'number' | 'color' | 'select' | 'url' | 'dimension';
  defaultValue?: string;
  options?: string[]; // For select type
  description?: string;
  category: 'content' | 'layout' | 'styling' | 'spacing' | 'typography';
}

export const MJML_COMPONENT_SCHEMAS: Record<string, MJMLAttributeDefinition[]> = {
  text: [
    // Typography
    { key: 'font-family', label: 'Font Family', type: 'text', defaultValue: 'Arial, sans-serif', category: 'typography' },
    { key: 'font-size', label: 'Font Size', type: 'dimension', defaultValue: '16px', category: 'typography' },
    { key: 'font-weight', label: 'Font Weight', type: 'select', defaultValue: 'normal', options: ['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'], category: 'typography' },
    { key: 'color', label: 'Text Color', type: 'color', defaultValue: '#000000', category: 'typography' },
    { key: 'line-height', label: 'Line Height', type: 'text', defaultValue: '1.6', category: 'typography' },
    { key: 'letter-spacing', label: 'Letter Spacing', type: 'dimension', defaultValue: 'normal', category: 'typography' },
    
    // Layout
    { key: 'align', label: 'Text Alignment', type: 'select', defaultValue: 'left', options: ['left', 'center', 'right', 'justify'], category: 'layout' },
    
    // Spacing
    { key: 'padding', label: 'Padding', type: 'dimension', defaultValue: '10px 25px', category: 'spacing' },
    { key: 'padding-top', label: 'Padding Top', type: 'dimension', category: 'spacing' },
    { key: 'padding-bottom', label: 'Padding Bottom', type: 'dimension', category: 'spacing' },
    { key: 'padding-left', label: 'Padding Left', type: 'dimension', category: 'spacing' },
    { key: 'padding-right', label: 'Padding Right', type: 'dimension', category: 'spacing' },
    
    // Styling
    { key: 'background-color', label: 'Background Color', type: 'color', category: 'styling' },
    { key: 'container-background-color', label: 'Container Background', type: 'color', category: 'styling' },
    { key: 'text-decoration', label: 'Text Decoration', type: 'select', options: ['none', 'underline', 'overline', 'line-through'], category: 'styling' },
    { key: 'text-transform', label: 'Text Transform', type: 'select', options: ['none', 'capitalize', 'uppercase', 'lowercase'], category: 'styling' },
  ],
  
  image: [
    // Content
    { key: 'src', label: 'Image URL', type: 'url', category: 'content' },
    { key: 'alt', label: 'Alt Text', type: 'text', category: 'content' },
    { key: 'title', label: 'Title', type: 'text', category: 'content' },
    { key: 'href', label: 'Link URL', type: 'url', category: 'content' },
    { key: 'target', label: 'Link Target', type: 'select', options: ['_blank', '_self'], defaultValue: '_blank', category: 'content' },
    
    // Layout
    { key: 'width', label: 'Width', type: 'dimension', defaultValue: '600px', category: 'layout' },
    { key: 'height', label: 'Height', type: 'dimension', category: 'layout' },
    { key: 'align', label: 'Alignment', type: 'select', defaultValue: 'center', options: ['left', 'center', 'right'], category: 'layout' },
    
    // Spacing
    { key: 'padding', label: 'Padding', type: 'dimension', defaultValue: '10px 25px', category: 'spacing' },
    { key: 'padding-top', label: 'Padding Top', type: 'dimension', category: 'spacing' },
    { key: 'padding-bottom', label: 'Padding Bottom', type: 'dimension', category: 'spacing' },
    { key: 'padding-left', label: 'Padding Left', type: 'dimension', category: 'spacing' },
    { key: 'padding-right', label: 'Padding Right', type: 'dimension', category: 'spacing' },
    
    // Styling
    { key: 'border', label: 'Border', type: 'text', description: 'e.g., 1px solid #000', category: 'styling' },
    { key: 'border-radius', label: 'Border Radius', type: 'dimension', category: 'styling' },
    { key: 'container-background-color', label: 'Container Background', type: 'color', category: 'styling' },
  ],
  
  button: [
    // Content
    { key: 'href', label: 'Link URL', type: 'url', category: 'content' },
    { key: 'target', label: 'Link Target', type: 'select', options: ['_blank', '_self'], defaultValue: '_blank', category: 'content' },
    { key: 'name', label: 'Button Name', type: 'text', category: 'content' },
    { key: 'rel', label: 'Rel Attribute', type: 'text', category: 'content' },
    
    // Typography
    { key: 'font-family', label: 'Font Family', type: 'text', defaultValue: 'Arial, sans-serif', category: 'typography' },
    { key: 'font-size', label: 'Font Size', type: 'dimension', defaultValue: '16px', category: 'typography' },
    { key: 'font-weight', label: 'Font Weight', type: 'select', defaultValue: 'normal', options: ['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'], category: 'typography' },
    { key: 'color', label: 'Text Color', type: 'color', defaultValue: '#ffffff', category: 'typography' },
    { key: 'line-height', label: 'Line Height', type: 'text', defaultValue: '120%', category: 'typography' },
    { key: 'letter-spacing', label: 'Letter Spacing', type: 'dimension', category: 'typography' },
    { key: 'text-decoration', label: 'Text Decoration', type: 'select', options: ['none', 'underline', 'overline', 'line-through'], category: 'typography' },
    { key: 'text-transform', label: 'Text Transform', type: 'select', options: ['none', 'capitalize', 'uppercase', 'lowercase'], category: 'typography' },
    
    // Layout
    { key: 'align', label: 'Button Alignment', type: 'select', defaultValue: 'center', options: ['left', 'center', 'right'], category: 'layout' },
    { key: 'width', label: 'Width', type: 'dimension', category: 'layout' },
    { key: 'height', label: 'Height', type: 'dimension', category: 'layout' },
    
    // Styling
    { key: 'background-color', label: 'Background Color', type: 'color', defaultValue: '#1553ec', category: 'styling' },
    { key: 'border', label: 'Border', type: 'text', description: 'e.g., 1px solid #000', category: 'styling' },
    { key: 'border-radius', label: 'Border Radius', type: 'dimension', defaultValue: '6px', category: 'styling' },
    { key: 'container-background-color', label: 'Container Background', type: 'color', category: 'styling' },
    
    // Spacing
    { key: 'padding', label: 'Padding', type: 'dimension', defaultValue: '10px 25px', category: 'spacing' },
    { key: 'padding-top', label: 'Padding Top', type: 'dimension', category: 'spacing' },
    { key: 'padding-bottom', label: 'Padding Bottom', type: 'dimension', category: 'spacing' },
    { key: 'padding-left', label: 'Padding Left', type: 'dimension', category: 'spacing' },
    { key: 'padding-right', label: 'Padding Right', type: 'dimension', category: 'spacing' },
    { key: 'inner-padding', label: 'Inner Padding', type: 'dimension', defaultValue: '10px 25px', category: 'spacing' },
  ],
  
  spacer: [
    // Layout
    { key: 'height', label: 'Height', type: 'dimension', defaultValue: '20px', category: 'layout' },
    
    // Styling
    { key: 'container-background-color', label: 'Container Background', type: 'color', category: 'styling' },
    
    // Spacing (for container)
    { key: 'padding', label: 'Padding', type: 'dimension', category: 'spacing' },
    { key: 'padding-top', label: 'Padding Top', type: 'dimension', category: 'spacing' },
    { key: 'padding-bottom', label: 'Padding Bottom', type: 'dimension', category: 'spacing' },
    { key: 'padding-left', label: 'Padding Left', type: 'dimension', category: 'spacing' },
    { key: 'padding-right', label: 'Padding Right', type: 'dimension', category: 'spacing' },
  ]
};

// Helper function to get all attributes for a component type
export function getMJMLAttributes(componentType: string): MJMLAttributeDefinition[] {
  return MJML_COMPONENT_SCHEMAS[componentType] || [];
}

// Helper function to get attributes by category
export function getMJMLAttributesByCategory(componentType: string, category: string): MJMLAttributeDefinition[] {
  return getMJMLAttributes(componentType).filter(attr => attr.category === category);
}

// Helper function to get attribute definition
export function getMJMLAttributeDefinition(componentType: string, attributeKey: string): MJMLAttributeDefinition | undefined {
  return getMJMLAttributes(componentType).find(attr => attr.key === attributeKey);
}

// Get all available categories for a component
export function getMJMLCategories(componentType: string): string[] {
  const attributes = getMJMLAttributes(componentType);
  const categories = [...new Set(attributes.map(attr => attr.category))];
  return categories.sort();
}