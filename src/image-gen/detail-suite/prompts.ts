/**
 * 提示词生成器
 *
 * 生成 8 个详情图的提示词：
 * - 4 个产品特定图（每次根据产品生成）
 * - 4 个品牌模板图（风格固定，内容根据产品微调）
 */

import { SILVER_STYLE, getStylePromptFragment } from './style-config';
import type { ProductInfo, DetailImageDef } from './types';

const style = getStylePromptFragment(SILVER_STYLE);

/**
 * 生成产品特定的 4 个提示词
 */
export function buildProductPrompts(product: ProductInfo): DetailImageDef[] {
  const desc = product.englishDescription;
  const craft = product.craftsmanship;
  const design = product.designElements;
  const cat = product.category;

  return [
    {
      id: 'main',
      name: '主图',
      prompt: [
        `Product hero shot of a ${desc}`,
        `centered composition on ${SILVER_STYLE.bgColor}`,
        `front-facing, full product view`,
        style,
      ].join(', '),
      isTemplate: false,
      aspectRatio: '1:1',
    },
    {
      id: 'angle',
      name: '角度展示图',
      prompt: [
        `Three-quarter angle view of a ${desc}`,
        `showing depth, dimension, and silhouette`,
        `${craft} surface details visible from this angle`,
        `subtle shadow on ${SILVER_STYLE.bgColor}`,
        style,
      ].join(', '),
      isTemplate: false,
      aspectRatio: '1:1',
    },
    {
      id: 'detail',
      name: '细节特写图',
      prompt: [
        `Extreme close-up macro shot of a ${desc}`,
        `focusing on ${craft} surface texture and ${design} patterns`,
        `visible hand-hammered marks, artisan craftsmanship details`,
        `shallow depth of field, soft bokeh background`,
        style,
      ].join(', '),
      isTemplate: false,
      aspectRatio: '1:1',
    },
    {
      id: 'scene',
      name: '佩戴场景图',
      prompt: [
        `Lifestyle editorial photo of a ${desc} being worn`,
        `elegant woman with minimalist styling`,
        `soft natural lighting, magazine-quality photography`,
        `Chinese aesthetic, understated luxury atmosphere`,
        `wearing the ${cat} as the focal point`,
        style,
      ].join(', '),
      isTemplate: false,
      aspectRatio: '3:4',
    },
  ];
}

/**
 * 生成品牌模板的 4 个提示词
 * 风格固定，内容根据产品品类微调
 */
export function buildTemplatePrompts(product: ProductInfo): DetailImageDef[] {
  const cat = product.category;
  const meaning = product.culturalMeaning || '吉祥如意';
  const design = product.designElements || '传统纹样';

  return [
    {
      id: 'specs',
      name: '尺寸规格图',
      prompt: [
        `Product specification illustration for a silver ${cat}`,
        `precise dimensional annotations with elegant thin lines`,
        `showing length, width, thickness measurements`,
        `clean dark background, minimalist technical drawing style`,
        `silver ${cat} silhouette with measurement lines`,
        `professional product specification layout`,
        style,
      ].join(', '),
      isTemplate: true,
      aspectRatio: '1:1',
    },
    {
      id: 'culture',
      name: '文化寓意图',
      prompt: [
        `Chinese cultural story illustration for silver ${cat}`,
        `theme: "${meaning}" (traditional Chinese blessing)`,
        `design elements: ${design} patterns`,
        `traditional Chinese aesthetic with modern luxury execution`,
        `dark background with silver and deep blue accents`,
        `elegant calligraphy-style text elements`,
        `circular emblem or motif incorporating ${design}`,
        `cultural heritage storytelling through visual design`,
        style,
      ].join(', '),
      isTemplate: true,
      aspectRatio: '1:1',
    },
    {
      id: 'packaging',
      name: '包装展示图',
      prompt: [
        `Luxury jewelry packaging photography`,
        `dark navy blue velvet gift box with silver embossed logo`,
        `silk-lined interior holding a silver ${cat}`,
        `brand certificate card and care instructions`,
        `premium shopping bag with ribbon handle`,
        `dark gradient background, soft studio lighting`,
        `unboxing ceremony atmosphere, gifting presentation`,
        style,
      ].join(', '),
      isTemplate: true,
      aspectRatio: '1:1',
    },
    {
      id: 'brand',
      name: '品牌故事图',
      prompt: [
        `Brand heritage story illustration for artisan silver jewelry`,
        `traditional Chinese silversmithing craftsmanship showcase`,
        `ancient workshop scene with artisan tools: hammer, anvil, chisel`,
        `journey from raw silver to finished ${cat}`,
        `cultural motifs: ${design} as design lineage`,
        `dark background, silver and gold accents`,
        `premium brand storytelling visual, editorial quality`,
        `Chinese artisan heritage, handcraft tradition`,
        style,
      ].join(', '),
      isTemplate: true,
      aspectRatio: '1:1',
    },
  ];
}

/**
 * 生成完整的 8 张图提示词
 */
export function buildAllPrompts(product: ProductInfo): DetailImageDef[] {
  return [
    ...buildProductPrompts(product),
    ...buildTemplatePrompts(product),
  ];
}
