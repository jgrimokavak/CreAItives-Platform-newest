// Property Registry - Central schema for all component properties
// This ensures consistency across all components and makes adding new components automatic

export type PropertyControlType = 
  | 'text' 
  | 'textarea' 
  | 'number' 
  | 'color' 
  | 'select' 
  | 'toggle' 
  | 'slider' 
  | 'url' 
  | 'boxModel';

export interface PropertyDefinition {
  key: string;
  label: string;
  type: PropertyControlType;
  group: string;
  groupOrder: number;
  order: number;
  placeholder?: string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  tooltip?: string;
  mjmlAttribute?: string;
  defaultValue?: any;
  validation?: (value: any) => boolean;
}

export interface PropertyGroup {
  key: string;
  label: string;
  order: number;
  icon?: string;
}

// Standard property groups - consistent order across all components
export const PROPERTY_GROUPS: PropertyGroup[] = [
  { key: 'content', label: 'Content', order: 1 },
  { key: 'typography', label: 'Typography', order: 2 },
  { key: 'colors', label: 'Colors & Background', order: 3 },
  { key: 'sizing', label: 'Sizing', order: 4 },
  { key: 'spacing', label: 'Spacing & Padding', order: 5 },
  { key: 'borders', label: 'Borders', order: 6 },
  { key: 'alignment', label: 'Alignment', order: 7 },
  { key: 'action', label: 'Link/Action', order: 8 },
  { key: 'advanced', label: 'Advanced', order: 9 }
];

// Font family options - standardized across all components
const FONT_FAMILIES = [
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Helvetica, sans-serif', label: 'Helvetica' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Times, serif', label: 'Times' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
  { value: 'Trebuchet MS, sans-serif', label: 'Trebuchet MS' },
  { value: 'Courier New, monospace', label: 'Courier New' }
];

// Font size options - standardized
const FONT_SIZES = [
  { value: '12px', label: '12px' },
  { value: '14px', label: '14px' },
  { value: '16px', label: '16px' },
  { value: '18px', label: '18px' },
  { value: '20px', label: '20px' },
  { value: '24px', label: '24px' },
  { value: '28px', label: '28px' },
  { value: '32px', label: '32px' },
  { value: '36px', label: '36px' },
  { value: '48px', label: '48px' }
];

// Component property registry - defines all properties for each component
export const PROPERTY_REGISTRY: Record<string, PropertyDefinition[]> = {
  text: [
    // Content Group
    {
      key: 'text',
      label: 'Text Content',
      type: 'textarea',
      group: 'content',
      groupOrder: 1,
      order: 1,
      placeholder: 'Enter your text',
      mjmlAttribute: 'content',
      defaultValue: 'Add your text here'
    },

    // Typography Group
    {
      key: 'fontFamily',
      label: 'Font Family',
      type: 'select',
      group: 'typography',
      groupOrder: 2,
      order: 1,
      options: FONT_FAMILIES,
      mjmlAttribute: 'font-family',
      defaultValue: 'Arial, sans-serif'
    },
    {
      key: 'fontSize',
      label: 'Font Size',
      type: 'select',
      group: 'typography',
      groupOrder: 2,
      order: 2,
      options: FONT_SIZES,
      mjmlAttribute: 'font-size',
      defaultValue: '16px'
    },
    {
      key: 'fontWeight',
      label: 'Font Weight',
      type: 'select',
      group: 'typography',
      groupOrder: 2,
      order: 3,
      options: [
        { value: 'normal', label: 'Normal' },
        { value: 'bold', label: 'Bold' },
        { value: 'lighter', label: 'Lighter' },
        { value: '300', label: '300' },
        { value: '400', label: '400' },
        { value: '500', label: '500' },
        { value: '600', label: '600' },
        { value: '700', label: '700' }
      ],
      mjmlAttribute: 'font-weight',
      defaultValue: 'normal'
    },
    {
      key: 'fontStyle',
      label: 'Font Style',
      type: 'select',
      group: 'typography',
      groupOrder: 2,
      order: 4,
      options: [
        { value: 'normal', label: 'Normal' },
        { value: 'italic', label: 'Italic' },
        { value: 'oblique', label: 'Oblique' }
      ],
      mjmlAttribute: 'font-style',
      defaultValue: 'normal'
    },
    {
      key: 'lineHeight',
      label: 'Line Height',
      type: 'number',
      group: 'typography',
      groupOrder: 2,
      order: 5,
      min: 0.5,
      max: 3,
      step: 0.1,
      mjmlAttribute: 'line-height',
      defaultValue: '1.6'
    },
    {
      key: 'letterSpacing',
      label: 'Letter Spacing',
      type: 'number',
      group: 'typography',
      groupOrder: 2,
      order: 6,
      min: -5,
      max: 20,
      step: 0.5,
      unit: 'px',
      mjmlAttribute: 'letter-spacing',
      defaultValue: ''
    },
    {
      key: 'textTransform',
      label: 'Text Transform',
      type: 'select',
      group: 'typography',
      groupOrder: 2,
      order: 7,
      options: [
        { value: 'none', label: 'None' },
        { value: 'uppercase', label: 'Uppercase' },
        { value: 'lowercase', label: 'Lowercase' },
        { value: 'capitalize', label: 'Capitalize' }
      ],
      mjmlAttribute: 'text-transform',
      defaultValue: 'none'
    },
    {
      key: 'textDecoration',
      label: 'Text Decoration',
      type: 'select',
      group: 'typography',
      groupOrder: 2,
      order: 8,
      options: [
        { value: 'none', label: 'None' },
        { value: 'underline', label: 'Underline' },
        { value: 'overline', label: 'Overline' },
        { value: 'line-through', label: 'Line Through' }
      ],
      mjmlAttribute: 'text-decoration',
      defaultValue: 'none'
    },

    // Colors & Background Group
    {
      key: 'color',
      label: 'Text Color',
      type: 'color',
      group: 'colors',
      groupOrder: 3,
      order: 1,
      mjmlAttribute: 'color',
      defaultValue: '#000000'
    },
    {
      key: 'backgroundColor',
      label: 'Background Color',
      type: 'color',
      group: 'colors',
      groupOrder: 3,
      order: 2,
      mjmlAttribute: 'background-color',
      defaultValue: 'transparent'
    },

    // Alignment Group
    {
      key: 'textAlign',
      label: 'Text Alignment',
      type: 'select',
      group: 'alignment',
      groupOrder: 7,
      order: 1,
      options: [
        { value: 'left', label: 'Left' },
        { value: 'center', label: 'Center' },
        { value: 'right', label: 'Right' },
        { value: 'justify', label: 'Justify' }
      ],
      mjmlAttribute: 'align',
      defaultValue: 'left'
    },
    {
      key: 'verticalAlign',
      label: 'Vertical Alignment',
      type: 'select',
      group: 'alignment',
      groupOrder: 7,
      order: 2,
      options: [
        { value: 'top', label: 'Top' },
        { value: 'middle', label: 'Middle' },
        { value: 'bottom', label: 'Bottom' }
      ],
      mjmlAttribute: 'vertical-align',
      defaultValue: 'top'
    },

    // Spacing & Padding Group
    {
      key: 'padding',
      label: 'Padding',
      type: 'boxModel',
      group: 'spacing',
      groupOrder: 5,
      order: 1,
      mjmlAttribute: 'padding',
      defaultValue: '10px 25px'
    }
  ],

  image: [
    // Content Group
    {
      key: 'src',
      label: 'Image URL',
      type: 'url',
      group: 'content',
      groupOrder: 1,
      order: 1,
      placeholder: 'https://example.com/image.jpg',
      mjmlAttribute: 'src',
      defaultValue: ''
    },
    {
      key: 'alt',
      label: 'Alt Text',
      type: 'text',
      group: 'content',
      groupOrder: 1,
      order: 2,
      placeholder: 'Describe the image',
      mjmlAttribute: 'alt',
      defaultValue: 'Image description'
    },
    {
      key: 'title',
      label: 'Title',
      type: 'text',
      group: 'content',
      groupOrder: 1,
      order: 3,
      placeholder: 'Image title',
      mjmlAttribute: 'title',
      defaultValue: ''
    },

    // Sizing Group
    {
      key: 'width',
      label: 'Width',
      type: 'number',
      group: 'sizing',
      groupOrder: 4,
      order: 1,
      min: 50,
      max: 800,
      step: 10,
      unit: 'px',
      mjmlAttribute: 'width',
      defaultValue: 600
    },
    {
      key: 'height',
      label: 'Height',
      type: 'text',
      group: 'sizing',
      groupOrder: 4,
      order: 2,
      placeholder: 'auto, 300px',
      mjmlAttribute: 'height',
      defaultValue: 'auto'
    },
    {
      key: 'fluidOnMobile',
      label: 'Fluid on Mobile',
      type: 'toggle',
      group: 'sizing',
      groupOrder: 4,
      order: 3,
      mjmlAttribute: 'fluid-on-mobile',
      defaultValue: false
    },

    // Colors & Background Group
    {
      key: 'containerBackgroundColor',
      label: 'Container Background',
      type: 'color',
      group: 'colors',
      groupOrder: 3,
      order: 1,
      mjmlAttribute: 'container-background-color',
      defaultValue: 'transparent'
    },

    // Borders Group
    {
      key: 'border',
      label: 'Border',
      type: 'text',
      group: 'borders',
      groupOrder: 6,
      order: 1,
      placeholder: '1px solid #000',
      mjmlAttribute: 'border',
      defaultValue: ''
    },
    {
      key: 'borderRadius',
      label: 'Border Radius',
      type: 'number',
      group: 'borders',
      groupOrder: 6,
      order: 2,
      min: 0,
      max: 50,
      step: 1,
      unit: 'px',
      mjmlAttribute: 'border-radius',
      defaultValue: ''
    },

    // Alignment Group
    {
      key: 'align',
      label: 'Alignment',
      type: 'select',
      group: 'alignment',
      groupOrder: 7,
      order: 1,
      options: [
        { value: 'left', label: 'Left' },
        { value: 'center', label: 'Center' },
        { value: 'right', label: 'Right' }
      ],
      mjmlAttribute: 'align',
      defaultValue: 'center'
    },

    // Spacing & Padding Group
    {
      key: 'padding',
      label: 'Padding',
      type: 'boxModel',
      group: 'spacing',
      groupOrder: 5,
      order: 1,
      mjmlAttribute: 'padding',
      defaultValue: '10px 25px'
    },

    // Link/Action Group
    {
      key: 'href',
      label: 'Link URL',
      type: 'url',
      group: 'action',
      groupOrder: 8,
      order: 1,
      placeholder: 'https://example.com',
      mjmlAttribute: 'href',
      defaultValue: ''
    },
    {
      key: 'rel',
      label: 'Rel Attribute',
      type: 'text',
      group: 'action',
      groupOrder: 8,
      order: 2,
      placeholder: 'nofollow, noopener',
      mjmlAttribute: 'rel',
      defaultValue: ''
    }
  ],

  button: [
    // Content Group
    {
      key: 'text',
      label: 'Button Text',
      type: 'text',
      group: 'content',
      groupOrder: 1,
      order: 1,
      placeholder: 'Click here',
      mjmlAttribute: 'content',
      defaultValue: 'Click here'
    },
    {
      key: 'title',
      label: 'Title',
      type: 'text',
      group: 'content',
      groupOrder: 1,
      order: 2,
      placeholder: 'Button title',
      mjmlAttribute: 'title',
      defaultValue: ''
    },

    // Typography Group (same as text)
    {
      key: 'fontFamily',
      label: 'Font Family',
      type: 'select',
      group: 'typography',
      groupOrder: 2,
      order: 1,
      options: FONT_FAMILIES,
      mjmlAttribute: 'font-family',
      defaultValue: 'Arial, sans-serif'
    },
    {
      key: 'fontSize',
      label: 'Font Size',
      type: 'select',
      group: 'typography',
      groupOrder: 2,
      order: 2,
      options: FONT_SIZES,
      mjmlAttribute: 'font-size',
      defaultValue: '16px'
    },
    {
      key: 'fontWeight',
      label: 'Font Weight',
      type: 'select',
      group: 'typography',
      groupOrder: 2,
      order: 3,
      options: [
        { value: 'normal', label: 'Normal' },
        { value: 'bold', label: 'Bold' },
        { value: 'lighter', label: 'Lighter' },
        { value: '300', label: '300' },
        { value: '400', label: '400' },
        { value: '500', label: '500' },
        { value: '600', label: '600' },
        { value: '700', label: '700' }
      ],
      mjmlAttribute: 'font-weight',
      defaultValue: 'normal'
    },
    {
      key: 'fontStyle',
      label: 'Font Style',
      type: 'select',
      group: 'typography',
      groupOrder: 2,
      order: 4,
      options: [
        { value: 'normal', label: 'Normal' },
        { value: 'italic', label: 'Italic' },
        { value: 'oblique', label: 'Oblique' }
      ],
      mjmlAttribute: 'font-style',
      defaultValue: 'normal'
    },
    {
      key: 'lineHeight',
      label: 'Line Height',
      type: 'number',
      group: 'typography',
      groupOrder: 2,
      order: 5,
      min: 0.5,
      max: 3,
      step: 0.1,
      mjmlAttribute: 'line-height',
      defaultValue: '1.6'
    },
    {
      key: 'letterSpacing',
      label: 'Letter Spacing',
      type: 'number',
      group: 'typography',
      groupOrder: 2,
      order: 6,
      min: -5,
      max: 20,
      step: 0.5,
      unit: 'px',
      mjmlAttribute: 'letter-spacing',
      defaultValue: ''
    },
    {
      key: 'textTransform',
      label: 'Text Transform',
      type: 'select',
      group: 'typography',
      groupOrder: 2,
      order: 7,
      options: [
        { value: 'none', label: 'None' },
        { value: 'uppercase', label: 'Uppercase' },
        { value: 'lowercase', label: 'Lowercase' },
        { value: 'capitalize', label: 'Capitalize' }
      ],
      mjmlAttribute: 'text-transform',
      defaultValue: 'none'
    },
    {
      key: 'textDecoration',
      label: 'Text Decoration',
      type: 'select',
      group: 'typography',
      groupOrder: 2,
      order: 8,
      options: [
        { value: 'none', label: 'None' },
        { value: 'underline', label: 'Underline' },
        { value: 'overline', label: 'Overline' },
        { value: 'line-through', label: 'Line Through' }
      ],
      mjmlAttribute: 'text-decoration',
      defaultValue: 'none'
    },

    // Colors & Background Group
    {
      key: 'backgroundColor',
      label: 'Background Color',
      type: 'color',
      group: 'colors',
      groupOrder: 3,
      order: 1,
      mjmlAttribute: 'background-color',
      defaultValue: '#1553ec'
    },
    {
      key: 'color',
      label: 'Text Color',
      type: 'color',
      group: 'colors',
      groupOrder: 3,
      order: 2,
      mjmlAttribute: 'color',
      defaultValue: '#ffffff'
    },
    {
      key: 'containerBackgroundColor',
      label: 'Container Background',
      type: 'color',
      group: 'colors',
      groupOrder: 3,
      order: 3,
      mjmlAttribute: 'container-background-color',
      defaultValue: 'transparent'
    },

    // Sizing Group
    {
      key: 'width',
      label: 'Width',
      type: 'text',
      group: 'sizing',
      groupOrder: 4,
      order: 1,
      placeholder: 'auto, 200px, 100%',
      mjmlAttribute: 'width',
      defaultValue: ''
    },
    {
      key: 'height',
      label: 'Height',
      type: 'text',
      group: 'sizing',
      groupOrder: 4,
      order: 2,
      placeholder: 'auto, 50px',
      mjmlAttribute: 'height',
      defaultValue: ''
    },

    // Spacing & Padding Group
    {
      key: 'padding',
      label: 'Padding',
      type: 'boxModel',
      group: 'spacing',
      groupOrder: 5,
      order: 1,
      mjmlAttribute: 'padding',
      defaultValue: '10px 25px'
    },

    // Borders Group
    {
      key: 'border',
      label: 'Border',
      type: 'text',
      group: 'borders',
      groupOrder: 6,
      order: 1,
      placeholder: '1px solid #000',
      mjmlAttribute: 'border',
      defaultValue: ''
    },
    {
      key: 'borderRadius',
      label: 'Border Radius',
      type: 'number',
      group: 'borders',
      groupOrder: 6,
      order: 2,
      min: 0,
      max: 50,
      step: 1,
      unit: 'px',
      mjmlAttribute: 'border-radius',
      defaultValue: '6px'
    },

    // Alignment Group
    {
      key: 'align',
      label: 'Button Alignment',
      type: 'select',
      group: 'alignment',
      groupOrder: 7,
      order: 1,
      options: [
        { value: 'left', label: 'Left' },
        { value: 'center', label: 'Center' },
        { value: 'right', label: 'Right' }
      ],
      mjmlAttribute: 'align',
      defaultValue: 'center'
    },
    {
      key: 'textAlign',
      label: 'Text Alignment',
      type: 'select',
      group: 'alignment',
      groupOrder: 7,
      order: 2,
      options: [
        { value: 'left', label: 'Left' },
        { value: 'center', label: 'Center' },
        { value: 'right', label: 'Right' }
      ],
      mjmlAttribute: 'text-align',
      defaultValue: 'center'
    },
    {
      key: 'verticalAlign',
      label: 'Vertical Alignment',
      type: 'select',
      group: 'alignment',
      groupOrder: 7,
      order: 3,
      options: [
        { value: 'top', label: 'Top' },
        { value: 'middle', label: 'Middle' },
        { value: 'bottom', label: 'Bottom' }
      ],
      mjmlAttribute: 'vertical-align',
      defaultValue: 'middle'
    },

    // Link/Action Group
    {
      key: 'href',
      label: 'Link URL',
      type: 'url',
      group: 'action',
      groupOrder: 8,
      order: 1,
      placeholder: 'https://example.com',
      mjmlAttribute: 'href',
      defaultValue: '#'
    },
    {
      key: 'rel',
      label: 'Rel Attribute',
      type: 'text',
      group: 'action',
      groupOrder: 8,
      order: 2,
      placeholder: 'nofollow, noopener',
      mjmlAttribute: 'rel',
      defaultValue: ''
    },
    {
      key: 'target',
      label: 'Target',
      type: 'select',
      group: 'action',
      groupOrder: 8,
      order: 3,
      options: [
        { value: '_self', label: 'Same Window' },
        { value: '_blank', label: 'New Window' },
        { value: '_parent', label: 'Parent Frame' },
        { value: '_top', label: 'Top Frame' }
      ],
      mjmlAttribute: 'target',
      defaultValue: '_self'
    }
  ],

  spacer: [
    // Sizing Group
    {
      key: 'height',
      label: 'Height',
      type: 'slider',
      group: 'sizing',
      groupOrder: 4,
      order: 1,
      min: 5,
      max: 100,
      step: 5,
      unit: 'px',
      mjmlAttribute: 'height',
      defaultValue: 20
    },

    // Colors & Background Group
    {
      key: 'containerBackgroundColor',
      label: 'Container Background',
      type: 'color',
      group: 'colors',
      groupOrder: 3,
      order: 1,
      mjmlAttribute: 'container-background-color',
      defaultValue: 'transparent'
    },

    // Spacing & Padding Group
    {
      key: 'padding',
      label: 'Padding',
      type: 'boxModel',
      group: 'spacing',
      groupOrder: 5,
      order: 1,
      mjmlAttribute: 'padding',
      defaultValue: ''
    }
  ]
};

// Utility functions
export function getPropertiesForComponent(componentType: string): PropertyDefinition[] {
  return PROPERTY_REGISTRY[componentType] || [];
}

export function getGroupedProperties(componentType: string): Record<string, PropertyDefinition[]> {
  const properties = getPropertiesForComponent(componentType);
  const grouped: Record<string, PropertyDefinition[]> = {};
  
  properties.forEach(prop => {
    if (!grouped[prop.group]) {
      grouped[prop.group] = [];
    }
    grouped[prop.group].push(prop);
  });
  
  // Sort properties within each group by order
  Object.keys(grouped).forEach(groupKey => {
    grouped[groupKey].sort((a, b) => a.order - b.order);
  });
  
  return grouped;
}

export function getGroupsForComponent(componentType: string): PropertyGroup[] {
  const properties = getPropertiesForComponent(componentType);
  const usedGroups = new Set(properties.map(p => p.group));
  
  return PROPERTY_GROUPS.filter(group => usedGroups.has(group.key))
    .sort((a, b) => a.order - b.order);
}

export function getDefaultValuesForComponent(componentType: string): Record<string, any> {
  const properties = getPropertiesForComponent(componentType);
  const defaults: Record<string, any> = {};
  
  properties.forEach(prop => {
    if (prop.defaultValue !== undefined) {
      defaults[prop.key] = prop.defaultValue;
    }
  });
  
  return defaults;
}