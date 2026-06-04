import { LarkChannel, NormalizedMessage } from '@larksuiteoapi/node-sdk';

/**
 * 批量图片处理器
 *
 * 收集一段时间内的多张图片，统一处理后回复一条消息
 */

interface PendingImage {
  message: NormalizedMessage;
  imageKey: string;
  timestamp: number;
}

type ImageHandler = (channel: LarkChannel, messages: NormalizedMessage[], imageKeys: string[]) => Promise<void>;

export class BatchImageProcessor {
  private pendingImages = new Map<string, PendingImage[]>();
  private timers = new Map<string, NodeJS.Timeout>();
  private handler: ImageHandler;
  private batchDelay: number; // 批量等待时间（毫秒）

  constructor(handler: ImageHandler, batchDelay: number = 3000) {
    this.handler = handler;
    this.batchDelay = batchDelay;
  }

  /**
   * 添加图片到批量队列
   */
  addImage(channel: LarkChannel, msg: NormalizedMessage, imageKey: string): void {
    const userId = msg.senderId;

    if (!this.pendingImages.has(userId)) {
      this.pendingImages.set(userId, []);
    }

    this.pendingImages.get(userId)!.push({
      message: msg,
      imageKey,
      timestamp: Date.now(),
    });

    // 重置定时器
    this.resetTimer(channel, userId);
  }

  /**
   * 重置用户的批量处理定时器
   */
  private resetTimer(channel: LarkChannel, userId: string): void {
    // 清除之前的定时器
    if (this.timers.has(userId)) {
      clearTimeout(this.timers.get(userId)!);
    }

    // 设置新的定时器
    const timer = setTimeout(async () => {
      await this.processBatch(channel, userId);
    }, this.batchDelay);

    this.timers.set(userId, timer);
  }

  /**
   * 处理用户的批量图片
   */
  private async processBatch(channel: LarkChannel, userId: string): Promise<void> {
    const images = this.pendingImages.get(userId);
    if (!images || images.length === 0) return;

    // 清除队列和定时器
    this.pendingImages.delete(userId);
    this.timers.delete(userId);

    try {
      const messages = images.map(img => img.message);
      const imageKeys = images.map(img => img.imageKey);
      await this.handler(channel, messages, imageKeys);
    } catch (err) {
      console.error(`[batch] 处理批量图片失败:`, err);
      // 发送错误消息
      try {
        await channel.send(userId, {
          text: `❌ 批量图片处理失败: ${err instanceof Error ? err.message : String(err)}`,
        });
      } catch (sendErr) {
        console.error(`[batch] 发送错误消息失败:`, sendErr);
      }
    }
  }

  /**
   * 获取待处理图片数量
   */
  getPendingCount(userId: string): number {
    return this.pendingImages.get(userId)?.length || 0;
  }
}
