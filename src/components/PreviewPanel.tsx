import React, { useState, useEffect, useRef } from 'react';
import { 
  RefreshCw, ExternalLink, Terminal, Monitor, Tablet, Smartphone, 
  Maximize2, Minimize2, Trash2, Search, AlertCircle, AlertTriangle, 
  Info, Play, CheckCircle2, FileText, Code2, Download
} from 'lucide-react';
import { ConsoleLogItem, SupportedLanguage } from '../types';
import { downloadCodeAsFile } from '../utils/fileUpload';

interface PreviewPanelProps {
  language: SupportedLanguage;
  html: string;
  css: string;
  js: string;
  code: string;
  filename?: string;
  runTrigger: number;
  liveUrl?: string;
  onOpenLiveUrl?: () => void;
}

declare global {
  interface Window {
    loadPyodide?: any;
    pyodideInstance?: any;
  }
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
  language,
  html,
  css,
  js,
  code,
  filename,
  runTrigger,
  liveUrl,
  onOpenLiveUrl
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'console' | 'output'>('preview');
  const [deviceWidth, setDeviceWidth] = useState<'full' | 'tablet' | 'mobile'>('full');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLogItem[]>([]);
  const [consoleFilter, setConsoleFilter] = useState<'all' | 'log' | 'warn' | 'error'>('all');
  const [consoleSearch, setConsoleSearch] = useState('');
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [pythonOutput, setPythonOutput] = useState<string>('');
  const [pythonStatus, setPythonStatus] = useState<string>('Ready');

  const isWeb = language === 'web' || language === 'html';
  const isPython = language === 'python';
  const isJsOrTs = language === 'javascript' || language === 'typescript';

  // Listen for iframe messages from web projects
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.source === 'codeforge-runner') {
        const newLog: ConsoleLogItem = {
          id: Math.random().toString(36).substring(2, 9),
          type: event.data.type || 'log',
          content: typeof event.data.content === 'object' 
            ? JSON.stringify(event.data.content, null, 2) 
            : String(event.data.content),
          timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
        setConsoleLogs(prev => [...prev.slice(-200), newLog]);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Python Execution Runner via Pyodide WebAssembly
  const runPython = async (pyCode: string) => {
    setIsRunning(true);
    setPythonStatus('Loading Python 3 runtime...');
    setPythonOutput('Initializing Python 3 WebAssembly engine...\n');
    const startTime = performance.now();

    try {
      if (!window.pyodideInstance) {
        if (!window.loadPyodide) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Pyodide CDN'));
            document.head.appendChild(script);
          });
        }

        window.pyodideInstance = await window.loadPyodide({
          stdout: (text: string) => {
            setPythonOutput(prev => prev + text + '\n');
            setConsoleLogs(prev => [...prev, {
              id: Math.random().toString(36).substring(2, 9),
              type: 'log',
              content: text,
              timestamp: new Date().toLocaleTimeString([], { hour12: false })
            }]);
          },
          stderr: (text: string) => {
            setPythonOutput(prev => prev + '[Error] ' + text + '\n');
            setConsoleLogs(prev => [...prev, {
              id: Math.random().toString(36).substring(2, 9),
              type: 'error',
              content: text,
              timestamp: new Date().toLocaleTimeString([], { hour12: false })
            }]);
          }
        });
      }

      setPythonStatus('Running script...');
      setPythonOutput(''); // clear on fresh run
      await window.pyodideInstance.runPythonAsync(pyCode);
      const elapsed = Math.round(performance.now() - startTime);
      setExecutionTime(elapsed);
      setPythonStatus(`Completed in ${elapsed}ms`);
    } catch (err: any) {
      setPythonOutput(prev => prev + `\nTraceback (most recent call last):\n${err.message || err}`);
      setPythonStatus('Execution failed');
    } finally {
      setIsRunning(false);
    }
  };

  // Run or rerender on runTrigger
  useEffect(() => {
    if (isPython) {
      runPython(code);
      return;
    }

    if (isWeb) {
      const startTime = performance.now();
      setIsRunning(true);

      const docContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    ${css}
  </style>
  <script>
    (function() {
      function send(type, args) {
        try {
          var formatted = Array.from(args).map(function(item) {
            if (item === null) return 'null';
            if (item === undefined) return 'undefined';
            if (typeof item === 'object') {
              try { return JSON.stringify(item); } catch(e) { return String(item); }
            }
            return String(item);
          }).join(' ');
          window.parent.postMessage({ source: 'codeforge-runner', type: type, content: formatted }, '*');
        } catch(e) {}
      }
      var origLog = console.log, origWarn = console.warn, origError = console.error, origInfo = console.info;
      console.log = function() { origLog.apply(console, arguments); send('log', arguments); };
      console.warn = function() { origWarn.apply(console, arguments); send('warn', arguments); };
      console.error = function() { origError.apply(console, arguments); send('error', arguments); };
      console.info = function() { origInfo.apply(console, arguments); send('info', arguments); };
      window.onerror = function(msg, url, lineNo) {
        send('error', ['Error [Ln ' + lineNo + ']: ' + msg]);
        return false;
      };
    })();
  </script>
</head>
<body>
  ${html}
  <script>
    try {
      ${js}
    } catch(err) {
      console.error('Script Error:', err.message);
    }
  </script>
</body>
</html>`;

      if (iframeRef.current) {
        iframeRef.current.srcdoc = docContent;
      }

      const timer = setTimeout(() => {
        setExecutionTime(Math.round(performance.now() - startTime));
        setIsRunning(false);
      }, 100);

      return () => clearTimeout(timer);
    }

    // Single-file JavaScript / TypeScript execution
    if (isJsOrTs) {
      const startTime = performance.now();
      setIsRunning(true);
      const codeToRun = code || js;

      const docContent = `<!DOCTYPE html>
<html>
<head>
  <script>
    (function() {
      function send(type, args) {
        try {
          var formatted = Array.from(args).map(function(item) {
            if (typeof item === 'object') {
              try { return JSON.stringify(item, null, 2); } catch(e) { return String(item); }
            }
            return String(item);
          }).join(' ');
          window.parent.postMessage({ source: 'codeforge-runner', type: type, content: formatted }, '*');
        } catch(e) {}
      }
      console.log = function() { send('log', arguments); };
      console.warn = function() { send('warn', arguments); };
      console.error = function() { send('error', arguments); };
      window.onerror = function(msg, url, line) { send('error', ['Line ' + line + ': ' + msg]); };
    })();
  </script>
</head>
<body>
  <script>
    try {
      ${codeToRun}
    } catch(err) {
      console.error(err.message);
    }
  </script>
</body>
</html>`;

      if (iframeRef.current) {
        iframeRef.current.srcdoc = docContent;
      }
      setExecutionTime(Math.round(performance.now() - startTime));
      setIsRunning(false);
    }
  }, [runTrigger, html, css, js, code, language]);

  const handleClearLogs = () => {
    setConsoleLogs([]);
    if (isPython) setPythonOutput('');
  };

  const handleDownload = () => {
    const ext = isPython ? 'py' : isWeb ? 'html' : isJsOrTs ? 'js' : 'txt';
    const fname = filename || `snippet.${ext}`;
    const content = isWeb ? `<!DOCTYPE html>\n<html>\n<head><style>${css}</style></head>\n<body>\n${html}\n<script>${js}</script>\n</body>\n</html>` : code;
    downloadCodeAsFile(content, fname);
  };

  const filteredLogs = consoleLogs.filter(log => {
    if (consoleFilter !== 'all' && log.type !== consoleFilter) return false;
    if (consoleSearch.trim() && !log.content.toLowerCase().includes(consoleSearch.toLowerCase())) return false;
    return true;
  });

  const errorCount = consoleLogs.filter(l => l.type === 'error').length;
  const warnCount = consoleLogs.filter(l => l.type === 'warn').length;

  return (
    <div className={`flex flex-col h-full bg-neutral-950 overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50' : 'relative'}`}>
      {/* Top Runner Bar */}
      <div className="h-10 px-3 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between text-xs select-none">
        {/* Left Tabs */}
        <div className="flex items-center gap-1">
          {isWeb ? (
            <>
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-md font-medium text-xs flex items-center gap-1.5 transition-colors ${
                  activeTab === 'preview' ? 'bg-neutral-800 text-white shadow-xs' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Live Preview</span>
              </button>

              <button
                onClick={() => setActiveTab('console')}
                className={`px-3 py-1.5 rounded-md font-medium text-xs flex items-center gap-1.5 transition-colors relative ${
                  activeTab === 'console' ? 'bg-neutral-800 text-white shadow-xs' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Console</span>
                {consoleLogs.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 bg-neutral-700 rounded-full font-mono text-neutral-300">
                    {consoleLogs.length}
                  </span>
                )}
                {errorCount > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
              </button>
            </>
          ) : isPython ? (
            <button
              onClick={() => setActiveTab('output')}
              className="px-3 py-1.5 rounded-md font-medium text-xs flex items-center gap-1.5 bg-neutral-800 text-emerald-400"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Python 3 Terminal</span>
            </button>
          ) : (
            <button
              onClick={() => setActiveTab('output')}
              className="px-3 py-1.5 rounded-md font-medium text-xs flex items-center gap-1.5 bg-neutral-800 text-indigo-400"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Execution Output</span>
            </button>
          )}
        </div>

        {/* Center: Device width toggle for Web */}
        {isWeb && (
          <div className="hidden sm:flex items-center bg-neutral-800/80 rounded-md p-0.5 border border-neutral-700/60">
            <button
              onClick={() => setDeviceWidth('full')}
              className={`p-1 rounded text-neutral-400 transition-colors ${deviceWidth === 'full' ? 'bg-neutral-700 text-white' : 'hover:text-white'}`}
              title="Desktop 100%"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDeviceWidth('tablet')}
              className={`p-1 rounded text-neutral-400 transition-colors ${deviceWidth === 'tablet' ? 'bg-neutral-700 text-white' : 'hover:text-white'}`}
              title="Tablet (768px)"
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDeviceWidth('mobile')}
              className={`p-1 rounded text-neutral-400 transition-colors ${deviceWidth === 'mobile' ? 'bg-neutral-700 text-white' : 'hover:text-white'}`}
              title="Mobile (375px)"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-1.5">
          {executionTime !== null && (
            <span className="hidden md:inline text-[11px] text-neutral-500 font-mono tabular-nums">
              {isRunning ? 'running...' : `${executionTime}ms`}
            </span>
          )}

          <button
            onClick={handleDownload}
            className="p-1.5 rounded text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
            title="Download Code File"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              if (isPython) runPython(code);
              else if (iframeRef.current) iframeRef.current.srcdoc = iframeRef.current.srcdoc;
            }}
            className="p-1.5 rounded text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
            title="Re-run code"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {onOpenLiveUrl && (
            <button
              onClick={onOpenLiveUrl}
              className="p-1.5 rounded text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/40 transition-colors"
              title="Open Live Web Link in New Tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 relative flex items-center justify-center bg-neutral-950/80 overflow-hidden">
        {/* Invisible iframe for executing Web or JS */}
        <iframe
          ref={iframeRef}
          title="Live Sandbox"
          sandbox="allow-scripts allow-modals allow-forms allow-same-origin allow-popups"
          className={isWeb && activeTab === 'preview' 
            ? `h-full bg-white border-0 transition-all duration-150 ${deviceWidth === 'full' ? 'w-full' : deviceWidth === 'tablet' ? 'w-[768px] max-w-full shadow-2xl' : 'w-[375px] max-w-full shadow-2xl'}`
            : 'hidden'
          }
        />

        {/* Python Terminal View */}
        {isPython && (
          <div className="w-full h-full flex flex-col bg-neutral-950 font-mono text-xs p-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 text-neutral-400 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-white font-medium">Python 3 (Pyodide WebAssembly Engine)</span>
                <span>·</span>
                <span className="text-[11px] text-neutral-500">{pythonStatus}</span>
              </div>
              <button
                onClick={handleClearLogs}
                className="p-1 rounded text-neutral-400 hover:text-rose-400"
                title="Clear Output"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto pt-3 font-mono text-[13px] leading-relaxed text-emerald-400 whitespace-pre-wrap select-text">
              {pythonOutput || <span className="text-neutral-600">Hit "Run" or press Ctrl+Enter to execute Python code.</span>}
            </div>
          </div>
        )}

        {/* Generic Code Output / Console for JS, TS, or other scripts */}
        {(!isWeb && !isPython) || (isWeb && activeTab === 'console') ? (
          <div className="flex flex-col w-full h-full bg-neutral-950 font-mono text-xs">
            <div className="h-9 px-3 bg-neutral-900/80 border-b border-neutral-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setConsoleFilter('all')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium ${consoleFilter === 'all' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'}`}
                >
                  All ({consoleLogs.length})
                </button>
                <button
                  onClick={() => setConsoleFilter('log')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium ${consoleFilter === 'log' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'}`}
                >
                  Logs
                </button>
                <button
                  onClick={() => setConsoleFilter('error')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 ${consoleFilter === 'error' ? 'bg-rose-900/60 text-rose-200' : 'text-neutral-400 hover:text-rose-300'}`}
                >
                  Errors ({errorCount})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3 h-3 text-neutral-500 absolute left-2 top-2" />
                  <input
                    type="text"
                    value={consoleSearch}
                    onChange={(e) => setConsoleSearch(e.target.value)}
                    placeholder="Filter console..."
                    className="bg-neutral-950 border border-neutral-800 rounded pl-6 pr-2 py-0.5 text-[11px] text-neutral-200 outline-none w-32 focus:w-44 transition-all"
                  />
                </div>
                <button
                  onClick={handleClearLogs}
                  className="p-1 rounded text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 transition-colors"
                  title="Clear Console"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 select-text">
              {filteredLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-neutral-600 text-center py-12">
                  <Terminal className="w-8 h-8 mb-2 stroke-[1.5]" />
                  <p className="text-xs">No console output recorded.</p>
                  <p className="text-[11px] text-neutral-700 mt-1">
                    Output from prints, console logs, or errors will appear here in real-time.
                  </p>
                </div>
              ) : (
                filteredLogs.map(log => (
                  <div
                    key={log.id}
                    className={`flex items-start gap-2 px-2.5 py-1.5 rounded font-mono text-[12px] leading-relaxed border ${
                      log.type === 'error'
                        ? 'bg-rose-950/20 text-rose-300 border-rose-900/30'
                        : log.type === 'warn'
                        ? 'bg-amber-950/20 text-amber-300 border-amber-900/30'
                        : 'bg-neutral-900/50 text-neutral-300 border-neutral-850'
                    }`}
                  >
                    <span className="text-[10px] text-neutral-600 shrink-0 select-none mt-0.5 tabular-nums">
                      {log.timestamp}
                    </span>
                    {log.type === 'error' && <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />}
                    <div className="flex-1 whitespace-pre-wrap break-all">
                      {log.content}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
