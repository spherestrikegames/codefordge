import Prism from 'prismjs';
// Base components
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';

// Dynamically load additional languages safely
const loadExtraLanguages = async () => {
  try {
    // @ts-expect-error prism submodules lack standalone declarations
    await import('prismjs/components/prism-typescript');
    // @ts-expect-error prism submodules lack standalone declarations
    await import('prismjs/components/prism-python');
    // @ts-expect-error prism submodules lack standalone declarations
    await import('prismjs/components/prism-json');
    // @ts-expect-error prism submodules lack standalone declarations
    await import('prismjs/components/prism-markdown');
    // @ts-expect-error prism submodules lack standalone declarations
    await import('prismjs/components/prism-c');
    // @ts-expect-error prism submodules lack standalone declarations
    await import('prismjs/components/prism-cpp');
    // @ts-expect-error prism submodules lack standalone declarations
    await import('prismjs/components/prism-rust');
    // @ts-expect-error prism submodules lack standalone declarations
    await import('prismjs/components/prism-go');
    // @ts-expect-error prism submodules lack standalone declarations
    await import('prismjs/components/prism-java');
    // @ts-expect-error prism submodules lack standalone declarations
    await import('prismjs/components/prism-bash');
    // @ts-expect-error prism submodules lack standalone declarations
    await import('prismjs/components/prism-sql');
  } catch {
    // Graceful fallback to built-in clike or javascript
  }
};
loadExtraLanguages();

export function highlightCode(code: string, language: string): string {
  // Safe limits for massive files: if over 150KB, highlight first 5,000 lines or return escaped text for instant performance
  if (code.length > 250000) {
    return escapeHtml(code);
  }

  const langKey = mapLanguageToPrism(language);
  const grammar = Prism.languages[langKey] || Prism.languages.clike || Prism.languages.javascript;

  try {
    return Prism.highlight(code, grammar, langKey);
  } catch {
    return escapeHtml(code);
  }
}

function mapLanguageToPrism(lang: string): string {
  switch (lang.toLowerCase()) {
    case 'html':
    case 'markup':
    case 'web':
      return 'markup';
    case 'css':
      return 'css';
    case 'js':
    case 'javascript':
      return 'javascript';
    case 'ts':
    case 'typescript':
      return Prism.languages.typescript ? 'typescript' : 'javascript';
    case 'py':
    case 'python':
      return Prism.languages.python ? 'python' : 'clike';
    case 'json':
      return Prism.languages.json ? 'json' : 'javascript';
    case 'md':
    case 'markdown':
      return Prism.languages.markdown ? 'markdown' : 'markup';
    case 'c':
      return Prism.languages.c ? 'c' : 'clike';
    case 'cpp':
    case 'c++':
      return Prism.languages.cpp ? 'cpp' : 'clike';
    case 'rs':
    case 'rust':
      return Prism.languages.rust ? 'rust' : 'clike';
    case 'go':
      return Prism.languages.go ? 'go' : 'clike';
    case 'java':
      return Prism.languages.java ? 'java' : 'clike';
    case 'sh':
    case 'bash':
      return Prism.languages.bash ? 'bash' : 'clike';
    case 'sql':
      return Prism.languages.sql ? 'sql' : 'clike';
    default:
      return 'clike';
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
