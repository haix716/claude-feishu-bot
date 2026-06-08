/**
 * 详情图套件编排器
 *
 * 协调分析、提示词生成、模板管理、并行生图的完整流程：
 * 1. 分析产品图片
 * 2. 生成 8 个提示词
 * 3. 检查模板缓存（4 个模板图）
 * 4. 并行生成 4 个产品图 + 从缓存加载/生成 4 个模板图
 * 5. 返回完整结果
 */

import { analyzeProduct } from './analyzer';
import { buildAllPrompts } from './prompts';
import { generateImage } from '../router';
import { saveTemplate, loadTemplate } from './template-manager';
import type { DetailSuiteResult } from './types';
import type { ImageGenIntent } from '../router';

/** 进度回调 */
export type ProgressCallback = (current: number, total: number, name: string) => void;

/**
 * 生成完整的详情图套件
 *
 * @param imageBuffer 用户上传的产品图片
 * @param onProgress 进度回调
 */
export async function generateDetailSuite(
  imageBuffer: Buffer,
  onProgress?: ProgressCallback,
): Promise<DetailSuiteResult> {
  // 1. 分析产品
  console.log('[DetailSuite] 分析产品图片...');
  const base64Image = imageBuffer.toString('base64');
  const productInfo = await analyzeProduct(base64Image);
  console.log(`[DetailSuite] 产品: ${productInfo.category}, ${productInfo.material}, ${productInfo.style}`);

  // 2. 生成所有提示词
  const allPrompts = buildAllPrompts(productInfo);
  const productPrompts = allPrompts.filter(p => !p.isTemplate);
  const templatePrompts = allPrompts.filter(p => p.isTemplate);

  // 3. 并行处理
  const results: DetailSuiteResult['images'] = [];
  let completed = 0;
  const total = allPrompts.length;

  // 并行生成产品图 + 处理模板图
  const tasks: Promise<void>[] = [];

  // 产品图：每次都重新生成
  for (const def of productPrompts) {
    tasks.push((async () => {
      onProgress?.(completed + 1, total, def.name);
      console.log(`[DetailSuite] 生成产品图: ${def.name}...`);

      const intent: ImageGenIntent = { mode: 'product' };
      const result = await generateImage(imageBuffer, def.prompt, intent);

      if (result.images.length > 0) {
        results.push({ def, buffer: result.images[0] });
      }
      completed++;
    })());
  }

  // 模板图：检查缓存，没有则生成
  for (const def of templatePrompts) {
    tasks.push((async () => {
      onProgress?.(completed + 1, total, def.name);

      // 检查缓存
      const cached = loadTemplate(def.id);
      if (cached) {
        console.log(`[DetailSuite] 复用模板: ${def.name}`);
        results.push({ def, buffer: cached });
        completed++;
        return;
      }

      // 缓存没有，生成并缓存
      console.log(`[DetailSuite] 生成模板: ${def.name}...`);
      const intent: ImageGenIntent = { mode: 'product' };
      const result = await generateImage(imageBuffer, def.prompt, intent);

      if (result.images.length > 0) {
        results.push({ def, buffer: result.images[0] });
        saveTemplate(def.id, result.images[0]);
      }
      completed++;
    })());
  }

  // 等待所有任务完成
  await Promise.all(tasks);

  // 按原始顺序排列
  const orderedResults = allPrompts.map(def =>
    results.find(r => r.def.id === def.id)
  ).filter(Boolean) as DetailSuiteResult['images'];

  console.log(`[DetailSuite] 完成: ${orderedResults.length}/${total} 张图片`);

  return {
    productInfo,
    images: orderedResults,
  };
}
