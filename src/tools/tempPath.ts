import { Tool, ToolHandler, ToolResult } from './types.js';
import os from 'os';

export const tempPathTool: Tool = {
  name: 'getTempPath',
  description: '获取系统临时目录路径',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
};

export class TempPathHandler implements ToolHandler {
  async handle(): Promise<ToolResult> {
    const tempDir = os.tmpdir();
    return {
      content: [
        { type: 'text', text: tempDir },
      ],
    };
  }
}
