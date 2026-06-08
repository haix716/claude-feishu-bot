/**
 * 模板图片管理器
 *
 * 管理 4 张品牌模板图的缓存：
 * - 首次使用时生成并缓存
 * - 后续复用缓存文件
 * - 模板图片存放在 {IMAGE_SAVE_DIR}/brand-templates/
 */

import fs from 'fs';
import path from 'path';

const TEMPLATE_DIR = process.env.BRAND_TEMPLATE_DIR
  || path.join('/Users/hxy/Documents/小红书店铺', '详情图', '详情图模板');

/** 确保模板目录存在 */
function ensureTemplateDir(): void {
  if (!fs.existsSync(TEMPLATE_DIR)) {
    fs.mkdirSync(TEMPLATE_DIR, { recursive: true });
  }
}

/**
 * 获取模板图片路径
 * @returns 文件路径，如果不存在返回 null
 */
export function getTemplatePath(templateId: string): string | null {
  ensureTemplateDir();
  const filePath = path.join(TEMPLATE_DIR, `${templateId}.jpg`);
  return fs.existsSync(filePath) ? filePath : null;
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
 * 检查所有模板是否都已缓存
 */
export function allTemplatesCached(templateIds: string[]): boolean {
  return templateIds.every(id => getTemplatePath(id) !== null);
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
 * 获取模板目录路径
 */
export function getTemplateDir(): string {
  ensureTemplateDir();
  return TEMPLATE_DIR;
}
