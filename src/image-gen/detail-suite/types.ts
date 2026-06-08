/**
 * 详情图套件类型定义
 */

/** 产品分析结果 */
export interface ProductInfo {
  /** 品类：项链、手镯、戒指、耳环 */
  category: string;
  /** 材质：纯银、925银、银镀金 */
  material: string;
  /** 颜色描述 */
  color: string;
  /** 风格：复古、简约、民族风 */
  style: string;
  /** 工艺特征：花丝、錾刻、镶嵌 */
  craftsmanship: string;
  /** 设计元素/图案 */
  designElements: string;
  /** 文化寓意（如果能识别） */
  culturalMeaning: string;
  /** 英文描述（用于生图） */
  englishDescription: string;
}

/** 单张图片定义 */
export interface DetailImageDef {
  /** 图片类型 ID */
  id: string;
  /** 中文名 */
  name: string;
  /** 英文提示词 */
  prompt: string;
  /** 是否为模板图（可复用） */
  isTemplate: boolean;
  /** 宽高比 */
  aspectRatio: string;
}

/** 生成结果 */
export interface DetailSuiteResult {
  /** 产品分析 */
  productInfo: ProductInfo;
  /** 生成的图片列表 */
  images: Array<{
    def: DetailImageDef;
    buffer: Buffer;
  }>;
}
