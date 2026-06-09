/**
 * 图片文字叠加工具
 *
 * 在生成的图片上添加文字（如小红书封面标题）
 * 使用 SVG + sharp 实现，支持中文
 */

import sharp from 'sharp';

/** 文字叠加配置 */
export interface TextOverlayOptions {
  text: string;
  position?: 'top' | 'center' | 'bottom';
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  backgroundOpacity?: number;
  padding?: number;
  fontFamily?: string;
  maxWidth?: number;
}

/**
 * 在图片上叠加文字
 *
 * @param imageBuffer 原始图片 buffer
 * @param options 文字配置
 * @returns 处理后的图片 buffer
 */
export async function addTextOverlay(
  imageBuffer: Buffer,
  options: TextOverlayOptions,
): Promise<Buffer> {
  const {
    text,
    position = 'bottom',
    fontSize = 48,
    color = '#FFFFFF',
    backgroundColor = '#000000',
    backgroundOpacity = 0.6,
    padding = 20,
    fontFamily = 'PingFang SC, Microsoft YaHei, SimHei, sans-serif',
    maxWidth = 800,
  } = options;

  // 获取原图尺寸
  const metadata = await sharp(imageBuffer).metadata();
  const imgWidth = metadata.width || 1080;
  const imgHeight = metadata.height || 1080;

  // 计算文字行数和高度
  const charsPerLine = Math.floor(maxWidth / (fontSize * 0.6));
  const lines: string[] = [];
  for (let i = 0; i < text.length; i += charsPerLine) {
    lines.push(text.substring(i, i + charsPerLine));
  }
  const lineHeight = fontSize * 1.4;
  const textHeight = lines.length * lineHeight;
  const totalHeight = textHeight + padding * 2;

  // 构建 SVG 文字层
  const svgText = lines.map((line, index) => {
    const y = padding + fontSize + (index * lineHeight);
    return `<text x="${imgWidth / 2}" y="${y}"
      font-family="${fontFamily}"
      font-size="${fontSize}"
      fill="${color}"
      text-anchor="middle"
      font-weight="bold">${escapeXml(line)}</text>`;
  }).join('\n');

  const svg = `
    <svg width="${imgWidth}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${backgroundColor}" opacity="${backgroundOpacity}" rx="8" ry="8"/>
      ${svgText}
    </svg>
  `;

  const svgBuffer = Buffer.from(svg);

  // 计算叠加位置
  let top: number;
  if (position === 'top') {
    top = 0;
  } else if (position === 'center') {
    top = Math.floor((imgHeight - totalHeight) / 2);
  } else {
    top = imgHeight - totalHeight;
  }

  // 使用 sharp 合成
  const result = await sharp(imageBuffer)
    .composite([{
      input: svgBuffer,
      top: Math.max(0, top),
      left: 0,
    }])
    .jpeg({ quality: 95 })
    .toBuffer();

  return result;
}

/**
 * 转义 XML 特殊字符
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
