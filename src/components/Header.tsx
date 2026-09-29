import React, { useState } from 'react';
import { 
  Play, Share2, Sun, Moon, Plus, Code2, Check, 
  UploadCloud, Sparkles, LayoutDashboard, ChevronDown, User, Globe
} from 'lucide-react';
import { Snippet, SupportedLanguage } from '../types';

interface HeaderProps {
  currentSnippet: Snippet | null;
  onUpdateTitle: (newTitle: string) => void;
  onRunCode: () => void;
  onOpenShareModal: () => void;
  onOpenUploadModal: () => void;
  onNewSnippet: (lang?: SupportedLanguage) => void;
  onToggleAiAgent?: () => void;
  isAiAgentOpen?: boolean;
  viewMode: 'playground' | 'dashboard';
  setViewMode: (mode: 'playground' | 'dashboard') => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  isSaving: boolean;
  snippetsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentSnippet,
  onUpdateTitle,
  onRunCode,
  onOpenShareModal,
  onOpenUploadModal,
  onNewSnippet,
  onToggleAiAgent,
  isAiAgentOpen,
  viewMode,
  setViewMode,
  darkMode,
  setDarkMode,
  isSaving
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState('');
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);

  const handleStartEditing = () => {
    if (currentSnippet) {
      setTempTitle(currentSnippet.title);
      setIsEditingTitle(true);
    }
  };

  const handleFinishEditing = () => {
    if (tempTitle.trim() && currentSnippet) {
      onUpdateTitle(tempTitle.trim());
    }
    setIsEditingTitle(false);
  };

  return (
    <header className="h-14 border-b border-[#30363d] bg-[#161b22] px-4 flex items-center justify-between gap-4 sticky top-0 z-40 text-[#c9d1d9] select-none font-sans">
      {/* Zone 1: GitHub Octo / CodeForge Brand + Repo path */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => setViewMode('dashboard')}
          className="flex items-center gap-2 hover:opacity-90 transition-opacity"
          title="Go to GitHub-style Dashboard"
        >
          {/* CodeForge Brand Icon */}
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-sm">
            <Code2 className="w-4 h-4 text-white stroke-[2.5]" />
          </div>
          <span className="font-bold text-sm text-[#f0f6fc] tracking-tight">CodeForge</span>
        </button>

        {currentSnippet && (
          <div className="flex items-center gap-1.5 pl-3 border-l border-[#30363d] text-xs">
            <span className="text-[#8b949e]">rishi.p1.goyal</span>
            <span className="text-[#8b949e]">/</span>
            {isEditingTitle ? (
              <input
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onBlur={handleFinishEditing}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleFinishEditing();
                  if (e.key === 'Escape') setIsEditingTitle(false);
                }}
                autoFocus
                className="bg-[#0d1117] text-[#f0f6fc] px-2 py-0.5 rounded border border-[#58a6ff] outline-none text-xs w-44 font-semibold"
              />
            ) : (
              <button
                onClick={handleStartEditing}
                className="font-semibold text-[#58a6ff] hover:underline truncate max-w-[180px]"
                title="Click to rename"
              >
                {currentSnippet.slug || currentSnippet.title}
              </button>
            )}

            <span className="text-[10px] text-[#8b949e] font-mono ml-1">
              {isSaving ? (
                <span className="text-[#e3b341]">saving...</span>
              ) : (
                <span className="text-[#3fb950] flex items-center gap-0.5">
                  <Check className="w-3 h-3" /> saved
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Zone 2: Navigation Links */}
      <nav className="flex items-center gap-1 bg-[#21262d] p-1 rounded-lg border border-[#30363d] text-xs">
        <button
          onClick={() => setViewMode('dashboard')}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
            viewMode === 'dashboard' ? 'bg-[#30363d] text-[#f0f6fc]' : 'text-[#8b949e] hover:text-[#f0f6fc]'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setViewMode('playground')}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
            viewMode === 'playground' ? 'bg-[#30363d] text-[#f0f6fc]' : 'text-[#8b949e] hover:text-[#f0f6fc]'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Code Playground</span>
        </button>
      </nav>

      {/* Zone 3: Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* New Item Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] border border-[#30363d] transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-[#3fb950]" />
            <span className="hidden sm:inline">New</span>
            <ChevronDown className="w-3 h-3 text-[#8b949e]" />
          </button>

          {isNewMenuOpen && (
            <div
              className="absolute right-0 top-9 w-52 bg-[#161b22] border border-[#30363d] rounded-md shadow-2xl py-1 z-50 text-xs"
              onMouseLeave={() => setIsNewMenuOpen(false)}
            >
              <button
                onClick={() => {
                  onNewSnippet('web');
                  setIsNewMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-[#c9d1d9] hover:bg-[#1f6feb]/20 hover:text-[#58a6ff] flex items-center gap-2"
              >
                <Globe className="w-3.5 h-3.5 text-[#e34c26]" />
                <div>
                  <div className="font-semibold">New Web App</div>
                  <div className="text-[10px] text-[#8b949e]">HTML, CSS &amp; JavaScript</div>
                </div>
              </button>

              <button
                onClick={() => {
                  onNewSnippet('python');
                  setIsNewMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-[#c9d1d9] hover:bg-[#1f6feb]/20 hover:text-[#58a6ff] flex items-center gap-2"
              >
                <div className="w-3.5 h-3.5 rounded-full bg-[#3572A5] flex items-center justify-center text-[9px] text-white font-bold">Py</div>
                <div>
                  <div className="font-semibold">New Python Script</div>
                  <div className="text-[10px] text-[#8b949e]">Runs in browser WebAssembly</div>
                </div>
              </button>

              <div className="border-t border-[#30363d] my-1" />

              <button
                onClick={() => {
                  onOpenUploadModal();
                  setIsNewMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-[#c9d1d9] hover:bg-[#30363d] flex items-center gap-2"
              >
                <UploadCloud className="w-3.5 h-3.5 text-[#58a6ff]" />
                <span>Upload Downloaded Code</span>
              </button>
            </div>
          )}
        </div>

        {/* AI Copilot Toggle Button (Playground Mode) */}
        {viewMode === 'playground' && onToggleAiAgent && (
          <button
            onClick={onToggleAiAgent}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
              isAiAgentOpen 
                ? 'bg-indigo-600 border-indigo-500 text-white' 
                : 'bg-[#21262d] border-[#30363d] text-[#c9d1d9] hover:bg-[#30363d]'
            }`}
            title="Toggle Built-in AI Agent"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">AI Agent</span>
          </button>
        )}

        {/* Run Button */}
        <button
          onClick={onRunCode}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#238636] hover:bg-[#2ea043] text-white shadow-sm transition-all active:scale-95 whitespace-nowrap"
          title="Run Code (Cmd + Enter)"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Run</span>
          <kbd className="hidden xl:inline text-[10px] bg-[#2ea043] px-1 rounded text-white font-mono">⌘↵</kbd>
        </button>

        {/* Share Live Link */}
        <button
          onClick={onOpenShareModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#1f6feb] hover:bg-[#388bfd] text-white shadow-sm transition-all active:scale-95 whitespace-nowrap"
          title="Share live web URL"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Share</span>
        </button>

        {/* User Avatar */}
        <div
          className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-emerald-400 flex items-center justify-center text-neutral-950 font-bold text-xs shadow-sm ml-1"
          title="Logged in as rishi.p1.goyal"
        >
          R
        </div>
      </div>
    </header>
  );
};
