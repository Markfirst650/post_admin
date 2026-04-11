require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { OpenAI } = require('openai');
const axios = require('axios');
const path = require('path');

const app = express();

const SKIP_CI_MARKERS = ['[skip ci]', '[ci skip]', '[no ci]', '[skip actions]', '[actions skip]'];
const PROVIDERS = {
  deepseek: {
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    baseUrlEnv: 'DEEPSEEK_BASE_URL',
    modelEnv: 'DEEPSEEK_MODEL',
    defaultBaseURL: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
  },
  glm: {
    apiKeyEnv: 'GLM_API_KEY',
    baseUrlEnv: 'GLM_BASE_URL',
    modelEnv: 'GLM_MODEL',
    defaultModel: 'glm-4.5',
  },
  minimax: {
    apiKeyEnv: 'MINIMAX_API_KEY',
    baseUrlEnv: 'MINIMAX_BASE_URL',
    modelEnv: 'MINIMAX_MODEL',
    defaultModel: 'MiniMax-Text-01',
  },
  openai: {
    apiKeyEnv: 'OPENAI_API_KEY',
    baseUrlEnv: 'OPENAI_BASE_URL',
    modelEnv: 'OPENAI_MODEL',
    defaultModel: 'gpt-4.1-mini',
  },
};

const PORT = parseInteger(process.env.PORT, 3000);
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const NODE_ENV = process.env.NODE_ENV || 'development';
const COOKIE_SECURE = process.env.COOKIE_SECURE
  ? process.env.COOKIE_SECURE === 'true'
  : NODE_ENV === 'production';
const TRUST_PROXY = process.env.TRUST_PROXY === 'true';
const CONTENT_ROOT = normalizeContentRoot(process.env.CONTENT_ROOT || 'src/content/posts');
const LOGIN_WINDOW_MS = parseInteger(process.env.LOGIN_WINDOW_MS, 15 * 60 * 1000);
const LOGIN_MAX_ATTEMPTS = parseInteger(process.env.LOGIN_MAX_ATTEMPTS, 10);
const API_TIMEOUT_MS = parseInteger(process.env.API_TIMEOUT_MS, 30000);

const loginAttempts = new Map();

validateStartupConfig();

if (TRUST_PROXY) {
  app.set('trust proxy', 1);
}

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(securityHeaders);
app.use(express.static(path.join(__dirname, 'public')));

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeContentRoot(root) {
  return root.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

function validateStartupConfig() {
  const missing = [];

  if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) {
    missing.push('ADMIN_PASSWORD (minimum 12 characters)');
  }

  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    missing.push('JWT_SECRET (minimum 32 characters)');
  }

  if (!process.env.GITHUB_OWNER) {
    missing.push('GITHUB_OWNER');
  }

  if (!process.env.GITHUB_REPO) {
    missing.push('GITHUB_REPO');
  }

  if (!process.env.GITHUB_TOKEN) {
    missing.push('GITHUB_TOKEN');
  }

  if (missing.length) {
    throw new Error(`Startup configuration invalid: ${missing.join(', ')}`);
  }
}

function securityHeaders(req, res, next) {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://unpkg.com https://cdn.jsdelivr.net https://cdn.jsdelivr.net/npm",
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdn.jsdelivr.net/npm",
    "font-src 'self' https://cdn.jsdelivr.net https://cdn.jsdelivr.net/npm data:",
    "img-src 'self' data: https:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');

  res.setHeader('Content-Security-Policy', csp);
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
}

function getClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.length) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.ip || req.socket.remoteAddress || 'unknown';
}

function createLoginRateLimiter() {
  return (req, res, next) => {
    const key = getClientIp(req);
    const now = Date.now();
    const record = loginAttempts.get(key);

    if (!record || now > record.resetAt) {
      loginAttempts.set(key, { count: 0, resetAt: now + LOGIN_WINDOW_MS });
      return next();
    }

    if (record.count >= LOGIN_MAX_ATTEMPTS) {
      const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        error: `Too many login attempts. Try again in ${retryAfterSeconds} seconds.`,
      });
    }

    next();
  };
}

function recordFailedLogin(req) {
  const key = getClientIp(req);
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record || now > record.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return;
  }

  record.count += 1;
}

function clearLoginAttempts(req) {
  loginAttempts.delete(getClientIp(req));
}

function authenticate(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid token' });
  }
}

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function conflict(message) {
  const error = new Error(message);
  error.statusCode = 409;
  return error;
}

function validateRequiredString(value, fieldName, maxLength = 200) {
  if (typeof value !== 'string' || !value.trim()) {
    throw badRequest(`${fieldName} is required.`);
  }

  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw badRequest(`${fieldName} must be at most ${maxLength} characters.`);
  }

  return normalized;
}

function validateOptionalString(value, fieldName, maxLength = 500) {
  if (value == null || value === '') {
    return '';
  }

  if (typeof value !== 'string') {
    throw badRequest(`${fieldName} must be a string.`);
  }

  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw badRequest(`${fieldName} must be at most ${maxLength} characters.`);
  }

  return normalized;
}

function validateMarkdown(markdown) {
  const normalized = validateRequiredString(markdown, 'markdown', 200000);
  if (!normalized.includes('---')) {
    return normalized;
  }

  return normalized;
}

function resolveProvider(providerName, requestedModel) {
  const providerKey = providerName && PROVIDERS[providerName] ? providerName : 'openai';
  const provider = PROVIDERS[providerKey];
  const apiKey = process.env[provider.apiKeyEnv];
  const baseURL = process.env[provider.baseUrlEnv] || provider.defaultBaseURL;

  if (!apiKey) {
    throw badRequest(`Missing API key for provider "${providerKey}".`);
  }

  return {
    providerKey,
    apiKey,
    baseURL,
    model: requestedModel || process.env[provider.modelEnv] || provider.defaultModel,
  };
}

function getPublicProviderDefaults() {
  return Object.fromEntries(
    Object.entries(PROVIDERS).map(([key, provider]) => [
      key,
      {
        model: process.env[provider.modelEnv] || provider.defaultModel,
        hasApiKey: Boolean(process.env[provider.apiKeyEnv]),
      },
    ])
  );
}

function buildPrompt({ title, image, category, tags, keywords, draft, targetLength, today }) {
  const description = keywords || 'Generate a concise description based on the article content.';
  const normalizedTags = tags || 'Generate some relevant tags based on the article content.';
  const normalizedCategory = category || 'General';

  return `You are an experienced blog author.You are good at writing technical articles in a clear, engaging, and informative style.Your task is to help write a high-quality Markdown article based on the provided draft and instructions.
  you should make sure that the reader can easily understand the content and find it valuable. Please strictly follow the instructions and requirements below to create the article.

Write a production-ready Markdown article that matches the language of the user input.
Return Markdown only. Do not wrap the result in a code fence.

The document must start with YAML frontmatter in exactly this shape:
---
title: ${title}
published: ${today}
updated: ${today}
description: '${description}'
image: '${image}'
tags: [${normalizedTags}]
category: '${normalizedCategory}'
draft: false
---

Requirements:
- Respect the requested length: ${targetLength}.
- Keep the article structured and readable with headings, lists, quotes, and callouts when useful.
- If the draft asks for Mermaid diagrams, output valid Mermaid blocks.
- If the draft includes image URLs, convert them to Markdown image syntax.
- Do not add a generic conclusion unless the draft asks for one.
- End the document with an HTML comment in this exact format,it must be concise and summaried,remember that The shorter, the better,for example:
<!--- FILENAME: parameters-management.md --->

Markdown Syntax Rules (master and actively apply all of the following):

1. Standard Markdown:
- Headings: Atx style only (# H1 through ###### H6).
- Paragraphs separated by blank lines; hard line breaks with two trailing spaces or backslash.
- Lists: unordered with "- ", ordered with "1. "; nested lists and multi-paragraph list items (indent 3 spaces).
- Block quotes with ">", nestable; can contain headings, lists, and code inside.
- Code blocks: prefer fenced blocks with language identifier (e.g. \`\`\`js, \`\`\`python, \`\`\`html).
- Tables: use "|" separators, "---" under header row, ":" for column alignment.
- Inline: bold (**text**), italic (*text*), strikethrough (~~text~~), inline code (\`code\`), links ([text](url)), images (![alt](url)), autolinks, escape with backslash.
- HTML: block-level HTML tags allowed (surround with blank lines).

2. Mizuki Custom Extensions (use actively to enhance interactivity):
- GitHub repository card: ::github{repo="username/reponame"}
- Callout boxes:
  :::note [optional title]
  content
  :::
  Also supports :::tip / :::important / :::warning / :::caution
  Or GitHub-style: > [!NOTE], > [!TIP], > [!WARNING], etc.
- Folded spoiler: :spoiler[hidden content here] (Markdown supported inside)

3. Mermaid Diagrams (use when visualization helps):
- Wrap in \`\`\`mermaid code block.
- Supported types: pie, graph TD/LR (flowchart), sequenceDiagram, classDiagram, stateDiagram-v2, gantt.
- Support titles, participants, subgraphs, and style customization inside diagrams.


Draft and instructions:
${draft}
If there are some mistakes in the draft, please correct them in the final article, but do not mention that you have made corrections.
`;
}

function getTodayInShanghai() {
  const now = new Date();
  const shanghaiDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  return shanghaiDate.replace(/\//g, '-');
}

function extractFilename(output) {
  const match = output.match(/<!---\s*FILENAME:\s*(.*?)\s*--->/i);
  const fallback = 'new-post.md';

  if (!match) {
    return { finalMarkdown: output.trim(), suggestedFilePath: fallback };
  }

  const candidate = match[1].trim().replace(/\\/g, '/');
  const safeCandidate = candidate
    .replace(/[^a-zA-Z0-9/_\-.]/g, '-')
    .replace(/\/{2,}/g, '/')
    .replace(/^-+|-+$/g, '');

  return {
    finalMarkdown: output.replace(/<!---\s*FILENAME:\s*(.*?)\s*--->/gi, '').trim(),
    suggestedFilePath: safeCandidate || fallback,
  };
}

function normalizePublishPath(filePath) {
  const normalized = validateRequiredString(filePath, 'filePath', 180).replace(/\\/g, '/');
  const resolved = path.posix.normalize(normalized);

  if (resolved.startsWith('/') || resolved.startsWith('../') || resolved.includes('/../')) {
    throw badRequest('filePath must stay inside the configured content directory.');
  }

  if (!/^[a-zA-Z0-9/_\-.]+$/.test(resolved)) {
    throw badRequest('filePath contains unsupported characters.');
  }

  if (!resolved.endsWith('.md') && !resolved.endsWith('.mdx')) {
    throw badRequest('filePath must end with .md or .mdx.');
  }

  return resolved;
}

function ensureSkipCiMessage(commitMessage, filePath) {
  const baseMessage = commitMessage ? commitMessage.trim() : `Update ${filePath}`;
  const finalMessage = baseMessage || `Update ${filePath}`;
  const lowerMessage = finalMessage.toLowerCase();
  const hasSkipMarker = SKIP_CI_MARKERS.some(marker => lowerMessage.includes(marker));

  return hasSkipMarker ? finalMessage : `${finalMessage} [skip ci]`;
}

function createGitHubHeaders(token) {
  return {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'post_admin',
  };
}

async function pushToGitHub({ filePath, commitMessage, overwrite, markdown }) {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';
  const token = process.env.GITHUB_TOKEN;
  const fullPath = `${CONTENT_ROOT}/${filePath}`;
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${fullPath}`;
  const headers = createGitHubHeaders(token);

  let sha;
  try {
    const { data } = await axios.get(url, {
      headers,
      params: { ref: branch },
      timeout: API_TIMEOUT_MS,
    });
    sha = data.sha;
    if (sha && !overwrite) {
      throw conflict('File already exists on GitHub. Enable overwrite to replace it.');
    }
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }

    if (error.response && error.response.status !== 404) {
      throw error;
    }
  }

  const payload = {
    message: ensureSkipCiMessage(commitMessage, filePath),
    content: Buffer.from(markdown, 'utf8').toString('base64'),
    branch,
    ...(sha ? { sha } : {}),
  };

  const { data } = await axios.put(url, payload, { headers, timeout: API_TIMEOUT_MS });
  return data.content.html_url;
}

async function pushToGitee({ filePath, commitMessage, overwrite, markdown }) {
  const owner = process.env.GITEE_OWNER;
  const repo = process.env.GITEE_REPO;
  const branch = process.env.GITEE_BRANCH || 'master';
  const token = process.env.GITEE_TOKEN;

  if (!owner || !repo || !token) {
    throw badRequest('Gitee sync is enabled, but GITEE_OWNER, GITEE_REPO, or GITEE_TOKEN is missing.');
  }

  const fullPath = `${CONTENT_ROOT}/${filePath}`;
  const url = `https://gitee.com/api/v5/repos/${owner}/${repo}/contents/${fullPath}`;

  let sha;
  try {
    const { data } = await axios.get(url, {
      params: { access_token: token, ref: branch },
      timeout: API_TIMEOUT_MS,
    });
    sha = data.sha;
    if (sha && !overwrite) {
      throw conflict('File already exists on Gitee. Enable overwrite to replace it.');
    }
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }

    if (error.response && error.response.status !== 404) {
      throw error;
    }
  }

  const payload = {
    access_token: token,
    message: ensureSkipCiMessage(commitMessage, filePath),
    content: Buffer.from(markdown, 'utf8').toString('base64'),
    branch,
    ...(sha ? { sha } : {}),
  };

  const method = sha ? 'put' : 'post';
  await axios({ method, url, data: payload, timeout: API_TIMEOUT_MS });
  return `https://gitee.com/${owner}/${repo}/blob/${branch}/${fullPath}`;
}

function logAudit(event, details = {}) {
  const timestamp = new Date().toISOString();
  console.log(JSON.stringify({ timestamp, event, ...details }));
}

app.get('/api/health/', (req, res) => {
  res.json({
    ok: true,
    env: NODE_ENV,
    contentRoot: CONTENT_ROOT,
    time: new Date().toISOString(),
  });
});

app.get('/api/public-config/', (req, res) => {
  res.json({
    providers: getPublicProviderDefaults(),
  });
});

app.post('/api/login/', createLoginRateLimiter(), (req, res) => {
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (password !== ADMIN_PASSWORD) {
    recordFailedLogin(req);
    logAudit('login.failed', { ip: getClientIp(req) });
    return res.status(401).json({ error: 'Invalid password' });
  }

  clearLoginAttempts(req);
  const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '12h' });
  res.cookie('token', token, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'strict',
    path: '/',
    maxAge: 12 * 60 * 60 * 1000,
  });

  logAudit('login.succeeded', { ip: getClientIp(req) });
  res.json({ success: true });
});

app.post('/api/logout/', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'strict',
    path: '/',
  });

  res.json({ success: true });
});

app.get('/api/check-auth/', (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.json({ authenticated: false });
  }

  try {
    jwt.verify(token, JWT_SECRET);
    res.json({ authenticated: true });
  } catch (error) {
    res.json({ authenticated: false });
  }
});

app.post('/api/generate/', authenticate, async (req, res) => {
  try {
    const title = validateRequiredString(req.body.title, 'title', 160);
    const image = validateOptionalString(req.body.image, 'image', 500);
    const category = validateOptionalString(req.body.category, 'category', 80);
    const tags = validateOptionalString(req.body.tags, 'tags', 200);
    const keywords = validateOptionalString(req.body.keywords, 'keywords', 200);
    const draft = validateRequiredString(req.body.draft, 'draft', 10000);
    const targetLength = validateOptionalString(req.body.targetLength, 'targetLength', 40) || '1200-1800 words';
    const requestedModel = validateOptionalString(req.body.model, 'model', 80);
    const { apiKey, baseURL, model, providerKey } = resolveProvider(req.body.provider, requestedModel);
    const prompt = buildPrompt({
      title,
      image,
      category,
      tags,
      keywords,
      draft,
      targetLength,
      today: getTodayInShanghai(),
    });

    const openai = new OpenAI({ apiKey, baseURL, timeout: API_TIMEOUT_MS });
    const response = await openai.chat.completions.create({
      model,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    });

    const output = response.choices?.[0]?.message?.content;
    if (typeof output !== 'string' || !output.trim()) {
      throw new Error('Model returned empty content.');
    }

    const { finalMarkdown, suggestedFilePath } = extractFilename(output);
    logAudit('generate.succeeded', { provider: providerKey, model });
    res.json({ markdown: finalMarkdown, suggestedFilePath });
  } catch (error) {
    const statusCode = error.statusCode || error.response?.status || 500;
    logAudit('generate.failed', { error: error.message, statusCode });
    res.status(statusCode).json({ error: error.response?.data?.message || error.message });
  }
});

app.post('/api/publish/', authenticate, async (req, res) => {
  try {
    const filePath = normalizePublishPath(req.body.filePath);
    const commitMessage = validateOptionalString(req.body.commitMessage, 'commitMessage', 160);
    const markdown = validateMarkdown(req.body.markdown);
    const overwrite = Boolean(req.body.overwrite);
    const syncToGitHub = Boolean(req.body.syncToGitHub);
    const syncToGitee = Boolean(req.body.syncToGitee);

    if (!syncToGitHub && !syncToGitee) {
      throw badRequest('请至少选择一个发布目标（GitHub 或 Gitee）。');
    }

    const results = {};

    if (syncToGitHub) {
      results.github = await pushToGitHub({ filePath, commitMessage, overwrite, markdown });
    }

    if (syncToGitee) {
      results.gitee = await pushToGitee({ filePath, commitMessage, overwrite, markdown });
    }

    logAudit('publish.succeeded', { filePath, syncToGitee });
    res.json({ success: true, urls: results });
  } catch (error) {
    const statusCode = error.statusCode || error.response?.status || 500;
    logAudit('publish.failed', { error: error.message, statusCode });
    res.status(statusCode).json({ error: error.response?.data?.message || error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
