import Anthropic from '@anthropic-ai/sdk';
import { config } from './config';

const client = new Anthropic({
  apiKey: config.claude.apiKey,
  baseURL: config.claude.baseURL,
});

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string | Anthropic.ContentBlockParam[];
}

export interface ChatContext {
  userName?: string;
  chatName?: string;
  chatType?: string;
}

/**
 * 调用 Claude API，返回流式响应的完整文本
 */
export async function streamClaude(
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  ctx?: ChatContext
): Promise<string> {
  // 构建系统提示词，包含上下文信息
  let system = '你是 Claude，一个由 Anthropic 开发的 AI 助手。请用中文回复。';

  if (ctx) {
    const parts = [];
    if (ctx.userName) parts.push(`当前用户：${ctx.userName}`);
    if (ctx.chatName) parts.push(`当前群聊：${ctx.chatName}`);
    if (ctx.chatType) parts.push(`聊天类型：${ctx.chatType === 'group' ? '群聊' : '私聊'}`);
    if (parts.length > 0) {
      system += '\n\n## 当前上下文\n' + parts.join('\n');
    }
  }

  const stream = client.messages.stream({
    model: config.claude.model,
    max_tokens: 4096,
    system,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
  });

  let fullText = '';

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      fullText += event.delta.text;
      onChunk(fullText);
    }
  }

  return fullText;
}
