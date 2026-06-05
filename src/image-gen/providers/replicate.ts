/**
 * Replicate Provider
 *
 * 通过 Replicate API 调用开源图片生成模型
 * - 通用 img2img：black-forest-labs/flux-dev
 * - 虚拟试穿：cuuupid/idm-vton
 *
 * API 文档：https://replicate.com/docs
 */

import { config } from '../../config';
import type { ImageProvider, GenerateParams, GenerateResult, GenerateMode } from './provider';

const API_BASE = 'https://api.replicate.com/v1';

/** Replicate API 响应 */
interface ReplicateResponse {
  id?: string;
  status: string;
  output?: string | string[];
  error?: string;
  model?: string;
}

export class ReplicateProvider implements ImageProvider {
  name = 'replicate';
  private token: string;

  constructor() {
    this.token = config.imageGen.replicateApiToken;
  }

  supports(_mode: GenerateMode): boolean {
    return true;
  }

  async generateImage(params: GenerateParams): Promise<GenerateResult> {
    if (!this.token) {
      throw new Error('REPLICATE_API_TOKEN 未配置');
    }

    const { referenceImage, prompt, negativePrompt, mode, options } = params;

    // 根据模式选择不同的调用方式
    if (mode === 'tryon') {
      return this.generateTryOn(referenceImage, prompt);
    }

    // 通用 img2img（使用 Flux）
    return this.generateWithFlux(referenceImage, prompt, negativePrompt, options);
  }

  /**
   * 使用 Flux 进行通用图生图
   */
  private async generateWithFlux(
    referenceImage: Buffer,
    prompt: string,
    negativePrompt?: string,
    _options?: GenerateParams['options'],
  ): Promise<GenerateResult> {
    const base64 = referenceImage.toString('base64');
    const dataUri = `data:image/jpeg;base64,${base64}`;

    const body = {
      input: {
        prompt,
        image: dataUri,
        ...(negativePrompt && { negative_prompt: negativePrompt }),
      },
    };

    return this.submitAndWait('black-forest-labs/flux-dev', body);
  }

  /**
   * 使用 IDM-VTON 进行虚拟试穿
   *
   * IDM-VTON 需要两张图：
   * - human_img: 人物照片
   * - garm_img: 服装照片
   *
   * 当前实现：用上传的图作为服装，用默认人物图
   * 后续可以支持用户上传自己的照片
   */
  private async generateTryOn(
    garmentImage: Buffer,
    garmentDescription: string,
  ): Promise<GenerateResult> {
    const base64 = garmentImage.toString('base64');
    const dataUri = `data:image/jpeg;base64,${base64}`;

    // 使用默认的人物模板图
    // TODO: 允许用户上传自己的人物照片
    const defaultHumanImg = 'https://replicate.delivery/pbxt/JYMQdFCqwGPpfUGiFf7YJBhlHhpBjHdL06KIq1d2vgBNH0iC/human.jpg';

    const body = {
      input: {
        human_img: defaultHumanImg,
        garm_img: dataUri,
        garment_des: garmentDescription,
      },
    };

    return this.submitAndWait('cuuupid/idm-vton', body);
  }

  /**
   * 获取模型的最新 version ID
   *
   * 社区模型（如 cuuupid/idm-vton）不支持 POST /v1/models/{owner}/{name}/predictions，
   * 必须通过 POST /v1/predictions + version 字段调用。
   * 官方模型也支持这种方式，所以统一使用。
   */
  private async getModelVersion(model: string): Promise<string> {
    const response = await fetch(`${API_BASE}/models/${model}`, {
      headers: { 'Authorization': `Bearer ${this.token}` },
    });

    if (!response.ok) {
      throw new Error(`获取模型信息失败 (${response.status}): ${model}`);
    }

    const data = await response.json() as { latest_version?: { id?: string } };
    const versionId = data.latest_version?.id;

    if (!versionId) {
      throw new Error(`模型 ${model} 没有可用的 version`);
    }

    return versionId;
  }

  /**
   * 提交预测并等待结果
   *
   * 使用 POST /v1/predictions + version 字段，兼容所有模型（官方 + 社区）。
   */
  private async submitAndWait(model: string, body: Record<string, unknown>): Promise<GenerateResult> {
    const version = await this.getModelVersion(model);

    const response = await fetch(`${API_BASE}/predictions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait=60',
      },
      body: JSON.stringify({ ...body, version }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Replicate API 错误 (${response.status}): ${error}`);
    }

    const result = await response.json() as ReplicateResponse;

    // 处理结果
    if (result.status === 'succeeded') {
      return this.parseOutput(result);
    }

    if (result.status === 'failed') {
      throw new Error(`Replicate 生成失败: ${result.error || '未知原因'}`);
    }

    // 需要轮询
    if (result.id && (result.status === 'processing' || result.status === 'starting')) {
      return await this.pollResult(result.id);
    }

    throw new Error(`Replicate 未知状态: ${result.status}`);
  }

  private async pollResult(predictionId: string, maxAttempts = 30): Promise<GenerateResult> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, 2000));

      const response = await fetch(`${API_BASE}/predictions/${predictionId}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Replicate 轮询失败: ${response.status}`);
      }

      const result = await response.json() as ReplicateResponse;

      if (result.status === 'succeeded') {
        return this.parseOutput(result);
      }

      if (result.status === 'failed') {
        throw new Error(`Replicate 生成失败: ${result.error || '未知原因'}`);
      }
    }

    throw new Error('Replicate 生成超时（60 秒）');
  }

  private async parseOutput(result: ReplicateResponse): Promise<GenerateResult> {
    const output = result.output;
    if (!output) throw new Error('Replicate 返回的结果为空');

    // output 可能是字符串（URL）或数组（URLs）
    const urls: string[] = Array.isArray(output)
      ? output.filter((u): u is string => typeof u === 'string')
      : [output];

    const images: Buffer[] = [];
    for (const url of urls) {
      if (typeof url === 'string' && url.startsWith('http')) {
        const response = await fetch(url);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          images.push(Buffer.from(arrayBuffer));
        }
      }
    }

    if (images.length === 0) {
      throw new Error('Replicate 生成成功但无法下载图片');
    }

    return {
      images,
      model: result.model || 'replicate',
    };
  }
}
