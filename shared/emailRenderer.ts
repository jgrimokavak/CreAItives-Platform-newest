import { EmailComponent, EmailContent } from './schema';
import DOMPurify from 'isomorphic-dompurify'; // For sanitization

// KAVAK brand colors and styles
const BRAND_STYLES = {
  colors: {
    primary: '#1553ec',
    secondary: '#001dd1', 
    white: '#ffffff',
    black: '#000000',
    gray: '#666666',
    lightGray: '#f5f5f5',
    footerBg: '#f8f9fa'
  },
  fonts: {
    primary: "'Roboto', 'Helvetica', Arial, sans-serif"
  }
};

interface EmailRenderOptions {
  subject?: string;
  components?: EmailComponent[];
  globalStyles?: EmailContent['globalStyles'];
  includeKavakFooter?: boolean;
}

// Sanitize user content to prevent XSS
function sanitizeContent(content: string): string {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'style']
  });
}

// Render individual email component to HTML - matches frontend builder exactly
function renderComponent(component: EmailComponent): string {
  const styles = { ...component.styles };
  
  switch (component.type) {
    case 'text':
      const textContent = sanitizeContent(component.content.text || '');
      // Match frontend: reset margins/padding, then apply component styles
      const textStyles = {
        margin: '0',
        padding: '0',
        paddingTop: styles.paddingTop || '0px',
        paddingRight: styles.paddingRight || '0px', 
        paddingBottom: styles.paddingBottom || '0px',
        paddingLeft: styles.paddingLeft || '0px',
        marginTop: styles.marginTop || '0px',
        marginRight: styles.marginRight || '0px',
        marginBottom: styles.marginBottom || '0px',
        marginLeft: styles.marginLeft || '0px',
        ...styles
      };
      return `<div style="${convertStylesToString(textStyles)}">${textContent}</div>`;
      
    case 'image':
      if (!component.content.src) {
        return `<div style="${convertStylesToString({
          ...styles,
          border: '2px dashed #ccc',
          minHeight: '100px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        })}">
          <span style="color: #999; font-size: 14px;">Imagen no disponible</span>
        </div>`;
      }
      
      const alt = sanitizeContent(component.content.alt || '');
      // Match frontend: use flexbox for alignment control
      const imageAlignment = 
        styles.textAlign === 'left' ? 'flex-start' :
        styles.textAlign === 'right' ? 'flex-end' : 'center';
      
      return `<div style="${convertStylesToString({
        display: 'flex',
        justifyContent: imageAlignment,
        margin: '0',
        padding: '0',
        paddingTop: styles.paddingTop || '0px',
        paddingRight: styles.paddingRight || '0px',
        paddingBottom: styles.paddingBottom || '0px', 
        paddingLeft: styles.paddingLeft || '0px',
        marginTop: styles.marginTop || '0px',
        marginRight: styles.marginRight || '0px',
        marginBottom: styles.marginBottom || '0px',
        marginLeft: styles.marginLeft || '0px'
      })}">
        <img src="${component.content.src}" alt="${alt}" style="${convertStylesToString({
          maxWidth: styles.maxWidth || '100%',
          width: styles.width || 'auto',
          height: styles.height || 'auto',
          border: styles.border || 'none',
          borderRadius: styles.borderRadius || '0px'
        })}" />
      </div>`;
      
    case 'button':
      const buttonText = sanitizeContent(component.content.text || 'Click aquí');
      const href = component.content.href || '#';
      // Match frontend: use flexbox for button alignment
      const buttonAlignment = 
        styles.textAlign === 'left' ? 'flex-start' :
        styles.textAlign === 'right' ? 'flex-end' : 'center';
      
      return `<div style="${convertStylesToString({
        display: 'flex',
        justifyContent: buttonAlignment,
        margin: '0',
        padding: '0',
        paddingTop: styles.paddingTop || '0px',
        paddingRight: styles.paddingRight || '0px',
        paddingBottom: styles.paddingBottom || '0px',
        paddingLeft: styles.paddingLeft || '0px',
        marginTop: styles.marginTop || '0px', 
        marginRight: styles.marginRight || '0px',
        marginBottom: styles.marginBottom || '0px',
        marginLeft: styles.marginLeft || '0px'
      })}">
        <a href="${href}" style="${convertStylesToString({
          display: 'inline-block',
          textDecoration: 'none',
          ...styles
        })}">${buttonText}</a>
      </div>`;
      
    case 'spacer':
      return `<div style="${convertStylesToString(styles)}"></div>`;
      
    default:
      return '';
  }
}

// Convert style object to CSS string
function convertStylesToString(styles: Record<string, any>): string {
  return Object.entries(styles)
    .map(([key, value]) => {
      // Convert camelCase to kebab-case
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `${cssKey}: ${value}`;
    })
    .join('; ');
}

// Generate email-compatible HTML with enhanced compatibility
export function generateEmailHTML(options: EmailRenderOptions): string {
  const {
    subject = 'Email de KAVAK',
    components = [],
    globalStyles = {
      backgroundColor: BRAND_STYLES.colors.lightGray,
      fontFamily: BRAND_STYLES.fonts.primary,
      primaryColor: BRAND_STYLES.colors.primary,
      secondaryColor: BRAND_STYLES.colors.secondary
    },
    includeKavakFooter = true
  } = options;

  // Render all components directly without extra table padding to match frontend
  const componentsHTML = components.map(component => {
    return renderComponent(component);
  }).join('\n');

  // Use same structure as frontend builder for pixel-perfect matching
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${sanitizeContent(subject)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Roboto', 'Helvetica', Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        ${componentsHTML}
        ${includeKavakFooter ? `
        <div style="padding: 30px 20px; text-align: center; color: #666666; font-size: 14px; background-color: #f8f9fa; border-top: 1px solid #e9ecef;">
            <p style="margin: 5px 0;"><strong>KAVAK</strong> - Tu experiencia automotriz</p>
            <p style="margin: 5px 0;">© ${new Date().getFullYear()} KAVAK. Todos los derechos reservados.</p>
            <p style="font-size: 12px; color: #999; margin: 5px 0;">
                Este email fue generado con Email CreAItor
            </p>
        </div>
        ` : ''}
    </div>
</body>
</html>`;
}

// Legacy function for backward compatibility with old API
export function generateLegacyEmailHTML(data: {
  subject: string;
  header: string;
  body: string;
  cta: string;
}): string {
  const components: EmailComponent[] = [
    {
      id: 'header',
      type: 'text',
      content: { text: data.header },
      styles: {
        fontSize: '28px',
        fontWeight: 'bold',
        textAlign: 'center',
        color: BRAND_STYLES.colors.white,
        background: `linear-gradient(135deg, ${BRAND_STYLES.colors.primary} 0%, ${BRAND_STYLES.colors.secondary} 100%)`,
        padding: '40px 20px',
        margin: '0 0 30px 0'
      }
    },
    {
      id: 'body',
      type: 'text', 
      content: { text: data.body },
      styles: {
        fontSize: '16px',
        lineHeight: '1.6',
        color: BRAND_STYLES.colors.gray,
        marginBottom: '30px'
      }
    },
    {
      id: 'cta',
      type: 'button',
      content: { text: data.cta, href: '#' },
      styles: {
        background: `linear-gradient(135deg, ${BRAND_STYLES.colors.primary} 0%, ${BRAND_STYLES.colors.secondary} 100%)`,
        color: BRAND_STYLES.colors.white,
        padding: '15px 30px',
        fontSize: '16px',
        fontWeight: 'bold'
      }
    }
  ];

  return generateEmailHTML({
    subject: data.subject,
    components
  });
}