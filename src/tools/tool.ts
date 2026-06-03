/**
 * 工具基类
 *
 * 所有工具都继承这个基类，实现 name、description、parameters 和 execute 方法
 * ToolManager 负责注册和执行工具
 */

export interface ToolParameter {
  type: string;
  description: string;
  required?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ToolParameter>;
    required?: string[];
  };
}

/**
 * 工具抽象基类
 */
export abstract class Tool {
  abstract name: string;
  abstract description: string;
  abstract parameters: Record<string, ToolParameter>;
  required?: string[];

  /**
   * 获取工具定义（用于传给大模型）
   */
  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: 'object',
        properties: this.parameters,
        required: this.required || [],
      },
    };
  }

  /**
   * 执行工具（子类实现）
   */
  abstract execute(params: Record<string, any>): Promise<string>;
}

/**
 * 工具管理器 - 注册和执行工具
 */
export class ToolManager {
  private tools = new Map<string, Tool>();

  /**
   * 注册工具
   */
  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * 获取所有工具定义（传给大模型）
   */
  getDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(t => t.getDefinition());
  }

  /**
   * 执行工具
   */
  async execute(name: string, params: Record<string, any>): Promise<string> {
    const tool = this.tools.get(name);
    if (!tool) {
      return `工具 "${name}" 不存在`;
    }

    try {
      return await tool.execute(params);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return `工具执行失败: ${errorMsg}`;
    }
  }

  /**
   * 检查工具是否存在
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * 获取工具数量
   */
  get size(): number {
    return this.tools.size;
  }
}
