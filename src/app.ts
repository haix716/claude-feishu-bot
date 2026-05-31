import express from 'express';
import * as Lark from '@larksuiteoapi/node-sdk';
import { config } from './config';
import { larkService } from './lark';
import { handleMessage, handleFileEvent, storeUserToken } from './handler';

console.log('🚀 Claude 飞书助手启动中...');

// 注册事件处理器
const eventDispatcher = new Lark.EventDispatcher({}).register({
  'im.message.receive_v1': (event) => {
    (async () => {
      try {
        const userId = event.sender?.sender_id?.open_id || '';
        const chatId = event.message.chat_id || '';
        const chatType = event.message?.chat_type || 'p2p';
        const messageId = event.message?.message_id || '';
        const messageType = event.message?.message_type || '';

        if (messageType === 'text') {
          // 文本消息
          let query = '';
          try {
            query = JSON.parse(event.message.content).text?.trim() || '';
          } catch {
            query = '';
          }
          if (!query) return;
          console.log(`[${chatType}] [${userId}] ${query}`);
          await handleMessage(userId, chatId, query, chatType, messageId);

        } else if (messageType === 'file') {
          // 文件消息
          let fileName = '';
          try {
            fileName = JSON.parse(event.message.content).file_name || '未知文件';
          } catch {
            fileName = '未知文件';
          }
          console.log(`[${chatType}] [${userId}] 📎 ${fileName}`);
          await handleFileEvent(userId, chatId, chatType, messageId, fileName);

        } else {
          // 其他类型
          if (chatType === 'group' && messageId) {
            await larkService.replyText(messageId, '目前支持文本消息和文件，请发送文字或附件');
          } else {
            await larkService.sendText(chatId, '目前支持文本消息和文件，请发送文字或附件');
          }
        }
      } catch (err) {
        console.error('[event handler error]', err);
      }
    })();
  },
});

// Express
const app = express();

// OAuth 回调路由
app.get(config.lark.callbackPath, async (req, res) => {
  try {
    const code = req.query.code as string;
    if (!code) {
      res.status(400).end('缺少授权码');
      return;
    }

    const tokenResp = await larkService.getUserAccessToken(code);
    if (!tokenResp) {
      res.status(500).end('获取 token 失败');
      return;
    }

    const userInfo = await larkService.getUserInfoWithToken(tokenResp.access_token);
    if (!userInfo?.openId) {
      res.status(500).end('获取用户信息失败');
      return;
    }

    storeUserToken(userInfo.openId, tokenResp.access_token);
    res.send(`<h2>✅ 登录成功</h2><p>你好 ${userInfo.name}，可以关闭此页面回到飞书继续对话。</p>`);
  } catch (err) {
    console.error('[OAuth callback error]', err);
    res.status(500).end('授权回调处理失败');
  }
});

app.listen(config.port, () => {
  console.log(`📡 HTTP 服务已启动: http://localhost:${config.port}`);
});

// WebSocket 长连接
larkService.wsClient.start({ eventDispatcher });
console.log('✅ WebSocket 长连接已建立，等待消息...');
