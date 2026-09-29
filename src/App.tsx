import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { CodeEditor } from './components/CodeEditor';
import { PreviewPanel } from './components/PreviewPanel';
import { GithubDashboard } from './components/GithubDashboard';
import { AiCopilotAgent } from './components/AiCopilotAgent';
import { UploadModal } from './components/UploadModal';
import { ShareModal } from './components/ShareModal';
import { Snippet, Folder, SharedProject, UploadedFileResult, SupportedLanguage } from './types';
import { Code2, Monitor, Sparkles, X } from 'lucide-react';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'project';
}

export default function App() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentSnippet, setCurrentSnippet] = useState<Snippet | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  const [activeEditorTab, setActiveEditorTab] = useState<'html' | 'css' | 'js'>('html');
  const [viewMode, setViewMode] = useState<'playground' | 'dashboard'>('dashboard');
  const [mobileView, setMobileView] = useState<'editor' | 'preview'>('editor');
  const [darkMode, setDarkMode] = useState(true);

  const [isAiAgentOpen, setIsAiAgentOpen] = useState(false);
  const [runTrigger, setRunTrigger] = useState(0);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editorSplitRatio, setEditorSplitRatio] = useState(50);

  // Toggle dark mode class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
    }
  }, [darkMode]);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/projects');
        if (res.ok) {
          const data = await res.json();
          setSnippets(data.snippets || []);
          setFolders(data.folders || []);

          // Check URL query parameters
          const params = new URLSearchParams(window.location.search);
          const shareId = params.get('share');
          const projectId = params.get('project');

          if (shareId) {
            try {
              const sRes = await fetch(`/api/share/${shareId}`);
              if (sRes.ok) {
                const sData: SharedProject = await sRes.json();
                const forked: Snippet = {
                  id: 'snip_' + Math.random().toString(36).substring(2, 9),
                  slug: slugify(sData.title) + '-forked',
                  title: `${sData.title} (Forked)`,
                  description: sData.description || '',
                  language: sData.language || 'web',
                  folderId: data.folders[0]?.id || 'f_web',
                  html: sData.html || '',
                  css: sData.css || '',
                  js: sData.js || '',
                  code: sData.code || '',
                  filename: sData.filename || undefined,
                  tags: ['forked', 'shared'],
                  isFavorite: false,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  version: 1
                };
                setCurrentSnippet(forked);
                setSnippets(prev => [forked, ...prev]);
                setViewMode('playground');
                return;
              }
            } catch (err) {
              console.error('Failed to load shared snippet:', err);
            }
          }

          if (projectId) {
            const found = data.snippets.find((s: Snippet) => s.id === projectId || s.slug === projectId);
            if (found) {
              setCurrentSnippet(found);
              setViewMode('playground');
              return;
            }
          }

          if (data.snippets && data.snippets.length > 0) {
            setCurrentSnippet(data.snippets[0]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch projects:', err);
      }
    }
    loadData();
  }, []);

  // Debounced auto-save
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerSave = useCallback((snippetToSave: Snippet) => {
    setIsSaving(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/projects/${snippetToSave.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(snippetToSave)
        });

        if (!res.ok) {
          await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(snippetToSave)
          });
        }

        setSnippets(prev => prev.map(s => s.id === snippetToSave.id ? snippetToSave : s));
      } catch (err) {
        console.error('Auto-save error:', err);
      } finally {
        setIsSaving(false);
      }
    }, 500);
  }, []);

  // Code change in editor
  const handleCodeChange = (newCode: string) => {
    if (!currentSnippet) return;

    let updated: Snippet;
    if (currentSnippet.language === 'web' || currentSnippet.language === 'html') {
      updated = {
        ...currentSnippet,
        [activeEditorTab]: newCode,
        updatedAt: new Date().toISOString()
      };
    } else {
      updated = {
        ...currentSnippet,
        code: newCode,
        updatedAt: new Date().toISOString()
      };
    }

    setCurrentSnippet(updated);
    triggerSave(updated);
  };

  // Run code
  const handleRunCode = () => {
    setRunTrigger(prev => prev + 1);
    if (mobileView === 'editor') {
      setMobileView('preview');
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRunCode();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (currentSnippet) triggerSave(currentSnippet);
      }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [currentSnippet, triggerSave]);

  // Apply code from AI Copilot
  const handleApplyAiCode = (codeSnippet: string) => {
    if (!currentSnippet) return;

    if (currentSnippet.language === 'web' || currentSnippet.language === 'html') {
      // If code contains HTML tags, apply to html; if css syntax, apply to css; else js
      let targetTab = activeEditorTab;
      if (codeSnippet.includes('<div') || codeSnippet.includes('<button') || codeSnippet.includes('<h1')) {
        targetTab = 'html';
      } else if (codeSnippet.includes('{') && (codeSnippet.includes('color:') || codeSnippet.includes('background:') || codeSnippet.includes('margin:'))) {
        targetTab = 'css';
      } else if (codeSnippet.includes('function') || codeSnippet.includes('const') || codeSnippet.includes('document.')) {
        targetTab = 'js';
      }

      const updated = {
        ...currentSnippet,
        [targetTab]: codeSnippet,
        updatedAt: new Date().toISOString()
      };
      setActiveEditorTab(targetTab);
      setCurrentSnippet(updated);
      triggerSave(updated);
    } else {
      const updated = {
        ...currentSnippet,
        code: codeSnippet,
        updatedAt: new Date().toISOString()
      };
      setCurrentSnippet(updated);
      triggerSave(updated);
    }
    setRunTrigger(r => r + 1);
  };

  // Create new snippet
  const handleCreateNewSnippet = async (folderId?: string, lang: SupportedLanguage = 'web') => {
    const targetFolderId = folderId || (folders[0] ? folders[0].id : 'f_web');
    const isWeb = lang === 'web' || lang === 'html';
    const title = isWeb ? 'Interactive Web App' : 'Python Script';
    const slug = slugify(title) + '-' + Math.random().toString(36).substring(2, 6);

    const newSnippet: Snippet = {
      id: 'snip_' + Math.random().toString(36).substring(2, 9),
      slug,
      title,
      description: isWeb ? 'HTML, CSS & JavaScript application.' : 'Python 3 script.',
      language: lang,
      folderId: targetFolderId,
      filename: isWeb ? 'index.html' : 'main.py',
      html: isWeb ? `<div class="container">\n  <h1>Hello, CodeForge!</h1>\n  <p>Build with HTML, CSS & JavaScript in real-time.</p>\n  <button id="actionBtn">Click to Interact</button>\n</div>` : '',
      css: isWeb ? `body {\n  margin: 0;\n  background: #0d1117;\n  color: #f0f6fc;\n  font-family: -apple-system, sans-serif;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 100vh;\n}\n.container {\n  text-align: center;\n  padding: 32px;\n  background: #161b22;\n  border: 1px solid #30363d;\n  border-radius: 12px;\n}\nbutton {\n  background: #238636;\n  color: white;\n  border: none;\n  padding: 10px 20px;\n  border-radius: 6px;\n  font-weight: 600;\n  cursor: pointer;\n}` : '',
      js: isWeb ? `const btn = document.getElementById('actionBtn');\nbtn.addEventListener('click', () => {\n  console.log('Button clicked!');\n  btn.textContent = 'Awesome! Clicked!';\n  btn.style.background = '#1f6feb';\n});\nconsole.log('Interactive web application mounted.');` : '',
      code: !isWeb ? `def main():\n    print("Hello from Python 3!")\n    numbers = [1, 2, 3, 4, 5]\n    print("Sum of numbers:", sum(numbers))\n\nmain()\n` : '',
      tags: [lang],
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    };

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSnippet)
      });
      if (res.ok) {
        const saved = await res.json();
        setSnippets(prev => [saved, ...prev]);
        setCurrentSnippet(saved);
      } else {
        setSnippets(prev => [newSnippet, ...prev]);
        setCurrentSnippet(newSnippet);
      }
    } catch {
      setSnippets(prev => [newSnippet, ...prev]);
      setCurrentSnippet(newSnippet);
    }

    setViewMode('playground');
    setRunTrigger(r => r + 1);
  };

  // Upload handler
  const handleUploadSuccess = async (fileData: UploadedFileResult & { title: string; folderId: string }) => {
    const slug = slugify(fileData.title);
    const newSnippet: Snippet = {
      id: 'snip_' + Math.random().toString(36).substring(2, 9),
      slug,
      title: fileData.title,
      description: `Imported from ${fileData.filename}`,
      language: fileData.language,
      folderId: fileData.folderId,
      filename: fileData.filename,
      filesize: fileData.filesize,
      html: fileData.html || '',
      css: fileData.css || '',
      js: fileData.js || '',
      code: fileData.code,
      tags: [fileData.language, 'uploaded'],
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    };

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSnippet)
      });
      if (res.ok) {
        const saved = await res.json();
        setSnippets(prev => [saved, ...prev]);
        setCurrentSnippet(saved);
      } else {
        setSnippets(prev => [newSnippet, ...prev]);
        setCurrentSnippet(newSnippet);
      }
    } catch {
      setSnippets(prev => [newSnippet, ...prev]);
      setCurrentSnippet(newSnippet);
    }

    setViewMode('playground');
    setRunTrigger(r => r + 1);
  };

  const handleDuplicateSnippet = async (snip: Snippet) => {
    const duplicated: Snippet = {
      ...snip,
      id: 'snip_' + Math.random().toString(36).substring(2, 9),
      slug: snip.slug + '-copy',
      title: `${snip.title} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    };

    try {
      await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicated)
      });
      setSnippets(prev => [duplicated, ...prev]);
    } catch (err) {
      console.error('Error duplicating snippet:', err);
    }
  };

  const handleDeleteSnippet = async (id: string) => {
    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      const nextSnippets = snippets.filter(s => s.id !== id && s.slug !== id);
      setSnippets(nextSnippets);
      if (currentSnippet?.id === id || currentSnippet?.slug === id) {
        setCurrentSnippet(nextSnippets[0] || null);
      }
    } catch (err) {
      console.error('Delete snippet error:', err);
    }
  };

  const handleToggleFavorite = async (id: string) => {
    const target = snippets.find(s => s.id === id || s.slug === id);
    if (!target) return;
    const updated = { ...target, isFavorite: !target.isFavorite };
    try {
      await fetch(`/api/projects/${target.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: updated.isFavorite })
      });
      setSnippets(prev => prev.map(s => (s.id === target.id) ? updated : s));
      if (currentSnippet?.id === target.id) {
        setCurrentSnippet(updated);
      }
    } catch (err) {
      console.error('Toggle favorite error:', err);
    }
  };

  const handleCreateFolder = async (name: string, color: string) => {
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color })
      });
      if (res.ok) {
        const newFolder = await res.json();
        setFolders(prev => [...prev, newFolder]);
      }
    } catch (err) {
      console.error('Create folder error:', err);
    }
  };

  const handleDeleteFolder = async (id: string) => {
    try {
      await fetch(`/api/folders/${id}`, { method: 'DELETE' });
      setFolders(prev => prev.filter(f => f.id !== id));
      if (activeFolderId === id) setActiveFolderId(null);
    } catch (err) {
      console.error('Delete folder error:', err);
    }
  };

  const handleClearAllProjects = async () => {
    if (confirm('Are you sure you want to get rid of all projects? This will clear all snippets and live links.')) {
      try {
        await fetch('/api/reset', { method: 'POST' });
        setSnippets([]);
        setCurrentSnippet(null);
        setViewMode('dashboard');
      } catch (err) {
        console.error('Failed to reset:', err);
      }
    }
  };

  const getCurrentCode = () => {
    if (!currentSnippet) return '';
    if (currentSnippet.language === 'web' || currentSnippet.language === 'html') {
      return currentSnippet[activeEditorTab];
    }
    return currentSnippet.code;
  };

  const cleanLiveUrl = currentSnippet
    ? `${window.location.origin}/live/${currentSnippet.slug || currentSnippet.id}`
    : '';

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0d1117] font-sans text-[#c9d1d9] select-none">
      <Header
        currentSnippet={currentSnippet}
        onUpdateTitle={(title) => {
          if (currentSnippet) {
            const updated = { ...currentSnippet, title, slug: slugify(title), updatedAt: new Date().toISOString() };
            setCurrentSnippet(updated);
            triggerSave(updated);
          }
        }}
        onRunCode={handleRunCode}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
        onNewSnippet={handleCreateNewSnippet}
        onToggleAiAgent={() => setIsAiAgentOpen(!isAiAgentOpen)}
        isAiAgentOpen={isAiAgentOpen}
        viewMode={viewMode}
        setViewMode={setViewMode}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        isSaving={isSaving}
        snippetsCount={snippets.length}
      />

      <div className="flex-1 flex overflow-hidden relative">
        {viewMode === 'playground' && !currentSnippet && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#0d1117]">
            <div className="w-12 h-12 rounded-xl bg-[#161b22] border border-[#30363d] flex items-center justify-center text-[#8b949e] mb-3">
              <Code2 className="w-6 h-6 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-semibold text-[#f0f6fc]">No Active Project</h3>
            <p className="text-xs text-[#8b949e] mt-1 max-w-sm">
              All projects have been cleared. Create a new interactive Web App or Python project, or upload a code file.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              <button
                onClick={() => handleCreateNewSnippet(undefined, 'web')}
                className="px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded-md text-xs font-semibold"
              >
                + New Web Project (HTML &amp; JS)
              </button>
              <button
                onClick={() => handleCreateNewSnippet(undefined, 'python')}
                className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] border border-[#30363d] rounded-md text-xs font-semibold"
              >
                + New Python Script
              </button>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-[#58a6ff] border border-[#30363d] rounded-md text-xs font-semibold"
              >
                Upload Code File
              </button>
            </div>
          </div>
        )}

        {viewMode === 'playground' && currentSnippet && (
          <div className="flex-1 flex flex-col md:flex-row h-full w-full overflow-hidden">
            {/* Mobile Switcher */}
            <div className="md:hidden h-10 px-4 bg-[#161b22] border-b border-[#30363d] flex items-center justify-around shrink-0">
              <button
                onClick={() => setMobileView('editor')}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-md ${
                  mobileView === 'editor' ? 'bg-[#30363d] text-white' : 'text-[#8b949e]'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Code Editor</span>
              </button>
              <button
                onClick={() => {
                  setMobileView('preview');
                  handleRunCode();
                }}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-md ${
                  mobileView === 'preview' ? 'bg-[#30363d] text-white' : 'text-[#8b949e]'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Output &amp; Console</span>
              </button>
            </div>

            {/* Left Panel: Code Editor */}
            <div
              className={`h-full flex-col overflow-hidden ${
                mobileView === 'editor' ? 'flex w-full' : 'hidden md:flex'
              }`}
              style={{ width: `${isAiAgentOpen ? Math.min(editorSplitRatio, 40) : editorSplitRatio}%` }}
            >
              <CodeEditor
                value={getCurrentCode()}
                onChange={handleCodeChange}
                language={currentSnippet.language}
                filename={currentSnippet.filename}
                activeTab={activeEditorTab}
                setActiveTab={setActiveEditorTab}
                onRun={handleRunCode}
              />
            </div>

            {/* Resizer */}
            <div
              className="hidden md:flex w-1 hover:w-1.5 bg-[#30363d] hover:bg-[#58a6ff] cursor-col-resize items-center justify-center transition-all z-20"
              onMouseDown={(e) => {
                const handleMouseMove = (moveEvent: MouseEvent) => {
                  const newRatio = (moveEvent.clientX / window.innerWidth) * 100;
                  if (newRatio >= 25 && newRatio <= 75) setEditorSplitRatio(newRatio);
                };
                const handleMouseUp = () => {
                  window.removeEventListener('mousemove', handleMouseMove);
                  window.removeEventListener('mouseup', handleMouseUp);
                };
                window.addEventListener('mousemove', handleMouseMove);
                window.addEventListener('mouseup', handleMouseUp);
              }}
            />

            {/* Right Panel: Output & Runner */}
            <div
              className={`h-full flex-col overflow-hidden flex-1 ${
                mobileView === 'preview' ? 'flex w-full' : 'hidden md:flex'
              }`}
            >
              <PreviewPanel
                language={currentSnippet.language}
                html={currentSnippet.html}
                css={currentSnippet.css}
                js={currentSnippet.js}
                code={currentSnippet.code}
                filename={currentSnippet.filename}
                runTrigger={runTrigger}
                liveUrl={cleanLiveUrl}
                onOpenLiveUrl={() => {
                  if (cleanLiveUrl) window.open(cleanLiveUrl, '_blank');
                }}
              />
            </div>

            {/* Slide-out AI Copilot Agent Drawer */}
            {isAiAgentOpen && (
              <div className="w-80 lg:w-96 h-full border-l border-[#30363d] bg-[#0d1117] flex flex-col z-30 animate-in slide-in-from-right duration-200">
                <div className="h-10 px-3 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between text-xs text-[#f0f6fc] font-semibold">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#58a6ff]" />
                    <span>AI Copilot Agent</span>
                  </div>
                  <button
                    onClick={() => setIsAiAgentOpen(false)}
                    className="p-1 rounded text-[#8b949e] hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <AiCopilotAgent
                    currentSnippet={currentSnippet}
                    onApplyCode={handleApplyAiCode}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {viewMode === 'dashboard' && (
          <GithubDashboard
            snippets={snippets}
            folders={folders}
            activeFolderId={activeFolderId}
            setActiveFolderId={setActiveFolderId}
            onSelectSnippet={(snip) => {
              setCurrentSnippet(snip);
              setViewMode('playground');
            }}
            onCreateSnippet={handleCreateNewSnippet}
            onOpenUploadModal={() => setIsUploadModalOpen(true)}
            onDeleteSnippet={handleDeleteSnippet}
            onDuplicateSnippet={handleDuplicateSnippet}
            onToggleFavorite={handleToggleFavorite}
            onCreateFolder={handleCreateFolder}
            onDeleteFolder={handleDeleteFolder}
            onOpenPlayground={() => setViewMode('playground')}
            onClearAll={handleClearAllProjects}
          />
        )}
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        snippet={currentSnippet}
      />

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        folders={folders}
        activeFolderId={activeFolderId}
        onUploadSuccess={handleUploadSuccess}
      />
    </div>
  );
}
