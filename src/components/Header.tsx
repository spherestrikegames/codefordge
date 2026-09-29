import React, { useState } from 'react';
import { 
  Play, Share2, Plus, Code2, Check, 
  UploadCloud, Sparkles, HardDrive, ChevronDown, User as UserIcon, LogIn, LogOut
} from 'lucide-react';
import { Snippet, SupportedLanguage, User } from '../types';

interface HeaderProps {
  currentSnippet: Snippet | null;
  currentUser: User | null;
  onUpdateTitle: (newTitle: string) => void;
  onRunCode: () => void;
  onOpenShareModal: () => void;
  onOpenUploadModal: () => void;
  onOpenAuthModal: () => void;
  onLogout: () => void;
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
  currentUser,
  onUpdateTitle,
  onRunCode,
  onOpenShareModal,
  onOpenUploadModal,
  onOpenAuthModal,
  onLogout,
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
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

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
    <header className="h-16 border-b border-[#2d3139] bg-[#1e2025] px-5 flex items-center justify-between gap-4 sticky top-0 z-40 text-[#e3e3e3] select-none font-sans">
      {/* Zone 1: Google Drive Style Logo & Active File */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => setViewMode('dashboard')}
          className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
          title="Go to Code Drive"
        >
          {/* Google Drive Logo Colors: Yellow, Blue, Green */}
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#34a853] via-[#fbbc04] to-[#4285f4] flex items-center justify-center shadow-sm">
            <HardDrive className="w-4 h-4 text-white stroke-[2.5]" />
          </div>
          <span className="font-bold text-base text-white tracking-tight">Code Drive</span>
        </button>

        {currentSnippet && (
          <div className="flex items-center gap-2 pl-3 border-l border-[#2d3139] text-xs">
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
                className="bg-[#14161a] text-white px-2 py-0.5 rounded border border-[#8ab4f8] outline-none text-xs w-48 font-semibold"
              />
            ) : (
              <button
                onClick={handleStartEditing}
                className="font-semibold text-white hover:text-[#8ab4f8] truncate max-w-[200px]"
                title="Click to rename"
              >
                {currentSnippet.title}
              </button>
            )}

            <span className="text-[10px] text-[#9aa0a6] font-mono ml-1">
              {!currentUser ? (
                <span className="text-amber-400">Sign in to save</span>
              ) : isSaving ? (
                <span className="text-[#fbbc04]">saving...</span>
              ) : (
                <span className="text-[#34a853] flex items-center gap-0.5">
                  <Check className="w-3 h-3" /> saved
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Zone 2: Navigation Links */}
      <nav className="flex items-center gap-1 bg-[#14161a] p-1 rounded-full border border-[#2d3139] text-xs">
        <button
          onClick={() => setViewMode('dashboard')}
          className={`px-3.5 py-1.5 rounded-full font-medium transition-colors flex items-center gap-1.5 ${
            viewMode === 'dashboard' ? 'bg-[#c2e7ff]/20 text-[#8ab4f8] font-semibold' : 'text-[#9aa0a6] hover:text-white'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span>My Drive</span>
        </button>

        <button
          onClick={() => setViewMode('playground')}
          className={`px-3.5 py-1.5 rounded-full font-medium transition-colors flex items-center gap-1.5 ${
            viewMode === 'playground' ? 'bg-[#c2e7ff]/20 text-[#8ab4f8] font-semibold' : 'text-[#9aa0a6] hover:text-white'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Code Editor</span>
        </button>
      </nav>

      {/* Zone 3: Actions & User Account */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* "+ New" Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#282a30] hover:bg-[#333741] text-white border border-[#3c4049] transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-[#8ab4f8]" />
            <span className="hidden sm:inline">New</span>
            <ChevronDown className="w-3 h-3 text-[#9aa0a6]" />
          </button>

          {isNewMenuOpen && (
            <div
              className="absolute right-0 top-10 w-52 bg-[#282a30] border border-[#3c4049] rounded-xl shadow-2xl py-1.5 z-50 text-xs"
              onMouseLeave={() => setIsNewMenuOpen(false)}
            >
              <button
                onClick={() => {
                  onNewSnippet('web');
                  setIsNewMenuOpen(false);
                }}
                className="w-full text-left px-3.5 py-2 text-[#e3e3e3] hover:bg-[#333741] flex items-center gap-2"
              >
                <div className="w-5 h-5 rounded bg-red-500/10 text-[#ea4335] flex items-center justify-center font-bold text-[10px]">W</div>
                <div>
                  <div className="font-semibold text-white">Blank Web App</div>
                  <div className="text-[10px] text-[#9aa0a6]">Empty HTML, CSS &amp; JS codebox</div>
                </div>
              </button>

              <button
                onClick={() => {
                  onNewSnippet('python');
                  setIsNewMenuOpen(false);
                }}
                className="w-full text-left px-3.5 py-2 text-[#e3e3e3] hover:bg-[#333741] flex items-center gap-2"
              >
                <div className="w-5 h-5 rounded bg-green-500/10 text-[#34a853] flex items-center justify-center font-bold text-[10px]">Py</div>
                <div>
                  <div className="font-semibold text-white">Blank Python Script</div>
                  <div className="text-[10px] text-[#9aa0a6]">Empty Python 3 codebox</div>
                </div>
              </button>

              <div className="border-t border-[#3c4049] my-1" />

              <button
                onClick={() => {
                  onOpenUploadModal();
                  setIsNewMenuOpen(false);
                }}
                className="w-full text-left px-3.5 py-2 text-[#e3e3e3] hover:bg-[#333741] flex items-center gap-2"
              >
                <UploadCloud className="w-4 h-4 text-[#8ab4f8]" />
                <span>Upload Code Files</span>
              </button>
            </div>
          )}
        </div>

        {/* AI Copilot Toggle Button (Playground Mode) */}
        {viewMode === 'playground' && onToggleAiAgent && (
          <button
            onClick={onToggleAiAgent}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              isAiAgentOpen 
                ? 'bg-[#8ab4f8] text-neutral-950 border-[#8ab4f8]' 
                : 'bg-[#282a30] border-[#3c4049] text-white hover:bg-[#333741]'
            }`}
            title="Toggle Built-in AI Agent"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#fbbc04]" />
            <span className="hidden sm:inline">AI Agent</span>
          </button>
        )}

        {/* Run Button */}
        <button
          onClick={onRunCode}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#34a853] hover:bg-[#2d9247] text-white shadow-sm transition-all active:scale-95 whitespace-nowrap"
          title="Run Code (Cmd + Enter)"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Run</span>
        </button>

        {/* Share Live Link */}
        <button
          onClick={onOpenShareModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#8ab4f8] hover:bg-[#aecbfa] text-neutral-950 shadow-sm transition-all active:scale-95 whitespace-nowrap"
          title="Share live web URL"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Share</span>
        </button>

        {/* User Account / Auth Button */}
        {!currentUser ? (
          <button
            onClick={onOpenAuthModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition-all"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In / Register</span>
          </button>
        ) : (
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 p-1 rounded-full hover:bg-[#282a30] transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                {currentUser.name[0].toUpperCase()}
              </div>
            </button>

            {isUserMenuOpen && (
              <div
                className="absolute right-0 top-11 w-56 bg-[#282a30] border border-[#3c4049] rounded-2xl shadow-2xl p-3 z-50 text-xs animate-in fade-in duration-150"
                onMouseLeave={() => setIsUserMenuOpen(false)}
              >
                <div className="pb-3 border-b border-[#3c4049] mb-2">
                  <div className="font-bold text-white truncate">{currentUser.name}</div>
                  <div className="text-[11px] text-[#9aa0a6] truncate">{currentUser.email}</div>
                  <div className="text-[10px] text-[#34a853] mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Account Active · Projects Saved
                  </div>
                </div>

                <button
                  onClick={() => {
                    onLogout();
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full text-left py-2 px-2 hover:bg-[#333741] text-red-400 hover:text-red-300 rounded-lg flex items-center gap-2 font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
