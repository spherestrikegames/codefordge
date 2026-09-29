import React, { useState } from 'react';
import { 
  Lock, Mail, User as UserIcon, Shield, ArrowRight, 
  Loader2, HardDrive, Database, Sparkles, Check, ExternalLink 
} from 'lucide-react';
import { User } from '../types';
import { signInWithGitHub, isSupabaseConfigured, getSupabaseClient } from '../lib/supabase';

interface AuthGateProps {
  onSuccess: (user: User, token: string) => void;
  onOpenSupabaseModal: () => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({
  onSuccess,
  onOpenSupabaseModal
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGitHubAuth = async () => {
    setErrorMsg(null);
    if (!isSupabaseConfigured()) {
      onOpenSupabaseModal();
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

    // If Supabase is configured, sync user registration with Supabase Auth
    const sbClient = getSupabaseClient();
    if (sbClient && isSupabaseConfigured()) {
      try {
        if (mode === 'register') {
          await sbClient.auth.signUp({
            email: email.trim(),
            password,
            options: { data: { full_name: name.trim() } }
          });
        } else {
          await sbClient.auth.signInWithPassword({
            email: email.trim(),
            password
          });
        }
      } catch (err) {
        console.warn('Supabase auth notice:', err);
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

      localStorage.setItem('code_auth_token', data.token);
      onSuccess(data.user, data.token);
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-[#14161a] text-[#e3e3e3] select-none font-sans relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Card */}
      <div className="relative w-full max-w-md bg-[#1e2025] border border-[#2d3139] rounded-3xl shadow-2xl overflow-hidden z-10">
        {/* Brand Header */}
        <div className="p-8 pb-6 text-center border-b border-[#2d3139] bg-[#181a1f]/80">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#34a853] via-[#fbbc04] to-[#4285f4] flex items-center justify-center shadow-lg mx-auto mb-4">
            <HardDrive className="w-7 h-7 text-white stroke-[2.5]" />
          </div>

          <h1 className="text-xl font-bold text-white tracking-tight">Code Drive</h1>
          <p className="text-xs text-[#9aa0a6] mt-1.5 max-w-xs mx-auto leading-relaxed">
            An account is required to access your private code drive, build applications, and run code.
          </p>
        </div>

        {/* GitHub / Supabase Quick Login */}
        <div className="px-8 pt-6 pb-2">
          <button
            type="button"
            onClick={handleGitHubAuth}
            disabled={isLoading}
            className="w-full py-3 px-4 bg-[#24292f] hover:bg-[#2f363d] text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-2.5 border border-[#3c4049] shadow-sm hover:border-[#8ab4f8]"
          >
            {/* GitHub Octo SVG Icon */}
            <svg height="18" width="18" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
            </svg>
            <span>Continue with GitHub</span>
          </button>

          <div className="flex items-center my-4">
            <div className="flex-1 border-t border-[#2d3139]" />
            <span className="px-3 text-[11px] text-[#9aa0a6] uppercase tracking-wider font-semibold">
              or continue with email
            </span>
            <div className="flex-1 border-t border-[#2d3139]" />
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-[#2d3139] bg-[#14161a] text-xs font-semibold mx-8 rounded-xl overflow-hidden border">
          <button
            onClick={() => { setMode('register'); setErrorMsg(null); }}
            className={`flex-1 py-2.5 text-center transition-colors ${
              mode === 'register' ? 'bg-[#8ab4f8] text-neutral-950 font-bold' : 'text-[#9aa0a6] hover:text-white'
            }`}
          >
            Create Account
          </button>
          <button
            onClick={() => { setMode('login'); setErrorMsg(null); }}
            className={`flex-1 py-2.5 text-center transition-colors ${
              mode === 'login' ? 'bg-[#8ab4f8] text-neutral-950 font-bold' : 'text-[#9aa0a6] hover:text-white'
            }`}
          >
            Sign In
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-8 pt-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-200">
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
                  className="w-full bg-[#14161a] border border-[#2d3139] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-[#9aa0a6] outline-none focus:border-[#8ab4f8] transition-colors"
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
                className="w-full bg-[#14161a] border border-[#2d3139] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-[#9aa0a6] outline-none focus:border-[#8ab4f8] transition-colors"
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
                className="w-full bg-[#14161a] border border-[#2d3139] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-[#9aa0a6] outline-none focus:border-[#8ab4f8] transition-colors"
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
                  className="w-full bg-[#14161a] border border-[#2d3139] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-[#9aa0a6] outline-none focus:border-[#8ab4f8] transition-colors"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-[#8ab4f8] hover:bg-[#aecbfa] disabled:opacity-50 text-neutral-950 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg mt-2 cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{mode === 'register' ? 'Create Account & Enter Drive' : 'Sign In to Drive'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="p-4 px-8 bg-[#14161a] border-t border-[#2d3139] flex items-center justify-between text-xs text-[#9aa0a6]">
          <button
            onClick={onOpenSupabaseModal}
            className="text-[#3ecf8e] hover:underline flex items-center gap-1.5 font-medium"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Connect Supabase</span>
          </button>

          {mode === 'register' ? (
            <span>
              Already have an account?{' '}
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

      <div className="mt-6 text-xs text-[#9aa0a6] flex items-center gap-2">
        <Shield className="w-3.5 h-3.5 text-[#34a853]" />
        <span>Strict isolation: your code projects are only accessible by your authenticated account.</span>
      </div>
    </div>
  );
};
