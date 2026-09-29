import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { CodeEditor } from './components/CodeEditor';
import { PreviewPanel } from './components/PreviewPanel';
import { GoogleDriveDashboard } from './components/GoogleDriveDashboard';
import { AiCopilotAgent } from './components/AiCopilotAgent';
import { UploadModal } from './components/UploadModal';
import { ShareModal } from './components/ShareModal';
import { AuthModal } from './components/AuthModal';
import { AuthGate } from './components/AuthGate';
import { SupabaseModal } from './components/SupabaseModal';
import { Snippet, Folder, SharedProject, UploadedFileResult, SupportedLanguage, User } from './types';
import { 
  getSupabaseClient, 
  mapSupabaseUser, 
  fetchProjectsFromSupabase, 
  upsertProjectToSupabase, 
  isSupabaseConfigured 
} from './lib/supabase';
import { Code2, Monitor, Sparkles, X, Lock } from 'lucide-react';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'project';
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(localStorage.getItem('code_auth_token'));
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

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
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  // Check auth session on mount (Local Server + Supabase GitHub OAuth)
  useEffect(() => {
    async function checkAuth() {
      // 1. Check local server auth token
      const token = localStorage.getItem('code_auth_token');
      if (token) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setCurrentUser(data.user);
            setAuthToken(token);
          } else {
            localStorage.removeItem('code_auth_token');
            setAuthToken(null);
          }
        } catch (err) {
          console.error('Auth verification error:', err);
        }
      }

      // 2. Check Supabase Auth (e.g. GitHub OAuth login)
      const sb = getSupabaseClient();
      if (sb) {
        try {
          const { data: { session } } = await sb.auth.getSession();
          if (session?.user) {
            const mapped = mapSupabaseUser(session.user);
            setCurrentUser(mapped);
          }

          sb.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
              const mapped = mapSupabaseUser(session.user);
              setCurrentUser(mapped);
            }
          });
        } catch (err) {
          console.warn('Supabase session check notice:', err);
        }
      }
    }
    checkAuth();
  }, []);

  // Load user data whenever auth state changes
  const loadProjects = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      const token = localStorage.getItem('code_auth_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/projects', { headers });
      if (res.ok) {
        const data = await res.json();
        let loadedSnippets: Snippet[] = data.snippets || [];

        // If Supabase is configured, also fetch from Supabase projects
        if (isSupabaseConfigured() && currentUser) {
          const sbSnippets = await fetchProjectsFromSupabase(currentUser.id);
          if (sbSnippets.length > 0) {
            // merge without duplicates
            const existingIds = new Set(loadedSnippets.map(s => s.id));
            const newFromSb = sbSnippets.filter(s => !existingIds.has(s.id));
            loadedSnippets = [...loadedSnippets, ...newFromSb];
          }
        }

        setSnippets(loadedSnippets);
        setFolders(data.folders || []);

        if (loadedSnippets.length > 0 && !currentSnippet) {
          setCurrentSnippet(loadedSnippets[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    }
  }, [currentSnippet, currentUser]);

  useEffect(() => {
    loadProjects();
  }, [currentUser, loadProjects]);

  // Handle URL share params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareId = params.get('share');
    if (shareId) {
      fetch(`/api/share/${shareId}`)
        .then(r => r.json())
        .then((sData: SharedProject) => {
          if (sData && sData.title) {
            const forked: Snippet = {
              id: 'snip_' + Math.random().toString(36).substring(2, 9),
              slug: slugify(sData.title) + '-forked',
              title: `${sData.title} (Forked)`,
              description: sData.description || '',
              language: sData.language || 'web',
              folderId: folders[0]?.id || 'f_web',
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
          }
        })
        .catch(err => console.error('Share link load error:', err));
    }
  }, [folders]);

  // Debounced auto-save (requires authentication)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerSave = useCallback((snippetToSave: Snippet) => {
    if (!currentUser) {
      setAuthNotice('You must make an account or sign in with GitHub to have your projects saved.');
      return;
    }

    setIsSaving(true);
    setAuthNotice(null);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }

        const res = await fetch(`/api/projects/${snippetToSave.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(snippetToSave)
        });

        if (!res.ok) {
          await fetch('/api/projects', {
            method: 'POST',
            headers,
            body: JSON.stringify(snippetToSave)
          });
        }

        // Also sync to Supabase if connected
        if (isSupabaseConfigured() && currentUser) {
          upsertProjectToSupabase(snippetToSave, currentUser.id);
        }

        setSnippets(prev => prev.map(s => s.id === snippetToSave.id ? snippetToSave : s));
      } catch (err) {
        console.error('Auto-save error:', err);
      } finally {
        setIsSaving(false);
      }
    }, 500);
  }, [currentUser, authToken]);

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
        if (currentSnippet) {
          if (!currentUser) {
            setIsAuthModalOpen(true);
          } else {
            triggerSave(currentSnippet);
          }
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [currentSnippet, currentUser, triggerSave]);

  // Apply code from AI Copilot
  const handleApplyAiCode = (codeSnippet: string) => {
    if (!currentSnippet) return;

    if (currentSnippet.language === 'web' || currentSnippet.language === 'html') {
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

  // Create new snippet - BLANK CODEBOX AS REQUESTED!
  const handleCreateNewSnippet = async (folderId?: string, lang: SupportedLanguage = 'web') => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }

    const targetFolderId = folderId || (folders[0] ? folders[0].id : 'f_web');
    const isWeb = lang === 'web' || lang === 'html';
    const title = isWeb ? 'Untitled Web App' : 'Untitled Python Script';
    const slug = slugify(title) + '-' + Math.random().toString(36).substring(2, 6);

    // Completely BLANK codebox: no prefilled code!
    const newSnippet: Snippet = {
      id: 'snip_' + Math.random().toString(36).substring(2, 9),
      slug,
      title,
      description: '',
      language: lang,
      folderId: targetFolderId,
      filename: isWeb ? 'index.html' : 'main.py',
      html: '',
      css: '',
      js: '',
      code: '',
      tags: [lang],
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    };

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers,
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

    // Sync to Supabase
    if (isSupabaseConfigured() && currentUser) {
      upsertProjectToSupabase(newSnippet, currentUser.id);
    }

    setViewMode('playground');
    setRunTrigger(r => r + 1);
  };

  // Upload handler
  const handleUploadSuccess = async (fileData: UploadedFileResult & { title: string; folderId: string }) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }

    const slug = slugify(fileData.title);
    const newSnippet: Snippet = {
      id: 'snip_' + Math.random().toString(36).substring(2, 9),
      slug,
      title: fileData.title,
      description: `Uploaded from ${fileData.filename}`,
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
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers,
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

    if (isSupabaseConfigured() && currentUser) {
      upsertProjectToSupabase(newSnippet, currentUser.id);
    }

    setViewMode('playground');
    setRunTrigger(r => r + 1);
  };

  const handleDuplicateSnippet = async (snip: Snippet) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }

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
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      await fetch('/api/projects', {
        method: 'POST',
        headers,
        body: JSON.stringify(duplicated)
      });
      setSnippets(prev => [duplicated, ...prev]);

      if (isSupabaseConfigured() && currentUser) {
        upsertProjectToSupabase(duplicated, currentUser.id);
      }
    } catch (err) {
      console.error('Error duplicating snippet:', err);
    }
  };

  const handleDeleteSnippet = async (id: string) => {
    try {
      const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : undefined;
      await fetch(`/api/projects/${id}`, { method: 'DELETE', headers });
      const nextSnippets = snippets.filter(s => s.id !== id && s.slug !== id);
      setSnippets(nextSnippets);
      if (currentSnippet?.id === id || currentSnippet?.slug === id) {
        setCurrentSnippet(nextSnippets[0] || null);
      }

      if (isSupabaseConfigured()) {
        const sb = getSupabaseClient();
        sb?.from('projects').delete().eq('id', id);
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
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      await fetch(`/api/projects/${target.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ isFavorite: updated.isFavorite })
      });
      setSnippets(prev => prev.map(s => (s.id === target.id) ? updated : s));
      if (currentSnippet?.id === target.id) {
        setCurrentSnippet(updated);
      }

      if (isSupabaseConfigured() && currentUser) {
        upsertProjectToSupabase(updated, currentUser.id);
      }
    } catch (err) {
      console.error('Toggle favorite error:', err);
    }
  };

  const handleCreateFolder = async (name: string, color: string) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch('/api/folders', {
        method: 'POST',
        headers,
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
        const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : undefined;
        await fetch('/api/reset', { method: 'POST', headers });
        setSnippets([]);
        setCurrentSnippet(null);
        setViewMode('dashboard');

        if (isSupabaseConfigured() && currentUser) {
          const sb = getSupabaseClient();
          sb?.from('projects').delete().eq('user_id', currentUser.id);
        }
      } catch (err) {
        console.error('Failed to reset:', err);
      }
    }
  };

  const handleLogout = async () => {
    try {
      if (authToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
      }
      const sb = getSupabaseClient();
      sb?.auth.signOut();
    } catch {}
    localStorage.removeItem('code_auth_token');
    setAuthToken(null);
    setCurrentUser(null);
    setSnippets([]);
    setCurrentSnippet(null);
    setViewMode('dashboard');
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

  // Strict Account Requirement: you cannot do anything without an account
  if (!currentUser) {
    return (
      <div className="h-screen w-screen bg-[#14161a]">
        <AuthGate
          onSuccess={(user, token) => {
            setCurrentUser(user);
            setAuthToken(token);
            setAuthNotice(null);
            loadProjects();
          }}
          onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        />
        <SupabaseModal
          isOpen={isSupabaseModalOpen}
          onClose={() => setIsSupabaseModalOpen(false)}
          onCredentialsUpdated={() => {
            loadProjects();
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#181a1f] font-sans text-[#e3e3e3] select-none">
      <Header
        currentSnippet={currentSnippet}
        currentUser={currentUser}
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
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        onLogout={handleLogout}
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

      {/* Guest Account Banner Notice */}
      {authNotice && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>{authNotice}</span>
          </div>
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="px-2.5 py-1 rounded bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-[11px] transition-colors"
          >
            Create Account / Sign In with GitHub
          </button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden relative">
        {viewMode === 'playground' && !currentSnippet && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#181a1f]">
            <div className="w-14 h-14 rounded-2xl bg-[#282a30] border border-[#3c4049] flex items-center justify-center text-[#8ab4f8] mb-3">
              <Code2 className="w-7 h-7 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-semibold text-white">No Project Open</h3>
            <p className="text-xs text-[#9aa0a6] mt-1 max-w-sm">
              Create a new blank project or upload files. The codebox opens completely clean with no code.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              <button
                onClick={() => handleCreateNewSnippet(undefined, 'web')}
                className="px-4 py-2 bg-[#8ab4f8] hover:bg-[#aecbfa] text-neutral-950 rounded-xl text-xs font-bold"
              >
                + Blank Web App
              </button>
              <button
                onClick={() => handleCreateNewSnippet(undefined, 'python')}
                className="px-4 py-2 bg-[#282a30] hover:bg-[#333741] text-white border border-[#3c4049] rounded-xl text-xs font-semibold"
              >
                + Blank Python Script
              </button>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="px-4 py-2 bg-[#282a30] hover:bg-[#333741] text-[#c58af9] border border-[#3c4049] rounded-xl text-xs font-semibold"
              >
                Upload Code File
              </button>
            </div>
          </div>
        )}

        {viewMode === 'playground' && currentSnippet && (
          <div className="flex-1 flex flex-col md:flex-row h-full w-full overflow-hidden">
            {/* Mobile Switcher */}
            <div className="md:hidden h-10 px-4 bg-[#1e2025] border-b border-[#2d3139] flex items-center justify-around shrink-0">
              <button
                onClick={() => setMobileView('editor')}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-md ${
                  mobileView === 'editor' ? 'bg-[#282a30] text-white' : 'text-[#9aa0a6]'
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
                  mobileView === 'preview' ? 'bg-[#282a30] text-white' : 'text-[#9aa0a6]'
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
              className="hidden md:flex w-1 hover:w-1.5 bg-[#2d3139] hover:bg-[#8ab4f8] cursor-col-resize items-center justify-center transition-all z-20"
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
              <div className="w-80 lg:w-96 h-full border-l border-[#2d3139] bg-[#1e2025] flex flex-col z-30 animate-in slide-in-from-right duration-200">
                <div className="h-12 px-4 bg-[#14161a] border-b border-[#2d3139] flex items-center justify-between text-xs text-white font-semibold">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#fbbc04]" />
                    <span>AI Copilot Agent</span>
                  </div>
                  <button
                    onClick={() => setIsAiAgentOpen(false)}
                    className="p-1 rounded text-[#9aa0a6] hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-hidden p-2">
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
          <GoogleDriveDashboard
            snippets={snippets}
            folders={folders}
            currentUser={currentUser}
            activeFolderId={activeFolderId}
            setActiveFolderId={setActiveFolderId}
            onSelectSnippet={(snip) => {
              setCurrentSnippet(snip);
              setViewMode('playground');
            }}
            onCreateSnippet={handleCreateNewSnippet}
            onOpenUploadModal={() => setIsUploadModalOpen(true)}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
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

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        onSuccess={(user, token) => {
          setCurrentUser(user);
          setAuthToken(token);
          setAuthNotice(null);
          loadProjects();
        }}
      />

      {/* Supabase & GitHub Configuration Modal */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onCredentialsUpdated={() => {
          loadProjects();
        }}
      />

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
