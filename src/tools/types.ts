// 工具定义接口
export interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

// 工具处理结果接口
export type ToolResult = CallToolResult;

// 工具处理器接口
export interface ToolHandler {
  handle(args: any): Promise<ToolResult>;
}