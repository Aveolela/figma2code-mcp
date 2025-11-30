import { Tool, ToolHandler } from './types.js';
import { exportsListTool, ExportsListHandler } from './fetchFigmaData.js';
import { tempPathTool, TempPathHandler } from './tempPath.js';

interface ToolRegistration {
  tool: Tool;
  handler: ToolHandler;
}

class ToolRegistry {
  private tools: Map<string, ToolRegistration> = new Map();

  constructor() {
    this.register(exportsListTool, new ExportsListHandler());
    this.register(tempPathTool, new TempPathHandler());
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