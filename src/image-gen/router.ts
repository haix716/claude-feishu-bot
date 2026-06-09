/**
 * 图片生成路由器
 *
 * 根据分析结果和用户意图，选择合适的 Provider 和参数
 */

import { config } from '../config';
import type { ImageAnalysis, GenerateMode, GenerateParams, ImageProvider } from './providers/provider';
import { JimengProvider } from './providers/jimeng';
import { ReplicateProvider } from './providers/replicate';
import { LibTVProvider } from './providers/libtv';
import { ComfyUIProvider, isComfyAvailable } from './providers/comfyui';

/** 用户意图解析结果 */
export interface ImageGenIntent {
  mode: GenerateMode;
  style?: string;        // 风格选项
  modelType?: string;    // 模特类型（穿戴用）
  aspectRatio?: string;  // 宽高比
  numImages?: number;    // 生成数量
}

/** ComfyUI 可用性缓存 */
let comfyAvailable: boolean | null = null;

/** 初始化可用的 Provider */
async function getProviders(): Promise<ImageProvider[]> {
  const providers: ImageProvider[] = [];

  // ComfyUI（最高优先级，本地免费）
  if (comfyAvailable === null) {
    comfyAvailable = await isComfyAvailable();
  }
  if (comfyAvailable) {
    providers.push(new ComfyUIProvider());
  }

  // LibTV（VIP 可用）
  providers.push(new LibTVProvider());

  // 即梦（备用）
  providers.push(new JimengProvider());

  // Replicate（备用）
  if (config.imageGen.replicateApiToken) {
    providers.push(new ReplicateProvider());
  }

  return providers;
}

/**
 * 选择最佳 Provider
 *
 * 优先级：ComfyUI（本地免费）> LibTV > 即梦 > Replicate
 */
async function selectProvider(mode: GenerateMode): Promise<ImageProvider> {
  const providers = await getProviders();

  if (providers.length === 0) {
    throw new Error('没有可用的图片生成服务。请配置 libtv CLI、ComfyUI 或 REPLICATE_API_TOKEN。');
  }

  // ComfyUI 最高优先级（本地免费，无 API 费用）
  const comfy = providers.find(p => p.name === 'comfyui');
  if (comfy) return comfy;

  // LibTV 优先（VIP 可用，质量好）
  const libtv = providers.find(p => p.name === 'libtv');
  if (libtv) return libtv;

  // 穿戴效果图：优先 Replicate（有专门的 Try-On 模型）
  if (mode === 'tryon') {
    const replicate = providers.find(p => p.name === 'replicate');
    if (replicate) return replicate;
  }

  // 其他模式：即梦
  const jimeng = providers.find(p => p.name === 'jimeng');
  if (jimeng) return jimeng;

  // fallback
  return providers[0];
}

/**
 * 从用户文本中解析意图
 */
export function parseImageGenIntent(query: string, analysis: ImageAnalysis): ImageGenIntent {
  const q = query.toLowerCase();

  // 模式检测
  let mode: GenerateMode = analysis.suggestedMode;
  if (/穿戴|试穿|上身|真人|模特/.test(q)) {
    mode = 'tryon';
  } else if (/主图|白底|商品图|详情/.test(q)) {
    mode = 'product';
  } else if (/封面|小红书|海报/.test(q)) {
    mode = 'cover';
  }

  // 模特类型
  let modelType: string | undefined;
  if (/女模|女生|女性/.test(q)) modelType = 'asian_female';
  else if (/男模|男生|男性/.test(q)) modelType = 'asian_male';
  else if (/欧美|西方/.test(q)) {
    if (/女/.test(q)) modelType = 'western_female';
    else modelType = 'western_male';
  }

  // 风格
  let style: string | undefined;
  if (/白底|纯白/.test(q)) style = 'white_bg';
  else if (/场景|生活|家居/.test(q)) style = 'lifestyle';
  else if (/户外|自然/.test(q)) style = 'outdoor';
  else if (/简约|极简/.test(q)) style = 'minimalist';
  else if (/奢华|高端|高级/.test(q)) style = 'luxury';
  else if (/可爱|粉色|萌/.test(q)) style = 'cute';
  else if (/艺术|创意|独特/.test(q)) style = 'artistic';

  // 宽高比
  let aspectRatio: string | undefined;
  if (/1:1|正方形|方形/.test(q)) aspectRatio = '1:1';
  else if (/3:4|竖版/.test(q)) aspectRatio = '3:4';
  else if (/16:9|横版|宽屏/.test(q)) aspectRatio = '16:9';
  else if (/9:16|竖屏/.test(q)) aspectRatio = '9:16';

  // 数量
  let numImages: number | undefined;
  const numMatch = q.match(/(\d+)\s*[张个份]/);
  if (numMatch) numImages = Math.min(parseInt(numMatch[1]), 4);

  return { mode, style, modelType, aspectRatio, numImages };
}

/**
 * 构建生成参数
 */
export function buildGenerateParams(
  imageBuffer: Buffer,
  prompt: string,
  intent: ImageGenIntent,
): GenerateParams {
  return {
    referenceImage: imageBuffer,
    prompt,
    mode: intent.mode,
    options: {
      modelType: intent.modelType,
      aspectRatio: intent.aspectRatio,
      style: intent.style,
      numImages: intent.numImages,
    },
  };
}

/**
 * 生成图片（主入口）
 */
export async function generateImage(
  imageBuffer: Buffer,
  prompt: string,
  intent: ImageGenIntent,
): Promise<{ images: Buffer[]; provider: string }> {
  const provider = await selectProvider(intent.mode);
  const params = buildGenerateParams(imageBuffer, prompt, intent);

  console.log(`[ImageGen] 使用 ${provider.name} 生成，模式: ${intent.mode}`);

  const result = await provider.generateImage(params);

  return {
    images: result.images,
    provider: provider.name,
  };
}
