import React, { useState, useRef } from 'react';
import { UploadCloud, FileCode, Check, X, AlertCircle, Folder as FolderIcon, Sparkles } from 'lucide-react';
import { Folder, SupportedLanguage, UploadedFileResult } from '../types';
import { readFileAsText, formatFileSize, detectLanguageFromFilename } from '../utils/fileUpload';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  activeFolderId: string | null;
  onUploadSuccess: (fileData: UploadedFileResult & { title: string; folderId: string }) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  folders,
  activeFolderId,
  onUploadSuccess
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<UploadedFileResult | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState(
    activeFolderId && activeFolderId !== 'favorites' ? activeFolderId : (folders[0]?.id || 'f_general')
  );
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>('python');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Paste code fallback tab
  const [mode, setMode] = useState<'file' | 'paste'>('file');
  const [pastedCode, setPastedCode] = useState('');
  const [pastedFilename, setPastedFilename] = useState('script.py');

  if (!isOpen) return null;

  const handleProcessFile = async (file: File) => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const result = await readFileAsText(file);
      setSelectedFile(result);
      setSelectedLang(result.language);
      setCustomTitle(file.name.replace(/\.[^/.]+$/, ''));
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to read uploaded file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleProcessFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'file') {
      if (!selectedFile) return;
      onUploadSuccess({
        ...selectedFile,
        title: customTitle.trim() || selectedFile.filename,
        language: selectedLang,
        folderId: selectedFolderId
      });
    } else {
      if (!pastedCode.trim()) return;
      const detected = detectLanguageFromFilename(pastedFilename);
      onUploadSuccess({
        filename: pastedFilename,
        code: pastedCode,
        language: selectedLang || detected,
        filesize: pastedCode.length,
        title: customTitle.trim() || pastedFilename,
        folderId: selectedFolderId
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Upload &amp; Import Code</h3>
              <p className="text-xs text-neutral-400">Load your downloaded Python, JavaScript, Web, or any code</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-5 pt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setMode('file')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              mode === 'file' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Upload File
          </button>
          <button
            type="button"
            onClick={() => setMode('paste')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              mode === 'paste' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Paste Raw Code
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {mode === 'file' ? (
            <div>
              {/* Dropzone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-950/20'
                    : selectedFile
                    ? 'border-emerald-500/50 bg-neutral-950'
                    : 'border-neutral-800 hover:border-neutral-700 bg-neutral-950/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileInputChange}
                  className="hidden"
                  accept=".py,.js,.ts,.tsx,.jsx,.html,.css,.json,.md,.c,.cpp,.rs,.go,.java,.sh,.sql,.txt"
                />

                {selectedFile ? (
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2">
                      <FileCode className="w-5 h-5" />
                    </div>
                    <div className="text-sm font-semibold text-white truncate max-w-xs">{selectedFile.filename}</div>
                    <div className="text-xs text-neutral-400 mt-1 flex items-center gap-2">
                      <span>{formatFileSize(selectedFile.filesize)}</span>
                      <span>·</span>
                      <span>{selectedFile.code.split('\n').length} lines</span>
                      <span>·</span>
                      <span className="uppercase text-emerald-400 font-semibold">{selectedFile.language}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                      className="mt-3 text-xs text-neutral-500 hover:text-rose-400 underline"
                    >
                      Choose a different file
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <UploadCloud className="w-8 h-8 text-neutral-500 mb-2 stroke-[1.5]" />
                    <p className="text-xs font-medium text-neutral-300">
                      Drag &amp; drop your code file here, or <span className="text-indigo-400 underline">browse files</span>
                    </p>
                    <p className="text-[11px] text-neutral-500 mt-1">
                      Supports Python (.py), JavaScript (.js), Web (.html), TypeScript (.ts), C/C++, Rust, Go, Java, and all code files (any size)
                    </p>
                  </div>
                )}
              </div>

              {errorMessage && (
                <div className="mt-2 p-2.5 rounded-lg bg-rose-950/30 border border-rose-900/40 text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>
          ) : (
            /* Paste Raw Code */
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  File Name &amp; Extension
                </label>
                <input
                  type="text"
                  value={pastedFilename}
                  onChange={(e) => {
                    setPastedFilename(e.target.value);
                    setSelectedLang(detectLanguageFromFilename(e.target.value));
                  }}
                  placeholder="e.g. data_pipeline.py, app.js, index.html"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  Code Content
                </label>
                <textarea
                  rows={6}
                  value={pastedCode}
                  onChange={(e) => setPastedCode(e.target.value)}
                  placeholder="Paste Python, JavaScript, HTML, C++, or any downloaded code here..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-xs text-white font-mono outline-none focus:border-indigo-500 resize-none"
                />
              </div>
            </div>
          )}

          {/* Project Title & Folder metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">
                Project Title
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Give this project a name"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">
                Save to Folder
              </label>
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
              >
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">
              Programming Language
            </label>
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value as SupportedLanguage)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
            >
              <option value="python">Python 3 (.py)</option>
              <option value="javascript">JavaScript (.js)</option>
              <option value="web">Web App (HTML/CSS/JS)</option>
              <option value="typescript">TypeScript (.ts, .tsx)</option>
              <option value="c">C (.c, .h)</option>
              <option value="cpp">C++ (.cpp)</option>
              <option value="rust">Rust (.rs)</option>
              <option value="go">Go (.go)</option>
              <option value="java">Java (.java)</option>
              <option value="bash">Bash / Shell (.sh)</option>
              <option value="sql">SQL (.sql)</option>
              <option value="markdown">Markdown (.md)</option>
              <option value="json">JSON (.json)</option>
              <option value="plaintext">Plain Text / Other</option>
            </select>
          </div>

          {/* Footer buttons */}
          <div className="pt-2 border-t border-neutral-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mode === 'file' ? !selectedFile : !pastedCode.trim()}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-colors shadow-xs"
            >
              Upload &amp; Open
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
