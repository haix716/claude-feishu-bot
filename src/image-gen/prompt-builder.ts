/**
 * 提示词模板库
 *
 * 根据不同场景和商品类型，生成高质量的英文提示词
 */

import type { GenerateMode, GenerateParams, ImageAnalysis } from './providers/provider';

/** 模特类型映射 */
const MODEL_TYPE_MAP: Record<string, string> = {
  asian_female: 'young Asian female model',
  asian_male: 'young Asian male model',
  western_female: 'Western female model',
  western_male: 'Western male model',
};

/**
 * 构建穿戴效果图提示词
 */
export function buildTryOnPrompt(analysis: ImageAnalysis, options?: { modelType?: string }): string {
  const modelDesc = MODEL_TYPE_MAP[options?.modelType || 'asian_female'] || MODEL_TYPE_MAP.asian_female;
  const { color, material, style } = analysis.attributes;

  const parts = [
    `${modelDesc} 穿着 ${color} ${material} ${analysis.category}`,
    `${style} 风格`,
    '自然体态, 真实穿着效果',
    '时尚穿搭摄影, 小红书穿搭博主风格',
    '柔和自然光, 全身照',
    '超高清, 4K, 面料质感清晰',
  ];

  return parts.join(', ');
}

/**
 * 构建商品主图提示词（白底）
 */
export function buildProductWhiteBgPrompt(analysis: ImageAnalysis): string {
  const { color, material } = analysis.attributes;

  const parts = [
    `产品摄影, ${color} ${material} ${analysis.category}`,
    '干净白色背景',
    '专业棚拍, 柔和阴影',
    '商业产品图, 居中构图',
    '超高清, 细节锐利, 4K',
  ];

  return parts.join(', ');
}

/**
 * 构建商品场景图提示词
 */
export function buildProductScenePrompt(analysis: ImageAnalysis, options?: { style?: string }): string {
  const { color, material, style } = analysis.attributes;
  const sceneStyle = options?.style || 'lifestyle';

  const sceneMap: Record<string, string> = {
    lifestyle: '现代家居桌面, 温暖自然光, 精致生活感',
    outdoor: '户外自然场景, 黄金时刻光线, 清新空气感',
    minimalist: '大理石台面, 极简美学, 柔和漫射光',
    luxury: '高端展示台, 戏剧性光影, 奢华品牌质感',
  };

  const scene = sceneMap[sceneStyle] || sceneMap.lifestyle;

  const parts = [
    `${color} ${material} ${analysis.category}, ${scene}`,
    `${style} 风格`,
    '生活方式产品摄影',
    '浅景深, 虚化背景',
    '超高清, 4K, 精致质感',
  ];

  return parts.join(', ');
}

/**
 * 构建小红书封面提示词
 */
export function buildCoverPrompt(analysis: ImageAnalysis, options?: { style?: string }): string {
  const { color, material } = analysis.attributes;
  const coverStyle = options?.style || 'aesthetic';

  const styleMap: Record<string, string> = {
    aesthetic: '精致生活感, 种草风格, 小红书爆款封面, 柔和暖色调, 精致摆拍',
    cute: '可爱少女风, 粉色系, 柔光梦幻, 日系清新',
    minimal: '极简高级感, 低饱和度, 干净留白, 现代审美',
    vibrant: '活力撞色, 吸睛构图, 潮流感, 视觉冲击',
  };

  const styleDesc = styleMap[coverStyle] || styleMap.aesthetic;

  const parts = [
    `精致产品摄影, ${color} ${material} ${analysis.category}`,
    styleDesc,
    '柔和自然光, 精致构图, 干净背景',
    '小红书封面风格, 种草感, 高级质感',
    '超高清, 4K, 商业级品质',
  ];

  return parts.join(', ');
}

/**
 * 根据模式自动构建提示词
 */
export function buildPrompt(
  analysis: ImageAnalysis,
  mode: GenerateMode,
  options?: GenerateParams['options']
): string {
  switch (mode) {
    case 'tryon':
      return buildTryOnPrompt(analysis, { modelType: options?.modelType });
    case 'product':
      if (options?.style === 'white_bg') {
        return buildProductWhiteBgPrompt(analysis);
      }
      return buildProductScenePrompt(analysis, { style: options?.style });
    case 'cover':
      return buildCoverPrompt(analysis, { style: options?.style });
    default:
      return analysis.suggestedPrompt;
  }
}

/** 默认反向提示词 */
export const DEFAULT_NEGATIVE_PROMPT =
  'blurry, low quality, distorted, deformed, ugly, bad anatomy, ' +
  'bad proportions, extra limbs, mutated, watermark, text, logo, signature';
