import React, { useRef, useState } from 'react';
import { Copy, Check, Sparkles, FileCode2, Palette, FileText, Code2, Download } from 'lucide-react';
import { SupportedLanguage } from '../types';
import { highlightCode } from '../utils/prismHelper';
import { downloadCodeAsFile } from '../utils/fileUpload';

interface CodeEditorProps {
  value: string;
  onChange: (val: string) => void;
  language: SupportedLanguage;
  filename?: string;
  activeTab: 'html' | 'css' | 'js';
  setActiveTab: (tab: 'html' | 'css' | 'js') => void;
  onRun?: () => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language,
  filename,
  activeTab,
  setActiveTab,
  onRun
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState<13 | 14 | 16>(13);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

  const isWeb = language === 'web' || language === 'html';

  const handleScroll = () => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const updateCursorPosition = () => {
    if (!textareaRef.current) return;
    const text = textareaRef.current.value.substring(0, textareaRef.current.selectionStart);
    const lines = text.split('\n');
    setCursorPos({
      line: lines.length,
      col: lines[lines.length - 1].length + 1
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!textareaRef.current) return;

    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onRun?.();
      return;
    }

    const { selectionStart, selectionEnd, value } = textareaRef.current;

    // Tab key (2 spaces)
    if (e.key === 'Tab') {
      e.preventDefault();
      const tabString = '  ';
      if (!e.shiftKey) {
        const newValue = value.substring(0, selectionStart) + tabString + value.substring(selectionEnd);
        onChange(newValue);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = selectionStart + tabString.length;
          }
        }, 0);
      } else {
        const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
        if (value.substring(lineStart, lineStart + 2) === '  ') {
          const newValue = value.substring(0, lineStart) + value.substring(lineStart + 2);
          onChange(newValue);
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.selectionStart = textareaRef.current.selectionEnd = Math.max(lineStart, selectionStart - 2);
            }
          }, 0);
        }
      }
      return;
    }

    // Auto-close pairs
    const pairs: Record<string, string> = {
      '(': ')',
      '{': '}',
      '[': ']',
      '"': '"',
      "'": "'",
      '`': '`'
    };

    if (pairs[e.key] && selectionStart === selectionEnd) {
      e.preventDefault();
      const closeChar = pairs[e.key];
      const newValue = value.substring(0, selectionStart) + e.key + closeChar + value.substring(selectionEnd);
      onChange(newValue);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = selectionStart + 1;
        }
      }, 0);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    const ext = language === 'python' ? 'py' : language === 'javascript' ? 'js' : language === 'typescript' ? 'ts' : isWeb ? 'html' : 'txt';
    const name = filename || `code.${ext}`;
    downloadCodeAsFile(value, name);
  };

  const handleFormat = () => {
    const lines = value.split('\n');
    let indentLevel = 0;
    const formatted = lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('}') || trimmed.startsWith('</') || trimmed.startsWith(')')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }
      const pad = '  '.repeat(indentLevel);
      if (trimmed.endsWith('{') || (trimmed.startsWith('<') && !trimmed.endsWith('/>') && !trimmed.startsWith('</') && trimmed.includes('>')) || trimmed.endsWith(':')) {
        indentLevel++;
      }
      return pad + trimmed;
    }).join('\n');
    onChange(formatted);
  };

  // Syntax highlighting
  const currentLangKey = isWeb ? activeTab : language;
  const highlightedHtml = highlightCode(value, currentLangKey);
  const lines = value.split('\n');

  return (
    <div className="flex flex-col h-full bg-neutral-900 border-r border-neutral-800 select-none">
      {/* Editor Top Toolbar */}
      <div className="h-10 px-3 bg-neutral-900/90 border-b border-neutral-800 flex items-center justify-between text-xs">
        {/* File Tabs */}
        {isWeb ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('html')}
              className={`px-3 py-1.5 rounded-t-md font-mono text-xs flex items-center gap-1.5 transition-colors border-b-2 ${
                activeTab === 'html'
                  ? 'bg-neutral-800/90 text-orange-400 border-orange-500 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200 border-transparent'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>index.html</span>
            </button>

            <button
              onClick={() => setActiveTab('css')}
              className={`px-3 py-1.5 rounded-t-md font-mono text-xs flex items-center gap-1.5 transition-colors border-b-2 ${
                activeTab === 'css'
                  ? 'bg-neutral-800/90 text-sky-400 border-sky-500 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200 border-transparent'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>style.css</span>
            </button>

            <button
              onClick={() => setActiveTab('js')}
              className={`px-3 py-1.5 rounded-t-md font-mono text-xs flex items-center gap-1.5 transition-colors border-b-2 ${
                activeTab === 'js'
                  ? 'bg-neutral-800/90 text-amber-400 border-amber-500 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200 border-transparent'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>script.js</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-neutral-800 rounded font-mono text-xs text-white">
              <Code2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>{filename || (language === 'python' ? 'main.py' : `script.${language}`)}</span>
            </div>
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-neutral-800/60 uppercase font-mono text-indigo-300">
              {language}
            </span>
          </div>
        )}

        {/* Toolbar Action Buttons */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center bg-neutral-800 rounded px-1 py-0.5 border border-neutral-700/60 text-[11px] text-neutral-400">
            <button
              onClick={() => setFontSize(13)}
              className={`px-1.5 rounded ${fontSize === 13 ? 'bg-neutral-700 text-white font-medium' : 'hover:text-white'}`}
            >
              13px
            </button>
            <button
              onClick={() => setFontSize(14)}
              className={`px-1.5 rounded ${fontSize === 14 ? 'bg-neutral-700 text-white font-medium' : 'hover:text-white'}`}
            >
              14px
            </button>
            <button
              onClick={() => setFontSize(16)}
              className={`px-1.5 rounded ${fontSize === 16 ? 'bg-neutral-700 text-white font-medium' : 'hover:text-white'}`}
            >
              16px
            </button>
          </div>

          <button
            onClick={handleFormat}
            className="p-1.5 rounded text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
            title="Clean Indentation"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleDownload}
            className="p-1.5 rounded text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
            title="Download Code File"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleCopy}
            className="p-1.5 rounded text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
            title="Copy Code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Code Editor Body */}
      <div className="relative flex-1 flex overflow-hidden font-mono bg-neutral-950">
        {/* Line Numbers Gutter */}
        <div
          ref={lineNumbersRef}
          className="w-12 py-3 bg-neutral-950/80 border-r border-neutral-800/80 text-right pr-3 select-none overflow-hidden text-neutral-600 font-mono"
          style={{ fontSize: `${fontSize}px`, lineHeight: '21px' }}
        >
          {lines.map((_, i) => (
            <div
              key={i}
              className={`leading-[21px] ${cursorPos.line === i + 1 ? 'text-neutral-300 font-bold' : ''}`}
            >
              {i + 1}
            </div>
          ))}
        </div>

        {/* Code Canvas */}
        <div className="relative flex-1 h-full overflow-hidden">
          <pre
            ref={preRef}
            aria-hidden="true"
            className="absolute inset-0 p-3 m-0 overflow-hidden pointer-events-none whitespace-pre break-normal code-editor-layer bg-transparent text-neutral-100"
            style={{ fontSize: `${fontSize}px`, lineHeight: '21px' }}
            dangerouslySetInnerHTML={{ __html: highlightedHtml + '\n' }}
          />

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            onKeyUp={updateCursorPosition}
            onClick={updateCursorPosition}
            placeholder={`// Blank codebox - write your ${isWeb ? activeTab.toUpperCase() : language} code here...`}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            className="absolute inset-0 w-full h-full p-3 m-0 bg-transparent text-transparent caret-white resize-none outline-none border-none whitespace-pre break-normal overflow-auto code-editor-layer placeholder:text-neutral-600"
            style={{ fontSize: `${fontSize}px`, lineHeight: '21px' }}
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="h-6 px-3 bg-neutral-900/90 border-t border-neutral-800 flex items-center justify-between text-[11px] text-neutral-500 font-mono">
        <div className="flex items-center gap-3">
          <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
          <span>·</span>
          <span>{lines.length} lines</span>
          <span>·</span>
          <span>{(value.length / 1024).toFixed(1)} KB</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="uppercase text-neutral-400 font-medium">{language}</span>
          <span>·</span>
          <span>UTF-8</span>
        </div>
      </div>
    </div>
  );
};
