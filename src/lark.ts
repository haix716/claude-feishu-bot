import { Client, WSClient, withUserAccessToken } from '@larksuiteoapi/node-sdk';
import { config } from './config';
import { generateCard } from './util';

class LarkService {
  client: Client;
  wsClient: WSClient;

  constructor() {
    const opts = {
      appId: config.lark.appId,
      appSecret: config.lark.appSecret,
      domain: config.lark.domain,
    };
    this.client = new Client(opts);
    this.wsClient = new WSClient(opts);
  }

  /** OAuth 回调 URL */
  get callbackUrl() {
    return `http://localhost:${config.port}${config.lark.callbackPath}`;
  }

  /** OAuth 授权链接 */
  get authorizeUrl() {
    const endpoint = new URL(`${config.lark.domain}/open-apis/authen/v1/authorize`);
    endpoint.searchParams.append('client_id', config.lark.appId);
    endpoint.searchParams.append('redirect_uri', this.callbackUrl);
    endpoint.searchParams.append('scope', 'im:chat.members:read contact:user.base:readonly');
    return endpoint.toString();
  }

  /** 用授权码换取 user_access_token */
  async getUserAccessToken(code: string): Promise<{ access_token: string; expires_in: number; refresh_token: string } | null> {
    try {
      const resp = await fetch(`${config.lark.domain}/open-apis/authen/v2/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          client_id: config.lark.appId,
          client_secret: config.lark.appSecret,
          code,
          redirect_uri: this.callbackUrl,
        }),
      });
      const data = await resp.json() as any;
      if (data.access_token) return data;
    } catch (err) {
      console.error('getUserAccessToken failed:', err);
    }
    return null;
  }

  /** 用 user_access_token 获取用户信息 */
  async getUserInfoWithToken(userAccessToken: string): Promise<{ openId: string; name: string } | null> {
    try {
      const resp = await this.client.authen.userInfo.get({}, withUserAccessToken(userAccessToken));
      if (resp.code === 0 && resp.data) {
        return { openId: resp.data.open_id || '', name: resp.data.name || '' };
      }
    } catch (err) {
      console.error('getUserInfoWithToken failed:', err);
    }
    return null;
  }

  /** 发送卡片消息，返回 messageId */
  async sendCard(chatId: string, content: string): Promise<string> {
    const resp = await this.client.im.message.create({
      params: { receive_id_type: 'chat_id' },
      data: {
        receive_id: chatId,
        msg_type: 'interactive',
        content: JSON.stringify(generateCard(content)),
      },
    });
    if (resp.code !== 0) {
      throw new Error(`sendCard failed: ${resp.msg}`);
    }
    return resp.data?.message_id || '';
  }

  /** 更新已有卡片消息 */
  async updateCard(messageId: string, content: string): Promise<void> {
    const resp = await this.client.im.message.patch({
      path: { message_id: messageId },
      data: { content: JSON.stringify(generateCard(content)) },
    });
    if (resp.code !== 0) {
      console.error(`updateCard failed: ${resp.msg}`);
    }
  }

  /** 发送纯文本消息 */
  async sendText(chatId: string, text: string): Promise<void> {
    await this.client.im.message.create({
      params: { receive_id_type: 'chat_id' },
      data: {
        receive_id: chatId,
        msg_type: 'text',
        content: JSON.stringify({ text }),
      },
    });
  }

  /** 回复卡片消息（群聊用，引用原消息），返回 messageId */
  async replyCard(messageId: string, content: string): Promise<string> {
    const resp = await this.client.im.message.reply({
      path: { message_id: messageId },
      data: {
        msg_type: 'interactive',
        content: JSON.stringify(generateCard(content)),
      },
    });
    if (resp.code !== 0) {
      throw new Error(`replyCard failed: ${resp.msg}`);
    }
    return resp.data?.message_id || '';
  }

  /** 回复纯文本消息（群聊用，引用原消息） */
  async replyText(messageId: string, text: string): Promise<void> {
    await this.client.im.message.reply({
      path: { message_id: messageId },
      data: {
        msg_type: 'text',
        content: JSON.stringify({ text }),
      },
    });
  }

  /** 获取用户信息（昵称、头像） */
  async getUserInfo(userId: string): Promise<{ name: string; avatar: string } | null> {
    try {
      const resp = await this.client.contact.user.get({
        path: { user_id: userId },
        params: { user_id_type: 'open_id' },
      });
      if (resp.code === 0 && resp.data?.user) {
        return {
          name: resp.data.user.name || '未知用户',
          avatar: resp.data.user.avatar?.avatar_72 || '',
        };
      }
    } catch (err) {
      console.error('getUserInfo failed:', err);
    }
    return null;
  }

  /** 获取群信息（群名） */
  async getChatInfo(chatId: string): Promise<{ name: string } | null> {
    try {
      const resp = await this.client.im.chat.get({
        path: { chat_id: chatId },
      });
      if (resp.code === 0 && resp.data) {
        return { name: resp.data.name || '未命名群' };
      }
    } catch (err) {
      console.error('getChatInfo failed:', err);
    }
    return null;
  }

  /** 从群成员列表获取用户在群里的名字（nickname） */
  async getChatMemberName(chatId: string, userId: string, userAccessToken?: string): Promise<string | null> {
    try {
      const reqOpts = {
        path: { chat_id: chatId },
        params: { member_id_type: 'open_id' as const },
      };
      // 用 user_access_token 调用可获取用户视角下的显示名
      const resp = userAccessToken
        ? await this.client.im.chatMembers.get(reqOpts, withUserAccessToken(userAccessToken))
        : await this.client.im.chatMembers.get(reqOpts);
      if (resp.code === 0 && resp.data?.items) {
        const member = resp.data.items.find((m: any) => m.member_id === userId);
        if (member?.name) return member.name;
      }
    } catch (err) {
      console.error('getChatMemberName failed:', err);
    }
    return null;
  }

  /** 获取消息中的文件资源 */
  async getFileResource(messageId: string, fileKey: string): Promise<Buffer | null> {
    try {
      const resp = await this.client.im.messageResource.get({
        path: { message_id: messageId, file_key: fileKey },
        params: { type: 'file' },
      });
      // SDK 返回的是文件流，需要转为 Buffer
      if (resp && typeof resp === 'object' && 'pipe' in resp) {
        const chunks: Buffer[] = [];
        for await (const chunk of resp as any) {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        }
        return Buffer.concat(chunks);
      }
    } catch (err) {
      console.error('getFileResource failed:', err);
    }
    return null;
  }

  /** 获取消息详情（用于获取文件信息） */
  async getMessage(messageId: string): Promise<any | null> {
    try {
      const resp = await this.client.im.message.get({
        path: { message_id: messageId },
      });
      if (resp.code === 0) {
        return resp.data;
      }
    } catch (err) {
      console.error('getMessage failed:', err);
    }
    return null;
  }
}

export const larkService = new LarkService();
