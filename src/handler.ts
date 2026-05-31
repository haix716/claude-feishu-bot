import { larkService } from './lark';
import { streamClaude, ChatMessage } from './claude';
import { config } from './config';
import { pThrottle } from './util';

/** 每用户对话历史 */
const conversations = new Map<string, ChatMessage[]>();

/** 每用户并发锁 */
const running = new Map<string, boolean>();

/** 节流更新卡片（200ms 间隔） */
const throttledUpdate = pThrottle(
  (messageId: string, content: string) => larkService.updateCard(messageId, content),
  200
);

/**
 * 清理群聊中的 @mention 占位符
 * 群聊消息 content 中 bot 被 @ 的部分会变成 @_user_1 等占位符
 */
function stripAtMention(text: string): string {
  return text.replace(/@_user_\d+\s*/g, '').trim();
}

/**
 * 处理用户消息
 */
export async function handleMessage(
  userId: string,
  chatId: string,
  query: string,
  chatType: string = 'p2p',
  messageId: string = ''
): Promise<void> {
  // 群聊：清理 @mention
  if (chatType === 'group') {
    query = stripAtMention(query);
  }

  if (!query) return;

  // /clear 命令
  if (query.trim() === '/clear') {
    conversations.delete(userId);
    if (chatType === 'group' && messageId) {
      await larkService.replyText(messageId, '对话已清除 ✅');
    } else {
      await larkService.sendText(chatId, '对话已清除 ✅');
    }
    return;
  }

  // 并发检查
  if (running.get(userId)) {
    if (chatType === 'group' && messageId) {
      await larkService.replyText(messageId, '上一条回复还在生成中，请稍候...');
    } else {
      await larkService.sendText(chatId, '上一条回复还在生成中，请稍候...');
    }
    return;
  }

  // 获取或创建对话历史
  if (!conversations.has(userId)) {
    conversations.set(userId, []);
  }
  const history = conversations.get(userId)!;

  // 追加用户消息
  history.push({ role: 'user', content: query });

  // 裁剪历史（保留最近 N 轮）
  while (history.length > config.maxTurns * 2) {
    history.shift();
  }

  running.set(userId, true);

  try {
    // 群聊用 reply（引用原消息），私聊用 create（发新消息）
    let replyMessageId: string;
    if (chatType === 'group' && messageId) {
      replyMessageId = await larkService.replyCard(messageId, '思考中...');
    } else {
      replyMessageId = await larkService.sendCard(chatId, '思考中...');
    }

    // 调 Claude，流式更新卡片
    const fullText = await streamClaude(
      history,
      (text) => throttledUpdate(replyMessageId, text)
    );

    // 保存 assistant 回复
    history.push({ role: 'assistant', content: fullText });
  } catch (err) {
    console.error('Claude API error:', err);
    if (chatType === 'group' && messageId) {
      await larkService.replyText(messageId, `出错了: ${err instanceof Error ? err.message : String(err)}`);
    } else {
      await larkService.sendText(chatId, `出错了: ${err instanceof Error ? err.message : String(err)}`);
    }
  } finally {
    running.set(userId, false);
  }
}
