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

  // Render all components with table-based structure for better email client support
  const componentsHTML = components.map(component => {
    const renderedComponent = renderComponent(component);
    // Wrap each component in a table row for better compatibility
    return `
    <tr>
        <td style="padding: 10px 0;">
            ${renderedComponent}
        </td>
    </tr>`;
  }).join('\n');

  // Enhanced email-compatible HTML with MSO conditionals and table structure
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <!--[if gte mso 9]>
    <xml>
        <o:OfficeDocumentSettings>
            <o:AllowPNG/>
            <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
    </xml>
    <![endif]-->
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>${sanitizeContent(subject)}</title>
    <style type="text/css">
        /* Email client reset */
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; outline: none; max-width: 100%; height: auto; }
        
        /* Outlook specific */
        .ReadMsgBody { width: 100%; }
        .ExternalClass { width: 100%; }
        .ExternalClass, .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td, .ExternalClass div { 
            line-height: 100%; 
        }
        
        /* Gmail specific */
        u + .body .gmail-fix { display: none; }
        
        /* Responsive design */
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; max-width: 600px !important; }
            .content { padding: 20px !important; }
            .mobile-center { text-align: center !important; }
            .mobile-hide { display: none !important; }
        }
        
        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
            .dark-mode-bg { background-color: #1a1a1a !important; }
            .dark-mode-text { color: #ffffff !important; }
        }
    </style>
    <!--[if mso]>
    <style type="text/css">
        .fallback-font { font-family: Arial, sans-serif !important; }
    </style>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: ${globalStyles.fontFamily}; background-color: ${globalStyles.backgroundColor}; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;" class="body">
    <div style="display: none; max-height: 0; overflow: hidden;">
        Email CreAItor - ${sanitizeContent(subject)}
    </div>
    <div style="display: none; max-height: 0; overflow: hidden;">
        &#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;
    </div>
    
    <!-- Main wrapper table -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${globalStyles.backgroundColor}; min-height: 100vh;">
        <tr>
            <td align="center" style="padding: 20px 0;" valign="top">
                <!-- Container table with MSO conditional width -->
                <!--[if mso]>
                <table border="0" cellpadding="0" cellspacing="0" width="600">
                <tr>
                <td>
                <![endif]-->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: ${BRAND_STYLES.colors.white};" class="container">
                    <!-- Content table -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        ${componentsHTML}
                        ${includeKavakFooter ? `
                        <tr>
                            <td style="background-color: ${BRAND_STYLES.colors.footerBg}; padding: 30px 20px; text-align: center; border-top: 1px solid #e9ecef;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td style="text-align: center; padding: 5px 0;">
                                            <p style="margin: 0; font-size: 14px; color: ${BRAND_STYLES.colors.gray}; font-family: ${globalStyles.fontFamily};">
                                                <strong>KAVAK</strong> - Tu experiencia automotriz
                                            </p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="text-align: center; padding: 5px 0;">
                                            <p style="margin: 0; font-size: 14px; color: ${BRAND_STYLES.colors.gray}; font-family: ${globalStyles.fontFamily};">
                                                © ${new Date().getFullYear()} KAVAK. Todos los derechos reservados.
                                            </p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="text-align: center; padding: 5px 0;">
                                            <p style="margin: 0; font-size: 12px; color: #999; font-family: ${globalStyles.fontFamily};">
                                                Este email fue generado con Email CreAItor
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        ` : ''}
                    </table>
                </table>
                <!--[if mso]>
                </td>
                </tr>
                </table>
                <![endif]-->
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