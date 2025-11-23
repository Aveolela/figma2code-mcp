import { Tool, ToolHandler } from './types.js';
import { calculatorTool, CalculatorHandler } from './calculator.js';
import { textProcessorTool, TextProcessorHandler } from './textProcessor.js';
import { figmaHelperTool, FigmaHelperHandler } from './figmaHelper.js';
import { exportsListTool, ExportsListHandler } from './exportsList.js';

// 工具注册表
interface ToolRegistration {
  tool: Tool;
  handler: ToolHandler;
}

class ToolRegistry {
  private tools: Map<string, ToolRegistration> = new Map();

  constructor() {
    this.registerDefaultTools();
  }

  private registerDefaultTools(): void {
    this.register(calculatorTool, new CalculatorHandler());
    this.register(textProcessorTool, new TextProcessorHandler());
    this.register(figmaHelperTool, new FigmaHelperHandler());
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