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
        // Build comprehensive mj-text attributes
        const textAttrs = [];
        if (component.styles?.textAlign) textAttrs.push(`align="${component.styles.textAlign}"`);
        if (component.styles?.color) textAttrs.push(`color="${component.styles.color}"`);
        if (component.styles?.backgroundColor) textAttrs.push(`background-color="${component.styles.backgroundColor}"`);
        if (component.styles?.fontSize) textAttrs.push(`font-size="${component.styles.fontSize}"`);
        if (component.styles?.fontFamily) textAttrs.push(`font-family="${component.styles.fontFamily}"`);
        if (component.styles?.fontWeight) textAttrs.push(`font-weight="${component.styles.fontWeight}"`);
        if (component.styles?.fontStyle) textAttrs.push(`font-style="${component.styles.fontStyle}"`);
        if (component.styles?.lineHeight) textAttrs.push(`line-height="${component.styles.lineHeight}"`);
        if (component.styles?.letterSpacing) textAttrs.push(`letter-spacing="${component.styles.letterSpacing}"`);
        if (component.styles?.textTransform) textAttrs.push(`text-transform="${component.styles.textTransform}"`);
        if (component.styles?.textDecoration) textAttrs.push(`text-decoration="${component.styles.textDecoration}"`);
        if (component.styles?.verticalAlign) textAttrs.push(`vertical-align="${component.styles.verticalAlign}"`);
        
        // Handle padding attributes
        if (component.styles?.padding) textAttrs.push(`padding="${component.styles.padding}"`);
        if (component.styles?.paddingTop) textAttrs.push(`padding-top="${component.styles.paddingTop}"`);
        if (component.styles?.paddingBottom) textAttrs.push(`padding-bottom="${component.styles.paddingBottom}"`);
        if (component.styles?.paddingLeft) textAttrs.push(`padding-left="${component.styles.paddingLeft}"`);
        if (component.styles?.paddingRight) textAttrs.push(`padding-right="${component.styles.paddingRight}"`);
        
        return `        <mj-text ${textAttrs.join(' ')}>
          ${sanitizeInput(component.content?.text || '')}
        </mj-text>`;
        
      case 'image':
        if (!component.content?.src) {
          return `        <mj-text align="center" color="#9ca3af" padding="20px" font-size="14px">
            [Image placeholder - Add image URL in properties]
          </mj-text>`;
        }
        
        // Build comprehensive mj-image attributes
        const imageAttrs = [];
        imageAttrs.push(`src="${component.content.src}"`);
        if (component.content?.alt) imageAttrs.push(`alt="${component.content.alt}"`);
        if (component.content?.title) imageAttrs.push(`title="${component.content.title}"`);
        if (component.content?.href) imageAttrs.push(`href="${component.content.href}"`);
        if (component.content?.rel) imageAttrs.push(`rel="${component.content.rel}"`);
        if (component.styles?.width) imageAttrs.push(`width="${component.styles.width}"`);
        if (component.styles?.height) imageAttrs.push(`height="${component.styles.height}"`);
        if (component.styles?.align) imageAttrs.push(`align="${component.styles.align}"`);
        if (component.styles?.border) imageAttrs.push(`border="${component.styles.border}"`);
        if (component.styles?.borderRadius) imageAttrs.push(`border-radius="${component.styles.borderRadius}"`);
        if (component.styles?.containerBackgroundColor) imageAttrs.push(`container-background-color="${component.styles.containerBackgroundColor}"`);
        if (component.styles?.fluidOnMobile === 'true') imageAttrs.push(`fluid-on-mobile="true"`);
        
        // Handle padding attributes
        if (component.styles?.padding) imageAttrs.push(`padding="${component.styles.padding}"`);
        if (component.styles?.paddingTop) imageAttrs.push(`padding-top="${component.styles.paddingTop}"`);
        if (component.styles?.paddingBottom) imageAttrs.push(`padding-bottom="${component.styles.paddingBottom}"`);
        if (component.styles?.paddingLeft) imageAttrs.push(`padding-left="${component.styles.paddingLeft}"`);
        if (component.styles?.paddingRight) imageAttrs.push(`padding-right="${component.styles.paddingRight}"`);
        
        return `        <mj-image ${imageAttrs.join(' ')} />`;
        
      case 'button':
        // Build comprehensive mj-button attributes
        const buttonAttrs = [];
        if (component.styles?.backgroundColor) buttonAttrs.push(`background-color="${component.styles.backgroundColor}"`);
        if (component.styles?.color) buttonAttrs.push(`color="${component.styles.color}"`);
        if (component.styles?.fontFamily) buttonAttrs.push(`font-family="${component.styles.fontFamily}"`);
        if (component.styles?.fontSize) buttonAttrs.push(`font-size="${component.styles.fontSize}"`);
        if (component.styles?.fontWeight) buttonAttrs.push(`font-weight="${component.styles.fontWeight}"`);
        if (component.styles?.fontStyle) buttonAttrs.push(`font-style="${component.styles.fontStyle}"`);
        if (component.styles?.lineHeight) buttonAttrs.push(`line-height="${component.styles.lineHeight}"`);
        if (component.styles?.letterSpacing) buttonAttrs.push(`letter-spacing="${component.styles.letterSpacing}"`);
        if (component.styles?.textTransform) buttonAttrs.push(`text-transform="${component.styles.textTransform}"`);
        if (component.styles?.textDecoration) buttonAttrs.push(`text-decoration="${component.styles.textDecoration}"`);
        if (component.styles?.borderRadius) buttonAttrs.push(`border-radius="${component.styles.borderRadius}"`);
        if (component.styles?.border) buttonAttrs.push(`border="${component.styles.border}"`);
        if (component.styles?.borderTop) buttonAttrs.push(`border-top="${component.styles.borderTop}"`);
        if (component.styles?.borderBottom) buttonAttrs.push(`border-bottom="${component.styles.borderBottom}"`);
        if (component.styles?.borderLeft) buttonAttrs.push(`border-left="${component.styles.borderLeft}"`);
        if (component.styles?.borderRight) buttonAttrs.push(`border-right="${component.styles.borderRight}"`);
        if (component.styles?.width) buttonAttrs.push(`width="${component.styles.width}"`);
        if (component.styles?.height) buttonAttrs.push(`height="${component.styles.height}"`);
        if (component.styles?.align) buttonAttrs.push(`align="${component.styles.align}"`);
        if (component.styles?.textAlign) buttonAttrs.push(`text-align="${component.styles.textAlign}"`);
        if (component.styles?.verticalAlign) buttonAttrs.push(`vertical-align="${component.styles.verticalAlign}"`);
        if (component.styles?.containerBackgroundColor) buttonAttrs.push(`container-background-color="${component.styles.containerBackgroundColor}"`);
        if (component.content?.href) buttonAttrs.push(`href="${component.content.href}"`);
        if (component.content?.rel) buttonAttrs.push(`rel="${component.content.rel}"`);
        if (component.content?.target) buttonAttrs.push(`target="${component.content.target}"`);
        if (component.content?.title) buttonAttrs.push(`title="${component.content.title}"`);
        
        // Handle padding attributes
        if (component.styles?.padding) buttonAttrs.push(`padding="${component.styles.padding}"`);
        if (component.styles?.paddingTop) buttonAttrs.push(`padding-top="${component.styles.paddingTop}"`);
        if (component.styles?.paddingBottom) buttonAttrs.push(`padding-bottom="${component.styles.paddingBottom}"`);
        if (component.styles?.paddingLeft) buttonAttrs.push(`padding-left="${component.styles.paddingLeft}"`);
        if (component.styles?.paddingRight) buttonAttrs.push(`padding-right="${component.styles.paddingRight}"`);
        
        return `        <mj-button ${buttonAttrs.join(' ')}>
          ${sanitizeInput(component.content?.text || 'Click here')}
        </mj-button>`;
        
      case 'spacer':
        // Build comprehensive mj-spacer attributes
        const spacerAttrs = [];
        if (component.styles?.height) spacerAttrs.push(`height="${component.styles.height}"`);
        if (component.styles?.containerBackgroundColor) spacerAttrs.push(`container-background-color="${component.styles.containerBackgroundColor}"`);
        
        // Handle padding attributes
        if (component.styles?.padding) spacerAttrs.push(`padding="${component.styles.padding}"`);
        if (component.styles?.paddingTop) spacerAttrs.push(`padding-top="${component.styles.paddingTop}"`);
        if (component.styles?.paddingBottom) spacerAttrs.push(`padding-bottom="${component.styles.paddingBottom}"`);
        if (component.styles?.paddingLeft) spacerAttrs.push(`padding-left="${component.styles.paddingLeft}"`);
        if (component.styles?.paddingRight) spacerAttrs.push(`padding-right="${component.styles.paddingRight}"`);
        
        return `        <mj-spacer ${spacerAttrs.join(' ')} />`;
        
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