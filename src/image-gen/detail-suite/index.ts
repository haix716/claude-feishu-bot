/**
 * 详情图套件模块
 *
 * 用户发一张银饰图片 → 生成 8 张专业详情图：
 * - 4 张产品特定图（主图/角度/细节/场景）
 * - 4 张品牌模板图（规格/文化/包装/品牌故事，可复用）
 */

export { generateDetailSuite } from './orchestrator';
export type { DetailSuiteResult, ProductInfo, DetailImageDef } from './types';
export type { ProgressCallback } from './orchestrator';
