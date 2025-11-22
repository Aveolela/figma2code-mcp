import { Tool, ToolHandler, ToolResult } from './types.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

export const textProcessorTool: Tool = {
  name: 'text_processor',
  description: '处理文本：转换大小写、计算长度、反转文本等',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['uppercase', 'lowercase', 'length', 'reverse', 'word_count'],
        description: '要执行的文本操作'
      },
      text: {
        type: 'string',
        description: '要处理的文本'
      }
    },
    required: ['action', 'text']
  }
};

export class TextProcessorHandler implements ToolHandler {
  async handle(args: any): Promise<ToolResult> {
    const { action, text } = args;
    
    let result: string | number;
    switch (action) {
      case 'uppercase':
        result = text.toUpperCase();
        break;
      case 'lowercase':
        result = text.toLowerCase();
        break;
      case 'length':
        result = text.length;
        break;
      case 'reverse':
        result = text.split('').reverse().join('');
        break;
      case 'word_count':
        result = text.trim().split(/\s+/).filter((word: string) => word.length > 0).length;
        break;
      default:
        throw new McpError(ErrorCode.InvalidParams, `不支持的文本操作: ${action}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: `文本处理结果: ${result}`
        }
      ]
    };
  }
}