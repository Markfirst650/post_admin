# post_admin

<p align="center">
<a href="README.md">简体中文</a> | <a href="README.en.md">English</a>
</p>

<p align="center">
An AI writing and publishing console for Markdown-first blog authors.
</p>

<p align="center">
From draft, to generation, to review, to publishing, everything stays in one page.
</p>

---

## Overview

post_admin is designed to compress a fragmented publishing flow into a single continuous action: talking to a model, organizing frontmatter, editing Markdown, deciding file names, and pushing content into your repository.

It is not a general CMS and does not try to replace your blog system. It is a focused console for producing and publishing Markdown content. In the current version, content is written to `src/content/posts/` by default, and commit messages are automatically appended with `[skip ci]`, which is a good fit for markdown-only updates that should not trigger extra workflows.

---

## What Changed in This Version

- Added light and dark theme switching with persistence
- Added Chinese and English UI switching
- Added KaTeX rendering in the Markdown preview
- Added one-click form reset after login
- Kept the immersive fullscreen split preview
- Supports GitHub publishing with optional Gitee sync

---

## Core Capabilities

- One-page flow for login, generate, edit, preview, and publish
- JWT Cookie-based authentication on the server side
- Admin-password login with login rate limiting
- Supports DeepSeek, OpenAI-compatible APIs, GLM, and MiniMax
- Forces generation output to Markdown body plus YAML frontmatter
- Extracts a suggested file name from the model output
- Supports overwriting same-name files
- Automatically appends `[skip ci]` to commit messages
- A good fit for Astro, Nuxt Content, VitePress, Hexo, and other Markdown-driven sites

---

## Page Features

- Login page: enter the admin password to enter the console
- Generation panel: fill in title, category, tags, keywords, target length, and draft instructions, then generate content with the model
- Editing panel: manually adjust Markdown, file path, and commit message
- Publishing panel: choose whether to sync to GitHub, sync to Gitee, or overwrite an existing file
- Preview panel: supports live rendering and fullscreen split preview

---

## Tech Stack

- Node.js 18+
- Express 4.x
- Vue 3 via CDN
- Tailwind CSS via CDN
- Axios
- Marked
- KaTeX
- OpenAI Node SDK

---

## Quick Start

### 1. Install Dependencies

Recommended:

```bash
pnpm install
```

Alternative:

```bash
npm install
```

### 2. Prepare Environment Variables

The repository includes a sample file at `.env.example`. Copy it first:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Then fill in your model provider and repository settings.

### 3. Start the Development Server

```bash
pnpm dev
```

or:

```bash
npm run dev
```

### 4. Start the Production Server

```bash
pnpm start
```

Default URL:

```text
http://localhost:3000
```

---

## Environment Variables

### Basic Settings

- `PORT`: service port, default `3000`
- `NODE_ENV`: runtime mode; cookies become secure in production
- `ADMIN_PASSWORD`: admin login password, at least 12 characters
- `JWT_SECRET`: JWT signing secret, at least 32 characters
- `COOKIE_SECURE`: force secure cookies over HTTPS only
- `TRUST_PROXY`: trust the reverse proxy
- `LOGIN_WINDOW_MS`: login rate-limit window, default `900000`
- `LOGIN_MAX_ATTEMPTS`: login rate-limit count, default `10`
- `API_TIMEOUT_MS`: timeout for model and publishing requests, default `30000`

### Content Settings

- `CONTENT_ROOT`: content root directory, default `src/content/posts`

### OpenAI-Compatible Settings

- `OPENAI_API_KEY`: OpenAI or OpenAI-compatible API key
- `OPENAI_BASE_URL`: OpenAI-compatible base URL, optional
- `OPENAI_MODEL`: default model name

### DeepSeek Settings

- `DEEPSEEK_API_KEY`: DeepSeek API key
- `DEEPSEEK_BASE_URL`: DeepSeek API base URL
- `DEEPSEEK_MODEL`: default model name

### GLM Settings

- `GLM_API_KEY`: GLM API key
- `GLM_BASE_URL`: GLM API base URL
- `GLM_MODEL`: default model name

### MiniMax Settings

- `MINIMAX_API_KEY`: MiniMax API key
- `MINIMAX_BASE_URL`: MiniMax API base URL
- `MINIMAX_MODEL`: default model name

### GitHub Publishing Settings

- `GITHUB_OWNER`: GitHub owner, user or organization
- `GITHUB_REPO`: target repository name
- `GITHUB_BRANCH`: target branch, default `main`
- `GITHUB_TOKEN`: token with content write permission

### Gitee Sync Settings

- `GITEE_OWNER`: Gitee owner, user or organization
- `GITEE_REPO`: target repository name
- `GITEE_BRANCH`: target branch, default `master`
- `GITEE_TOKEN`: Gitee access token

---

## API Routes

### Public Routes

- `GET /api/health/`: health check, returns runtime status and content root
- `GET /api/public-config/`: fetch public config and default provider values

### Auth Routes

- `POST /api/login/`: admin login
- `POST /api/logout/`: log out
- `GET /api/check-auth/`: check current authentication state

### Business Routes

- `POST /api/generate/`: generate Markdown content from the form data
- `POST /api/publish/`: publish to GitHub or sync to Gitee

`generate` and `publish` both require authentication.

---

## Publishing Flow

1. The admin enters the password and the server issues a JWT Cookie.
2. The user fills in title, tags, keywords, category, target length, and draft instructions.
3. The server builds a prompt and asks the model to return blog-ready Markdown.
4. The model returns content plus frontmatter, with a suggested file name appended.
5. The user performs final edits and decides whether to overwrite the file or sync to Gitee.
6. The server writes the content to `src/content/posts/` through the GitHub Contents API.
7. If sync is enabled, the same content is pushed to Gitee as well.

---

## Project Structure

```text
post_admin/
 public/
   index.html
   favicon.ico
 .env.example
 package.json
 pnpm-lock.yaml
 README.md
 README.en.md
 server.js
```

---

## Notes

What this project saves is not API calls. It saves context switches.

- No need to draft in a chat window and copy content back manually
- No need to rebuild frontmatter on every post
- No need to think about file naming again before publishing
- No need to worry about accidental full CI/CD runs for ordinary content updates


---

## Usage

### Step 1: Login

Use ADMIN_PASSWORD from .env.

### Step 2: Configure Generation Parameters

Fill in the left panel:

- provider and model
- article title
- cover image URL
- category, tags, keywords
- target length
- draft, key points, or writing instructions

Title is required.

### Step 3: Generate Markdown

After clicking the generate button, the server requests the model to:

- output plain Markdown only
- include YAML frontmatter at the top
- generate structured metadata from your input
- append a suggested filename at the end

The result is written directly into the right editor panel.

### Step 4: Review and Publish

Edit manually if needed, then set:

- final file path
- commit message
- overwrite option
- Gitee sync option

Click publish to push content into your repository.

---

## Prompt Optimization Guide (Match Your Blog Format)

If your blog has strict frontmatter and content structure requirements, the best strategy is to move those constraints into the prompt instead of fixing every article manually.

### 1. Define a Format Contract

List all fixed fields and rules, such as:

- title, published, updated, description
- whether image is required
- whether tags must be an array
- whether category is restricted
- default draft value

Write these as hard requirements, not suggestions.

### 2. Put a Frontmatter Template in the Prompt

Use a template like this and replace field names with your own:

```text
You are my blog writing assistant. Output plain Markdown only, with no explanations.

You must output YAML frontmatter at the very top using this exact format:
---
title: {TITLE}
published: {TODAY}
updated: {TODAY}
description: '{AUTO_SUMMARY}'
image: '{IMAGE_URL}'
tags: [{TAGS}]
category: '{CATEGORY}'
draft: false
---

Hard requirements:
1) Keep the field order unchanged.
2) Auto-fill missing values with reasonable defaults.
3) Use structured Markdown in the body (h2/h3, lists, quotes, highlights).
4) Append this marker at the end: <!--- FILENAME: english-file-name.md --->
```

### 3. Add Content Structure Instructions

If you want stable writing style, define the body skeleton:

- opening: background + reader pain points
- middle: 3 key ideas, each with an example
- ending: summary + actionable checklist

This greatly reduces style drift between runs.

### 4. Add Negative Constraints

Explicitly forbid common failures:

- do not print phrases like Here is your article
- do not wrap the entire article in a code block
- do not omit frontmatter
- do not add generic off-topic paragraphs

Clear constraints mean less rework.

### 5. Use a Two-Pass Generation Strategy

Recommended process:

1. First pass: outline + frontmatter draft only.
2. Second pass: full article after structure confirmation.

This gives better control than one-shot long generation.

### 6. Better Input Strategy

- title: specific and searchable
- keywords: keep it to 3-6 core terms
- draft: provide bullet points instead of large unstructured text
- targetLength: use a range (for example 1200-1800)

Input quality directly affects output quality.

### 7. Common Issues and Fixes

- Issue: tags generated as a string.
  Fix: add tags must be a YAML array.
- Issue: description is too long.
  Fix: limit it, e.g. description must be <= 80 Chinese characters or <= 160 English characters.
- Issue: heading levels are messy.
  Fix: specify body starts from h2 and no level skipping.

Once these fixes are written into your prompt, output quality becomes much more stable.

---

## Publishing Convention

Current default destination:

```text
src/content/posts/
```

This works best for blog systems that:

- are Markdown-driven
- support frontmatter
- keep a stable content directory layout

If your project uses a different content path, update the publish logic on the server side.

---

## Commit Strategy

The project checks whether your commit message already contains a skip-CI marker. If not, it appends [skip ci] automatically.

Recognized markers:

- [skip ci]
- [ci skip]
- [no ci]
- [skip actions]
- [actions skip]

For content repositories, this prevents unnecessary workflow runs.

---

## API Overview

### Auth APIs

- POST /api/login/: login
- POST /api/logout/: logout
- GET /api/check-auth/: check auth state

### Content APIs

- POST /api/generate/: generate Markdown content from model
- POST /api/publish/: publish to GitHub with optional Gitee sync

---

## Security Notes

- Current auth model is suitable for personal or small-team use
- Use strong values for ADMIN_PASSWORD and JWT_SECRET
- Do not commit .env to public repositories
- Use HTTPS and reverse proxy in production
- Grant GitHub/Gitee tokens only the minimum required permissions

---

## Who This Is For

- Independent developers using Markdown as content source
- Authors maintaining Astro/Nuxt Content/VitePress/Hexo style content sites
- Teams that want a stable workflow: AI draft + human review + one-click publish

---

## Roadmap

- .env validation before startup
- prompt template management and scenario presets
- publish history and operation logs
- auto-save for drafts
- frontmatter validation and Markdown quality checks
- customizable publish destination directory
- multi-user and fine-grained permission control

---

## License

This project is licensed under MIT. See LICENSE for details.
