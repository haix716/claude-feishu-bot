/**
 * 模板图片管理器
 *
 * 目录结构（/Users/hxy/Documents/小红书店铺/详情图/详情图模板/）：
 *
 * 品牌模板图（txt2img，可复用）：
 *   specs.jpg      - 规格图
 *   culture.jpg    - 文化寓意图
 *   packaging.jpg  - 包装展示图
 *   brand.jpg      - 品牌故事图
 *
 * 风格参考图（用户在 TapNow 手动制作，用于 img2img 保持风格一致）：
 *   style-main.jpg    - 主图风格参考
 *   style-angle.jpg   - 角度图风格参考
 *   style-detail.jpg  - 细节图风格参考
 *   style-scene.jpg   - 场景图风格参考
 */

import fs from 'fs';
import os from 'os';
import path from 'path';

const TEMPLATE_DIR = process.env.BRAND_TEMPLATE_DIR
  || path.join(os.homedir(), 'Documents', '小红书店铺', '详情图', '详情图模板');

/** 确保模板目录存在 */
function ensureTemplateDir(): void {
  if (!fs.existsSync(TEMPLATE_DIR)) {
    fs.mkdirSync(TEMPLATE_DIR, { recursive: true });
  }
}

/**
 * 获取模板图片路径
 */
export function getTemplatePath(templateId: string): string | null {
  ensureTemplateDir();
  // 支持 .jpg 和 .png 两种格式
  for (const ext of ['.jpg', '.png', '.jpeg', '.webp']) {
    const filePath = path.join(TEMPLATE_DIR, `${templateId}${ext}`);
    if (fs.existsSync(filePath)) return filePath;
  }
  return null;
}

/**
 * 保存模板图片到缓存
 */
export function saveTemplate(templateId: string, buffer: Buffer): string {
  ensureTemplateDir();
  const filePath = path.join(TEMPLATE_DIR, `${templateId}.jpg`);
  fs.writeFileSync(filePath, buffer);
  console.log(`[TemplateManager] 模板已缓存: ${filePath}`);
  return filePath;
}

/**
 * 读取已缓存的模板图片
 */
export function loadTemplate(templateId: string): Buffer | null {
  const filePath = getTemplatePath(templateId);
  if (!filePath) return null;
  return fs.readFileSync(filePath);
}

/**
 * 加载风格参考图（用户手动制作的详情图）
 * 用于 img2img 时保持构图和风格一致
 */
export function loadStyleReference(styleId: string): Buffer | null {
  return loadTemplate(`style-${styleId}`);
}

/**
 * 检查风格参考图是否存在
 */
export function hasStyleReference(styleId: string): boolean {
  return getTemplatePath(`style-${styleId}`) !== null;
}

/**
 * 列出所有已有的模板和风格参考
 */
export function listTemplates(): { templates: string[]; styleRefs: string[] } {
  ensureTemplateDir();
  const files = fs.readdirSync(TEMPLATE_DIR);
  const templates: string[] = [];
  const styleRefs: string[] = [];

  for (const file of files) {
    const name = path.parse(file).name;
    if (name.startsWith('style-')) {
      styleRefs.push(name);
    } else {
      templates.push(name);
    }
  }

  return { templates, styleRefs };
}

/**
 * 获取模板目录路径
 */
export function getTemplateDir(): string {
  ensureTemplateDir();
  return TEMPLATE_DIR;
}
