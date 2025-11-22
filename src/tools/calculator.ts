import { Tool, ToolHandler, ToolResult } from './types.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

export const calculatorTool: Tool = {
  name: 'calculator',
  description: '执行基本的数学计算（加、减、乘、除）',
  inputSchema: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['add', 'subtract', 'multiply', 'divide'],
        description: '要执行的数学运算'
      },
      a: {
        type: 'number',
        description: '第一个数字'
      },
      b: {
        type: 'number',
        description: '第二个数字'
      }
    },
    required: ['operation', 'a', 'b']
  }
};

export class CalculatorHandler implements ToolHandler {
  async handle(args: any): Promise<ToolResult> {
    const { operation, a, b } = args;
    
    let result: number;
    switch (operation) {
      case 'add':
        result = a + b;
        break;
      case 'subtract':
        result = a - b;
        break;
      case 'multiply':
        result = a * b;
        break;
      case 'divide':
        if (b === 0) {
          throw new McpError(ErrorCode.InvalidParams, '除数不能为零');
        }
        result = a / b;
        break;
      default:
        throw new McpError(ErrorCode.InvalidParams, `不支持的运算: ${operation}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: `计算结果: ${a} ${operation} ${b} = ${result}`
        }
      ]
    };
  }
}