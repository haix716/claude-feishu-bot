import { getFileExtension, getImportTargetType } from '../util';
import { handleTextMessage } from './conversation';
import { handleImageMessage, handlePendingImageResponse, handlePendingImageEditResponse } from './image';
import { handleMediaMessage, handleFileEvent, handleBinaryFile } from './file';
import type { LarkChannel, NormalizedMessage } from '@larksuiteoapi/node-sdk';

/**
 * 处理用户消息（统一入口）
 */
export async function handleMessage(
  channel: LarkChannel,
  msg: NormalizedMessage
): Promise<void> {
  const userId = msg.senderId;

  // 根据消息类型分发
  const imageResource = msg.resources.find((r) => r.type === 'image');
  const audioResource = msg.resources.find((r) => r.type === 'audio');
  const videoResource = msg.resources.find((r) => r.type === 'video');
  const fileResource = msg.resources.find((r) => r.type === 'file');

  console.log(`[${userId}] 资源类型: image=${!!imageResource}, audio=${!!audioResource}, video=${!!videoResource}, file=${!!fileResource}`);
  if (fileResource) {
    console.log(`[${userId}] 文件名: ${fileResource.fileName}`);
  }

  if (imageResource) {
    await handleImageMessage(channel, msg, imageResource.fileKey);
    return;
  }
  if (audioResource || videoResource) {
    const media = audioResource || videoResource!;
    await handleMediaMessage(channel, msg, media.fileName || 'media', media.fileKey);
    return;
  }
  if (fileResource) {
    const fileName = fileResource.fileName || 'file';
    const ext = getFileExtension(fileName);
    if (getImportTargetType(ext)) {
      await handleBinaryFile(channel, msg, fileName);
    } else {
      await handleFileEvent(channel, msg, fileName);
    }
    return;
  }

  // 文本消息：检查是否有待处理的图片状态
  let query = msg.content;
  if (typeof query !== 'string') return;

  // 群聊：清理 @mention
  if (msg.chatType === 'group') {
    query = query.replace(/@_user_\d+\s*/g, '').trim();
  }

  if (!query) return;

  // 待保存图片响应
  const handledPending = await handlePendingImageResponse(channel, msg, query);
  if (handledPending) return;

  // 待编辑图片响应
  const handledEdit = await handlePendingImageEditResponse(channel, msg, query);
  if (handledEdit) return;

  // 普通文本消息
  await handleTextMessage(channel, msg);
}
