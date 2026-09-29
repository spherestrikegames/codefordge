import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Snippet, User } from '../types';

let cachedClient: SupabaseClient | null = null;
let lastUrl = '';
let lastKey = '';

export function getSupabaseCredentials(): { url: string; key: string } {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  const localUrl = localStorage.getItem('code_supabase_url') || '';
  const localKey = localStorage.getItem('code_supabase_key') || '';

  return {
    url: (localUrl || envUrl).trim(),
    key: (localKey || envKey).trim()
  };
}

export function saveSupabaseCredentials(url: string, key: string) {
  localStorage.setItem('code_supabase_url', url.trim());
  localStorage.setItem('code_supabase_key', key.trim());
  cachedClient = null; // force re-create
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = getSupabaseCredentials();
  return Boolean(url && key && url.startsWith('http') && !url.includes('your-project'));
}

export function getSupabaseClient(): SupabaseClient | null {
  const { url, key } = getSupabaseCredentials();
  if (!url || !key || !url.startsWith('http') || url.includes('your-project')) {
    return null;
  }

  if (cachedClient && lastUrl === url && lastKey === key) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, key, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });
    lastUrl = url;
    lastKey = key;
    return cachedClient;
  } catch (err) {
    console.error('Failed to create Supabase client:', err);
    return null;
  }
}

// GitHub OAuth Sign In via Supabase
export async function signInWithGitHub(): Promise<{ error: Error | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { error: new Error('Supabase is not configured yet. Please configure your project URL and Key.') };
  }

  const { error } = await client.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: window.location.origin
    }
  });

  return { error };
}

// Email/Password Sign Up via Supabase
export async function signUpWithSupabase(email: string, password: string, name: string) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client not initialized');

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
        avatar_url: `https://api.dicebear.com/7.x/identicon/svg?seed=${email}`
      }
    }
  });

  if (error) throw error;
  return data;
}

// Email/Password Sign In via Supabase
export async function signInWithSupabase(email: string, password: string) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client not initialized');

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data;
}

// Map Supabase User to App User
export function mapSupabaseUser(sbUser: any): User {
  return {
    id: sbUser.id,
    email: sbUser.email || '',
    name: sbUser.user_metadata?.full_name || sbUser.user_metadata?.user_name || sbUser.email?.split('@')[0] || 'User',
    avatar: sbUser.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${sbUser.email || sbUser.id}`,
    createdAt: sbUser.created_at || new Date().toISOString()
  };
}

// Projects Database Sync Helpers for Supabase
export async function fetchProjectsFromSupabase(userId?: string): Promise<Snippet[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    let query = client.from('projects').select('*').order('updated_at', { ascending: false });
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { data, error } = await query;
    if (error) {
      console.warn('Supabase projects table query returned notice:', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      slug: row.slug || row.id,
      title: row.title,
      description: row.description || '',
      language: row.language || 'web',
      folderId: row.folder_id || 'f_web',
      userId: row.user_id,
      html: row.html || '',
      css: row.css || '',
      js: row.js || '',
      code: row.code || '',
      filename: row.filename,
      tags: Array.isArray(row.tags) ? row.tags : [],
      isFavorite: Boolean(row.is_favorite),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      version: row.version || 1
    }));
  } catch (err) {
    console.error('Supabase fetch error:', err);
    return [];
  }
}

export async function upsertProjectToSupabase(snippet: Snippet, userId: string) {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client.from('projects').upsert({
      id: snippet.id,
      user_id: userId,
      slug: snippet.slug,
      title: snippet.title,
      description: snippet.description,
      language: snippet.language,
      folder_id: snippet.folderId,
      html: snippet.html,
      css: snippet.css,
      js: snippet.js,
      code: snippet.code,
      filename: snippet.filename,
      is_favorite: snippet.isFavorite,
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Supabase upsert error:', err);
  }
}
