# Claude 飞书助手 / Claude Feishu Bot

一个基于 Claude API 的飞书机器人，支持流式回复、多轮对话、卡片消息更新、多模态内容处理。

A Feishu/Lark bot powered by Claude API, with streaming responses, multi-turn conversation, card message updates, and multimodal content handling.

---

## 功能 / Features

### 基础功能
- 🤖 接收飞书文本消息，调用 Claude 生成回复
- 📡 WebSocket 长连接，无需公网 IP
- 💬 流式更新卡片消息（1s 节流）
- 🧠 每用户独立的多轮对话历史
- 🔄 `/clear` 命令清空对话
- 🔒 并发控制，同一用户同时只处理一条消息

### 多模态功能 (v1.2.0)
- 🖼️ 图片自动保存到飞书云盘 + AI 内容分析
- 🎵 音视频自动保存到飞书云盘
- 📄 二进制文件导入（xlsx/docx → 飞书文档，可读取内容）
- 🔗 飞书云文档链接自动解析（支持 docx/doc/wiki/sheets/base）
- 📁 群文件浏览与读取（「群文件」/「读文件 xxx」指令）

### 智能文件管理
- 📂 自动创建「机器人文件」文件夹结构（图片/音视频/文件 + 日期子目录）
- 🧠 Claude 意图理解：发图片后说「保存到 xxx」自动归档

---

## 项目结构 / Project Structure

```
src/
├── app.ts        # 入口：Lark WSClient + Express
├── config.ts     # 环境变量配置
├── lark.ts       # 飞书 API 封装（消息收发、云盘操作、文档读取）
├── claude.ts     # Claude/MiMo API 封装（流式对话 + 图片分析）
├── handler.ts    # 消息处理主逻辑（路由 + 对话 + 文件处理）
└── util.ts       # 工具函数（节流、卡片生成、链接解析）
```

## 快速开始 / Quick Start

### 1. 安装依赖 / Install

```bash
git clone https://github.com/haix716/claude-feishu-bot.git
cd claude-feishu-bot
npm install
```

### 2. 配置 / Configure

```bash
cp .env.example .env
```

编辑 `.env` 填入凭据 / Edit `.env` with your credentials:

```env
# 飞书应用凭据 / Feishu app credentials (https://open.feishu.cn/app)
APP_ID=cli_xxx
APP_SECRET=xxx
LARK_DOMAIN=https://open.feishu.cn

# Claude API / Model API (https://console.anthropic.com)
ANTHROPIC_API_KEY=sk-ant-xxx
ANTHROPIC_BASE_URL=https://api.anthropic.com
CLAUDE_MODEL=claude-sonnet-4-20250514

# 可选：图片分析模型（默认 mimo-v2.5-omni）
# MIMO_IMAGE_MODEL=mimo-v2.5-omni

# 可选：指定云盘文件夹 token（不配置则自动创建）
# DRIVE_FOLDER_TOKEN=xxx
```

### 3. 飞书应用配置 / Feishu App Setup

1. 在 [飞书开发者后台](https://open.feishu.cn/app) 创建自建应用
2. 启用机器人功能
3. 添加权限：
   - `im:message:send_as_bot` — 发送消息
   - `im:message:readonly` — 读取消息
   - `im:message.p2p_msg:readonly` — 读取私聊消息
   - `im:resource` — 获取消息中的图片/文件
   - `drive:drive` — 云盘文件读写
   - `docx:document:readonly` — 读取云文档
   - `wiki:wiki:readonly` — 读取知识库
4. 事件订阅 → 订阅方式 → 选择「使用长连接接收事件」
5. 添加事件：`im.message.receive_v1`
6. 发布应用

### 4. 启动 / Run

```bash
npm run dev     # 开发模式 / Development (ts-node)
npm run build   # 编译 / Build
npm start       # 生产模式 / Production
npm run lint    # 代码检查 / Lint
npm test        # 运行测试 / Test
```

启动后在飞书中找到你的 bot，发条消息即可。

After starting, find your bot in Feishu and send a message.

## 环境变量 / Environment Variables

| 变量 | 必填 | 说明 | 默认值 |
|------|------|------|--------|
| `APP_ID` | ✅ | 飞书应用 ID | — |
| `APP_SECRET` | ✅ | 飞书应用密钥 | — |
| `LARK_DOMAIN` | | 飞书 API 域名 | `https://open.feishu.cn` |
| `ANTHROPIC_API_KEY` | ✅ | Claude/MiMo API key | — |
| `ANTHROPIC_BASE_URL` | | API 地址 | `https://api.anthropic.com` |
| `CLAUDE_MODEL` | | 对话模型名 | `claude-sonnet-4-20250514` |
| `MIMO_IMAGE_MODEL` | | 图片分析模型 | `mimo-v2.5-omni` |
| `MAX_TURNS` | | 对话历史最大轮数 | `20` |
| `PORT` | | HTTP 端口 | `3000` |
| `DRIVE_FOLDER_TOKEN` | | 云盘文件夹 token（不配置则自动创建） | — |
| `NO_PROXY` | | 绕过代理的域名 | — |

## 使用方式 / Usage

| 指令 | 说明 |
|------|------|
| 发送任意文本 | 与 Claude 对话 |
| `/clear` | 清空对话历史 |
| 发送图片 | 自动保存到云盘 + AI 分析内容 |
| 发送音视频 | 自动保存到云盘 |
| 发送文件 (txt/pdf/docx/xlsx) | 读取内容并对话 |
| 粘贴飞书文档链接 | 自动读取文档内容 |
| `群文件` | 列出群聊文件 |
| `读文件 xxx` | 读取指定文件内容 |
| `保存到 xxx` | 保存待处理的图片到指定文件夹 |

## 技术栈 / Tech Stack

- **Runtime**: Node.js >= 20 + TypeScript
- **飞书 SDK**: [@larksuiteoapi/node-sdk](https://github.com/larksuite/node-sdk)
- **AI SDK**: [openai](https://github.com/openai/openai-node)（OpenAI 兼容格式，支持 MiMo/Claude）
- **测试**: Node.js 内置 test runner

## 开发方式 / Development Workflow

采用 Git Worktree + Claude Subagent 并行开发：

```
.claude/
├── plans/        # 开发计划
├── agents/       # 自定义 subagent
└── workflows/    # 工作流脚本

.trees/           # 并行开发的 worktree 目录（已 gitignore）
```

## License

MIT
