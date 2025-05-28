import { Request, Response } from 'express';
import { z } from 'zod';
import { openai } from '../openai';
import { emailTemplates, insertEmailTemplateSchema, type EmailTemplate, type InsertEmailTemplate, type EmailComponent } from '@shared/schema';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import DOMPurify from 'isomorphic-dompurify';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
// @ts-ignore
const mjml2html = require('mjml');

// Enhanced validation schemas with sanitization
const emailContentSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
  header: z.string().optional(),
  body: z.string().optional(), 
  cta: z.string().optional(),
  templateType: z.string().optional(),
  components: z.array(z.object({
    id: z.string(),
    type: z.enum(['text', 'image', 'button', 'spacer']),
    content: z.record(z.any()),
    styles: z.record(z.any())
  })).optional()
});

// Sanitize user input to prevent XSS
function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br'],
    ALLOWED_ATTR: []
  });
}

// Email content generation schema
const generateEmailContentSchema = z.object({
  templateType: z.enum(['welcome', 'offer', 'newsletter']),
  brand: z.string().default('KAVAK'),
  tone: z.enum(['professional', 'friendly', 'urgent', 'promotional']).default('friendly'),
  customPrompt: z.string().optional(),
});

// KAVAK brand templates in Spanish
const brandTemplates = {
  welcome: {
    systemPrompt: `Eres un copywriter experto para KAVAK, la plataforma automotriz líder en México. 
    Crea contenido de email de bienvenida que sea cálido, profesional y que refleje la confianza de la marca KAVAK.
    El tono debe ser amigable pero profesional, enfocado en hacer sentir al usuario parte de la familia KAVAK.`,
    structure: {
      subject: 'Asunto atractivo de bienvenida',
      header: 'Título principal de bienvenida',
      body: 'Mensaje de bienvenida que haga sentir al usuario valorado y emocionado por su experiencia automotriz',
      cta: 'Texto del botón de acción'
    }
  },
  offer: {
    systemPrompt: `Eres un copywriter experto para KAVAK. Crea contenido para un email de oferta por el auto del cliente.
    El mensaje debe ser persuasivo, crear urgencia y mostrar el valor de la oferta de KAVAK.
    Mantén el tono profesional pero emocionante, destacando la transparencia y confianza de KAVAK.`,
    structure: {
      subject: 'Asunto que genere curiosidad sobre la oferta',
      header: 'Título que destaque la oferta especial',
      body: 'Mensaje que explique la oferta de manera atractiva y genere urgencia',
      cta: 'Texto del botón para ver la oferta'
    }
  },
  newsletter: {
    systemPrompt: `Eres un copywriter experto para KAVAK. Crea contenido para el newsletter de KAVAK.
    El contenido debe ser informativo, valuable y mantener a los usuarios conectados con las novedades automotrices.
    Tono profesional pero accesible, enfocado en educar y mantener el interés del usuario.`,
    structure: {
      subject: 'Asunto atractivo para el newsletter',
      header: 'Título principal del newsletter',
      body: 'Contenido informativo y valioso sobre el mundo automotriz y novedades de KAVAK',
      cta: 'Texto del botón para leer más'
    }
  }
};

export async function generateEmailContent(req: Request, res: Response) {
  try {
    const { templateType, brand, tone, customPrompt } = generateEmailContentSchema.parse(req.body);
    
    const template = brandTemplates[templateType];
    if (!template) {
      return res.status(400).json({ error: 'Tipo de plantilla no válido' });
    }

    const userPrompt = customPrompt || `Genera contenido para un email de ${templateType} para ${brand}. 
    Tono: ${tone}. 
    
    Estructura requerida:
    - Asunto: ${template.structure.subject}
    - Encabezado: ${template.structure.header}  
    - Cuerpo: ${template.structure.body}
    - CTA: ${template.structure.cta}
    
    Responde en formato JSON con las siguientes claves: subject, header, body, cta`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: template.systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 800,
      temperature: 0.7
    });

    const generatedContent = JSON.parse(response.choices[0].message.content || '{}');
    
    // Ensure we have content, provide fallbacks if OpenAI doesn't respond properly
    const finalContent = {
      subject: generatedContent.subject || `Email ${templateType} - ${brand}`,
      header: generatedContent.header || `Mensaje importante de ${brand}`,
      body: generatedContent.body || `Contenido personalizado para tu experiencia con ${brand}.`,
      cta: generatedContent.cta || 'Ver más'
    };
    
    res.json({
      success: true,
      content: finalContent,
      templateType,
      brand,
      tone
    });

  } catch (error: any) {
    console.error('Error generating email content:', error);
    res.status(500).json({ 
      error: 'Error al generar contenido del email',
      details: error.message 
    });
  }
}

export async function saveEmailTemplate(req: Request, res: Response) {
  try {
    const emailData = insertEmailTemplateSchema.parse(req.body);
    
    const [savedTemplate] = await db
      .insert(emailTemplates)
      .values({
        ...emailData,
        userId: 'system', // For now, using system user
        content: JSON.stringify(emailData.content)
      })
      .returning();

    res.json({
      success: true,
      template: savedTemplate
    });

  } catch (error: any) {
    console.error('Error saving email template:', error);
    res.status(500).json({ 
      error: 'Error al guardar la plantilla de email',
      details: error.message 
    });
  }
}

export async function getEmailTemplates(req: Request, res: Response) {
  try {
    const templates = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.isTemplate, 'true'))
      .orderBy(emailTemplates.createdAt);

    res.json({
      success: true,
      templates: templates.map(template => ({
        ...template,
        content: JSON.parse(template.content)
      }))
    });

  } catch (error: any) {
    console.error('Error fetching email templates:', error);
    res.status(500).json({ 
      error: 'Error al obtener las plantillas de email',
      details: error.message 
    });
  }
}

// MJML Compilation endpoint
export async function compileMjml(req: Request, res: Response) {
  try {
    const { subject, components } = req.body;
    console.log('MJML compilation request:', { subject, componentsCount: components?.length || 0 });
    
    // Convert components to MJML
    const mjmlContent = generateMjmlFromComponents(subject, components || []);
    console.log('Generated MJML:', mjmlContent.substring(0, 200) + '...');
    
    // Try MJML compilation with fallback
    let html = '';
    try {
      const result = mjml2html(mjmlContent, {
        validationLevel: 'soft',
        minify: false
      });
      html = result.html;
      
      if (result.errors && result.errors.length > 0) {
        console.warn('MJML compilation warnings:', result.errors);
      }
    } catch (mjmlError: any) {
      console.error('MJML compilation failed, using fallback:', mjmlError);
      // Provide a fallback HTML structure
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${sanitizeInput(subject || 'Email')}</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #ffffff;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            ${generateFallbackHtml(subject, components || [])}
          </div>
        </body>
        </html>
      `;
    }

    console.log('Compilation successful, HTML length:', html.length);

    res.json({
      success: true,
      mjml: mjmlContent,
      html: html
    });

  } catch (error: any) {
    console.error('Error compiling MJML:', error);
    
    // Return error HTML instead of failing completely
    const errorHtml = `
      <!DOCTYPE html>
      <html>
      <head><title>Email Preview Error</title></head>
      <body style="padding: 40px; font-family: Arial, sans-serif; text-align: center;">
        <div style="color: #dc2626; border: 2px solid #fecaca; background: #fef2f2; padding: 20px; border-radius: 8px;">
          <h3>Email Preview Error</h3>
          <p>Unable to compile email preview. Please check your components and try again.</p>
          <small style="color: #6b7280;">Error: ${error.message}</small>
        </div>
      </body>
      </html>
    `;
    
    res.json({ 
      success: false,
      error: 'Error al compilar MJML',
      details: error.message,
      html: errorHtml
    });
  }
}

// Convert email components to MJML structure
function generateMjmlFromComponents(subject: string, components: EmailComponent[]): string {
  const mjmlComponents = components.map(component => {
    switch (component.type) {
      case 'text':
        return `        <mj-text 
          align="${component.styles?.textAlign || 'left'}"
          color="${component.styles?.color || '#000000'}"
          font-size="${component.styles?.fontSize || '16px'}"
          padding="${component.styles?.padding || '15px'}"
          line-height="1.6"
        >
          ${sanitizeInput(component.content?.text || '')}
        </mj-text>`;
        
      case 'image':
        if (!component.content?.src) {
          return `        <mj-text align="center" color="#9ca3af" padding="20px">
            [Image placeholder - Add image URL in properties]
          </mj-text>`;
        }
        return `        <mj-image 
          src="${component.content.src}"
          alt="${component.content?.alt || ''}"
          width="${component.styles?.width || '600px'}"
          padding="${component.styles?.padding || '15px'}"
        />`;
        
      case 'button':
        return `        <mj-button 
          background-color="${component.styles?.backgroundColor || '#1553ec'}"
          color="${component.styles?.color || '#ffffff'}"
          border-radius="${component.styles?.borderRadius || '6px'}"
          padding="${component.styles?.margin || '15px'}"
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

  // Pure MJML structure - completely blank when no components
  if (components.length === 0) {
    const mjmlStructure = `
<mjml>
  <mj-head>
    <mj-title>${sanitizeInput(subject || 'Email')}</mj-title>
    <mj-attributes>
      <mj-all font-family="Arial, sans-serif" />
      <mj-text font-size="16px" color="#000000" line-height="1.6" />
      <mj-button background-color="#1553ec" color="#ffffff" border-radius="6px" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#ffffff">
  </mj-body>
</mjml>`;
    return mjmlStructure;
  }

  const mjmlStructure = `
<mjml>
  <mj-head>
    <mj-title>${sanitizeInput(subject || 'Email')}</mj-title>
    <mj-attributes>
      <mj-all font-family="Arial, sans-serif" />
      <mj-text font-size="16px" color="#000000" line-height="1.6" />
      <mj-button background-color="#1553ec" color="#ffffff" border-radius="6px" />
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

  return mjmlStructure;
}

// Generate fallback HTML when MJML compilation fails - clean structure
function generateFallbackHtml(subject: string, components: EmailComponent[]): string {
  const htmlComponents = components.map(component => {
    switch (component.type) {
      case 'text':
        return `<div style="font-family: Arial, sans-serif; font-size: ${component.styles?.fontSize || '16px'}; line-height: 1.6; text-align: ${component.styles?.textAlign || 'left'}; color: ${component.styles?.color || '#000000'}; padding: ${component.styles?.padding || '10px 25px'};">
          ${sanitizeInput(component.content?.text || '')}
        </div>`;
        
      case 'image':
        if (!component.content?.src) {
          return `<div style="padding: 20px; text-align: center; color: #9ca3af; background: #f9fafb; border: 1px dashed #d1d5db; font-family: Arial, sans-serif; font-size: 14px;">
            [Image placeholder - Add image URL in properties]
          </div>`;
        }
        return `<div style="font-size: 0px; padding: ${component.styles?.padding || '10px 25px'}; text-align: center;">
          <img src="${component.content.src}" alt="${component.content?.alt || ''}" style="border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; width: ${component.styles?.width || '600px'}; max-width: 100%;" />
        </div>`;
        
      case 'button':
        return `<div style="font-size: 0px; padding: ${component.styles?.margin || '10px 25px'}; text-align: ${component.styles?.textAlign || 'center'};">
          <table style="border-collapse: separate; line-height: 100%; margin: 0 auto;">
            <tbody>
              <tr>
                <td style="border: none; border-radius: ${component.styles?.borderRadius || '3px'}; cursor: auto; background-color: ${component.styles?.backgroundColor || '#1553ec'}; padding: ${component.styles?.padding || '10px 25px'};">
                  <a href="${component.content?.href || '#'}" style="display: inline-block; background-color: ${component.styles?.backgroundColor || '#1553ec'}; color: ${component.styles?.color || '#ffffff'}; font-family: Arial, sans-serif; font-size: 13px; font-weight: normal; line-height: 120%; margin: 0; text-decoration: none; text-transform: none; padding: 10px 25px; border-radius: ${component.styles?.borderRadius || '3px'};">
                    ${sanitizeInput(component.content?.text || 'Click here')}
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>`;
        
      case 'spacer':
        return `<div style="height: ${component.styles?.height || '20px'}; line-height: ${component.styles?.height || '20px'};">&#8202;</div>`;
        
      default:
        return '';
    }
  }).join('');

  return `
    <div style="font-family: Arial, sans-serif; background-color: #ffffff;">
      ${components.length === 0 ? '' : htmlComponents}
    </div>
  `;
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
    console.log('- HTML preview:', result.html.substring(0, 300) + '...');
    
    if (result.errors && result.errors.length > 0) {
      console.log('MJML warnings:', result.errors);
    }

    res.json({
      success: true,
      mjml: testMjmlString,
      html: result.html,
      htmlLength: result.html.length,
      errors: result.errors || []
    });

  } catch (error: any) {
    console.error('=== MJML TEST COMPILATION FAILED ===');
    console.error('Error details:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      error: 'MJML compilation failed',
      details: error.message,
      stack: error.stack
    });
  }
}

