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
        `小红书产品主图, ${desc} 正面展示`,
        `${craft} 表面质感`,
        `居中构图, ${SILVER_STYLE.bgColor}`,
        `正面全貌, 完整产品展示`,
        SILVER_STYLE.lighting,
        CAMERA_SPECS.main,
        `保留参考图中产品的精确外观、形状和所有细节`,
        style,
      ].join(', '),
      isTemplate: false,
      aspectRatio: '1:1',
    },
    {
      id: 'angle',
      name: '角度展示图',
      prompt: [
        `小红书产品角度图, ${desc} 45度侧面展示`,
        `${craft} 表面质感从侧面清晰可见`,
        `${SILVER_STYLE.bgColor}`,
        `展示深度、立体感和3D轮廓`,
        SILVER_STYLE.lighting,
        CAMERA_SPECS.angle,
        `保留参考图中产品的精确设计、形状和表面细节`,
        style,
      ].join(', '),
      isTemplate: false,
      aspectRatio: '1:1',
    },
    {
      id: 'detail',
      name: '细节特写图',
      prompt: [
        `小红书产品细节图, ${desc} 极致微距特写`,
        `聚焦 ${craft} 质感${design ? ` 和 ${design} 纹样细节` : ''}`,
        `${SILVER_STYLE.bgColor}`,
        `工匠工艺痕迹和表面处理清晰可见`,
        `60度角聚光灯, 戏剧性光影`,
        CAMERA_SPECS.detail,
        `保持参考图中精确的金属工艺细节和表面处理`,
        style,
      ].join(', '),
      isTemplate: false,
      aspectRatio: '1:1',
    },
    {
      id: 'scene',
      name: '佩戴场景图',
      prompt: [
        `小红书穿搭博主风格, ${desc} 佩戴效果`,
        `简约风格女性, 中式美学`,
        `左侧自然窗光, 柔和阴影`,
        `温暖氛围, 低调奢华感`,
        CAMERA_SPECS.scene,
        `保留参考图中产品的精确外观`,
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
        `小红书产品规格图, 银饰 ${cat} 尺寸标注`,
        `精确尺寸标注, 优雅细线`,
        `展示长度、宽度、厚度测量`,
        `干净深色背景, 极简技术绘图风格`,
        `银色 ${cat} 轮廓配测量线`,
        `专业产品规格排版`,
        style,
      ].join(', '),
      isTemplate: true,
      aspectRatio: '1:1',
    },
    {
      id: 'culture',
      name: '文化寓意图',
      prompt: [
        `小红书文化寓意图, 银饰 ${cat} 文化故事`,
        `主题: "${meaning}" (中国传统吉祥寓意)`,
        `设计元素: ${design} 纹样`,
        `中式美学与现代奢华结合`,
        `深色背景配银色和深蓝点缀`,
        `优雅书法风格文字元素`,
        `圆形徽章或图案融入 ${design}`,
        `文化传承视觉叙事`,
        style,
      ].join(', '),
      isTemplate: true,
      aspectRatio: '1:1',
    },
    {
      id: 'packaging',
      name: '包装展示图',
      prompt: [
        `小红书开箱风格, 银饰包装展示`,
        `深海军蓝丝绒礼盒配银色烫印 logo`,
        `丝绸内衬托着银色 ${cat}`,
        `品牌证书卡和保养说明`,
        `高端购物袋配缎带手柄`,
        `深色渐变背景, 柔和棚拍光`,
        `开箱仪式感, 送礼氛围`,
        style,
      ].join(', '),
      isTemplate: true,
      aspectRatio: '1:1',
    },
    {
      id: 'brand',
      name: '品牌故事图',
      prompt: [
        `小红书品牌故事图, 匠人银饰工艺展示`,
        `中国传统银匠工艺展示`,
        `古法工坊场景, 匠人工具: 锤子、铁砧、錾刀`,
        `从 raw silver 到成品 ${cat} 的匠心之旅`,
        `文化图案: ${design} 作为设计传承`,
        `深色背景, 银色和金色点缀`,
        `高端品牌叙事视觉, 杂志级品质`,
        `中国匠人传承, 手工艺精神`,
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
