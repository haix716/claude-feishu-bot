/**
 * 产品分析器
 *
 * 用 MiMo 多模态模型分析银饰产品图片，提取详细的产品信息
 */

import OpenAI from 'openai';
import { config } from '../../config';
import type { ProductInfo } from './types';

const openai = new OpenAI({
  apiKey: config.ai.apiKey,
  baseURL: config.ai.baseURL,
});

/**
 * 分析银饰产品图片
 */
export async function analyzeProduct(base64Image: string): Promise<ProductInfo> {
  const response = await openai.chat.completions.create({
    model: config.mimoImageModel,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'text',
          text: `请分析这张银饰产品图片，返回 JSON 格式的结果。不要输出其他内容，只输出 JSON。

返回格式：
{
  "category": "品类，如 项链、手镯、戒指、耳环、吊坠、胸针",
  "material": "材质，如 纯银、925银、银镀金、泰银",
  "color": "颜色描述，如 亮银色、哑光银、做旧银、银白色",
  "style": "风格，如 复古、简约、民族风、中式古典、现代时尚",
  "craftsmanship": "工艺特征，如 花丝镶嵌、錾刻、锤揲、抛光、做旧、珐琅",
  "designElements": "设计元素/图案，如 龙凤纹、莲花、祥云、几何图案、素面",
  "culturalMeaning": "文化寓意（如果能识别），如 龙凤呈祥、年年有余、平安如意，无法识别则为空字符串",
  "englishDescription": "用英文写一个详细的产品描述，包含品类、材质、工艺、设计元素，用于 AI 生图提示词。50-80词。"
}

规则：
- 仔细观察图片中的每一个细节
- category 必须是银饰品类之一
- craftsmanship 如果看不清就写 "polished silver"
- englishDescription 要详细具体，包含可观察到的所有视觉特征`
        },
        {
          type: 'image_url',
          image_url: { url: `data:image/jpeg;base64,${base64Image}` },
        },
      ],
    }],
    max_completion_tokens: 600,
  });

  const content = response.choices[0]?.message?.content || '';

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('无法从 AI 回复中提取 JSON');
    }

    const data = JSON.parse(jsonMatch[0]);

    return {
      category: data.category || '银饰',
      material: data.material || '银',
      color: data.color || '银色',
      style: data.style || '简约',
      craftsmanship: data.craftsmanship || 'polished silver',
      designElements: data.designElements || '',
      culturalMeaning: data.culturalMeaning || '',
      englishDescription: data.englishDescription || `A silver ${data.category || 'jewelry'} with ${data.craftsmanship || 'polished'} finish`,
    };
  } catch (parseErr) {
    console.error('[DetailSuite] 解析产品分析失败:', parseErr, '\n原始回复:', content);

    // 降级：用默认值
    return {
      category: '银饰',
      material: '银',
      color: '银色',
      style: '简约',
      craftsmanship: 'polished silver',
      designElements: '',
      culturalMeaning: '',
      englishDescription: 'A silver jewelry piece with polished finish on dark background',
    };
  }
}
