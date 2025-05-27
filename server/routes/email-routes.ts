import { Request, Response } from 'express';
import { z } from 'zod';
import { openai } from '../openai';
import { emailTemplates, insertEmailTemplateSchema, type EmailTemplate, type InsertEmailTemplate, type EmailComponent } from '@shared/schema';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import DOMPurify from 'isomorphic-dompurify';

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

