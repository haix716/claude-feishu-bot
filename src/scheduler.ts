import cron from 'node-cron';
import { larkService } from './lark';
import { config } from './config';
import { generateDailyInsightSummary } from './metacognition';

/** 匹配 {yyyyMMdd}(待处理) 格式的文件夹名 */
const PENDING_FOLDER_PATTERN = /^\{(\d{8})\}\(待处理\)$/;

/**
 * 启动定时任务
 */
export function startScheduler(): void {
  // 每天凌晨 2:00 执行清理任务
  cron.schedule('0 2 * * *', async () => {
    console.log('⏰ 执行定时任务：清理空的待处理文件夹');
    await cleanupEmptyFolders();
  });

  // 每日洞察推送（默认 08:00，可通过 DAILY_PUSH_HOUR 配置）
  const pushHour = config.dailyPush.hour;
  cron.schedule(`0 ${pushHour} * * *`, async () => {
    console.log(`⏰ 执行定时任务：每日洞察推送（${pushHour}:00）`);
    await pushDailyInsight();
  });

  console.log(`📅 定时任务已启动（每天 02:00 清理空文件夹，${pushHour}:00 每日洞察推送）`);
}

/**
 * 推送每日洞察摘要到飞书
 */
async function pushDailyInsight(): Promise<void> {
  try {
    const userId = config.dailyPush.userId;
    if (!userId) {
      console.log('⚠️ 未配置 DAILY_PUSH_USER_ID，跳过每日推送');
      return;
    }

    const summary = generateDailyInsightSummary();
    if (!summary) {
      console.log('⚠️ 无洞察数据，跳过推送');
      return;
    }

    const success = await larkService.sendMessage(userId, summary);
    if (success) {
      console.log('✅ 每日洞察推送成功');
    } else {
      console.error('❌ 每日洞察推送失败');
    }
  } catch (err) {
    console.error('❌ 每日洞察推送异常:', err);
  }
}

/**
 * 清理空的 {yyyyMMdd}(待处理) 文件夹
 */
async function cleanupEmptyFolders(): Promise<void> {
  try {
    // 获取根文件夹 token
    const rootToken = config.driveFolderToken || await larkService.getRootFolder();
    if (!rootToken) {
      console.error('❌ 无法获取根文件夹 token');
      return;
    }

    // 列出根文件夹下的所有子文件夹
    const folders = await larkService.listFolders(rootToken);
    console.log(`📁 根目录下共 ${folders.length} 个文件夹`);

    // 筛选匹配 {yyyyMMdd}(待处理) 模式的文件夹
    const pendingFolders = folders.filter(f => PENDING_FOLDER_PATTERN.test(f.name));
    console.log(`🔍 找到 ${pendingFolders.length} 个待处理文件夹`);

    if (pendingFolders.length === 0) {
      console.log('✅ 无需清理');
      return;
    }

    // 检查并删除空文件夹
    let deletedCount = 0;
    for (const folder of pendingFolders) {
      const contentCount = await larkService.listFolderContents(folder.token);
      if (contentCount === 0) {
        const success = await larkService.deleteFile(folder.token, 'folder');
        if (success) {
          console.log(`🗑️ 已删除空文件夹: ${folder.name}`);
          deletedCount++;
        } else {
          console.error(`❌ 删除失败: ${folder.name}`);
        }
      } else if (contentCount > 0) {
        console.log(`📂 跳过非空文件夹: ${folder.name}（含 ${contentCount} 个文件）`);
      }
    }

    console.log(`✅ 清理完成：共删除 ${deletedCount} 个空文件夹`);
  } catch (err) {
    console.error('❌ 清理任务执行失败:', err);
  }
}
