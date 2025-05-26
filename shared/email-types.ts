// Centralized email component types and interfaces
export interface EmailComponent {
  id: string;
  type: 'text' | 'image' | 'button' | 'spacer' | 'background' | 'column';
  content: any;
  styles: Record<string, any>;
  children?: EmailComponent[];
}

export interface EmailContent {
  subject: string;
  components: EmailComponent[];
  globalStyles: {
    backgroundColor: string;
    fontFamily: string;
    primaryColor: string;
    secondaryColor: string;
  };
}

export interface EmailTemplate {
  id: string;
  name: string;
  description?: string;
  content: EmailContent;
  color: string;
  category?: string;
}

export interface ComponentType {
  type: string;
  name: string;
  icon: React.ReactNode;
  description: string;
}

export interface EmailBuilderState {
  selectedTemplate: string | null;
  emailComponents: EmailComponent[];
  emailContent: {
    subject: string;
    header: string;
    body: string;
    cta: string;
  };
  selectedComponent: string | null;
  tone: 'professional' | 'friendly' | 'urgent' | 'promotional';
}