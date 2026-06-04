import { larkService } from './src/lark';
import { analyzeImage } from './src/ai';

/**
 * 测试图片处理功能
 *
 * 测试内容：
 * 1. 图片下载（getResource）
 * 2. 图片识别（analyzeImage）
 * 3. 文件名生成
 */

async function testImageDownload() {
  console.log('=== 测试图片下载 ===');

  // 使用真实的消息 ID 和 fileKey（从日志中获取）
  const messageId = 'om_x100b6d2045433c98c1b697b02ea2f4d';
  const fileKey = 'img_v3_0212b_b8587c32-7639-4d2a-9e86-8b5919db28eg';

  console.log(`messageId: ${messageId}`);
  console.log(`fileKey: ${fileKey}`);

  try {
    const buffer = await larkService.getResource(messageId, fileKey, 'image');
    if (buffer) {
      console.log(`✅ 下载成功，大小: ${buffer.length} bytes`);
      return buffer;
    } else {
      console.log('❌ 下载失败，返回 null');
      return null;
    }
  } catch (err) {
    console.error('❌ 下载异常:', err);
    return null;
  }
}

async function testImageAnalysis(buffer: Buffer) {
  console.log('\n=== 测试图片识别 ===');

  try {
    const base64Image = buffer.toString('base64');
    const result = await analyzeImage(base64Image);
    console.log(`✅ 识别成功`);
    console.log(`描述: ${result.description}`);
    console.log(`文件名: ${result.fileName}`);
    return result;
  } catch (err) {
    console.error('❌ 识别异常:', err);
    return null;
  }
}

async function testFileNameGeneration() {
  console.log('\n=== 测试文件名生成 ===');

  const now = new Date();
  const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

  const testCases = [
    { input: '这是一张风景照', expected: '风景照' },
    { input: '手机应用界面截图', expected: '手机应用界面截图' },
    { input: '足银珐琅花丝手工镯', expected: '足银珐琅花丝手工镯' },
    { input: '图片', expected: '图片' },
  ];

  for (const testCase of testCases) {
    // 简单的 sanitizeFileName 实现
    const sanitized = testCase.input
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 50);

    const fileName = `${timestamp}_${sanitized}.jpg`;
    console.log(`输入: "${testCase.input}" → 文件名: "${fileName}"`);
  }
}

async function main() {
  console.log('开始测试图片处理功能...\n');

  // 测试文件名生成
  await testFileNameGeneration();

  // 测试图片下载
  const buffer = await testImageDownload();
  if (!buffer) {
    console.log('\n图片下载失败，跳过后续测试');
    return;
  }

  // 测试图片识别
  await testImageAnalysis(buffer);

  console.log('\n测试完成！');
}

main().catch(console.error);
