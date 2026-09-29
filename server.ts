import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Initialize Google Gemini AI SDK
let aiClient: GoogleGenAI | null = null;
try {
  aiClient = new GoogleGenAI();
} catch (err) {
  console.warn('Gemini AI initialized in fallback mode:', err);
}

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export type SupportedLanguage = 
  | 'web' | 'javascript' | 'python' | 'typescript' | 'html' 
  | 'css' | 'json' | 'markdown' | 'c' | 'cpp' | 'rust' 
  | 'go' | 'java' | 'bash' | 'sql' | 'plaintext';

export interface UserAccount {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  name: string;
  avatar: string;
  createdAt: string;
}

export interface Snippet {
  id: string;
  slug: string;
  title: string;
  description: string;
  language: SupportedLanguage;
  folderId: string;
  userId?: string;
  html: string;
  css: string;
  js: string;
  code: string;
  filename?: string;
  filesize?: number;
  tags: string[];
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  userId?: string;
  createdAt: string;
}

export interface SharedProject {
  shareId: string;
  slug: string;
  projectId?: string;
  title: string;
  description: string;
  language: SupportedLanguage;
  html: string;
  css: string;
  js: string;
  code: string;
  filename?: string;
  author: string;
  createdAt: string;
  views: number;
}

interface StoreData {
  users: UserAccount[];
  sessions: Record<string, string>; // token -> userId
  folders: Folder[];
  snippets: Snippet[];
  shares: Record<string, SharedProject>;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'project';
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

const DEFAULT_FOLDERS: Folder[] = [
  { id: 'f_web', name: 'Web Apps', color: '#EA4335', createdAt: new Date().toISOString() },
  { id: 'f_python', name: 'Python Scripts', color: '#34A853', createdAt: new Date().toISOString() },
  { id: 'f_tools', name: 'Utilities', color: '#4285F4', createdAt: new Date().toISOString() },
];

function loadStore(): StoreData {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const data = JSON.parse(raw);
      return {
        users: data.users || [],
        sessions: data.sessions || {},
        folders: data.folders || DEFAULT_FOLDERS,
        snippets: data.snippets || [],
        shares: data.shares || {}
      };
    }
  } catch (err) {
    console.error('Error reading store:', err);
  }
  return {
    users: [],
    sessions: {},
    folders: DEFAULT_FOLDERS,
    snippets: [],
    shares: {}
  };
}

function saveStore(data: StoreData) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving store:', err);
  }
}

let store = loadStore();

// Helper to get authenticated user from Request header
function getAuthUser(req: Request): UserAccount | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  const userId = store.sessions[token];
  if (!userId) return null;
  return store.users.find(u => u.id === userId) || null;
}

// --- AUTHENTICATION API ---

app.post('/api/auth/register', (req: Request, res: Response) => {
  const { email, password, name } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const cleanEmail = email.toLowerCase().trim();
  if (store.users.some(u => u.email === cleanEmail)) {
    res.status(409).json({ error: 'An account with this email already exists' });
    return;
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);
  const newUser: UserAccount = {
    id: 'usr_' + crypto.randomBytes(8).toString('hex'),
    email: cleanEmail,
    passwordHash,
    salt,
    name: name?.trim() || cleanEmail.split('@')[0],
    avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${cleanEmail}`,
    createdAt: new Date().toISOString()
  };

  store.users.push(newUser);
  const token = 'tok_' + crypto.randomBytes(24).toString('hex');
  store.sessions[token] = newUser.id;
  saveStore(store);

  res.status(201).json({
    token,
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      avatar: newUser.avatar,
      createdAt: newUser.createdAt
    }
  });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const cleanEmail = email.toLowerCase().trim();
  const user = store.users.find(u => u.email === cleanEmail);
  if (!user) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const hash = hashPassword(password, user.salt);
  if (hash !== user.passwordHash) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const token = 'tok_' + crypto.randomBytes(24).toString('hex');
  store.sessions[token] = user.id;
  saveStore(store);

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      createdAt: user.createdAt
    }
  });
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      createdAt: user.createdAt
    }
  });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    delete store.sessions[token];
    saveStore(store);
  }
  res.json({ success: true });
});

// --- REST API FOR PROJECTS (Google Drive Style) ---

app.get('/api/projects', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ 
      error: 'ACCOUNT_REQUIRED',
      message: 'You must make an account or sign in to access projects.' 
    });
    return;
  }

  // Filter projects belonging strictly to this user
  const userSnippets = store.snippets.filter(s => s.userId === user.id);
  res.json({ snippets: userSnippets, folders: store.folders });
});

app.get('/api/projects/:id', (req: Request, res: Response) => {
  const item = store.snippets.find(s => s.id === req.params.id || s.slug === req.params.id);
  if (!item) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.json(item);
});

// Create project - REQUIRES USER ACCOUNT TO SAVE
app.post('/api/projects', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ 
      error: 'ACCOUNT_REQUIRED',
      message: 'You must make an account or sign in to have your projects saved.' 
    });
    return;
  }

  const body = req.body;
  const title = body.title || 'Untitled Project';
  const slug = body.slug || slugify(title);

  // NO CODE in the codebox when creating new projects as requested!
  const newSnippet: Snippet = {
    id: body.id || 'snip_' + Math.random().toString(36).substring(2, 9),
    slug,
    title,
    description: body.description || '',
    language: body.language || 'web',
    folderId: body.folderId || store.folders[0]?.id || 'f_web',
    userId: user.id,
    html: body.html ?? '',
    css: body.css ?? '',
    js: body.js ?? '',
    code: body.code ?? '',
    filename: body.filename || undefined,
    filesize: body.filesize || (body.code?.length || body.html?.length || 0),
    tags: Array.isArray(body.tags) ? body.tags : [],
    isFavorite: Boolean(body.isFavorite),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1
  };

  store.snippets.unshift(newSnippet);
  saveStore(store);
  res.status(201).json(newSnippet);
});

// Update project - REQUIRES USER ACCOUNT
app.put('/api/projects/:id', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ 
      error: 'ACCOUNT_REQUIRED',
      message: 'You must make an account or sign in to have your projects saved.' 
    });
    return;
  }

  const index = store.snippets.findIndex(s => s.id === req.params.id || s.slug === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const existing = store.snippets[index];
  const updated: Snippet = {
    ...existing,
    ...req.body,
    id: existing.id,
    userId: existing.userId || user.id,
    updatedAt: new Date().toISOString(),
    version: (existing.version || 1) + 1
  };
  store.snippets[index] = updated;
  saveStore(store);
  res.json(updated);
});

// Delete project
app.delete('/api/projects/:id', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  store.snippets = store.snippets.filter(s => s.id !== req.params.id && s.slug !== req.params.id);
  saveStore(store);
  res.json({ success: true, id: req.params.id });
});

// Reset user's projects
app.post('/api/reset', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (user) {
    store.snippets = store.snippets.filter(s => s.userId !== user.id);
  } else {
    store.snippets = [];
  }
  store.shares = {};
  saveStore(store);
  res.json({ success: true, message: 'All snippets and shares cleared' });
});

// Folders
app.get('/api/folders', (req: Request, res: Response) => {
  res.json(store.folders);
});

app.post('/api/folders', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  const { name, color } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Folder name is required' });
    return;
  }
  const newFolder: Folder = {
    id: 'f_' + Math.random().toString(36).substring(2, 8),
    name: name.trim(),
    color: color || '#4285F4',
    userId: user?.id,
    createdAt: new Date().toISOString()
  };
  store.folders.push(newFolder);
  saveStore(store);
  res.status(201).json(newFolder);
});

// Share with Clean Human-Readable Slugs
app.post('/api/share', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  const body = req.body;
  const baseSlug = slugify(body.title || 'project');
  let shareId = baseSlug;
  if (store.shares[shareId] && store.shares[shareId].projectId !== body.projectId) {
    shareId = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
  }

  const shared: SharedProject = {
    shareId,
    slug: shareId,
    projectId: body.projectId || undefined,
    title: body.title || 'Shared Project',
    description: body.description || '',
    language: body.language || 'web',
    html: body.html || '',
    css: body.css || '',
    js: body.js || '',
    code: body.code || '',
    filename: body.filename || undefined,
    author: user?.name || body.author || 'Anonymous',
    createdAt: new Date().toISOString(),
    views: 1
  };

  store.shares[shareId] = shared;
  saveStore(store);

  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const baseUrl = `${protocol}://${host}`;

  res.status(201).json({
    shareId,
    slug: shareId,
    shared,
    liveUrl: `${baseUrl}/live/${shareId}`,
    editorUrl: `${baseUrl}/?share=${shareId}`
  });
});

app.get('/api/share/:shareId', (req: Request, res: Response) => {
  const shared = store.shares[req.params.shareId];
  if (!shared) {
    res.status(404).json({ error: 'Share link not found' });
    return;
  }
  shared.views = (shared.views || 0) + 1;
  saveStore(store);
  res.json(shared);
});

// --- AI Copilot Agent Endpoint ---
app.post('/api/ai/suggest', async (req: Request, res: Response) => {
  const { prompt, language, code, html, css, js, title } = req.body;

  const currentCodeContext = language === 'web' || language === 'html'
    ? `HTML:\n${html || ''}\n\nCSS:\n${css || ''}\n\nJavaScript:\n${js || ''}`
    : `Code (${language}):\n${code || ''}`;

  const systemPrompt = `You are CodeForge AI Copilot, an elite software engineering assistant.
You provide clear, direct, and actionable advice on:
1. What to build or improve next.
2. How to implement features step-by-step with practical, modern HTML, CSS, JavaScript, or Python code.
3. Architecture improvements, UI design polishes, and bug fixes.
Always provide concrete code snippets and concise explanations. Focus on high quality, clean code.`;

  try {
    if (aiClient) {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Project: "${title || 'Untitled'}" (Language: ${language})
User Request: ${prompt || 'Suggest 3 high-impact features or improvements for this project.'}

Current Code:
\`\`\`
${currentCodeContext.slice(0, 15000)}
\`\`\`

Give concise suggestions:
1. Concrete feature or improvement idea with "why".
2. Exact code to add or modify.
3. Next steps.`,
        config: {
          systemInstruction: systemPrompt,
        }
      });

      const reply = response.text || 'No suggestion generated.';
      res.json({ suggestion: reply });
      return;
    }
  } catch (err: any) {
    console.error('Gemini AI error:', err);
  }

  // Graceful intelligent fallback if API key is in setup or offline
  const fallback = `### Recommendations for "${title || 'Project'}" (${language.toUpperCase()})

1. **Blank Canvas Architecture**:
   - Start by defining the HTML DOM layout structure with semantic tags.
   - Add styling for fluid layout and dark mode theme.
   - Add JavaScript event listeners to handle user inputs.`;

  res.json({ suggestion: fallback });
});

// Standalone Live Render URL: /live/:slugOrId
app.get('/live/:shareId', (req: Request, res: Response) => {
  const shared = store.shares[req.params.shareId];
  if (!shared) {
    res.status(404).send(`
      <!DOCTYPE html>
      <html>
        <head><title>404 - Project Not Found</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="background:#0d1117; color:#8b949e; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; margin:0;">
          <h1 style="color:#f0f6fc; margin-bottom:8px;">Project Not Found</h1>
          <p>The link might have expired or the slug is invalid.</p>
          <a href="/" style="margin-top:16px; color:#58a6ff; text-decoration:none; font-weight:600;">← Back to Code Drive</a>
        </body>
      </html>
    `);
    return;
  }

  shared.views = (shared.views || 0) + 1;
  saveStore(store);

  const safeTitle = (shared.title || 'Live Project').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const isWeb = shared.language === 'web' || shared.language === 'html';
  const isPython = shared.language === 'python';

  const badgeHtml = `
    <div style="position:fixed; bottom:16px; right:16px; z-index:999999; display:flex; align-items:center; gap:8px; background:rgba(22,27,34,0.92); border:1px solid #30363d; padding:6px 14px; border-radius:9999px; backdrop-filter:blur(10px); font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:12px; color:#8b949e; box-shadow:0 10px 25px rgba(0,0,0,0.5);">
      <span>Hosted on <strong style="color:#f0f6fc;">CodeDrive</strong></span>
      <span>·</span>
      <a href="/?share=${shared.shareId}" target="_blank" style="color:#58a6ff; text-decoration:none; font-weight:600;">Open Code ↗</a>
    </div>
  `;

  if (isWeb) {
    const webHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle} · CodeDrive Live</title>
  <style>
    ${shared.css || ''}
  </style>
</head>
<body>
  ${shared.html || ''}
  ${badgeHtml}
  <script>
    try {
      ${shared.js || ''}
    } catch(err) {
      console.error('Runtime error:', err);
    }
  </script>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html');
    res.send(webHtml);
    return;
  }

  if (isPython) {
    const escapedPyCode = JSON.stringify(shared.code || '');
    const pyHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle} · Python Live</title>
  <script src="https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js"></script>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:#0d1117; color:#c9d1d9; font-family:'JetBrains Mono', monospace; padding:24px; min-height:100vh; }
    .container { max-width:860px; margin:0 auto; }
    .header { display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #30363d; padding-bottom:16px; margin-bottom:20px; }
    .title { font-size:16px; font-weight:700; color:#58a6ff; }
    .btn { background:#238636; color:#fff; border:1px solid rgba(240,246,252,0.1); padding:8px 16px; border-radius:6px; cursor:pointer; font-weight:600; font-size:12px; }
    .btn:hover { background:#2ea043; }
    .code-box { background:#161b22; border:1px solid #30363d; border-radius:8px; padding:16px; margin-bottom:20px; font-size:13px; line-height:1.6; white-space:pre-wrap; overflow-x:auto; }
    .terminal { background:#030712; border:1px solid #30363d; border-radius:8px; padding:16px; font-size:13px; line-height:1.6; color:#3fb950; min-height:160px; white-space:pre-wrap; }
    .status { font-size:11px; color:#8b949e; margin-top:8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title">${safeTitle} (Python 3)</div>
      <button class="btn" id="runBtn" onclick="runPythonCode()">▶ Run Python Script</button>
    </div>
    <div class="code-box"><code>${(shared.code || '').replace(/</g, '&lt;')}</code></div>
    <div style="font-size:12px; font-weight:600; color:#8b949e; margin-bottom:8px;">TERMINAL STDOUT</div>
    <div class="terminal" id="output">Loading Python 3 WebAssembly engine...</div>
    <div class="status" id="status">Status: Initializing Pyodide...</div>
  </div>
  ${badgeHtml}
  <script>
    let pyodideInstance = null;
    const pyCode = ${escapedPyCode};
    const outEl = document.getElementById('output');
    const statusEl = document.getElementById('status');

    async function initPy() {
      try {
        pyodideInstance = await loadPyodide({
          stdout: (text) => { outEl.textContent += text + '\\n'; },
          stderr: (text) => { outEl.textContent += '[Error] ' + text + '\\n'; }
        });
        statusEl.textContent = 'Status: Python 3 Ready';
        runPythonCode();
      } catch(e) {
        outEl.textContent = 'Error: ' + e.message;
      }
    }

    async function runPythonCode() {
      if (!pyodideInstance) return;
      outEl.textContent = '';
      statusEl.textContent = 'Status: Running...';
      const t0 = performance.now();
      try {
        await pyodideInstance.runPythonAsync(pyCode);
        const elapsed = Math.round(performance.now() - t0);
        statusEl.textContent = 'Status: Executed in ' + elapsed + 'ms';
      } catch(err) {
        outEl.textContent += '\\nTraceback:\\n' + err.message;
        statusEl.textContent = 'Status: Execution failed';
      }
    }
    initPy();
  </script>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html');
    res.send(pyHtml);
    return;
  }

  // Generic code viewer
  const rawCode = shared.code || shared.js || shared.html || '';
  const escapedCode = rawCode.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const genericHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle} · CodeDrive</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:#0d1117; color:#c9d1d9; font-family:'JetBrains Mono', monospace; padding:24px; min-height:100vh; }
    .container { max-width:880px; margin:0 auto; }
    .header { display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #30363d; padding-bottom:16px; margin-bottom:20px; }
    .title { font-size:16px; font-weight:700; color:#58a6ff; }
    .code-box { background:#161b22; border:1px solid #30363d; border-radius:8px; padding:20px; font-size:13px; line-height:1.6; white-space:pre-wrap; overflow-x:auto; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <div class="title">${safeTitle}</div>
        <div style="font-size:12px; color:#8b949e; margin-top:4px;">${shared.language} · by ${shared.author}</div>
      </div>
      <a href="/?share=${shared.shareId}" style="background:#238636; color:white; padding:8px 16px; border-radius:6px; text-decoration:none; font-size:12px; font-weight:600;">Open &amp; Edit ↗</a>
    </div>
    <div class="code-box"><code>${escapedCode}</code></div>
  </div>
  ${badgeHtml}
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(genericHtml);
});

// Start Server
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CodeDrive Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
