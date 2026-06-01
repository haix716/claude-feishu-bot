/**
 * 生成飞书卡片消息 JSON（schema 2.0，markdown 内容）
 */
export function generateCard(content: string) {
  return {
    schema: '2.0',
    config: { update_multi: true, streaming_mode: false },
    body: {
      direction: 'vertical',
      padding: '12px 12px 12px 12px',
      elements: [
        {
          tag: 'markdown',
          content,
          text_align: 'left',
          text_size: 'normal',
          margin: '0px 0px 0px 0px',
        },
      ],
    },
  };
}

/**
 * 节流函数：限制函数调用频率，确保最后一次调用不被丢弃
 */
export function pThrottle<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  intervalMs: number
): T {
  let lastCall = 0;
  let pendingArgs: any[] | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    if (pendingArgs === null) return;
    const args = pendingArgs;
    pendingArgs = null;
    lastCall = Date.now();
    fn(...args);
    schedule();
  };

  const schedule = () => {
    if (timer) clearTimeout(timer);
    if (pendingArgs === null) return;
    const elapsed = Date.now() - lastCall;
    const delay = Math.max(0, intervalMs - elapsed);
    timer = setTimeout(flush, delay);
  };

  return ((...args: any[]) => {
    pendingArgs = args;
    schedule();
  }) as T;
}
