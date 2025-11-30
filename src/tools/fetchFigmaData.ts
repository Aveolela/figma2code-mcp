import { Tool, ToolHandler, ToolResult } from './types.js';
import * as path from 'path';
import * as os from 'os'
import { fetchFigmaData } from '../server/ws.js';
import { saveBase64ImageToFile } from './base64Image.js'

export const exportsListTool: Tool = {
  name: 'fetch-figma-data',
  description: '获取 figma 设计稿数据，并指示大模型进行语义化组件重构（包含图片资源迁移）',
  inputSchema: {
    type: 'object',
    properties: {
      framework: { type: 'string', description: '目标技术栈（vue 或 react）', enum: ['vue', 'react'] }
    },
    required: ['framework']
  }
};

export class ExportsListHandler implements ToolHandler {
  async handle(args: any): Promise<ToolResult> {
    const framework = args?.framework;

    // --- 1. 参数校验 ---
    if (!framework || !['vue', 'react'].includes(framework)) {
      return {
        content: [
          { type: 'text', text: '错误: framework 参数必须为 vue 或 react' }
        ]
      };
    }

    // --- 2. 读取 HTML 内容并组装 Prompt ---
    const data = await fetchFigmaData();
    const htmlContent = data?.response?.htmlContent || '';
    const images = data?.response?.images || {};

    const tempPath = os.tmpdir();
    saveBase64ImageToFile(images, path.join(tempPath, 'temp_images'));

    const ext = framework === 'vue' ? '.vue' : '.tsx';
    const instructions = [
      `\n=== 任务指令 (Task Instructions) ===`,
      `请根据上述内容，严格按照以下步骤执行操作：`,
      `1. [语义分析与目录创建]:`,
      `   - 分析 htmlContent 的内容意图`,
      `   - 决定一个符合语义的英文 PascalCase 组件名称，记为 {ComponentName}`,
      `   - 在工作区根目录下，创建一个名为 {ComponentName} 的新文件夹。`,
      `2. [图片迁移]:`,
      `   - 调用 mcp 提供的 getTempPath 工具获取系统临时路径，记为 {TempPath}，然后将 {TempPath}/temp_images 的文件夹内的所有图片，移动到 {ComponentName}/images 目录下。`,
      `   - 删除 {TempPath}/temp_images 文件夹。`,
      `3. [代码重构]:`,
      `   - 创建文件 {ComponentName}${ext} (与文件夹同名)。`,
      `   - 将 htmlContent 内容按照下面的要求重构为 ${framework} 组件代码，写入到文件中`,
      `     - 使用scss，不要使用Tailwind`,
      `     - 禁止使用gap属性，使用margin实现gap的效果`,
      `     - 单位使用px，不要使用百分比`,
      `     - 遵循清晰的BEM命名规范`,
      `     - 移除默认的css值，减少冗余代码`,
      `     - 移除font-family属性`,
      `     - 如果有多个属性可以简写，使用简写的方式输出`,
      `     ${framework === 'vue' ? '- .vue文件中template中使用的数据都通过props传入，且props需要有默认值' : ''}`,
      `4. [最终确认]: 操作完成后，请输出"已创建组件: {ComponentName}"。`
    ];

    const contentArr = [
      {
        type: 'text',
        text: `=== htmlContent ===\n${htmlContent}\n`
      },
      {
        type: 'text',
        text: instructions.join('\n')
      }
    ];

    return {
      content: contentArr as any
    };
  }
}