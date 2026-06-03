import { Tool, ToolParameter } from './tool';

/**
 * 获取当前时间工具
 *
 * 让智能体能回答"今天几号""现在几点"等时间相关问题
 */
export class GetTimeTool extends Tool {
  name = 'get_current_time';
  description = '获取当前日期和时间，用于回答用户关于今天日期、现在时间等问题';
  parameters: Record<string, ToolParameter> = {};

  async execute(): Promise<string> {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'long',
    };
    return now.toLocaleString('zh-CN', options);
  }
}
