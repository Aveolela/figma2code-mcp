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

// 工具处理结果接口
export type ToolResult = {
  content: Array<
    | { type: 'text'; text: string }
    | { type: 'image'; url: string }
    | { type: 'resource'; url: string }
    | { type: 'json'; data: any }
  >;
};

// 工具处理器接口
export interface ToolHandler {
  handle(args: any): Promise<ToolResult>;
}