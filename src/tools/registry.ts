import { Tool, ToolHandler } from './types.js';
import { exportsListTool, ExportsListHandler } from './transform_figma_export.js';

// 只注册 transform_figma_export 工具
interface ToolRegistration {
  tool: Tool;
  handler: ToolHandler;
}

class ToolRegistry {
  private tools: Map<string, ToolRegistration> = new Map();

  constructor() {
    this.register(exportsListTool, new ExportsListHandler());
  }

  register(tool: Tool, handler: ToolHandler): void {
    this.tools.set(tool.name, { tool, handler });
  }

  getTools(): Tool[] {
    return Array.from(this.tools.values()).map(reg => reg.tool);
  }

  getHandler(toolName: string): ToolHandler | undefined {
    return this.tools.get(toolName)?.handler;
  }

  hasHandler(toolName: string): boolean {
    return this.tools.has(toolName);
  }
}

export const toolRegistry = new ToolRegistry();