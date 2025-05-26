import { describe, it, expect } from 'vitest';
import { generateEmailHTML, generateLegacyEmailHTML } from '../shared/emailRenderer';
import type { EmailComponent } from '../shared/schema';

describe('Email Renderer', () => {
  describe('generateEmailHTML', () => {
    it('should generate valid HTML structure', () => {
      const components: EmailComponent[] = [
        {
          id: 'test-text',
          type: 'text',
          content: { text: 'Hello World' },
          styles: { fontSize: '16px', color: '#333' }
        }
      ];

      const html = generateEmailHTML({
        subject: 'Test Email',
        components
      });

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Hello World');
      expect(html).toContain('Test Email');
      expect(html).toContain('KAVAK');
    });

    it('should sanitize malicious content', () => {
      const components: EmailComponent[] = [
        {
          id: 'test-malicious',
          type: 'text',
          content: { text: '<script>alert("xss")</script>Safe content' },
          styles: {}
        }
      ];

      const html = generateEmailHTML({
        subject: 'Test Email',
        components
      });

      expect(html).not.toContain('<script>');
      expect(html).toContain('Safe content');
    });
  });
});