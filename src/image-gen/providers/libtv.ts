/**
 * LibTV Provider
 *
 * 通过 libtv CLI 调用 LiblibAI 的图片生成能力
 * 支持 text2img 和 img2img（通过画布节点连线）
 *
 * 安装：curl -sL https://liblibai-web-static.liblib.cloud/cli/latest/install-libtv-cli.sh | bash
 * 登录：libtv login web
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import type { ImageProvider, GenerateParams, GenerateResult, GenerateMode } from './provider';

const execFileAsync = promisify(execFile);

/** 模式 → 模型映射（modelKey） */
const MODE_MODEL_MAP: Record<GenerateMode, string> = {
  tryon: 'jimeng-4.6',       // Seedream 4.6，人像一致性好
  product: 'seedream-4.5',   // 商品图质量高
  cover: 'seedream-4.5',     // 封面图
};

/** 宽高比映射 */
const RATIO_MAP: Record<string, string> = {
  '1:1': '1:1',
  '3:4': '3:4',
  '4:3': '4:3',
  '16:9': '16:9',
  '9:16': '9:16',
};

export class LibTVProvider implements ImageProvider {
  name = 'libtv';
  private projectUuid: string | null = null;

  constructor() {
    // 从 .libtv/project.json 读取已绑定的项目
    this.loadProject();
  }

  private loadProject() {
    try {
      const configPath = path.join(process.cwd(), '.libtv', 'project.json');
      if (fs.existsSync(configPath)) {
        const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        this.projectUuid = data.projectUuid || null;
      }
    } catch {
      // 忽略，会在生成时自动创建项目
    }
  }

  supports(_mode: GenerateMode): boolean {
    return true;
  }

  async generateImage(params: GenerateParams): Promise<GenerateResult> {
    const { referenceImage, prompt, mode, options } = params;

    // 确保有项目
    if (!this.projectUuid) {
      this.projectUuid = await this.createProject();
    }

    // 选择模型
    const model = this.selectModel(mode, options?.style);

    // 选择宽高比
    const ratio = this.selectRatio(mode, options?.aspectRatio);

    // 上传参考图并生成
    const imageUrl = await this.uploadAndGenerate(referenceImage, prompt, model, ratio, mode);

    // 下载结果图片
    const images = await this.downloadImage(imageUrl);

    return {
      images,
      model: `libtv/${model}`,
    };
  }

  /**
   * 选择模型
   */
  private selectModel(mode: GenerateMode, style?: string): string {
    // 如果指定了风格，可以选择更适合的模型
    if (style === 'artistic') return 'mj-v7';
    if (style === 'cute') return 'mj-niji7';

    return MODE_MODEL_MAP[mode] || 'seedream-4.5';
  }

  /**
   * 选择宽高比
   */
  private selectRatio(mode: GenerateMode, aspectRatio?: string): string {
    if (aspectRatio && RATIO_MAP[aspectRatio]) {
      return RATIO_MAP[aspectRatio];
    }

    // 默认比例
    switch (mode) {
      case 'tryon': return '3:4';   // 竖版，适合人物
      case 'product': return '1:1'; // 正方形，适合电商主图
      case 'cover': return '3:4';   // 小红书封面
      default: return '16:9';
    }
  }

  /**
   * 创建 LibTV 项目
   */
  private async createProject(): Promise<string> {
    const { stdout } = await execFileAsync('libtv', [
      'project', 'create', '飞书智能体生图',
    ], { timeout: 30000 });

    const result = JSON.parse(stdout);
    if (!result.uuid) {
      throw new Error(`创建项目失败: ${stdout}`);
    }

    // 绑定项目
    await execFileAsync('libtv', ['project', 'use', result.uuid], { timeout: 10000 });

    return result.uuid;
  }

  /**
   * 上传参考图并生成图片
   */
  private async uploadAndGenerate(
    referenceImage: Buffer,
    prompt: string,
    model: string,
    ratio: string,
    mode: GenerateMode,
  ): Promise<string> {
    // 1. 保存参考图到临时文件
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'libtv-'));
    const inputPath = path.join(tmpDir, 'input.png');
    fs.writeFileSync(inputPath, referenceImage);

    try {
      // 2. 上传参考图
      const uploadNodeName = `ref_${Date.now()}`;
      const { stdout: uploadStdout } = await execFileAsync('libtv', [
        'upload', uploadNodeName,
        '--resource', inputPath,
        '-t', 'image',
      ], { timeout: 60000 });

      const uploadResult = JSON.parse(uploadStdout);
      if (!uploadResult.nodeKey) {
        throw new Error(`上传图片失败: ${uploadStdout}`);
      }

      // 3. 创建生成节点并连接到参考图
      const genNodeName = `gen_${Date.now()}`;
      const args = [
        'node', 'create', genNodeName,
        '-t', 'image',
        '--prompt', prompt,
        '-s', `model=${model}`,
        '-s', `ratio=${ratio}`,
        '--left', uploadNodeName,
        '-r',  // 创建后立即运行
      ];

      // 连接了参考图，必须使用图生图模式
      args.push('-s', 'modeType=image2image');

      const { stdout: genStdout } = await execFileAsync('libtv', args, {
        timeout: 180000, // 3 分钟超时
      });

      // CLI 输出格式：create JSON + 换行 + [run] text + 换行 + run JSON
      // run JSON 包含 status=2 和生成的图片 url
      // 用最后一个完整的 JSON 对象（从最后一个 { 开始匹配）
      const lastBraceStart = genStdout.lastIndexOf('{"nodeKey"');
      if (lastBraceStart !== -1) {
        const jsonStr = genStdout.slice(lastBraceStart);
        const result = JSON.parse(jsonStr);
        if (result.data?.url?.length > 0) {
          return result.data.url[0];
        }
      }

      // fallback：尝试找任何包含 url 的 JSON
      const urlMatch = genStdout.match(/"url"\s*:\s*\[\s*"(https?:\/\/[^"]+)"\s*\]/);
      if (urlMatch) {
        return urlMatch[1];
      }

      throw new Error(`生成失败，未获取到图片 URL: ${genStdout}`);
    } finally {
      // 清理临时文件
      try {
        fs.unlinkSync(inputPath);
        fs.rmdirSync(tmpDir);
      } catch {
        // 忽略清理错误
      }
    }
  }

  /**
   * 下载图片
   */
  private async downloadImage(imageUrl: string): Promise<Buffer[]> {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`下载图片失败 (${response.status}): ${imageUrl}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return [Buffer.from(arrayBuffer)];
  }
}
