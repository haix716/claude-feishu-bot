/**
 * 提示词生成器
 *
 * 生成 8 个详情图的提示词：
 * - 4 个产品特定图（每次根据产品生成）
 * - 4 个品牌模板图（风格固定，内容根据产品微调）
 */

import { SILVER_STYLE, CAMERA_SPECS, getStylePromptFragment } from './style-config';
import type { ProductInfo, DetailImageDef } from './types';

const style = getStylePromptFragment(SILVER_STYLE);

/**
 * 构建产品精确描述（提示词最前面，权重最高）
 */
function buildProductDesc(product: ProductInfo): string {
  const parts = [
    product.material,
    product.category,
    product.craftsmanship !== 'polished silver' ? `with ${product.craftsmanship}` : '',
    product.designElements ? `featuring ${product.designElements} patterns` : '',
    `${product.color} finish`,
  ].filter(Boolean);
  return parts.join(' ');
}

/**
 * 生成产品特定的 4 个提示词
 *
 * 提示词结构（按权重从高到低）：
 * 1. 产品精确描述（最前面 = 最高权重）
 * 2. 材质/工艺细节
 * 3. 展示方式/构图
 * 4. 光影环境
 * 5. 相机参数
 * 6. 保真指令（最后，但必须有）
 */
export function buildProductPrompts(product: ProductInfo): DetailImageDef[] {
  const desc = buildProductDesc(product);
  const craft = product.craftsmanship;
  const design = product.designElements;

  return [
    {
      id: 'main',
      name: '主图',
      prompt: [
        `Product hero shot of a ${desc}`,
        `${craft} surface texture`,
        `centered on ${SILVER_STYLE.bgColor}`,
        `front-facing, full product view`,
        SILVER_STYLE.lighting,
        CAMERA_SPECS.main,
        `preserve exact product appearance, shape and all details from reference image`,
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
        `${craft} surface texture visible from this angle`,
        `on ${SILVER_STYLE.bgColor}`,
        `showing depth, dimension, and 3D silhouette`,
        SILVER_STYLE.lighting,
        CAMERA_SPECS.angle,
        `preserve exact product design, shape and surface details from reference`,
        style,
      ].join(', '),
      isTemplate: false,
      aspectRatio: '1:1',
    },
    {
      id: 'detail',
      name: '细节特写图',
      prompt: [
        `Extreme macro close-up of a ${desc}`,
        `focusing on ${craft} texture${design ? ` and ${design} pattern details` : ''}`,
        `on ${SILVER_STYLE.bgColor}`,
        `visible artisan craftsmanship marks and surface finish`,
        `dramatic spotlight from 60 degrees`,
        CAMERA_SPECS.detail,
        `maintaining exact metalwork details and surface finish from reference image`,
        style,
      ].join(', '),
      isTemplate: false,
      aspectRatio: '1:1',
    },
    {
      id: 'scene',
      name: '佩戴场景图',
      prompt: [
        `Lifestyle product photo of a ${desc} being worn`,
        `woman with minimalist styling, Chinese aesthetic`,
        `natural window light from the left, gentle shadows`,
        `warm ambient atmosphere, understated luxury`,
        CAMERA_SPECS.scene,
        `preserve exact product appearance from reference image`,
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
