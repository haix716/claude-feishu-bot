# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目简介

Claude 助手飞书机器人。用户在飞书中发消息，机器人调用 Claude API 生成回复，流式更新卡片消息。

## 技术栈

- Node.js >= 20 + TypeScript
- `@larksuiteoapi/node-sdk` — 飞书 SDK（WebSocket 长连接）
- `@anthropic-ai/sdk` — Claude API（streaming）
- `dotenv` + `express`
- ESLint（`npx eslint src/`，0 error 才能 commit）

## 运行命令

```bash
npm install
cp .env.example .env   # 填入凭据
npm run dev             # 开发模式（ts-node）
npm run build           # 编译
npm start               # 生产模式
npm run lint            # 检查代码规范
```

代理环境下需加 `NO_PROXY=open.feishu.cn`。

## 架构

```
src/
├── app.ts        # 入口：Lark WSClient + Express
├── config.ts     # 环境变量配置
├── lark.ts       # 飞书消息收发封装
├── claude.ts     # Claude API streaming 封装
├── handler.ts    # 消息处理主逻辑（路由 + 对话管理）
└── util.ts       # 工具函数（节流、卡片生成）
```

核心流程：`用户消息 → handler → Claude stream → 流式更新飞书卡片`

## 环境变量

- `APP_ID` / `APP_SECRET` — 飞书应用凭据
- `LARK_DOMAIN` — 飞书 API 域名
- `ANTHROPIC_API_KEY` — Claude API key
- `ANTHROPIC_BASE_URL` — API 地址（支持第三方兼容服务）
- `CLAUDE_MODEL` — 模型名
- `MAX_TURNS` — 对话历史最大轮数
- `PORT` — HTTP 端口
- `NO_PROXY` — 绕过代理的域名

## 工作流规范

遵循全局 CLAUDE.md 的「讨论→确认→执行」流程：

1. **先停 bot** → 改代码 → 编译 + lint（0 error）→ 重启 bot
2. 等用户在飞书里测试确认功能正常
3. **用户明确确认后**再 commit → 敏感信息扫描 → push

### 任务大小判断
- **直接做**：单文件修改、小 bug 修复、明确的单步操作
- **先讨论**：多文件改动、新功能、有多种实现方案

### Commit 规范
- 格式：`<type>(<scope>): <description>`
- description 用英文，小写开头，不超过 72 字符
- 提交前必须 lint：`npx eslint src/`（0 error）
- push 前必须敏感信息扫描：`git diff --cached | grep -iE "token|key|secret|password|ghp_|sk-"`

### 安全规则
- 密钥、token、密码不进代码、不进 commit、不进日志
- API key 只存 `.env`（被 .gitignore 排除）
- 涉及 API key 的操作必须让晓燕文字确认

## 多 Agent 并行开发规范

当需要并行开发 3+ 个独立任务时，使用 Agent View + Background Sessions。

### 角色定义
- **PM（主 agent）**：需求分析、任务拆分、写 task brief、监控进度、合并交付
- **Developer（`.claude/agents/developer.md`）**：写代码、跑测试、提交
- **Reviewer（`.claude/agents/reviewer.md`）**：审查代码，只读不写

### 工作流程
1. PM 理解需求，拆分为独立任务
2. PM 为每个任务写 task brief（目标、当前代码、改动要求、验收标准）
3. 通过 `claude agents` 派发 developer agent 并行执行
4. Developer 完成后，自动 hooks 验证（lint + test）
5. PM review 代码，不合格打回
6. 合并分支，更新文档

### Task Brief 必须包含
- 一句话目标
- 具体改动哪个文件
- 不要动哪些文件（其他 agent 负责）
- 验收标准（lint 0 error、测试通过、功能正常）

### 质量门禁
- PreToolUse hook：敏感信息扫描
- PostToolUse hook：自动 lint
- SubagentStop hook：验证 agent 产出（lint + test + commit）

### 并行原则
- 独立任务并行，有依赖的串行
- 瓶颈任务优先启动
- 不要信任 agent 的产出，全部要验证
