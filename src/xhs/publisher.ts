/**
 * 小红书发布器
 *
 * 使用 Playwright 浏览器自动化发布笔记到小红书
 * 流程：登录（Cookie）→ 创建笔记 → 上传图片 → 填写内容 → 发布
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import fs from 'fs';
import path from 'path';
import os from 'os';

/** Cookie 存储路径 */
const COOKIE_DIR = path.join(os.homedir(), '.xiaohongshu');
const COOKIE_FILE = path.join(COOKIE_DIR, 'cookies.json');

/** 发布参数 */
export interface PublishParams {
  title: string;
  content: string;
  images: Buffer[];           // 图片 buffer 列表（最多 18 张）
  tags?: string[];            // 话题标签
  location?: string;          // 地点
}

/** 发布结果 */
export interface PublishResult {
  success: boolean;
  noteId?: string;
  noteUrl?: string;
  error?: string;
}

/**
 * 小红书发布器
 */
export class XhsPublisher {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;

  /**
   * 初始化浏览器
   */
  async init(): Promise<void> {
    this.browser = await chromium.launch({
      headless: false, // 需要可见窗口用于扫码登录
      args: ['--lang=zh-CN'],
    });

    // 尝试加载已保存的 Cookie
    const cookies = this.loadCookies();
    if (cookies.length > 0) {
      this.context = await this.browser.newContext({
        storageState: { cookies, origins: [] },
        locale: 'zh-CN',
      });
    } else {
      this.context = await this.browser.newContext({
        locale: 'zh-CN',
      });
    }
  }

  /**
   * 关闭浏览器
   */
  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * 检查是否已登录
   */
  async isLoggedIn(): Promise<boolean> {
    if (!this.context) await this.init();

    const page = await this.context!.newPage();
    try {
      await page.goto('https://creator.xiaohongshu.com/publish/publish', {
        waitUntil: 'networkidle',
        timeout: 15000,
      });

      // 如果跳转到登录页，说明未登录
      const url = page.url();
      if (url.includes('login') || url.includes('passport')) {
        return false;
      }

      return true;
    } catch {
      return false;
    } finally {
      await page.close();
    }
  }

  /**
   * 扫码登录（需要用户手动扫码）
   */
  async login(): Promise<{ success: boolean; qrCodeUrl?: string; error?: string }> {
    if (!this.context) await this.init();

    const page = await this.context!.newPage();
    try {
      // 打开小红书创作者中心登录页
      await page.goto('https://creator.xiaohongshu.com/login', {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // 等待二维码出现
      await page.waitForTimeout(3000);

      // 尝试获取二维码图片
      const qrImg = await page.$('img.qrcode-img, img[class*="qrcode"], canvas[class*="qr"]');
      let qrCodeUrl: string | undefined;

      if (qrImg) {
        qrCodeUrl = await qrImg.getAttribute('src') || undefined;
      }

      // 等待用户扫码完成（最多 120 秒）
      console.log('[XHS] 等待扫码登录...');

      try {
        // 等待页面跳转到创作者中心
        await page.waitForURL('**/publish/**', { timeout: 120000 });
        console.log('[XHS] 登录成功！');

        // 保存 Cookie
        const cookies = await this.context!.cookies();
        this.saveCookies(cookies);

        return { success: true };
      } catch {
        return {
          success: false,
          qrCodeUrl,
          error: '扫码超时（120秒），请重试',
        };
      }
    } catch (err) {
      return {
        success: false,
        error: `登录失败: ${err instanceof Error ? err.message : String(err)}`,
      };
    } finally {
      await page.close();
    }
  }

  /**
   * 发布笔记
   */
  async publish(params: PublishParams): Promise<PublishResult> {
    if (!this.context) await this.init();

    // 检查登录状态
    const loggedIn = await this.isLoggedIn();
    if (!loggedIn) {
      return { success: false, error: '未登录，请先执行登录' };
    }

    const page = await this.context!.newPage();
    try {
      console.log('[XHS] 打开发布页面...');
      await page.goto('https://creator.xiaohongshu.com/publish/publish', {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // 等待页面加载
      await page.waitForTimeout(2000);

      // 1. 上传图片
      console.log(`[XHS] 上传 ${params.images.length} 张图片...`);
      await this.uploadImages(page, params.images);
      await page.waitForTimeout(2000);

      // 2. 填写标题
      console.log(`[XHS] 填写标题: ${params.title}`);
      const titleInput = await page.$('input[placeholder*="标题"], #title, [class*="title"] input');
      if (titleInput) {
        await titleInput.click();
        await titleInput.fill(params.title.substring(0, 20)); // 标题限 20 字
      }

      // 3. 填写正文
      console.log('[XHS] 填写正文...');
      const contentInput = await page.$('[contenteditable="true"], textarea[placeholder*="正文"], #content');
      if (contentInput) {
        await contentInput.click();
        // 构建正文（含标签）
        let fullContent = params.content;
        if (params.tags && params.tags.length > 0) {
          fullContent += '\n\n' + params.tags.map(t => `#${t}`).join(' ');
        }
        await contentInput.fill(fullContent.substring(0, 1000)); // 正文限 1000 字
      }

      // 4. 添加话题标签
      if (params.tags && params.tags.length > 0) {
        console.log(`[XHS] 添加标签: ${params.tags.join(', ')}`);
        for (const tag of params.tags) {
          try {
            const tagBtn = await page.$('[class*="tag"], [class*="topic"]');
            if (tagBtn) {
              await tagBtn.click();
              await page.waitForTimeout(500);
              const tagInput = await page.$('input[placeholder*="话题"], input[placeholder*="标签"]');
              if (tagInput) {
                await tagInput.fill(tag);
                await page.waitForTimeout(1000);
                // 选择第一个建议
                const suggestion = await page.$('[class*="suggestion"], [class*="option"]');
                if (suggestion) {
                  await suggestion.click();
                }
              }
            }
          } catch (tagErr) {
            console.warn(`[XHS] 添加标签失败: ${tag}`, tagErr);
          }
        }
      }

      // 5. 点击发布按钮
      console.log('[XHS] 点击发布...');
      await page.waitForTimeout(1000);

      const publishBtn = await page.$('button:has-text("发布"), [class*="publish"] button');
      if (publishBtn) {
        await publishBtn.click();
        console.log('[XHS] 已点击发布按钮');

        // 等待发布完成
        await page.waitForTimeout(3000);

        // 检查是否发布成功
        const url = page.url();
        if (url.includes('publish') && !url.includes('login')) {
          // 尝试获取笔记链接
          const noteUrl = await this.extractNoteUrl(page);

          return {
            success: true,
            noteUrl,
          };
        }
      }

      return {
        success: false,
        error: '发布失败，未找到发布按钮或页面异常',
      };

    } catch (err) {
      return {
        success: false,
        error: `发布失败: ${err instanceof Error ? err.message : String(err)}`,
      };
    } finally {
      await page.close();
    }
  }

  /**
   * 上传图片到发布页面
   */
  private async uploadImages(page: Page, images: Buffer[]): Promise<void> {
    // 将图片 buffer 写入临时文件
    const tempDir = path.join(os.tmpdir(), 'xhs-upload');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFiles: string[] = [];
    for (let i = 0; i < images.length; i++) {
      const tempPath = path.join(tempDir, `image_${i}.jpg`);
      fs.writeFileSync(tempPath, images[i]);
      tempFiles.push(tempPath);
    }

    try {
      // 找到文件上传 input
      const fileInput = await page.$('input[type="file"]');
      if (fileInput) {
        await fileInput.setInputFiles(tempFiles);
        console.log(`[XHS] 已上传 ${tempFiles.length} 张图片`);
      } else {
        console.warn('[XHS] 未找到文件上传 input');
      }
    } finally {
      // 清理临时文件
      for (const f of tempFiles) {
        try { fs.unlinkSync(f); } catch { /* ignore */ }
      }
    }
  }

  /**
   * 从发布结果页面提取笔记链接
   */
  private async extractNoteUrl(page: Page): Promise<string | undefined> {
    try {
      // 尝试从页面中提取笔记链接
      const link = await page.$('a[href*="/explore/"], a[href*="/discovery/item/"]');
      if (link) {
        return await link.getAttribute('href') || undefined;
      }
    } catch { /* ignore */ }
    return undefined;
  }

  /**
   * 加载保存的 Cookie
   */
  private loadCookies(): any[] {
    try {
      if (fs.existsSync(COOKIE_FILE)) {
        const data = fs.readFileSync(COOKIE_FILE, 'utf-8');
        return JSON.parse(data);
      }
    } catch { /* ignore */ }
    return [];
  }

  /**
   * 保存 Cookie 到文件
   */
  private saveCookies(cookies: any[]): void {
    try {
      if (!fs.existsSync(COOKIE_DIR)) {
        fs.mkdirSync(COOKIE_DIR, { recursive: true });
      }
      fs.writeFileSync(COOKIE_FILE, JSON.stringify(cookies, null, 2));
      console.log('[XHS] Cookie 已保存');
    } catch (err) {
      console.error('[XHS] 保存 Cookie 失败:', err);
    }
  }
}
