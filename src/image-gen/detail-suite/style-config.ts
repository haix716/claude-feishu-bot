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
    'luxury jewelry photography',
    'editorial style',
    'minimalist elegance',
    'Chinese artisan craftsmanship',
    'matte silver texture',
  ],
  lighting: 'soft diffused lighting with subtle side highlights, creating depth and dimension on silver surface',
  texture: 'matte brushed silver with hand-hammered texture, antique patina finish, visible artisan marks',
  tone: 'premium, understated luxury, cultural heritage, artisanal quality',
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
