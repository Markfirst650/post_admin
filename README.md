# post_admin

<p align="center">
<a href="README.md">简体中文</a> | <a href="README.en.md">English</a>
</p>

<p align="center">
一个面向 Markdown 博客作者的 AI 写作与发布后台。
</p>

<p align="center">
<img src="https://img.shields.io/badge/Node.js-18%2B-3c873a?style=flat-square" alt="Node.js">
<img src="https://img.shields.io/badge/Express-4.x-111111?style=flat-square" alt="Express">
<img src="https://img.shields.io/badge/Vue-3-42b883?style=flat-square" alt="Vue 3">
<img src="https://img.shields.io/badge/Tailwind_CSS-CDN-06b6d4?style=flat-square" alt="Tailwind CSS">
<img src="https://img.shields.io/badge/AI-OpenAI%20%7C%20DeepSeek%20%7C%20GLM%20%7C%20MiniMax-8b5cf6?style=flat-square" alt="AI Providers">
<img src="https://img.shields.io/badge/Content-Markdown-0f766e?style=flat-square" alt="Markdown">
</p>

<p align="center">
<a href="https://github.com/Markfirst650/post_admin/stargazers"><img src="https://img.shields.io/github/stars/Markfirst650/post_admin?style=flat-square" alt="GitHub stars"></a>
<a href="https://github.com/Markfirst650/post_admin/network/members"><img src="https://img.shields.io/github/forks/Markfirst650/post_admin?style=flat-square" alt="GitHub forks"></a>
<a href="https://github.com/Markfirst650/post_admin/issues"><img src="https://img.shields.io/github/issues/Markfirst650/post_admin?style=flat-square" alt="GitHub issues"></a>
<a href="https://github.com/Markfirst650/post_admin/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Markfirst650/post_admin?style=flat-square" alt="License"></a>
<a href="https://github.com/Markfirst650/post_admin/commits/main"><img src="https://img.shields.io/github/last-commit/Markfirst650/post_admin?style=flat-square" alt="Last commit"></a>
</p>

<p align="center">
从一个草稿开始，到一篇带 frontmatter 的 Markdown 文章，再到推送进内容仓库，整个链路收束在同一个页面里。
</p>

---

## 项目简介

post_admin 的目标很直接：把“和模型对话、整理 frontmatter、调整 Markdown、决定文件名、提交到内容仓库”这条原本分散的流程，压缩成一个连续动作。

它不是通用 CMS，也不是博客系统替代品，而是一个专注于 Markdown 内容生产和发布的管理台。当前版本默认将内容写入 `src/content/posts/`，并自动为提交信息追加 `[skip ci]`，适合只推送 md 内容、尽量不触发额外工作流的场景。

---

## 这版更新了什么

- 前端支持浅色 / 深色主题切换，并会记住上次选择
- 支持中英文界面切换，便于不同语言环境使用
- Markdown 预览支持 KaTeX 数学公式渲染
- 登录后可一键重置表单，快速开始新文章
- 保留了全屏双栏预览，方便编辑和对照检查
- 支持 GitHub 发布，并可选同步到 Gitee

---

## 核心能力

- 单页完成登录、生成、编辑、预览、发布
- 服务端基于 JWT Cookie 做鉴权
- 支持管理员密码登录，并带有登录限流
- 支持 `DeepSeek`、`OpenAI` 兼容接口、`GLM`、`MiniMax`
- 生成结果强制为 Markdown 正文 + YAML frontmatter
- 自动从模型输出中提取建议文件名
- 支持同名文件覆盖发布
- 自动为 commit message 追加 `[skip ci]`
- 适合 Astro、Nuxt Content、VitePress、Hexo 等 Markdown 驱动站点

---

## 页面功能

- 登录页：输入管理员密码后进入后台
- 生成区：填写标题、分类、标签、关键词、目标长度和草稿指令，提交后由模型生成内容
- 编辑区：手动修改 Markdown、文件路径和提交信息
- 发布区：选择是否同步到 GitHub、是否同步到 Gitee、是否覆盖同名文件
- 预览区：支持实时渲染和全屏双栏预览

---

## 技术栈

- Node.js 18+
- Express 4.x
- Vue 3（CDN 引入）
- Tailwind CSS（CDN 引入）
- Axios
- Marked
- KaTeX
- OpenAI Node SDK

---

## 快速开始

### 1. 安装依赖

推荐使用 pnpm：

```bash
pnpm install
```

也可以使用 npm：

```bash
npm install
```

### 2. 准备环境变量

仓库已经提供示例文件 `.env.example`。你可以先复制一份：

```bash
cp .env.example .env
```

Windows PowerShell 可以使用：

```powershell
Copy-Item .env.example .env
```

然后按自己的模型服务和仓库信息填写 `.env`。

### 3. 启动开发服务

```bash
pnpm dev
```

如果你使用 npm：

```bash
npm run dev
```

### 4. 启动生产服务

```bash
pnpm start
```

默认访问地址：

```text
http://localhost:3000
```

---

## 环境变量说明

### 基础配置

- `PORT`: 服务端口，默认 `3000`
- `NODE_ENV`: 运行环境，生产环境下 Cookie 会启用 `secure`
- `ADMIN_PASSWORD`: 管理后台登录密码，至少 12 个字符
- `JWT_SECRET`: JWT 签名密钥，至少 32 个字符
- `COOKIE_SECURE`: 是否强制仅在 HTTPS 下发送 Cookie
- `TRUST_PROXY`: 是否信任反向代理
- `LOGIN_WINDOW_MS`: 登录限流时间窗口，默认 900000
- `LOGIN_MAX_ATTEMPTS`: 登录限流次数，默认 10
- `API_TIMEOUT_MS`: 模型和发布接口超时时间，默认 30000

### 内容配置

- `CONTENT_ROOT`: 发布内容根目录，默认 `src/content/posts`

### OpenAI 兼容配置

- `OPENAI_API_KEY`: OpenAI 或兼容接口密钥
- `OPENAI_BASE_URL`: OpenAI 兼容接口地址，可留空
- `OPENAI_MODEL`: 默认模型名

### DeepSeek 配置

- `DEEPSEEK_API_KEY`: DeepSeek 密钥
- `DEEPSEEK_BASE_URL`: DeepSeek 接口地址
- `DEEPSEEK_MODEL`: 默认模型名

### GLM 配置

- `GLM_API_KEY`: GLM 密钥
- `GLM_BASE_URL`: GLM 接口地址
- `GLM_MODEL`: 默认模型名

### MiniMax 配置

- `MINIMAX_API_KEY`: MiniMax 密钥
- `MINIMAX_BASE_URL`: MiniMax 接口地址
- `MINIMAX_MODEL`: 默认模型名

### GitHub 发布配置

- `GITHUB_OWNER`: GitHub 用户名或组织名
- `GITHUB_REPO`: 目标仓库名
- `GITHUB_BRANCH`: 目标分支，默认 `main`
- `GITHUB_TOKEN`: 具有内容写入权限的 Token

### Gitee 同步配置

- `GITEE_OWNER`: Gitee 用户名或组织名
- `GITEE_REPO`: 目标仓库名
- `GITEE_BRANCH`: 目标分支，默认 `master`
- `GITEE_TOKEN`: Gitee 访问令牌

---

## 接口说明

### 公开接口

- `GET /api/health/`: 健康检查，返回运行状态和内容根目录
- `GET /api/public-config/`: 获取公开配置和模型默认值

### 认证接口

- `POST /api/login/`: 管理员登录
- `POST /api/logout/`: 退出登录
- `GET /api/check-auth/`: 检查当前登录状态

### 业务接口

- `POST /api/generate/`: 根据表单信息生成 Markdown 内容
- `POST /api/publish/`: 将内容发布到 GitHub，或同步到 Gitee

其中 `generate` 和 `publish` 都需要先登录。

---

## 发布流程

1. 管理员输入后台密码，服务端验证后下发 JWT Cookie。
2. 用户填写标题、标签、关键词、分类、目标字数和草稿内容。
3. 服务端根据表单内容构造 Prompt，请模型返回符合博客规范的 Markdown。
4. 模型输出正文、frontmatter，并在尾部附带建议文件名。
5. 用户在编辑区进行最终校对，并决定是否覆盖同名文件、是否同步 Gitee。
6. 服务端通过 GitHub Contents API 写入 `src/content/posts/`。
7. 如果启用同步，则继续把同一份内容推送到 Gitee。

---

## 项目结构

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

## 说明

这个项目节省的不是模型调用次数，而是上下文切换。

- 不需要先在聊天窗口生成初稿，再手动复制回编辑器
- 不需要每次都重复整理 frontmatter
- 不需要在发布前再临时想文件名
- 不需要担心普通内容更新误触发整条 CI/CD 流程

如果你接下来要继续调整文案，我也可以再补一版更偏“项目介绍页”风格的 README，或者顺手写英文版。

## 使用指南

### 第 1 步：登录后台

使用 `.env` 中配置的 `ADMIN_PASSWORD` 登录。

### 第 2 步：配置生成参数

在左侧面板中填写：

- Provider 与 Model
- 文章标题
- 封面图链接
- 分类、标签、关键词
- 目标篇幅
- 草稿、要点或写作指令

其中标题为必填项。

### 第 3 步：生成 Markdown

点击智能生成 Markdown后，服务端会要求模型：

- 仅输出 Markdown 纯文本
- 在顶部输出 YAML frontmatter
- 基于你的输入自动生成描述和结构化元信息
- 在结尾给出建议文件名

生成后的结果会直接写入右侧编辑器。

### 第 4 步：复查并发布

你可以继续手动修改内容，然后填写：

- 最终文件路径
- 提交信息
- 是否覆盖同名文件
- 是否同步到 Gitee

确认后点击发布按钮，即可把文章推送到内容仓库。

---

## 提示词优化教程（按你的博客格式定制）

如果你的博客 frontmatter 字段和正文结构有固定规范，最有效的做法不是不断手动改稿，而是把规范前置到 Prompt。

### 1. 先定义你的格式契约

建议先整理一份你博客文章的固定字段和约束，例如：

- `title`、`published`、`updated`、`description`
- `image` 是否必填
- `tags` 是否必须数组
- `category` 是否限定取值
- `draft` 默认值

把它们写成必须遵守的规则，而不是尽量参考。

### 2. 把 frontmatter 模板写进 Prompt

下面是一个可直接改造的模板（把字段名改成你的博客实际格式）：

```text
你是我的博客写作助手。请严格输出 Markdown 纯文本，不要输出任何解释。

必须在最顶部输出 YAML frontmatter，格式如下：
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

硬性要求：
1) frontmatter 字段顺序不能变。
2) 缺失信息请你自动补齐合理值。
3) 正文必须使用 Markdown 结构化输出（h2/h3、列表、引用、重点块）。
4) 文末追加：<!--- FILENAME: english-file-name.md --->
```

### 3. 加上内容结构指令

如果你希望文章风格稳定，建议再明确正文骨架，比如：

- 开头：背景 + 读者痛点
- 中段：3 个核心观点，每个观点给示例
- 结尾：总结 + 可执行清单

这会显著降低同样参数，每次结构完全不同的问题。

### 4. 用反例约束减少跑偏

你可以在 Prompt 里明确禁止项：

- 不要输出以下是文章内容这类解释句
- 不要输出代码块包裹整个 Markdown
- 不要省略 frontmatter
- 不要出现与主题无关的泛化段落

规则越清楚，返工越少。

### 5. 用两段式迭代提高质量

推荐流程：

1. 第一轮只生成提纲 + frontmatter 草案。
2. 你确认结构后，第二轮再生成完整正文。

相比一次性出全文，这种方式更稳，也更容易控制文章调性。

### 6. 建议的参数输入策略

- `title`: 具体、可检索，不要太抽象
- `keywords`: 3 到 6 个核心关键词即可
- `draft`: 提供要点而非大段堆叠
- `targetLength`: 用区间更好（例如 `1200-1800`）

这些输入质量直接决定生成上限。

### 7. 常见问题与修复

- 问题：`tags` 输出成字符串而不是数组。
  修复：在 Prompt 中补一句tags 必须是 YAML 数组。
- 问题：`description` 太长。
  修复：增加限制description 不超过 80 字。
- 问题：标题层级混乱。
  修复：明确正文从二级标题开始，禁止跳级。

把这些修复沉淀进 Prompt 后，后续每次生成都会更稳定。

---

## 发布约定

当前版本默认把文章写入：

```text
src/content/posts/
```

因此它更适合以下类型的博客系统：

- 基于 Markdown 文件驱动内容
- 支持 frontmatter
- 内容目录结构稳定

如果你的博客目录并不是这个路径，可以按需调整服务端发布逻辑。

---

## 提交策略

项目会自动检查提交信息中是否已包含跳过 CI 的标记。如果没有，会自动追加 `[skip ci]`。

当前识别这些标记：

- `[skip ci]`
- `[ci skip]`
- `[no ci]`
- `[skip actions]`
- `[actions skip]`

这个细节对内容仓库尤其重要，因为一次普通的文章更新并不一定值得触发完整工作流。

---

## 接口概览

### 鉴权接口

- `POST /api/login/`: 登录
- `POST /api/logout/`: 退出登录
- `GET /api/check-auth/`: 检查当前登录状态

### 内容接口

- `POST /api/generate/`: 调用模型生成 Markdown 内容
- `POST /api/publish/`: 发布到 GitHub，并可选同步到 Gitee

---

## 安全说明

- 当前鉴权模型适合个人或小范围团队自用
- 请为 `ADMIN_PASSWORD` 和 `JWT_SECRET` 使用强值
- 不要将 `.env` 提交到公开仓库
- 生产环境建议放在 HTTPS 和反向代理之后
- GitHub/Gitee Token 只授予必要权限

---

## 适用人群

- 使用 Markdown 作为内容源的独立开发者
- 维护 Astro、Nuxt Content、VitePress、Hexo 等内容型站点的作者
- 希望把AI 起草 + 人工校稿 + 一键入库串成稳定工作流的人

---

## 迭代路线

- 增加 `.env` 校验与启动前检查
- 增加 prompt 模板管理和写作场景预设
- 增加发布历史和操作日志
- 增加文章草稿自动保存
- 增加 frontmatter 校验和 Markdown 质量检查
- 增加自定义目标发布目录
- 增加多用户与细粒度权限控制

---

## 开源协议

本项目使用 MIT License，详见 `LICENSE` 文件。
