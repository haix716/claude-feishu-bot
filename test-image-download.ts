import { larkService } from './src/lark';

/**
 * 测试图片下载功能
 *
 * 使用真实的 messageId 和 fileKey 测试 getResource 函数
 */

async function testImageDownload() {
  // 从日志中获取的真实数据
  const messageId = 'om_x100b6d279e80e054c3b44ac1970951a';
  const fileKey = 'img_v3_0212b_7f26d9eb-4de8-4693-8374-e52eb7f6208g';

  console.log('测试图片下载...');
  console.log(`messageId: ${messageId}`);
  console.log(`fileKey: ${fileKey}`);

  try {
    const buffer = await larkService.getResource(messageId, fileKey, 'image');
    if (buffer) {
      console.log(`✅ 下载成功，大小: ${buffer.length} bytes`);
    } else {
      console.log('❌ 下载失败，返回 null');
    }
  } catch (err) {
    console.error('❌ 下载异常:', err);
  }
}

// 运行测试
testImageDownload().catch(console.error);
