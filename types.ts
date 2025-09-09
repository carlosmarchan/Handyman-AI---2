export enum AppStage {
  LANDING = 'LANDING',
  CAPTURE = 'CAPTURE',
  GENERATING = 'GENERATING',
  REFINE = 'REFINE',
  PREVIEW = 'PREVIEW',
}

export interface ImageFile {
  id: string;
  src: string; // base64 data URL
  mimeType: string;
  selected: boolean;
  isAnnotated?: boolean;
  annotatedSrc?: string;
  annotationPrompt?: string;
}

export interface ChatMessage {
    author: 'user' | 'ai';
    content: string;
    // Optional array of images for AI messages to embed in the report
    images?: ImageFile[]; 
}