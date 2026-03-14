require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { OpenAI } = require('openai');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Middleware for authentication
const authenticate = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid token' });
  }
};

// --- AUTH API ---
app.post('/api/login/', (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '1d' });
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

app.post('/api/logout/', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

app.get('/api/check-auth/', (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.json({ authenticated: false });
  try {
    jwt.verify(token, JWT_SECRET);
    res.json({ authenticated: true });
  } catch (err) {
    res.json({ authenticated: false });
  }
});

// --- GENERATE API ---
app.post('/api/generate/', authenticate, async (req, res) => {
  const { provider, model, title, image, category, tags, keywords, draft, targetLength } = req.body;
  
  let apiKey, baseURL;
  if (provider === 'deepseek') {
    apiKey = process.env.DEEPSEEK_API_KEY;
    baseURL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
  } else if (provider === 'glm') {
    apiKey = process.env.GLM_API_KEY; // Using Zhipu or equivalent
    baseURL = process.env.GLM_BASE_URL;
  } else if (provider === 'minimax') {
    apiKey = process.env.MINIMAX_API_KEY;
    baseURL = process.env.MINIMAX_BASE_URL;
  } else {
    // Default to openai keys fallback
    apiKey = process.env.OPENAI_API_KEY;
    baseURL = process.env.OPENAI_BASE_URL;
  }

  try {
    const openai = new OpenAI({ apiKey, baseURL });
    
    // Explicitly format date with zero-padding (YYYY-MM-DD)
    const now = new Date();
    const shanghaiDate = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    const today = shanghaiDate.replace(/\//g, '-');

    const prompt = `
请生成一篇 Markdown 格式的博客文章。
严格要求：仅输出 Markdown 纯文本，并在最顶部包含用 --- 包围的 yaml frontmatter。
必须严格按照我现有的博客 frontmatter 格式输出，绝不能遗漏。格式参考如下（请根据传入的内容直接替换，保持结构固定，如果为空则生成合适的文案）：

---
title: ${title}
published: ${today}
updated: ${today}
description: '${keywords || '在这里根据草稿生成一句简短的描述（description）摘要'}'
image: '${image || ''}'
tags: [${tags || '草稿相关标签'}]
category: '${category || '默认分类'}'
draft: false 
---

文章正文生成要求：
目标字数: ${targetLength}

草稿/指令/核心内容参考：
${draft}

此外，请为这篇文章生成一个能够概括文章内容的简短英文文件名（例如 "my-post.md"），并将其放在最终文章末尾的 HTML 注释中：<!--- FILENAME: xxx.md --->。
正文内容请确保排版美观、阅读体验佳。请根据草稿内容，将其扩写/润色为一篇符合目标字数要求的高质量文章，并适当使用 Markdown 语法（如提示块、加粗、引用、列表等）来让结构更清晰。
还可参考一下个性化的进阶markdown格式，
## GitHub Repository Cards
You can add dynamic cards that link to GitHub repositories, on page load, the repository information is pulled from the GitHub API. 

::github{repo="matsuzaka-yuki/Mizuki"}

Create a GitHub repository card with the code \`::github{repo="matsuzaka-yuki/Mizuki"}\`.

\`\`\`markdown
::github{repo="matsuzaka-yuki/Mizuki"}
\`\`\`

## Admonitions

Following types of admonitions are supported: \`note\` \`tip\` \`important\` \`warning\` \`caution\`

:::note
Highlights information that users should take into account, even when skimming.
:::

:::tip
Optional information to help a user be more successful.
:::

:::important
Crucial information necessary for users to succeed.
:::

:::warning
Critical content demanding immediate user attention due to potential risks.
:::

:::caution
Negative potential consequences of an action.
:::

### Basic Syntax

\`\`\`markdown
:::note
Highlights information that users should take into account, even when skimming.
:::

:::tip
Optional information to help a user be more successful.
:::
\`\`\`

### Custom Titles

The title of the admonition can be customized.

:::note[MY CUSTOM TITLE]
This is a note with a custom title.
:::

\`\`\`markdown
:::note[MY CUSTOM TITLE]
This is a note with a custom title.
:::
\`\`\`

### GitHub Syntax

> [!TIP]
> [The GitHub syntax](https://github.com/orgs/community/discussions/16925) is also supported.

\`\`\`markdown
> [!NOTE]
> The GitHub syntax is also supported.

> [!TIP]
> The GitHub syntax is also supported.
\`\`\`

### Spoiler

You can add spoilers to your text. The text also supports **Markdown** syntax.

The content :spoiler[is hidden **ayyy**]!

\`\`\`markdown
The content :spoiler[is hidden **ayyy**]!
\`\`\`
`;

    const response = await openai.chat.completions.create({
      model: model || process.env.OPENAI_MODEL || 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }]
    });

    const output = response.choices[0].message.content;
    const filenameMatch = output.match(/<!---\s*FILENAME:\s*(.*?)\s*--->/);
    let suggestedFilePath = 'new-post.md';
    if (filenameMatch) {
      suggestedFilePath = filenameMatch[1].trim();
    }
    
    // Clean up output to remove the filename marker
    const finalMarkdown = output.replace(/<!---\s*FILENAME:\s*(.*?)\s*--->/g, '').trim();

    res.json({ markdown: finalMarkdown, suggestedFilePath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- PUBLISH API ---
const pushToGitHub = async ({ filePath, commitMessage, overwrite, markdown }) => {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';
  const token = process.env.GITHUB_TOKEN;
  const fullPath = `src/content/posts/${filePath}`;
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${fullPath}`;

  const headers = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json'
  };

  let sha;
  try {
    const { data } = await axios.get(url, { headers, params: { ref: branch } });
    sha = data.sha;
    if (!overwrite) throw new Error('File already exists on GitHub and overwrite is false.');
  } catch (err) {
    if (err.response && err.response.status !== 404) {
      throw err;
    }
  }

  const payload = {
    message: commitMessage || `Update ${filePath}`,
    content: Buffer.from(markdown).toString('base64'),
    branch,
    ...(sha && { sha })
  };

  const { data } = await axios.put(url, payload, { headers });
  return data.content.html_url;
};

const pushToGitee = async ({ filePath, commitMessage, overwrite, markdown }) => {
  const owner = process.env.GITEE_OWNER;
  const repo = process.env.GITEE_REPO;
  const branch = process.env.GITEE_BRANCH || 'master';
  const token = process.env.GITEE_TOKEN;
  const fullPath = `src/content/posts/${filePath}`;
  const url = `https://gitee.com/api/v5/repos/${owner}/${repo}/contents/${fullPath}`;

  let sha;
  try {
    // Check if exists
    const { data } = await axios.get(url, { params: { access_token: token, ref: branch } });
    sha = data.sha;
    if (!overwrite) throw new Error('File already exists on Gitee and overwrite is false.');
  } catch (err) {
    if (err.response && err.response.status !== 404) {
      throw err;
    }
  }

  const payload = {
    access_token: token,
    message: commitMessage || `Update ${filePath}`,
    content: Buffer.from(markdown).toString('base64'),
    branch,
    ...(sha && { sha })
  };

  const method = sha ? 'put' : 'post';
  const { data } = await axios({ method, url, data: payload });
  // Gitee API difference parsing, URL might not be returned perfectly
  return `https://gitee.com/${owner}/${repo}/blob/${branch}/${fullPath}`;
};

app.post('/api/publish/', authenticate, async (req, res) => {
  const { filePath, commitMessage, overwrite, syncToGitee, markdown } = req.body;

  try {
    const results = {};
    results.github = await pushToGitHub({ filePath, commitMessage, overwrite, markdown });
    
    if (syncToGitee) {
      results.gitee = await pushToGitee({ filePath, commitMessage, overwrite, markdown });
    }
    
    res.json({ success: true, urls: results });
  } catch (error) {
    res.status(500).json({ error: error.response?.data?.message || error.message });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
