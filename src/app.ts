import { createLarkChannel, LoggerLevel } from '@larksuiteoapi/node-sdk';
import { config } from './config';
import { handleMessage, initRootFolder } from './handler';
import { startScheduler } from './scheduler';

async function main() {
    // 初始化云盘文件夹（保留原有逻辑）
    await initRootFolder();

    // 创建 Channel
    const channel = createLarkChannel({
        appId: config.lark.appId,
        appSecret: config.lark.appSecret,
        policy: { requireMention: true, dmMode: 'open' },
        loggerLevel: LoggerLevel.info,
    });

    // 消息处理
    channel.on('message', async (msg) => {
        await handleMessage(channel, msg);
    });

    // 启动定时任务
    startScheduler();

    // 连接
    await channel.connect();
    console.log(`connected as ${channel.botIdentity!.name}`);

    // 优雅退出
    process.on('SIGINT', async () => {
        await channel.disconnect();
        process.exit(0);
    });
}

main().catch(console.error);
