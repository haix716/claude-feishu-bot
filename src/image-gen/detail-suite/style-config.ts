/**
 * 品牌风格配置（银饰专用）
 *
 * 基于老铺黄金的视觉体系，适配银饰：
 * - 深色背景 + 银色主调
 * - 哑光质感 + 高级感
 * - 中国文化元素
 */

export interface BrandStyle {
  /** 品牌名 */
  brandName: string;
  /** 主色调 */
  primaryColor: string;
  /** 辅助色 */
  accentColor: string;
  /** 背景色 */
  bgColor: string;
  /** 风格关键词（英文，用于提示词） */
  styleKeywords: string[];
  /** 光影描述 */
  lighting: string;
  /** 质感描述 */
  texture: string;
  /** 品牌调性 */
  tone: string;
}

/** 银饰品牌风格 */
export const SILVER_STYLE: BrandStyle = {
  brandName: '银饰',
  primaryColor: 'silver, white gold',
  accentColor: 'deep blue, charcoal grey',
  bgColor: 'dark gradient background, deep charcoal to black',
  styleKeywords: [
    'commercial product photography',
    'photorealistic, 8K resolution, ultra-detailed',
    'sharp focus, high clarity',
  ],
  lighting: 'professional studio lighting with soft diffused light from light tent, controlled reflections on silver surface, rim light for edge separation',
  texture: 'matte brushed silver with hand-hammered texture, visible artisan craftsmanship marks',
  tone: 'premium, understated luxury, commercial catalog quality',
};

/** 相机参数（按图片类型） */
export const CAMERA_SPECS = {
  main: 'shot with 100mm macro lens at f/8 for complete sharpness, centered composition',
  angle: 'shot with 100mm macro lens at f/5.6, three-point lighting with key light from upper left',
  detail: 'shot with 100mm macro lens at f/4, shallow depth of field with selective focus',
  scene: 'shot with 85mm lens at f/2.8, shallow depth of field with bokeh background',
};

/** 风格提示词片段（所有图片共享） */
export function getStylePromptFragment(style: BrandStyle): string {
  return [
    ...style.styleKeywords,
    style.lighting,
    style.texture,
    `${style.bgColor}`,
    'high resolution, 4K, commercial quality',
  ].join(', ');
}
