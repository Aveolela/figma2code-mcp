# F2C MCP Server 示例工具

这个 MCP 服务器包含了三个示例工具，演示了如何创建和使用 MCP 工具。

## 🛠️ 可用工具

### 1. 计算器 (calculator)
执行基本的数学运算。

**参数：**
- `operation`: 运算类型 (add/subtract/multiply/divide)
- `a`: 第一个数字
- `b`: 第二个数字

**示例：**
```json
{
  "operation": "add",
  "a": 10,
  "b": 5
}
```

### 2. 文本处理器 (text_processor)  
处理文本内容，支持多种文本操作。

**参数：**
- `action`: 操作类型 (uppercase/lowercase/length/reverse/word_count)
- `text`: 要处理的文本

**示例：**
```json
{
  "action": "uppercase",
  "text": "hello world"
}
```

### 3. Figma 助手 (figma_helper)
Figma 设计相关的辅助工具。

**参数：**
- `action`: 操作类型 (generate_component_code/color_palette/spacing_guide)
- `component_type`: 组件类型 (button/card/input/modal) - 生成组件代码时使用
- `colors`: 颜色数组 - 生成调色板时使用

**示例：**

生成按钮组件代码：
```json
{
  "action": "generate_component_code",
  "component_type": "button"
}
```

生成调色板：
```json
{
  "action": "color_palette", 
  "colors": ["#FF6B6B", "#4ECDC4", "#45B7D1"]
}
```

生成间距指南：
```json
{
  "action": "spacing_guide"
}
```

## 🚀 使用方法

1. **构建项目：**
   ```bash
   npm run build
   ```

2. **启动服务器：**
   ```bash
   npm start
   ```

3. **使用 MCP Inspector 测试：**
   ```bash
   npm run inspector
   ```

## 📁 项目结构

```
f2c/
├── src/
│   └── index.ts          # 主服务器文件
├── build/                # 编译输出目录
├── package.json
├── tsconfig.json
└── README.md
```

## 🔧 开发提示

- 修改 `src/index.ts` 添加新工具
- 每个工具需要定义名称、描述和输入模式
- 使用 `npm run watch` 进行开发时自动编译
- 使用 MCP Inspector 可以方便地测试工具功能

## 📝 添加新工具

1. 定义工具接口：
```typescript
const myTool: Tool = {
  name: 'my_tool',
  description: '工具描述',
  inputSchema: {
    type: 'object',
    properties: {
      // 参数定义
    },
    required: ['param1']
  }
};
```

2. 添加到工具列表：
```typescript
const tools = [calculatorTool, textProcessorTool, figmaHelperTool, myTool];
```

3. 实现工具处理逻辑：
```typescript
case 'my_tool':
  return await this.handleMyTool(args);
```

4. 创建处理函数：
```typescript
private async handleMyTool(args: any) {
  // 工具逻辑实现
  return {
    content: [{
      type: 'text',
      text: '工具执行结果'
    }]
  };
}
```