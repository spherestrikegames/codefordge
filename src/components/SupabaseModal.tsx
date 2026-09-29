import React, { useState, useEffect } from 'react';
import { X, Database, Check, Copy, ExternalLink, Shield, Key, Github, RefreshCw } from 'lucide-react';
import { getSupabaseCredentials, saveSupabaseCredentials, isSupabaseConfigured, getSupabaseClient } from '../lib/supabase';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCredentialsUpdated: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  onCredentialsUpdated
}) => {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const creds = getSupabaseCredentials();
      setUrl(creds.url);
      setKey(creds.key);
      if (isSupabaseConfigured()) {
        setStatus('success');
        setStatusMsg('Connected to Supabase project');
      } else {
        setStatus('idle');
        setStatusMsg('');
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !key.trim()) {
      setStatus('error');
      setStatusMsg('Please enter both Supabase Project URL and Anon Key');
      return;
    }

    setStatus('testing');
    setStatusMsg('Testing connection to Supabase...');

    try {
      saveSupabaseCredentials(url, key);
      const client = getSupabaseClient();
      if (!client) {
        throw new Error('Invalid URL format. Must start with https://');
      }

      // Quick ping test
      const { error } = await client.auth.getSession();
      if (error) {
        throw error;
      }

      setStatus('success');
      setStatusMsg('Successfully connected to Supabase!');
      onCredentialsUpdated();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setStatus('error');
      setStatusMsg(err.message || 'Connection test failed. Check your URL and Key.');
    }
  };

  const sqlSchema = `-- Supabase Table for Code Drive Projects
create table if not exists public.projects (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  slug text not null,
  title text not null,
  description text default '',
  language text not null default 'web',
  folder_id text default 'f_web',
  html text default '',
  css text default '',
  js text default '',
  code text default '',
  filename text,
  is_favorite boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
alter table public.projects enable row level security;

-- Policy: users can read, insert and update their own projects
create policy "Users can view own projects" on public.projects
  for select using (auth.uid() = user_id);

create policy "Users can insert own projects" on public.projects
  for insert with check (auth.uid() = user_id);

create policy "Users can update own projects" on public.projects
  for update using (auth.uid() = user_id);

create policy "Users can delete own projects" on public.projects
  for delete using (auth.uid() = user_id);`;

  const copySql = () => {
    navigator.clipboard.writeText(sqlSchema);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#1e2025] border border-[#2d3139] rounded-2xl shadow-2xl overflow-hidden font-sans text-[#e3e3e3]">
        {/* Header */}
        <div className="p-6 border-b border-[#2d3139] flex items-start justify-between bg-[#14161a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-[#3ecf8e]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Supabase &amp; GitHub Integration</span>
                {status === 'success' && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Connected
                  </span>
                )}
              </h2>
              <p className="text-xs text-[#9aa0a6] mt-0.5">
                Connect your Supabase project to sync accounts and code projects.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#9aa0a6] hover:text-white hover:bg-[#282a30] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleTestAndSave} className="p-6 space-y-4">
          {statusMsg && (
            <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
              status === 'success' 
                ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-200' 
                : status === 'error'
                ? 'bg-red-950/60 border border-red-800 text-red-200'
                : 'bg-blue-950/60 border border-blue-800 text-blue-200'
            }`}>
              {status === 'testing' && <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />}
              {status === 'success' && <Check className="w-3.5 h-3.5 shrink-0 text-emerald-400" />}
              <span>{statusMsg}</span>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#9aa0a6]">
                Supabase Project URL
              </label>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#8ab4f8] hover:underline flex items-center gap-1"
              >
                <span>Find in Supabase Dashboard</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="relative">
              <Key className="w-4 h-4 text-[#9aa0a6] absolute left-3 top-3" />
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-project-id.supabase.co"
                className="w-full bg-[#14161a] border border-[#2d3139] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-[#9aa0a6] outline-none focus:border-[#3ecf8e] transition-colors font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9aa0a6] mb-1.5">
              Supabase Anon Public API Key
            </label>
            <div className="relative">
              <Shield className="w-4 h-4 text-[#9aa0a6] absolute left-3 top-3" />
              <input
                type="password"
                required
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full bg-[#14161a] border border-[#2d3139] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-[#9aa0a6] outline-none focus:border-[#3ecf8e] transition-colors font-mono"
              />
            </div>
          </div>

          {/* SQL Setup Helper */}
          <div className="p-3 bg-[#14161a] border border-[#2d3139] rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#9aa0a6]">
                Optional: Supabase SQL Schema for Projects Table
              </span>
              <button
                type="button"
                onClick={copySql}
                className="text-[11px] text-[#8ab4f8] hover:underline flex items-center gap-1"
              >
                {copiedSql ? <Check className="w-3 h-3 text-[#3ecf8e]" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSql ? 'Copied SQL!' : 'Copy SQL'}</span>
              </button>
            </div>
            <p className="text-[10px] text-[#9aa0a6] leading-relaxed">
              Paste this in your Supabase SQL Editor if you want to store projects in your Supabase PostgreSQL database.
            </p>
          </div>

          <div className="pt-2 flex items-center gap-2">
            <button
              type="submit"
              disabled={status === 'testing'}
              className="flex-1 py-2.5 px-4 bg-[#3ecf8e] hover:bg-[#34b27b] text-neutral-950 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
            >
              {status === 'testing' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save &amp; Connect Supabase</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 bg-[#14161a] border-t border-[#2d3139] flex items-center justify-between text-xs text-[#9aa0a6]">
          <span>Integrated with GitHub &amp; Supabase</span>
          <button
            onClick={onClose}
            className="text-white hover:underline text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
