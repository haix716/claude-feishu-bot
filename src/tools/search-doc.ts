import { Tool, ToolParameter } from './tool';

/**
 * 搜索飞书文档工具
 *
 * 让智能体能搜索飞书云文档，回答用户关于文档的问题
 */
export class SearchDocTool extends Tool {
  name = 'search_feishu_docs';
  description = '搜索飞书云文档，返回相关文档列表。用于回答用户关于文档、资料、文件等问题';
  parameters: Record<string, ToolParameter> = {
    query: {
      type: 'string',
      description: '搜索关键词',
    },
  };
  required = ['query'];

  private searchResults: Array<{ title: string; url: string }> = [];

  async execute(params: Record<string, any>): Promise<string> {
    const { query } = params;

    if (!query || typeof query !== 'string') {
      return '请提供搜索关键词';
    }

    try {
      // 调用飞书 API 搜索文档
      // TODO: 实现实际的搜索逻辑
      // const results = await larkService.searchDocs(query);

      // 暂时返回模拟结果
      this.searchResults = [
        { title: '示例文档1', url: 'https://feishu.cn/docs/xxx1' },
        { title: '示例文档2', url: 'https://feishu.cn/docs/xxx2' },
      ];

      if (this.searchResults.length === 0) {
        return `未找到与"${query}"相关的文档`;
      }

      const formatted = this.searchResults
        .map((doc, i) => `${i + 1}. ${doc.title}\n   链接: ${doc.url}`)
        .join('\n');

      return `找到 ${this.searchResults.length} 个相关文档：\n${formatted}`;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return `搜索失败: ${errorMsg}`;
    }
  }

  /**
   * 获取上次搜索结果（用于在回复中附带来源）
   */
  getLastResults(): Array<{ title: string; url: string }> {
    return this.searchResults;
  }
}
