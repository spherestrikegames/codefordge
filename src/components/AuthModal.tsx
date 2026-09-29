import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, Shield, ArrowRight, Loader2, Database } from 'lucide-react';
import { User } from '../types';
import { signInWithGitHub, isSupabaseConfigured, getSupabaseClient, mapSupabaseUser } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User, token: string) => void;
  onOpenSupabaseModal?: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onOpenSupabaseModal,
  initialMode = 'register'
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGitHubAuth = async () => {
    setErrorMsg(null);
    if (!isSupabaseConfigured()) {
      if (onOpenSupabaseModal) {
        onClose();
        onOpenSupabaseModal();
      } else {
        setErrorMsg('Please configure your Supabase Project URL and Key first to use GitHub login.');
      }
      return;
    }

    try {
      setIsLoading(true);
      const { error } = await signInWithGitHub();
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || 'GitHub login failed');
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (mode === 'register') {
      if (!name.trim()) {
        setErrorMsg('Please enter your name');
        return;
      }
      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match');
        return;
      }
    }

    setIsLoading(true);

    // If Supabase is configured, also sync with Supabase Auth!
    const sbClient = getSupabaseClient();
    if (sbClient && isSupabaseConfigured()) {
      try {
        if (mode === 'register') {
          const { data: sbData, error: sbError } = await sbClient.auth.signUp({
            email: email.trim(),
            password,
            options: { data: { full_name: name.trim() } }
          });
          if (sbError) console.warn('Supabase sign up notice:', sbError.message);
        } else {
          const { data: sbData, error: sbError } = await sbClient.auth.signInWithPassword({
            email: email.trim(),
            password
          });
          if (sbError) console.warn('Supabase sign in notice:', sbError.message);
        }
      } catch (err) {
        console.warn('Supabase optional auth error:', err);
      }
    }

    const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: name.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Store token
      localStorage.setItem('code_auth_token', data.token);
      onSuccess(data.user, data.token);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#1e2025] border border-[#2d3139] rounded-2xl shadow-2xl overflow-hidden font-sans text-[#e3e3e3]">
        {/* Header */}
        <div className="p-6 border-b border-[#2d3139] flex items-start justify-between bg-[#14161a]">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-[#8ab4f8] mb-3">
              <Lock className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white">
              {mode === 'register' ? 'Create Your Account' : 'Sign In to Code Drive'}
            </h2>
            <p className="text-xs text-[#9aa0a6] mt-1">
              Required to save code projects, manage folders, and share live URLs.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#9aa0a6] hover:text-white hover:bg-[#282a30] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* GitHub / Supabase Quick Login */}
        <div className="px-6 pt-5 pb-2">
          <button
            type="button"
            onClick={handleGitHubAuth}
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-[#24292f] hover:bg-[#2f363d] text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-2 border border-[#3c4049] shadow-sm"
          >
            {/* GitHub Octo SVG Icon */}
            <svg height="18" width="18" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
            </svg>
            <span>Continue with GitHub</span>
          </button>

          <div className="flex items-center my-4">
            <div className="flex-1 border-t border-[#2d3139]" />
            <span className="px-3 text-[11px] text-[#9aa0a6] uppercase tracking-wider">or with email</span>
            <div className="flex-1 border-t border-[#2d3139]" />
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-[#2d3139] bg-[#14161a] text-xs font-semibold">
          <button
            onClick={() => { setMode('register'); setErrorMsg(null); }}
            className={`flex-1 py-3 text-center transition-colors border-b-2 ${
              mode === 'register' ? 'border-[#8ab4f8] text-[#8ab4f8]' : 'border-transparent text-[#9aa0a6] hover:text-white'
            }`}
          >
            Create Account
          </button>
          <button
            onClick={() => { setMode('login'); setErrorMsg(null); }}
            className={`flex-1 py-3 text-center transition-colors border-b-2 ${
              mode === 'login' ? 'border-[#8ab4f8] text-[#8ab4f8]' : 'border-transparent text-[#9aa0a6] hover:text-white'
            }`}
          >
            Sign In
          </button>
        </div>

        {/* Form Body */}
        <form noValidate onSubmit={handleSubmit} className="p-6 space-y-4 pt-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-200">
              {errorMsg}
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-[#9aa0a6] mb-1.5">
                Full Name / Username
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-[#9aa0a6] absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  className="w-full bg-[#14161a] border border-[#2d3139] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-[#9aa0a6] outline-none focus:border-[#8ab4f8] transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#9aa0a6] mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#9aa0a6] absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-[#14161a] border border-[#2d3139] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-[#9aa0a6] outline-none focus:border-[#8ab4f8] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9aa0a6] mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#9aa0a6] absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#14161a] border border-[#2d3139] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-[#9aa0a6] outline-none focus:border-[#8ab4f8] transition-colors"
              />
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-[#9aa0a6] mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Shield className="w-4 h-4 text-[#9aa0a6] absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#14161a] border border-[#2d3139] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-[#9aa0a6] outline-none focus:border-[#8ab4f8] transition-colors"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-[#8ab4f8] hover:bg-[#aecbfa] disabled:opacity-50 text-neutral-950 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-md mt-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{mode === 'register' ? 'Create Account & Enable Saving' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="p-4 bg-[#14161a] border-t border-[#2d3139] flex items-center justify-between text-xs text-[#9aa0a6]">
          {onOpenSupabaseModal && (
            <button
              onClick={() => {
                onClose();
                onOpenSupabaseModal();
              }}
              className="text-[#3ecf8e] hover:underline flex items-center gap-1.5 font-medium"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Configure Supabase</span>
            </button>
          )}

          {mode === 'register' ? (
            <span>
              Already registered?{' '}
              <button
                onClick={() => { setMode('login'); setErrorMsg(null); }}
                className="text-[#8ab4f8] hover:underline font-semibold"
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              Need an account?{' '}
              <button
                onClick={() => { setMode('register'); setErrorMsg(null); }}
                className="text-[#8ab4f8] hover:underline font-semibold"
              >
                Create Account
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
