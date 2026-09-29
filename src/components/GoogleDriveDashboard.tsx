import React, { useState } from 'react';
import { 
  Plus, Search, Star, ExternalLink, Trash2, MoreVertical, 
  Play, Copy, Check, BookOpen, Download, Sparkles, Filter, 
  Code2, Globe, Folder as FolderIcon, LayoutGrid, List, 
  Info, HardDrive, Clock, Users, ArrowUpRight, ChevronRight,
  FileCode, Terminal, X, Lock, LogIn, User as UserIcon, Database
} from 'lucide-react';
import { Snippet, Folder, SupportedLanguage, User } from '../types';
import { downloadCodeAsFile } from '../utils/fileUpload';
import { AiCopilotAgent } from './AiCopilotAgent';

interface GoogleDriveDashboardProps {
  snippets: Snippet[];
  folders: Folder[];
  currentUser: User | null;
  activeFolderId: string | null;
  setActiveFolderId: (id: string | null) => void;
  onSelectSnippet: (snippet: Snippet) => void;
  onCreateSnippet: (folderId?: string, lang?: SupportedLanguage) => void;
  onOpenUploadModal: () => void;
  onOpenAuthModal: () => void;
  onOpenSupabaseModal?: () => void;
  onDeleteSnippet: (id: string) => void;
  onDuplicateSnippet: (snippet: Snippet) => void;
  onToggleFavorite: (id: string) => void;
  onCreateFolder: (name: string, color: string) => void;
  onDeleteFolder: (id: string) => void;
  onOpenPlayground: () => void;
  onClearAll?: () => void;
}

const DRIVE_LANG_ICONS: Record<string, { color: string; label: string; bg: string }> = {
  web: { color: '#EA4335', label: 'HTML/JS Web App', bg: 'rgba(234, 67, 53, 0.12)' },
  html: { color: '#EA4335', label: 'HTML Document', bg: 'rgba(234, 67, 53, 0.12)' },
  javascript: { color: '#FBBC04', label: 'JavaScript Module', bg: 'rgba(251, 188, 4, 0.12)' },
  typescript: { color: '#4285F4', label: 'TypeScript Code', bg: 'rgba(66, 133, 244, 0.12)' },
  python: { color: '#34A853', label: 'Python 3 Script', bg: 'rgba(52, 168, 83, 0.12)' },
  css: { color: '#A142F4', label: 'CSS Stylesheet', bg: 'rgba(161, 66, 244, 0.12)' },
  plaintext: { color: '#9AA0A6', label: 'Source File', bg: 'rgba(154, 160, 166, 0.12)' }
};

export const GoogleDriveDashboard: React.FC<GoogleDriveDashboardProps> = ({
  snippets,
  folders,
  currentUser,
  activeFolderId,
  setActiveFolderId,
  onSelectSnippet,
  onCreateSnippet,
  onOpenUploadModal,
  onOpenAuthModal,
  onOpenSupabaseModal,
  onDeleteSnippet,
  onDuplicateSnippet,
  onToggleFavorite,
  onCreateFolder,
  onDeleteFolder,
  onOpenPlayground,
  onClearAll
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'recent' | 'starred' | 'shared'>('all');
  const [selectedSnippetId, setSelectedSnippetId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);

  // Folder creation
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const selectedSnippet = snippets.find(s => s.id === selectedSnippetId) || snippets[0] || null;

  const handleCopyLink = (snip: Snippet, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const liveUrl = `${window.location.origin}/live/${snip.slug || snip.id}`;
    navigator.clipboard.writeText(liveUrl);
    setCopiedSlug(snip.slug || snip.id);
    setTimeout(() => setCopiedSlug(null), 1500);
  };

  const handleDownload = (snip: Snippet, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const ext = snip.language === 'python' ? 'py' : snip.language === 'web' ? 'html' : 'js';
    const content = snip.language === 'web' 
      ? `<!DOCTYPE html>\n<html>\n<head><style>${snip.css}</style></head>\n<body>\n${snip.html}\n<script>${snip.js}</script>\n</body>\n</html>`
      : snip.code;
    downloadCodeAsFile(content, `${snip.slug || 'project'}.${ext}`);
  };

  const filteredSnippets = snippets.filter(s => {
    if (activeCategory === 'starred' && !s.isFavorite) return false;
    if (activeFolderId && s.folderId !== activeFolderId) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const inTitle = s.title.toLowerCase().includes(q);
      const inDesc = s.description.toLowerCase().includes(q);
      const inSlug = s.slug.toLowerCase().includes(q);
      if (!inTitle && !inDesc && !inSlug) return false;
    }
    return true;
  });

  // Calculate storage usage
  const totalBytes = snippets.reduce((acc, s) => {
    return acc + (s.filesize || (s.code?.length || 0) + (s.html?.length || 0) + (s.css?.length || 0) + (s.js?.length || 0));
  }, 0);
  const formattedStorage = totalBytes > 1024 * 1024 
    ? `${(totalBytes / (1024 * 1024)).toFixed(1)} MB` 
    : `${Math.max(1, Math.round(totalBytes / 1024))} KB`;

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-[#181a1f] text-[#e3e3e3] font-sans select-none">
      {/* DRIVE LEFT SIDEBAR */}
      <aside className="w-60 xl:w-64 bg-[#1e2025] border-r border-[#2d3139] flex flex-col shrink-0 p-3">
        {/* Google Drive "+ New" Pill Button */}
        <div className="relative mb-4">
          <button
            onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
            className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#282a30] hover:bg-[#333741] text-white shadow-lg border border-[#3c4049] transition-all hover:shadow-xl active:scale-98 font-medium text-sm"
          >
            {/* Google Drive style 4-color plus */}
            <div className="w-6 h-6 flex items-center justify-center">
              <Plus className="w-6 h-6 text-[#8ab4f8] stroke-[2.5]" />
            </div>
            <span className="font-semibold tracking-wide">New</span>
          </button>

          {isNewMenuOpen && (
            <div
              className="absolute left-0 top-14 w-60 bg-[#282a30] border border-[#3c4049] rounded-2xl shadow-2xl py-2 z-50 text-xs animate-in fade-in duration-150"
              onMouseLeave={() => setIsNewMenuOpen(false)}
            >
              <button
                onClick={() => {
                  onCreateSnippet(activeFolderId || undefined, 'web');
                  setIsNewMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-[#333741] flex items-center gap-3 text-[#e3e3e3]"
              >
                <div className="w-7 h-7 rounded-lg bg-red-500/10 text-[#ea4335] flex items-center justify-center font-bold">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-white">Web Application</div>
                  <div className="text-[10px] text-[#9aa0a6]">HTML, CSS &amp; JavaScript</div>
                </div>
              </button>

              <button
                onClick={() => {
                  onCreateSnippet(activeFolderId || undefined, 'python');
                  setIsNewMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-[#333741] flex items-center gap-3 text-[#e3e3e3]"
              >
                <div className="w-7 h-7 rounded-lg bg-green-500/10 text-[#34a853] flex items-center justify-center font-bold">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-white">Python Script</div>
                  <div className="text-[10px] text-[#9aa0a6]">Runs in WebAssembly</div>
                </div>
              </button>

              <div className="border-t border-[#3c4049] my-1.5" />

              <button
                onClick={() => {
                  setIsCreatingFolder(true);
                  setIsNewMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-[#333741] flex items-center gap-3 text-[#e3e3e3]"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-[#8ab4f8] flex items-center justify-center">
                  <FolderIcon className="w-4 h-4" />
                </div>
                <span className="font-medium">New folder</span>
              </button>

              <button
                onClick={() => {
                  onOpenUploadModal();
                  setIsNewMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-[#333741] flex items-center gap-3 text-[#e3e3e3]"
              >
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-[#c58af9] flex items-center justify-center">
                  <FileCode className="w-4 h-4" />
                </div>
                <span className="font-medium">File upload</span>
              </button>
            </div>
          )}
        </div>

        {/* Navigation Categories */}
        <nav className="flex-1 space-y-1 text-xs">
          <button
            onClick={() => { setActiveCategory('all'); setActiveFolderId(null); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-full font-medium transition-colors ${
              activeCategory === 'all' && activeFolderId === null 
                ? 'bg-[#c2e7ff]/15 text-[#c2e7ff] font-semibold' 
                : 'text-[#c4c7c5] hover:bg-[#282a30]'
            }`}
          >
            <HardDrive className="w-4 h-4 text-[#8ab4f8]" />
            <span>My Code Drive</span>
          </button>

          <button
            onClick={() => { setActiveCategory('starred'); setActiveFolderId(null); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-full font-medium transition-colors ${
              activeCategory === 'starred' 
                ? 'bg-[#c2e7ff]/15 text-[#c2e7ff] font-semibold' 
                : 'text-[#c4c7c5] hover:bg-[#282a30]'
            }`}
          >
            <Star className="w-4 h-4 text-[#fbbc04]" />
            <span>Starred</span>
          </button>

          <button
            onClick={() => { setActiveCategory('recent'); setActiveFolderId(null); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-full font-medium transition-colors ${
              activeCategory === 'recent' 
                ? 'bg-[#c2e7ff]/15 text-[#c2e7ff] font-semibold' 
                : 'text-[#c4c7c5] hover:bg-[#282a30]'
            }`}
          >
            <Clock className="w-4 h-4 text-[#34a853]" />
            <span>Recent</span>
          </button>

          {/* Folder section */}
          <div className="pt-4 pb-2 px-3 text-[11px] font-semibold text-[#9aa0a6] uppercase tracking-wider flex items-center justify-between">
            <span>Folders</span>
            <button
              onClick={() => setIsCreatingFolder(true)}
              className="hover:text-white"
              title="New folder"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {isCreatingFolder && (
            <div className="px-2 mb-2">
              <input
                type="text"
                autoFocus
                placeholder="Folder title"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newFolderName.trim()) {
                    onCreateFolder(newFolderName.trim(), '#8ab4f8');
                    setNewFolderName('');
                    setIsCreatingFolder(false);
                  }
                  if (e.key === 'Escape') setIsCreatingFolder(false);
                }}
                className="w-full bg-[#14161a] border border-[#8ab4f8] rounded-lg px-2.5 py-1 text-xs text-white outline-none"
              />
            </div>
          )}

          <div className="space-y-0.5 max-h-40 overflow-y-auto">
            {folders.map(f => (
              <button
                key={f.id}
                onClick={() => { setActiveFolderId(f.id); setActiveCategory('all'); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-full font-medium transition-colors ${
                  activeFolderId === f.id 
                    ? 'bg-[#c2e7ff]/15 text-[#c2e7ff] font-semibold' 
                    : 'text-[#c4c7c5] hover:bg-[#282a30]'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <FolderIcon className="w-4 h-4 shrink-0" style={{ color: f.color }} />
                  <span className="truncate">{f.name}</span>
                </div>
                <span className="text-[10px] text-[#9aa0a6] font-mono">
                  {snippets.filter(s => s.folderId === f.id).length}
                </span>
              </button>
            ))}
          </div>
        </nav>

        {/* Account Status / Login Prompt */}
        {!currentUser ? (
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs mb-3 space-y-2">
            <div className="flex items-center gap-1.5 font-semibold">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Sign in required</span>
            </div>
            <p className="text-[11px] text-amber-300/80 leading-relaxed">
              Create an account to have all your code projects securely saved.
            </p>
            <button
              onClick={onOpenAuthModal}
              className="w-full py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition-colors"
            >
              Create Account
            </button>
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-[#282a30] border border-[#3c4049] text-xs mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                {currentUser.name[0].toUpperCase()}
              </div>
              <div className="truncate">
                <div className="font-semibold text-white truncate">{currentUser.name}</div>
                <div className="text-[10px] text-[#9aa0a6] truncate">{currentUser.email}</div>
              </div>
            </div>
          </div>
        )}

        {/* Storage Meter */}
        <div className="p-3 border-t border-[#2d3139] text-xs text-[#9aa0a6]">
          <div className="flex items-center justify-between mb-1.5 font-medium">
            <span>Storage</span>
            <span className="text-white">{formattedStorage} of 15 GB</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-[#2d3139] overflow-hidden mb-2">
            <div className="h-full bg-[#8ab4f8] rounded-full" style={{ width: '2%' }} />
          </div>

          {snippets.length > 0 && onClearAll && (
            <button
              onClick={onClearAll}
              className="w-full text-center py-1 text-[11px] text-red-400 hover:text-red-300 hover:underline transition-colors mt-1"
            >
              Clear all my projects
            </button>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col overflow-y-auto bg-[#181a1f]">
        {/* Drive Top Search & View Bar */}
        <div className="h-16 border-b border-[#2d3139] px-6 flex items-center justify-between gap-4 sticky top-0 bg-[#181a1f]/95 backdrop-blur-sm z-20">
          {/* Google Drive Pill Search Bar */}
          <div className="relative flex-1 max-w-2xl">
            <Search className="w-4 h-4 text-[#9aa0a6] absolute left-4 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in Code Drive..."
              className="w-full bg-[#282a30] hover:bg-[#30333b] focus:bg-[#282a30] border border-transparent focus:border-[#8ab4f8] rounded-full pl-11 pr-4 py-2.5 text-xs text-white placeholder-[#9aa0a6] outline-none shadow-inner transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-3 text-[#9aa0a6] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Right Toolbar */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Grid / List toggle */}
            <div className="flex items-center bg-[#282a30] rounded-lg p-0.5 border border-[#3c4049]">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-[#3c4049] text-white' : 'text-[#9aa0a6] hover:text-white'}`}
                title="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-[#3c4049] text-white' : 'text-[#9aa0a6] hover:text-white'}`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Details panel toggle */}
            <button
              onClick={() => setIsDetailsOpen(!isDetailsOpen)}
              className={`p-2 rounded-full transition-colors ${isDetailsOpen ? 'bg-[#c2e7ff]/20 text-[#8ab4f8]' : 'text-[#9aa0a6] hover:bg-[#282a30] hover:text-white'}`}
              title="View details & AI Copilot"
            >
              <Info className="w-4 h-4" />
            </button>

            {onOpenSupabaseModal && (
              <button
                onClick={onOpenSupabaseModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#3ecf8e]/10 hover:bg-[#3ecf8e]/20 text-[#3ecf8e] border border-[#3ecf8e]/30 text-xs font-semibold transition-colors"
                title="Configure Supabase & GitHub Cloud Sync"
              >
                <Database className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Supabase</span>
              </button>
            )}

            {!currentUser && (
              <button
                onClick={onOpenAuthModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#8ab4f8] hover:bg-[#aecbfa] text-neutral-950 font-semibold text-xs transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Breadcrumb / Title */}
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span>{activeFolderId ? folders.find(f => f.id === activeFolderId)?.name : 'My Code Drive'}</span>
              <span className="text-xs font-normal text-[#9aa0a6]">
                ({filteredSnippets.length} {filteredSnippets.length === 1 ? 'item' : 'items'})
              </span>
            </h1>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onCreateSnippet(activeFolderId || undefined, 'web')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#282a30] hover:bg-[#333741] text-[#8ab4f8] border border-[#3c4049] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Project</span>
              </button>
            </div>
          </div>

          {/* Empty State */}
          {filteredSnippets.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-[#2d3139] rounded-3xl p-8 bg-[#1e2025]/40 max-w-2xl mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-[#282a30] border border-[#3c4049] flex items-center justify-center text-[#8ab4f8] mx-auto mb-4">
                <HardDrive className="w-8 h-8 stroke-[1.5]" />
              </div>
              <h2 className="text-base font-semibold text-white">A clean space for your code</h2>
              <p className="text-xs text-[#9aa0a6] mt-1.5 max-w-md mx-auto leading-relaxed">
                Create a blank interactive Web App or Python script, or upload code files. Everything opens with clean, empty codeboxes ready for your ideas.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                <button
                  onClick={() => onCreateSnippet(activeFolderId || undefined, 'web')}
                  className="px-4 py-2 bg-[#8ab4f8] hover:bg-[#aecbfa] text-neutral-950 font-bold rounded-xl text-xs transition-colors shadow-md"
                >
                  + Blank Web App (HTML &amp; JS)
                </button>
                <button
                  onClick={() => onCreateSnippet(activeFolderId || undefined, 'python')}
                  className="px-4 py-2 bg-[#282a30] hover:bg-[#333741] text-[#e3e3e3] border border-[#3c4049] font-semibold rounded-xl text-xs transition-colors"
                >
                  + Blank Python Script
                </button>
                <button
                  onClick={onOpenUploadModal}
                  className="px-4 py-2 bg-[#282a30] hover:bg-[#333741] text-[#c58af9] border border-[#3c4049] font-semibold rounded-xl text-xs transition-colors"
                >
                  Upload Code
                </button>
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            /* GRID VIEW (Google Drive Style Cards) */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredSnippets.map(snip => {
                const typeInfo = DRIVE_LANG_ICONS[snip.language] || DRIVE_LANG_ICONS.web;
                const isSelected = selectedSnippetId === snip.id;

                return (
                  <div
                    key={snip.id}
                    onClick={() => setSelectedSnippetId(snip.id)}
                    onDoubleClick={() => onSelectSnippet(snip)}
                    className={`group rounded-2xl bg-[#1e2025] border transition-all cursor-pointer overflow-hidden flex flex-col justify-between ${
                      isSelected 
                        ? 'border-[#8ab4f8] shadow-lg ring-1 ring-[#8ab4f8]' 
                        : 'border-[#2d3139] hover:border-[#3c4049] hover:bg-[#24272e]'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="p-4 border-b border-[#2d3139]/80 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 truncate mr-2">
                        <div 
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: typeInfo.bg, color: typeInfo.color }}
                        >
                          <FileCode className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-xs text-white truncate" title={snip.title}>
                          {snip.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(snip.id);
                          }}
                          className="p-1 rounded text-[#9aa0a6] hover:text-[#fbbc04]"
                        >
                          <Star className={`w-3.5 h-3.5 ${snip.isFavorite ? 'fill-[#fbbc04] text-[#fbbc04]' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* Preview Thumbnail Area */}
                    <div 
                      onClick={() => onSelectSnippet(snip)}
                      className="p-4 bg-[#14161a] min-h-[100px] max-h-[120px] overflow-hidden text-[11px] font-mono text-[#9aa0a6] leading-relaxed relative"
                    >
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#14161a]" />
                      <div className="opacity-70 whitespace-pre-wrap select-none">
                        {snip.code || snip.html || snip.js || '// Blank Codebox'}
                      </div>
                    </div>

                    {/* Card Footer / Metadata */}
                    <div className="p-3 bg-[#1e2025] flex items-center justify-between text-[11px] text-[#9aa0a6] border-t border-[#2d3139]/60">
                      <div className="flex items-center gap-1.5 truncate mr-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: typeInfo.color }} />
                        <span className="truncate">{typeInfo.label}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => handleCopyLink(snip, e)}
                          className="p-1 rounded hover:bg-[#333741] text-[#8ab4f8]"
                          title="Copy Live Link"
                        >
                          {copiedSlug === (snip.slug || snip.id) ? (
                            <Check className="w-3.5 h-3.5 text-[#34a853]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          onClick={(e) => handleDownload(snip, e)}
                          className="p-1 rounded hover:bg-[#333741] text-[#9aa0a6] hover:text-white"
                          title="Download Code"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete "${snip.title}"?`)) onDeleteSnippet(snip.id);
                          }}
                          className="p-1 rounded hover:bg-[#333741] text-[#9aa0a6] hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* LIST VIEW (Google Drive Style Table) */
            <div className="rounded-2xl border border-[#2d3139] bg-[#1e2025] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#2d3139] text-[#9aa0a6] font-medium bg-[#14161a]">
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Last Modified</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2d3139]">
                  {filteredSnippets.map(snip => {
                    const typeInfo = DRIVE_LANG_ICONS[snip.language] || DRIVE_LANG_ICONS.web;
                    const isSelected = selectedSnippetId === snip.id;

                    return (
                      <tr
                        key={snip.id}
                        onClick={() => setSelectedSnippetId(snip.id)}
                        onDoubleClick={() => onSelectSnippet(snip)}
                        className={`hover:bg-[#24272e] cursor-pointer transition-colors ${isSelected ? 'bg-[#c2e7ff]/10' : ''}`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <FileCode className="w-4 h-4 shrink-0" style={{ color: typeInfo.color }} />
                            <span className="font-semibold text-white truncate max-w-xs">{snip.title}</span>
                            {snip.isFavorite && <Star className="w-3.5 h-3.5 fill-[#fbbc04] text-[#fbbc04] shrink-0" />}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-[#9aa0a6]">{typeInfo.label}</td>
                        <td className="py-3 px-4 text-[#9aa0a6]">
                          {new Date(snip.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => onSelectSnippet(snip)}
                              className="px-2.5 py-1 rounded bg-[#282a30] hover:bg-[#333741] text-[#8ab4f8] font-semibold text-[11px]"
                            >
                              Open
                            </button>
                            <button
                              onClick={(e) => handleCopyLink(snip, e)}
                              className="p-1 rounded hover:bg-[#333741] text-[#9aa0a6] hover:text-white"
                              title="Copy Live Link"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Delete "${snip.title}"?`)) onDeleteSnippet(snip.id);
                              }}
                              className="p-1 rounded hover:bg-[#333741] text-[#9aa0a6] hover:text-red-400"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* RIGHT DETAILS DRAWER ("Drive Info Panel & AI Copilot") */}
      {isDetailsOpen && (
        <aside className="w-80 xl:w-96 border-l border-[#2d3139] bg-[#1e2025] flex flex-col shrink-0 animate-in slide-in-from-right duration-200">
          <div className="p-4 border-b border-[#2d3139] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-[#8ab4f8]" />
              <span className="font-semibold text-xs text-white">Item Details &amp; AI Copilot</span>
            </div>
            <button
              onClick={() => setIsDetailsOpen(false)}
              className="p-1 rounded-md text-[#9aa0a6] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {selectedSnippet ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-[#2d3139] bg-[#181a1f]/60 space-y-2 text-xs">
                <div className="font-bold text-white text-sm">{selectedSnippet.title}</div>
                <div className="text-[#9aa0a6] text-[11px] leading-relaxed">
                  {selectedSnippet.description || 'Interactive code application in your Code Drive.'}
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={() => onSelectSnippet(selectedSnippet)}
                    className="flex-1 py-1.5 px-3 bg-[#8ab4f8] hover:bg-[#aecbfa] text-neutral-950 font-bold rounded-lg text-xs transition-colors"
                  >
                    Open in Editor
                  </button>
                  <a
                    href={`${window.location.origin}/live/${selectedSnippet.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-[#282a30] hover:bg-[#333741] text-[#8ab4f8]"
                    title="Open live link"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Embedded AI Copilot Agent */}
              <div className="flex-1 overflow-hidden p-3">
                <AiCopilotAgent
                  currentSnippet={selectedSnippet}
                  className="h-full border-[#2d3139]"
                />
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-[#9aa0a6]">
              Select a project to inspect details or ask the AI agent for suggestions.
            </div>
          )}
        </aside>
      )}
    </div>
  );
};
