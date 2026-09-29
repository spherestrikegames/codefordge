import React, { useState } from 'react';
import { 
  Plus, Search, Star, ExternalLink, Trash2, MoreVertical, 
  Play, Copy, Check, BookOpen, GitFork, 
  FolderPlus, UploadCloud, Download, Sparkles, Filter, Code2, Globe, Shield, Terminal
} from 'lucide-react';
import { Snippet, Folder, SupportedLanguage } from '../types';
import { downloadCodeAsFile } from '../utils/fileUpload';
import { AiCopilotAgent } from './AiCopilotAgent';

interface GithubDashboardProps {
  snippets: Snippet[];
  folders: Folder[];
  activeFolderId: string | null;
  setActiveFolderId: (id: string | null) => void;
  onSelectSnippet: (snippet: Snippet) => void;
  onCreateSnippet: (folderId?: string, lang?: SupportedLanguage) => void;
  onOpenUploadModal: () => void;
  onDeleteSnippet: (id: string) => void;
  onDuplicateSnippet: (snippet: Snippet) => void;
  onToggleFavorite: (id: string) => void;
  onCreateFolder: (name: string, color: string) => void;
  onDeleteFolder: (id: string) => void;
  onOpenPlayground: () => void;
  onClearAll?: () => void;
}

const GITHUB_LANG_COLORS: Record<string, string> = {
  javascript: '#f1e05a',
  web: '#e34c26',
  html: '#e34c26',
  css: '#563d7c',
  python: '#3572A5',
  typescript: '#3178c6',
  c: '#555555',
  cpp: '#f34b7d',
  rust: '#dea584',
  go: '#00ADD8',
  bash: '#89e051',
  plaintext: '#8b949e'
};

export const GithubDashboard: React.FC<GithubDashboardProps> = ({
  snippets,
  folders,
  activeFolderId,
  setActiveFolderId,
  onSelectSnippet,
  onCreateSnippet,
  onOpenUploadModal,
  onDeleteSnippet,
  onDuplicateSnippet,
  onToggleFavorite,
  onCreateFolder,
  onDeleteFolder,
  onOpenPlayground,
  onClearAll
}) => {
  const [repoSearch, setRepoSearch] = useState('');
  const [selectedLang, setSelectedLang] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'web' | 'python' | 'starred'>('all');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Folder creation
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [folderNameInput, setFolderNameInput] = useState('');

  const handleCopyLiveLink = (snip: Snippet, e: React.MouseEvent) => {
    e.stopPropagation();
    const liveUrl = `${window.location.origin}/live/${snip.slug || snip.id}`;
    navigator.clipboard.writeText(liveUrl);
    setCopiedSlug(snip.slug || snip.id);
    setTimeout(() => setCopiedSlug(null), 1500);
  };

  const handleDownload = (snip: Snippet, e: React.MouseEvent) => {
    e.stopPropagation();
    const ext = snip.language === 'python' ? 'py' : snip.language === 'web' ? 'html' : 'js';
    const content = snip.language === 'web' 
      ? `<!DOCTYPE html>\n<html>\n<head><style>${snip.css}</style></head>\n<body>\n${snip.html}\n<script>${snip.js}</script>\n</body>\n</html>`
      : snip.code;
    downloadCodeAsFile(content, `${snip.slug || 'project'}.${ext}`);
  };

  const filteredSnippets = snippets.filter(s => {
    if (activeTab === 'starred' && !s.isFavorite) return false;
    if (activeTab === 'web' && s.language !== 'web' && s.language !== 'html' && s.language !== 'javascript') return false;
    if (activeTab === 'python' && s.language !== 'python') return false;

    if (activeFolderId && s.folderId !== activeFolderId) return false;
    if (selectedLang !== 'all' && s.language !== selectedLang) return false;

    if (repoSearch.trim()) {
      const q = repoSearch.toLowerCase();
      const inTitle = s.title.toLowerCase().includes(q);
      const inSlug = s.slug.toLowerCase().includes(q);
      const inDesc = s.description.toLowerCase().includes(q);
      const inCode = (s.code || '').toLowerCase().includes(q) || (s.html || '').toLowerCase().includes(q) || (s.js || '').toLowerCase().includes(q);
      if (!inTitle && !inSlug && !inDesc && !inCode) return false;
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden bg-[#0d1117] text-[#c9d1d9] font-sans">
      {/* LEFT SIDEBAR: GitHub Top Repositories */}
      <aside className="w-full lg:w-72 xl:w-80 bg-[#0d1117] border-r border-[#30363d] flex flex-col shrink-0">
        <div className="p-4 border-b border-[#30363d]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#f0f6fc]">Top Repositories</span>
            <button
              onClick={() => onCreateSnippet(undefined, 'web')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#238636] hover:bg-[#2ea043] text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#8b949e] absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={repoSearch}
              onChange={(e) => setRepoSearch(e.target.value)}
              placeholder="Find a repository..."
              className="w-full bg-[#161b22] border border-[#30363d] rounded-md pl-8 pr-3 py-1 text-xs text-[#c9d1d9] placeholder-[#8b949e] outline-none focus:border-[#58a6ff] transition-colors"
            />
          </div>
        </div>

        {/* Repositories Tree List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {snippets.map(s => {
            const langColor = GITHUB_LANG_COLORS[s.language] || '#8b949e';
            return (
              <div
                key={s.id}
                onClick={() => onSelectSnippet(s)}
                className="group flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-[#161b22] cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2 truncate mr-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: langColor }}
                  />
                  <div className="truncate text-xs text-[#58a6ff] hover:underline font-medium">
                    rishi.p1.goyal/<span className="font-semibold text-[#f0f6fc]">{s.slug}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 text-[#8b949e]">
                  {s.isFavorite && <Star className="w-3 h-3 text-[#e3b341] fill-[#e3b341]" />}
                  <span className="text-[10px] uppercase font-mono">{s.language}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Project Folders Navigation */}
        <div className="p-3 border-t border-[#30363d] bg-[#161b22]/40">
          <div className="flex items-center justify-between text-xs text-[#8b949e] font-semibold mb-2">
            <span>Project Folders</span>
            <button
              onClick={() => setIsCreatingFolder(!isCreatingFolder)}
              className="hover:text-white"
              title="Add Folder"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
          </div>

          {isCreatingFolder && (
            <div className="flex gap-1.5 mb-2">
              <input
                type="text"
                value={folderNameInput}
                onChange={(e) => setFolderNameInput(e.target.value)}
                placeholder="Folder name"
                className="flex-1 bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-xs text-white outline-none"
              />
              <button
                onClick={() => {
                  if (folderNameInput.trim()) {
                    onCreateFolder(folderNameInput.trim(), '#58a6ff');
                    setFolderNameInput('');
                    setIsCreatingFolder(false);
                  }
                }}
                className="px-2 py-1 bg-[#238636] text-white rounded text-xs"
              >
                Add
              </button>
            </div>
          )}

          <div className="space-y-1">
            <button
              onClick={() => setActiveFolderId(null)}
              className={`w-full text-left px-2 py-1 rounded text-xs flex items-center justify-between ${activeFolderId === null ? 'bg-[#21262d] text-white font-semibold' : 'text-[#8b949e] hover:text-white'}`}
            >
              <span>All Folders</span>
              <span className="font-mono text-[10px]">{snippets.length}</span>
            </button>

            {folders.map(f => (
              <button
                key={f.id}
                onClick={() => setActiveFolderId(activeFolderId === f.id ? null : f.id)}
                className={`w-full text-left px-2 py-1 rounded text-xs flex items-center justify-between ${activeFolderId === f.id ? 'bg-[#21262d] text-white font-semibold' : 'text-[#8b949e] hover:text-white'}`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: f.color }} />
                  <span className="truncate">{f.name}</span>
                </div>
                <span className="font-mono text-[10px]">
                  {snippets.filter(s => s.folderId === f.id).length}
                </span>
              </button>
            ))}
          </div>

          {snippets.length > 0 && onClearAll && (
            <div className="pt-3 mt-3 border-t border-[#30363d]">
              <button
                onClick={onClearAll}
                className="w-full py-1.5 text-xs text-[#f85149] hover:bg-[#f85149]/10 rounded border border-[#f85149]/30 transition-colors font-medium"
              >
                Clear All My Projects
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* CENTER FEED: GitHub Repository Cards */}
      <main className="flex-1 flex flex-col overflow-y-auto border-r border-[#30363d]">
        {/* Sub-header Filter Tabs */}
        <div className="p-4 border-b border-[#30363d] bg-[#161b22]/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-[#21262d] p-1 rounded-lg border border-[#30363d] text-xs">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${activeTab === 'all' ? 'bg-[#30363d] text-white shadow-xs' : 'text-[#8b949e] hover:text-white'}`}
            >
              All Projects ({snippets.length})
            </button>
            <button
              onClick={() => setActiveTab('web')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${activeTab === 'web' ? 'bg-[#30363d] text-white shadow-xs' : 'text-[#8b949e] hover:text-white'}`}
            >
              HTML &amp; JavaScript
            </button>
            <button
              onClick={() => setActiveTab('python')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${activeTab === 'python' ? 'bg-[#30363d] text-white shadow-xs' : 'text-[#8b949e] hover:text-white'}`}
            >
              Python
            </button>
            <button
              onClick={() => setActiveTab('starred')}
              className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${activeTab === 'starred' ? 'bg-[#30363d] text-[#e3b341] shadow-xs' : 'text-[#8b949e] hover:text-white'}`}
            >
              <Star className="w-3 h-3" />
              <span>Starred</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenUploadModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] border border-[#30363d] transition-colors"
            >
              <UploadCloud className="w-3.5 h-3.5 text-[#58a6ff]" />
              <span>Upload Code</span>
            </button>

            <button
              onClick={() => onCreateSnippet(undefined, 'web')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#238636] hover:bg-[#2ea043] text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Web Project</span>
            </button>
          </div>
        </div>

        {/* Repository Feed */}
        <div className="p-4 sm:p-6 space-y-4">
          {filteredSnippets.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-[#30363d] rounded-xl p-8 bg-[#161b22]/30">
              <BookOpen className="w-10 h-10 text-[#8b949e] mx-auto mb-3 stroke-[1.5]" />
              <h3 className="text-sm font-semibold text-[#f0f6fc]">No repositories found</h3>
              <p className="text-xs text-[#8b949e] mt-1 max-w-sm mx-auto">
                All projects have been cleared. Upload code files or create a new Web/Python project.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
                <button
                  onClick={() => onCreateSnippet(undefined, 'web')}
                  className="px-3.5 py-1.5 bg-[#238636] hover:bg-[#2ea043] text-white rounded-md text-xs font-semibold"
                >
                  + New Web Project (HTML &amp; JS)
                </button>
                <button
                  onClick={() => onCreateSnippet(undefined, 'python')}
                  className="px-3.5 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] border border-[#30363d] rounded-md text-xs font-semibold"
                >
                  + New Python Script
                </button>
                <button
                  onClick={onOpenUploadModal}
                  className="px-3.5 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-[#58a6ff] border border-[#30363d] rounded-md text-xs font-semibold"
                >
                  Upload Code File
                </button>
              </div>
            </div>
          ) : (
            filteredSnippets.map(snip => {
              const langColor = GITHUB_LANG_COLORS[snip.language] || '#8b949e';
              const cleanLiveUrl = `${window.location.origin}/live/${snip.slug}`;
              const lineCount = (snip.code || (snip.html + '\n' + snip.css + '\n' + snip.js)).split('\n').length;

              return (
                <div
                  key={snip.id}
                  className="bg-[#161b22] border border-[#30363d] rounded-lg p-5 hover:border-[#8b949e]/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <BookOpen className="w-4 h-4 text-[#8b949e]" />
                      <button
                        onClick={() => onSelectSnippet(snip)}
                        className="text-base font-bold text-[#58a6ff] hover:underline"
                      >
                        rishi.p1.goyal/<span className="text-[#f0f6fc]">{snip.slug}</span>
                      </button>

                      <span className="text-[11px] px-2 py-0.5 rounded-full border border-[#30363d] text-[#8b949e] font-medium">
                        Public
                      </span>

                      {snip.language === 'web' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1f6feb]/20 text-[#58a6ff] border border-[#1f6feb]/30 font-mono">
                          HTML5 + CSS + JS
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onToggleFavorite(snip.id)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium border border-[#30363d] transition-colors ${
                          snip.isFavorite ? 'bg-[#30363d] text-[#e3b341]' : 'bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]'
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${snip.isFavorite ? 'fill-[#e3b341]' : ''}`} />
                        <span>{snip.isFavorite ? 'Starred' : 'Star'}</span>
                      </button>

                      <button
                        onClick={() => onSelectSnippet(snip)}
                        className="px-3 py-1 rounded-md text-xs font-semibold bg-[#238636] hover:bg-[#2ea043] text-white transition-colors"
                      >
                        Edit Code
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-[#8b949e] leading-relaxed mb-4">
                    {snip.description || 'Interactive project with real-time runner and live share link.'}
                  </p>

                  {/* Clean Meaningful Live URL Bar */}
                  <div className="bg-[#0d1117] border border-[#30363d] rounded-md p-2 flex items-center justify-between text-xs font-mono text-[#58a6ff] mb-4">
                    <div className="flex items-center gap-2 truncate mr-2">
                      <Globe className="w-3.5 h-3.5 text-[#3fb950] shrink-0" />
                      <span className="text-[#8b949e] select-none">Live URL:</span>
                      <a
                        href={cleanLiveUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate hover:underline text-[#58a6ff]"
                      >
                        {cleanLiveUrl}
                      </a>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={(e) => handleCopyLiveLink(snip, e)}
                        className="px-2 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] text-[11px] font-sans flex items-center gap-1 transition-colors"
                      >
                        {copiedSlug === (snip.slug || snip.id) ? (
                          <>
                            <Check className="w-3 h-3 text-[#3fb950]" />
                            <span className="text-[#3fb950]">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>

                      <a
                        href={cleanLiveUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#58a6ff]"
                        title="Open live webpage"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* Metadata line */}
                  <div className="flex items-center justify-between text-xs text-[#8b949e]">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: langColor }} />
                        <span className="capitalize">{snip.language}</span>
                      </div>

                      <span>{lineCount} lines</span>
                      <span>Updated {new Date(snip.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => handleDownload(snip, e)}
                        className="hover:text-white flex items-center gap-1 text-[11px]"
                        title="Download code file"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`Delete ${snip.title}?`)) onDeleteSnippet(snip.id);
                        }}
                        className="hover:text-[#f85149] text-[11px]"
                        title="Delete repository"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* RIGHT SIDEBAR: AI Copilot Agent & Quick Links */}
      <aside className="w-full lg:w-80 xl:w-96 p-4 flex flex-col gap-4 bg-[#0d1117] shrink-0">
        {/* Built-in AI Copilot Agent */}
        <div className="h-[460px] flex flex-col">
          <AiCopilotAgent
            currentSnippet={filteredSnippets[0] || snippets[0] || null}
            className="shadow-xl"
          />
        </div>

        {/* Quick Help & Shortcuts */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 text-xs space-y-2">
          <div className="font-semibold text-[#f0f6fc] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#58a6ff]" />
            <span>AI Copilot Capabilities</span>
          </div>
          <p className="text-[#8b949e] leading-relaxed">
            The built-in AI agent inspects your HTML, CSS, JavaScript, and Python code in real-time, giving specific architecture tips and ready-to-run code snippets.
          </p>
          <div className="pt-2 border-t border-[#30363d] flex justify-between text-[#8b949e] font-mono text-[11px]">
            <span>⌘ + Enter : Run Code</span>
            <span>⌘ + S : Save</span>
          </div>
        </div>
      </aside>
    </div>
  );
};
