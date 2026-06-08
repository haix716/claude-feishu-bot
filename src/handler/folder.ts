import { larkService } from '../lark';
import { config } from '../config';

/** 文件夹 token 缓存：key = "类型/日期", value = folder_token */
const folderCache = new Map<string, string>();

/** 根文件夹 token（启动时自动获取） */
let rootFolderToken = '';

/** 初始化根文件夹：自动创建"智能体文件"文件夹 */
export async function initRootFolder(): Promise<void> {
  try {
    if (config.driveFolderToken) {
      rootFolderToken = config.driveFolderToken;
      console.log(`✅ 使用配置的根文件夹: ${rootFolderToken}`);
      return;
    }

    console.log('📁 尝试自动获取根文件夹...');
    try {
      const rootToken = await larkService.getRootFolder();
      console.log('📁 根文件夹获取成功');

      console.log('📁 创建"智能体文件"文件夹...');
      rootFolderToken = await larkService.createFolder('智能体文件', rootToken);
      console.log('✅ 智能体文件夹创建成功');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`⚠️ 自动创建文件夹失败: ${message}`);
      console.log('   请在 .env 文件中设置 DRIVE_FOLDER_TOKEN（飞书云盘文件夹 token）');
      console.log('   或者手动在飞书云盘创建"智能体文件"文件夹并复制其 token');
    }
  } catch (err) {
    console.error('❌ 初始化根文件夹失败:', err);
    throw err;
  }
}

/** 获取根文件夹 token */
export function getRootFolderToken(): string {
  return rootFolderToken;
}

/** 获取或创建文件夹，返回 folder_token */
export async function getOrCreateFolder(folderPath: string): Promise<string> {
  if (folderCache.has(folderPath)) {
    return folderCache.get(folderPath)!;
  }

  if (!rootFolderToken) {
    throw new Error('根文件夹未初始化，请先调用 initRootFolder()');
  }

  const parts = folderPath.split('/').filter(Boolean);
  let currentToken = rootFolderToken;

  for (const part of parts) {
    currentToken = await larkService.createFolder(part, currentToken);
  }

  folderCache.set(folderPath, currentToken);
  return currentToken;
}
