import { Request, Response } from 'express';
import { type EmailComponent } from '@shared/schema';
import DOMPurify from 'isomorphic-dompurify';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
// @ts-ignore
const mjml2html = require('mjml');

// Sanitize user input to prevent XSS
function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br'],
    ALLOWED_ATTR: []
  });
}

// MJML Compilation endpoint
export async function compileMjml(req: Request, res: Response) {
  try {
    const { subject, components } = req.body;
    console.log('MJML compilation request:', { subject, componentsCount: components?.length || 0 });
    
    // Convert components to MJML
    const mjmlContent = generateMjmlFromComponents(subject, components || []);
    console.log('Generated MJML:', mjmlContent.substring(0, 200) + '...');
    
    // Compile to HTML
    const result = mjml2html(mjmlContent, {
      validationLevel: 'soft',
      minify: false
    });
    
    if (result.errors && result.errors.length > 0) {
      console.warn('MJML compilation warnings:', result.errors);
    }

    console.log('Compilation successful, HTML length:', result.html.length);

    res.json({
      success: true,
      html: result.html,
      mjml: mjmlContent,
      htmlLength: result.html.length,
      errors: result.errors || []
    });
  } catch (error: any) {
    console.error('MJML compilation error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      html: '',
      mjml: '',
      errors: [error.message]
    });
  }
}

// Convert email components to MJML structure
function generateMjmlFromComponents(subject: string, components: EmailComponent[]): string {
  // Completely blank when no components
  if (components.length === 0) {
    return `
<mjml>
  <mj-head>
    <mj-title>${sanitizeInput(subject || 'Email')}</mj-title>
    <mj-attributes>
      <mj-all font-family="Arial, sans-serif" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#ffffff">
  </mj-body>
</mjml>`;
  }

  const mjmlComponents = components.map(component => {
    switch (component.type) {
      case 'text':
        return `        <mj-text 
          align="${component.styles?.textAlign || 'left'}"
          color="${component.styles?.color || '#000000'}"
          font-size="${component.styles?.fontSize || '16px'}"
          padding="${component.styles?.padding || '10px 25px'}"
          line-height="1.6"
        >
          ${sanitizeInput(component.content?.text || '')}
        </mj-text>`;
        
      case 'image':
        if (!component.content?.src) {
          return `        <mj-text align="center" color="#9ca3af" padding="20px" font-size="14px">
            [Image placeholder - Add image URL in properties]
          </mj-text>`;
        }
        return `        <mj-image 
          src="${component.content.src}"
          alt="${component.content?.alt || ''}"
          width="${component.styles?.width || '600px'}"
          padding="${component.styles?.padding || '10px 25px'}"
        />`;
        
      case 'button':
        return `        <mj-button 
          background-color="${component.styles?.backgroundColor || '#1553ec'}"
          color="${component.styles?.color || '#ffffff'}"
          border-radius="${component.styles?.borderRadius || '6px'}"
          padding="${component.styles?.margin || '10px 25px'}"
          href="${component.content?.href || '#'}"
          align="${component.styles?.textAlign || 'center'}"
        >
          ${sanitizeInput(component.content?.text || 'Click here')}
        </mj-button>`;
        
      case 'spacer':
        return `        <mj-spacer height="${component.styles?.height || '20px'}" />`;
        
      default:
        return '';
    }
  }).join('\n');

  return `
<mjml>
  <mj-head>
    <mj-title>${sanitizeInput(subject || 'Email')}</mj-title>
    <mj-attributes>
      <mj-all font-family="Arial, sans-serif" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#ffffff">
    <mj-section background-color="#ffffff" padding="0px">
      <mj-column>
${mjmlComponents}
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;
}

// Test endpoint to verify MJML compilation works
export async function testMjmlCompilation(req: Request, res: Response) {
  console.log('=== MJML TEST ENDPOINT CALLED ===');
  
  try {
    // Pure test MJML string - no branding
    const testMjmlString = `
<mjml>
  <mj-head>
    <mj-title>Test Email</mj-title>
    <mj-attributes>
      <mj-all font-family="Arial, sans-serif" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#ffffff">
    <mj-section background-color="#ffffff" padding="20px">
      <mj-column>
        <mj-text align="center" color="#1553ec" font-size="24px" font-weight="bold">
          TEST EMAIL
        </mj-text>
        <mj-text align="center" color="#000000" font-size="16px" line-height="1.6" padding="10px">
          This is a test email to verify MJML compilation is working correctly.
        </mj-text>
        <mj-button background-color="#1553ec" color="#ffffff" href="#" align="center">
          Test Button
        </mj-button>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;

    console.log('Test MJML string length:', testMjmlString.length);
    console.log('Test MJML preview:', testMjmlString.substring(0, 200) + '...');

    // Try MJML compilation
    const result = mjml2html(testMjmlString, {
      validationLevel: 'soft',
      minify: false
    });

    console.log('MJML compilation result:');
    console.log('- HTML length:', result.html.length);
    console.log('- Errors count:', result.errors?.length || 0);
    console.log('- HTML preview:', result.html.substring(0, 200) + '...');

    res.json({
      success: true,
      mjml: testMjmlString,
      html: result.html,
      htmlLength: result.html.length,
      errors: result.errors || []
    });
  } catch (error: any) {
    console.error('MJML test compilation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      mjml: '',
      html: '',
      errors: [error.message]
    });
  }
}