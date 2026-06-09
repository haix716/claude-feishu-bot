/**
 * 详情图套件编排器
 *
 * 两种模式：
 * 1. 有风格参考图：用参考图做 img2img（模板+换产品）
 * 2. 无风格参考图：用平台快捷指令 + 自定义提示词
 */

import { analyzeProduct } from './analyzer';
import { buildTemplatePrompts } from './prompts';
import { generateImage } from '../router';
import { LibTVProvider } from '../providers/libtv';
import {
  saveTemplate, loadTemplate,
  loadStyleReference, hasStyleReference,
} from './template-manager';
import type { DetailSuiteResult, DetailImageDef } from './types';

/** 进度回调 */
export type ProgressCallback = (current: number, total: number, name: string) => void;

/** 带超时的 Promise 包装 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} 超时（${ms / 1000}秒）`)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

/** 产品图定义 */
interface ProductImageJob {
  id: string;
  name: string;
  styleRefId: string;  // 对应的风格参考图 ID
  prompt: string;       // 无参考图时的降级提示词
}

/** 产品图任务列表 */
const PRODUCT_JOBS: ProductImageJob[] = [
  {
    id: 'main',
    name: '主图',
    styleRefId: 'main',
    prompt: '小红书产品主图, 居中构图, 深色渐变背景, 正面全貌, 专业棚拍, 超高清 8K',
  },
  {
    id: 'angle',
    name: '角度展示图',
    styleRefId: 'angle',
    prompt: '小红书产品角度图, 45度侧面展示, 深色渐变背景, 棚拍灯光, 超高清 8K',
  },
  {
    id: 'detail',
    name: '细节特写图',
    styleRefId: 'detail',
    prompt: '小红书产品细节图, 极致微距特写, 聚焦表面质感和工艺细节, 浅景深, 聚光灯, 超高清 8K',
  },
  {
    id: 'scene',
    name: '佩戴场景图',
    styleRefId: 'scene',
    prompt: '小红书穿搭博主风格, 简约女性佩戴, 自然窗光, 温暖氛围, 超高清 8K',
  },
];

/**
 * 生成完整的详情图套件
 */
export async function generateDetailSuite(
  imageBuffer: Buffer,
  onProgress?: ProgressCallback,
): Promise<DetailSuiteResult> {
  const TOTAL_STEPS = 8;
  let completed = 0;

  // 1. 分析产品
  onProgress?.(1, TOTAL_STEPS, '分析产品');
  console.log('[DetailSuite] 分析产品图片...');
  const base64Image = imageBuffer.toString('base64');
  const productInfo = await withTimeout(analyzeProduct(base64Image), 60000, '产品分析');
  console.log(`[DetailSuite] 产品: ${productInfo.category}, ${productInfo.material}, ${productInfo.style}`);
  completed++;

  const results: DetailSuiteResult['images'] = [];
  const libtv = new LibTVProvider();

  // 产品描述（用于提示词）
  const productDesc = [
    productInfo.material,
    productInfo.category,
    productInfo.craftsmanship !== 'polished silver' ? `with ${productInfo.craftsmanship}` : '',
    productInfo.designElements ? `featuring ${productInfo.designElements}` : '',
    `${productInfo.color} finish`,
  ].filter(Boolean).join(' ');

  // 2. 生成 4 张产品图
  const hasAnyStyleRef = PRODUCT_JOBS.some(j => hasStyleReference(j.styleRefId));

  if (hasAnyStyleRef) {
    // 模式 A：有风格参考图 → 用参考图做 img2img（模板+换产品）
    console.log('[DetailSuite] 使用风格参考图模式');

    for (const job of PRODUCT_JOBS) {
      onProgress?.(completed + 1, TOTAL_STEPS, job.name);

      const styleRef = loadStyleReference(job.styleRefId);
      if (styleRef) {
        console.log(`[DetailSuite] 用风格参考生成: ${job.name}`);
        try {
          // 用风格参考图做 img2img，提示词描述具体产品
          const prompt = `${productDesc}, ${job.prompt}, preserve exact composition and lighting from reference`;
          const result = await withTimeout(
            generateImage(styleRef, prompt, { mode: 'product' }),
            120000,
            job.name,
          );
          if (result.images.length > 0) {
            results.push({
              def: { id: job.id, name: job.name, prompt, isTemplate: false, aspectRatio: '1:1' },
              buffer: result.images[0],
            });
          }
          console.log(`[DetailSuite] ✅ ${job.name} 完成`);
        } catch (err) {
          console.error(`[DetailSuite] ❌ ${job.name} 失败:`, err);
        }
      } else {
        // 没有这个风格参考图，用用户原图 + 降级提示词
        console.log(`[DetailSuite] 无风格参考，用原图生成: ${job.name}`);
        try {
          const prompt = `Product photo of a ${productDesc}, ${job.prompt}`;
          const result = await withTimeout(
            generateImage(imageBuffer, prompt, { mode: 'product' }),
            120000,
            job.name,
          );
          if (result.images.length > 0) {
            results.push({
              def: { id: job.id, name: job.name, prompt, isTemplate: false, aspectRatio: '1:1' },
              buffer: result.images[0],
            });
          }
        } catch (err) {
          console.error(`[DetailSuite] ❌ ${job.name} 失败:`, err);
        }
      }
      completed++;
    }
  } else {
    // 模式 B：无风格参考图 → 用平台快捷指令
    console.log('[DetailSuite] 使用快捷指令模式（无风格参考图）');
    try {
      onProgress?.(completed + 1, TOTAL_STEPS, '产品三视图');
      const viewsResult = await withTimeout(
        libtv.generateWithShortcut(imageBuffer, 'product_turnaround_3view'),
        180000,
        '产品三视图',
      );
      const viewDefs: DetailImageDef[] = [
        { id: 'main', name: '主图', prompt: '', isTemplate: false, aspectRatio: '1:1' },
        { id: 'angle', name: '角度展示图', prompt: '', isTemplate: false, aspectRatio: '1:1' },
        { id: 'detail', name: '细节特写图', prompt: '', isTemplate: false, aspectRatio: '1:1' },
      ];
      for (let i = 0; i < Math.min(viewsResult.images.length, 3); i++) {
        results.push({ def: viewDefs[i], buffer: viewsResult.images[i] });
      }
      console.log(`[DetailSuite] ✅ 产品三视图完成`);
    } catch (err) {
      console.error('[DetailSuite] ❌ 产品三视图失败:', err);
    }
    completed += 3;

    // 场景图用自定义提示词
    onProgress?.(completed + 1, TOTAL_STEPS, '佩戴场景图');
    try {
      const scenePrompt = `小红书穿搭博主风格, ${productDesc} 佩戴效果, 简约女性, 自然窗光, 保留产品精确外观, 超高清 8K`;
      const sceneResult = await withTimeout(
        generateImage(imageBuffer, scenePrompt, { mode: 'product' }),
        120000,
        '佩戴场景图',
      );
      if (sceneResult.images.length > 0) {
        results.push({
          def: { id: 'scene', name: '佩戴场景图', prompt: scenePrompt, isTemplate: false, aspectRatio: '3:4' },
          buffer: sceneResult.images[0],
        });
      }
    } catch (err) {
      console.error('[DetailSuite] ❌ 佩戴场景图失败:', err);
    }
    completed++;
  }

  // 3. 模板图：检查缓存，没有则生成
  const templatePrompts = buildTemplatePrompts(productInfo);
  for (const def of templatePrompts) {
    onProgress?.(completed + 1, TOTAL_STEPS, def.name);

    const cached = loadTemplate(def.id);
    if (cached) {
      console.log(`[DetailSuite] 复用模板: ${def.name}`);
      results.push({ def, buffer: cached });
      completed++;
      continue;
    }

    console.log(`[DetailSuite] 生成模板: ${def.name}...`);
    try {
      const result = await withTimeout(
        generateImage(imageBuffer, def.prompt, { mode: 'product' }),
        120000,
        `模板-${def.name}`,
      );
      if (result.images.length > 0) {
        results.push({ def, buffer: result.images[0] });
        saveTemplate(def.id, result.images[0]);
      }
      console.log(`[DetailSuite] ✅ 模板 ${def.name} 完成`);
    } catch (err) {
      console.error(`[DetailSuite] ❌ 模板 ${def.name} 失败:`, err);
    }
    completed++;
  }

  // 按原始顺序排列
  const allDefs = PRODUCT_JOBS.map(j => ({ id: j.id })).concat(templatePrompts.map(d => ({ id: d.id })));
  const orderedResults = allDefs.map(def =>
    results.find(r => r.def.id === def.id)
  ).filter(Boolean) as DetailSuiteResult['images'];

  console.log(`[DetailSuite] 完成: ${orderedResults.length}/${TOTAL_STEPS} 张图片`);

  return {
    productInfo,
    images: orderedResults,
  };
}
