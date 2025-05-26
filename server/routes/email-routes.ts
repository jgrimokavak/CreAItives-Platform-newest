import { Request, Response } from 'express';
import { z } from 'zod';
import { openai } from '../openai';
import { emailTemplates, insertEmailTemplateSchema, type EmailTemplate, type InsertEmailTemplate } from '@shared/schema';
import { db } from '../db';
import { eq } from 'drizzle-orm';

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
    
    res.json({
      success: true,
      content: generatedContent,
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

export async function generateEmailHTML(req: Request, res: Response) {
  try {
    const { subject, header, body, cta, templateType } = req.body;
    
    // KAVAK brand colors
    const brandColors = {
      primary: '#1553ec',
      secondary: '#001dd1',
      white: '#ffffff',
      black: '#000000'
    };

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style>
        body { 
            margin: 0; 
            padding: 0; 
            font-family: 'Roboto', 'Helvetica', Arial, sans-serif; 
            background-color: #f5f5f5;
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: ${brandColors.white};
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header { 
            background: linear-gradient(135deg, ${brandColors.primary} 0%, ${brandColors.secondary} 100%);
            color: ${brandColors.white}; 
            padding: 40px 20px; 
            text-align: center; 
        }
        .header h1 { 
            margin: 0; 
            font-size: 28px; 
            font-weight: bold; 
            line-height: 1.2;
        }
        .content { 
            padding: 40px 20px; 
        }
        .content h2 { 
            color: #333333; 
            font-size: 24px; 
            margin-bottom: 20px; 
            line-height: 1.3;
        }
        .content p { 
            color: #666666; 
            font-size: 16px; 
            line-height: 1.6; 
            margin-bottom: 20px; 
        }
        .cta-button { 
            display: inline-block; 
            background: linear-gradient(135deg, ${brandColors.primary} 0%, ${brandColors.secondary} 100%);
            color: ${brandColors.white}; 
            padding: 15px 30px; 
            text-decoration: none; 
            border-radius: 8px; 
            font-weight: bold; 
            margin-top: 20px;
            transition: transform 0.2s ease;
        }
        .cta-button:hover {
            transform: translateY(-2px);
        }
        .footer { 
            background-color: #f8f9fa; 
            padding: 30px 20px; 
            text-align: center; 
            color: #666666; 
            font-size: 14px;
            border-top: 1px solid #e9ecef;
        }
        .footer p {
            margin: 5px 0;
        }
        .logo { 
            max-width: 150px; 
            height: auto; 
        }
        @media only screen and (max-width: 600px) {
            .header h1 { font-size: 24px; }
            .content { padding: 30px 15px; }
            .header { padding: 30px 15px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${header}</h1>
        </div>
        <div class="content">
            <p>${body}</p>
            <div style="text-align: center;">
                <a href="#" class="cta-button">${cta}</a>
            </div>
        </div>
        <div class="footer">
            <p><strong>KAVAK</strong> - Tu experiencia automotriz</p>
            <p>© ${new Date().getFullYear()} KAVAK. Todos los derechos reservados.</p>
            <p style="font-size: 12px; color: #999;">
                Este email fue generado con Email CreAItor
            </p>
        </div>
    </div>
</body>
</html>`;

    res.json({
      success: true,
      html,
      metadata: {
        subject,
        templateType,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Error generating email HTML:', error);
    res.status(500).json({ 
      error: 'Error al generar HTML del email',
      details: error.message 
    });
  }
}