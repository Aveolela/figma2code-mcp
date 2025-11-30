# figma2code MCP Server 

### 1. 配置 figma2code-mcp

```json
{
  "mcpServers": {
    "figma2code": {
      "command": "npx",
      "args": ["figma2code-mcp"],
    }
  }
}
```

### 2. 安装 Figma 客户端

### 3. 搜索安装 Figma 插件 figma2code

### 4. 选中想要生成代码的 Figma 元素，就可以看到预览效果

### 5. 在 AI 编辑器中输入 prompt 指令，生成代码文件

```plaintext
调用 mcp getFigmaData 工具，获取 figma 设计稿的数据，并根据大模型指示将其重构为 vue/react 的组件
```