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

// Render individual email component to HTML
function renderComponent(component: EmailComponent): string {
  const styles = { ...component.styles };
  
  switch (component.type) {
    case 'text':
      const textContent = sanitizeContent(component.content.text || '');
      return `<div style="${convertStylesToString(styles)}">${textContent}</div>`;
      
    case 'image':
      if (!component.content.src) {
        return `<div style="${convertStylesToString({
          ...styles,
          border: '2px dashed #ccc',
          minHeight: '100px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        })}">
          <span style="color: #999; font-size: 14px;">Imagen no disponible</span>
        </div>`;
      }
      
      const alt = sanitizeContent(component.content.alt || '');
      return `<img src="${component.content.src}" alt="${alt}" style="${convertStylesToString({
        ...styles,
        maxWidth: '100%',
        height: 'auto'
      })}" />`;
      
    case 'button':
      const buttonText = sanitizeContent(component.content.text || 'Click aquí');
      const href = component.content.href || '#';
      return `<div style="text-align: center; padding: 10px;">
        <a href="${href}" style="${convertStylesToString({
          display: 'inline-block',
          textDecoration: 'none',
          borderRadius: '8px',
          fontWeight: 'bold',
          transition: 'transform 0.2s ease',
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

// Generate email-compatible HTML
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

  // Render all components
  const componentsHTML = components.map(renderComponent).join('\n');

  // Email-compatible HTML structure
  return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <title>${sanitizeContent(subject)}</title>
    <!--[if !mso]><!-->
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <!--<![endif]-->
    <style type="text/css">
        /* Reset styles for email clients */
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; outline: none; }
        
        /* Email client specific styles */
        .ReadMsgBody { width: 100%; }
        .ExternalClass { width: 100%; }
        .ExternalClass, .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td, .ExternalClass div { 
            line-height: 100%; 
        }
        
        /* Responsive styles */
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; }
            .content { padding: 20px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; font-family: ${globalStyles.fontFamily}; background-color: ${globalStyles.backgroundColor};">
    <!-- Email container table for better compatibility -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${globalStyles.backgroundColor};">
        <tr>
            <td align="center" style="padding: 20px 0;">
                <!-- Main content table -->
                <table border="0" cellpadding="0" cellspacing="0" width="600" class="container" style="background-color: ${BRAND_STYLES.colors.white}; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <tr>
                        <td class="content" style="padding: 40px;">
                            ${componentsHTML}
                        </td>
                    </tr>
                    ${includeKavakFooter ? `
                    <tr>
                        <td style="background-color: ${BRAND_STYLES.colors.footerBg}; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
                            <p style="margin: 5px 0; font-size: 14px; color: ${BRAND_STYLES.colors.gray};">
                                <strong>KAVAK</strong> - Tu experiencia automotriz
                            </p>
                            <p style="margin: 5px 0; font-size: 14px; color: ${BRAND_STYLES.colors.gray};">
                                © ${new Date().getFullYear()} KAVAK. Todos los derechos reservados.
                            </p>
                            <p style="margin: 5px 0; font-size: 12px; color: #999;">
                                Este email fue generado con Email CreAItor
                            </p>
                        </td>
                    </tr>
                    ` : ''}
                </table>
            </td>
        </tr>
    </table>
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