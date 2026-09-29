import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, Globe, QrCode, Code, ShieldCheck } from 'lucide-react';
import { Snippet, SharedProject } from '../types';
import { generateQrSvgUrl } from '../utils/qrCode';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  snippet: Snippet | null;
  onShareSuccess?: (shared: SharedProject) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  snippet,
  onShareSuccess
}) => {
  const [authorName, setAuthorName] = useState('Developer');
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareData, setShareData] = useState<{
    shareId: string;
    liveUrl: string;
    editorUrl: string;
  } | null>(null);

  const [copiedLinkType, setCopiedLinkType] = useState<'live' | 'editor' | 'embed' | null>(null);
  const [activeShareTab, setActiveShareTab] = useState<'live' | 'embed' | 'qr'>('live');

  if (!isOpen || !snippet) return null;

  const handleGenerateShareLink = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: snippet.id,
          title: snippet.title,
          description: snippet.description,
          language: snippet.language,
          html: snippet.html,
          css: snippet.css,
          js: snippet.js,
          code: snippet.code,
          filename: snippet.filename,
          author: authorName.trim() || 'Anonymous Developer'
        })
      });

      if (!res.ok) throw new Error('Failed to generate live link');
      const data = await res.json();
      setShareData(data);
      if (onShareSuccess) onShareSuccess(data.shared);
    } catch (err) {
      console.error('Share generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, type: 'live' | 'editor' | 'embed') => {
    navigator.clipboard.writeText(text);
    setCopiedLinkType(type);
    setTimeout(() => setCopiedLinkType(null), 2000);
  };

  const liveUrl = shareData ? shareData.liveUrl : `${window.location.origin}/live/${snippet.slug || snippet.id}`;
  const editorUrl = shareData ? shareData.editorUrl : `${window.location.origin}/?project=${snippet.slug || snippet.id}`;
  const embedCode = `<iframe src="${liveUrl}" width="100%" height="500" style="border:1px solid #1e293b; border-radius:12px; overflow:hidden;" allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; midi" allowfullscreen></iframe>`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Share Live Project Link</h3>
              <p className="text-xs text-neutral-400">Anyone with this web link can run your code live</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Card Snapshot */}
          <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/80 flex items-center justify-between">
            <div className="truncate mr-3">
              <div className="text-xs font-semibold text-neutral-200 truncate">{snippet.title}</div>
              <div className="text-[11px] text-neutral-500 mt-0.5 uppercase font-mono">
                {snippet.language} · {snippet.filename || 'Code project'}
              </div>
            </div>

            <button
              onClick={handleGenerateShareLink}
              disabled={isGenerating}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shrink-0 transition-colors shadow-xs"
            >
              {isGenerating ? 'Publishing...' : shareData ? 'Update Live Link' : 'Generate Live URL'}
            </button>
          </div>

          {/* Share Format Tabs */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-xs">
            <button
              onClick={() => setActiveShareTab('live')}
              className={`flex-1 py-1.5 rounded-md font-medium text-center transition-colors flex items-center justify-center gap-1.5 ${
                activeShareTab === 'live' ? 'bg-neutral-800 text-white shadow-xs' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Live Web Link</span>
            </button>

            <button
              onClick={() => setActiveShareTab('embed')}
              className={`flex-1 py-1.5 rounded-md font-medium text-center transition-colors flex items-center justify-center gap-1.5 ${
                activeShareTab === 'embed' ? 'bg-neutral-800 text-white shadow-xs' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Embed Code</span>
            </button>

            <button
              onClick={() => setActiveShareTab('qr')}
              className={`flex-1 py-1.5 rounded-md font-medium text-center transition-colors flex items-center justify-center gap-1.5 ${
                activeShareTab === 'qr' ? 'bg-neutral-800 text-white shadow-xs' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Mobile QR Code</span>
            </button>
          </div>

          {/* Tab 1: Live Link */}
          {activeShareTab === 'live' && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-neutral-400 mb-1.5">
                  Direct Live Web Link (Standalone Fullscreen Page)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={liveUrl}
                    className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-indigo-300 outline-none select-all"
                  />
                  <button
                    onClick={() => copyToClipboard(liveUrl, 'live')}
                    className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    {copiedLinkType === 'live' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLinkType === 'live' ? 'Copied' : 'Copy'}</span>
                  </button>

                  <a
                    href={liveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shrink-0"
                    title="Open live project in new window"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-400 mb-1.5">
                  Playground Editor Link
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={editorUrl}
                    className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-neutral-300 outline-none select-all"
                  />
                  <button
                    onClick={() => copyToClipboard(editorUrl, 'editor')}
                    className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    {copiedLinkType === 'editor' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLinkType === 'editor' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-neutral-950/60 rounded-lg border border-neutral-800/80 text-xs text-neutral-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <p className="text-[11px] text-neutral-500">
                  {snippet.language === 'python' 
                    ? 'Python code will execute live in any visitor’s browser using Pyodide WebAssembly.' 
                    : snippet.language === 'web' 
                    ? 'Interactive web app runs directly on full-screen with styles, scripts, and audio.' 
                    : 'Code will display and run live with real-time output terminal.'}
                </p>
              </div>
            </div>
          )}

          {/* Tab 2: Embed Code */}
          {activeShareTab === 'embed' && (
            <div className="space-y-3">
              <label className="block text-[11px] font-medium text-neutral-400">
                HTML iFrame Embed Code
              </label>
              <textarea
                readOnly
                rows={3}
                value={embedCode}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs font-mono text-neutral-300 outline-none resize-none select-all"
              />
              <button
                onClick={() => copyToClipboard(embedCode, 'embed')}
                className="w-full py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors"
              >
                {copiedLinkType === 'embed' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLinkType === 'embed' ? 'Embed Code Copied!' : 'Copy Embed Code'}</span>
              </button>
            </div>
          )}

          {/* Tab 3: QR Code */}
          {activeShareTab === 'qr' && (
            <div className="flex flex-col items-center justify-center p-4 bg-neutral-950 rounded-lg border border-neutral-800 text-center">
              <div className="p-3 bg-white rounded-xl shadow-lg mb-3">
                <img
                  src={generateQrSvgUrl(liveUrl, 160)}
                  alt="QR Code for Live Project"
                  className="w-40 h-40 block"
                />
              </div>
              <p className="text-xs font-medium text-neutral-200">Scan with your smartphone camera</p>
              <p className="text-[11px] text-neutral-500 mt-0.5">Runs the live code directly in your mobile browser</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Serverless Live URL Active</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
