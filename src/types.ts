export type SupportedLanguage = 
  | 'web' 
  | 'javascript' 
  | 'python' 
  | 'typescript' 
  | 'html' 
  | 'css' 
  | 'json' 
  | 'markdown' 
  | 'c' 
  | 'cpp' 
  | 'rust' 
  | 'go' 
  | 'java' 
  | 'bash' 
  | 'sql' 
  | 'plaintext';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
}

export interface Snippet {
  id: string;
  slug: string;
  title: string;
  description: string;
  language: SupportedLanguage;
  folderId: string;
  userId?: string;
  // For web projects: html, css, js
  html: string;
  css: string;
  js: string;
  // For single-file / general code: code content
  code: string;
  filename?: string;
  filesize?: number;
  tags: string[];
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  icon?: string;
  createdAt: string;
}

export interface ConsoleLogItem {
  id: string;
  type: 'log' | 'info' | 'warn' | 'error';
  content: string;
  timestamp: string;
}

export interface SharedProject {
  shareId: string;
  slug: string;
  projectId?: string;
  title: string;
  description: string;
  language: SupportedLanguage;
  html: string;
  css: string;
  js: string;
  code: string;
  filename?: string;
  author: string;
  createdAt: string;
  views: number;
}

export interface UploadedFileResult {
  filename: string;
  code: string;
  language: SupportedLanguage;
  filesize: number;
  html?: string;
  css?: string;
  js?: string;
}
