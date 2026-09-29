import { SupportedLanguage, UploadedFileResult } from '../types';

export function detectLanguageFromFilename(filename: string): SupportedLanguage {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'py':
    case 'pyw':
    case 'python':
      return 'python';
    case 'js':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    case 'ts':
    case 'tsx':
    case 'jsx':
      return 'typescript';
    case 'html':
    case 'htm':
      return 'web';
    case 'css':
    case 'scss':
    case 'less':
      return 'css';
    case 'json':
      return 'json';
    case 'md':
    case 'markdown':
      return 'markdown';
    case 'c':
    case 'h':
      return 'c';
    case 'cpp':
    case 'cc':
    case 'cxx':
    case 'hpp':
      return 'cpp';
    case 'rs':
      return 'rust';
    case 'go':
      return 'go';
    case 'java':
      return 'java';
    case 'sh':
    case 'bash':
    case 'zsh':
      return 'bash';
    case 'sql':
      return 'sql';
    default:
      return 'plaintext';
  }
}

export function readFileAsText(file: File): Promise<UploadedFileResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = (e.target?.result as string) || '';
      const language = detectLanguageFromFilename(file.name);

      let html = '';
      let css = '';
      let js = '';

      if (language === 'web' || file.name.endsWith('.html')) {
        html = content;
        // Check if there are separate style and script tags
        const styleMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
        const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
        if (styleMatch) css = styleMatch[1];
        if (scriptMatch) js = scriptMatch[1];
      } else if (language === 'javascript' || language === 'typescript') {
        js = content;
      } else if (language === 'css') {
        css = content;
      }

      resolve({
        filename: file.name,
        code: content,
        language,
        filesize: file.size,
        html,
        css,
        js
      });
    };

    reader.onerror = () => {
      reject(new Error(`Failed to read file ${file.name}`));
    };

    reader.readAsText(file);
  });
}

export function downloadCodeAsFile(content: string, filename: string, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function formatFileSize(bytes?: number): string {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
