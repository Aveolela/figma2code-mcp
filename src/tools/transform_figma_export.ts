import { Tool, ToolHandler, ToolResult } from './types.js';
import fs from 'fs-extra';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM __dirname
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const exportsListTool: Tool = {
  name: 'transform_figma_export',
  description: '读取指定目录下的 HTML 文件，并指示大模型进行语义化组件重构（包含图片资源迁移）',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: '相对于 exports 的子路径，默认根目录' },
      recursive: { type: 'boolean', description: '是否递归列出子目录', default: false },
      framework: { type: 'string', description: '目标技术栈（vue 或 react）', enum: ['vue', 'react'] }
    },
    required: ['path', 'framework']
  }
};

export class ExportsListHandler implements ToolHandler {
  async handle(args: any): Promise<ToolResult> {
    const subPath = args?.path || '';
    const recursive = !!args?.recursive;
    const framework = args?.framework;

    // --- 1. 参数校验 ---
    if (!framework || !['vue', 'react'].includes(framework)) {
      return {
        content: [
          { type: 'text', text: '错误: framework 参数必须为 vue 或 react' }
        ]
      };
    }

    // --- 2. 路径定义 ---
    const EXPORTS_DIR = process.env.EXPORTS_DIR || path.join(__dirname, '../exports');
    // 假设工作区根目录在代码的上两级
    const targetDir = path.join(EXPORTS_DIR, subPath);

    if (!fs.existsSync(targetDir)) {
      return {
        content: [
          { type: 'text', text: `错误: 目录不存在: ${targetDir}` }
        ]
      };
    }

    // --- 3. 扫描文件与图片目录 ---
    const htmlFiles: Array<{ full: string; name: string }> = [];
    let imagesDir: string | null = null;
    const fileList: string[] = [];

    const walk = async (dir: string) => {
      const items = await fs.readdir(dir);
      for (const item of items) {
        const full = path.join(dir, item);
        const stat = await fs.stat(full);
        
        fileList.push(item);

        if (item.endsWith('.html') && !stat.isDirectory()) {
          htmlFiles.push({ full, name: item });
        }
        // 记录原始图片目录绝对路径
        if (item === 'images' && stat.isDirectory()) {
          imagesDir = full;
        }
        
        if (recursive && stat.isDirectory()) {
          await walk(full);
        }
      }
    };

    await walk(targetDir);

    // --- 4. 读取 HTML 内容并组装 Prompt ---
    const contentArr: { type: 'text'; text: string }[] = [];
    
    for (const { full, name } of htmlFiles) {
      const htmlContent = await fs.readFile(full, 'utf-8');
      contentArr.push({ 
        type: 'text', 
        text: `=== 源文件: ${name} ===\n${htmlContent}\n======================` 
      });
    }

    // 确定文件后缀
    const ext = framework === 'vue' ? '.vue' : '.tsx';

    // --- 5. 核心优化：语义化任务指令 ---
    const instructions = [
      `\n=== 任务指令 (Task Instructions) ===`,
      `请根据上述 HTML 内容，严格按照以下步骤执行操作：`,
      
      `1. [语义分析与目录创建]:`,
      `   - 分析 HTML 的内容意图（例如：它是登录页? 仪表盘? 还是列表页?）。`,
      `   - 决定一个符合语义的英文 PascalCase 组件名称，记为 {ComponentName} (例如: LoginCard, DataDashboard)。`,
      `   - 在工作区根目录下，创建一个名为 {ComponentName} 的新文件夹。`,
      
      `2. [代码重构]:`,
      `   - 将 HTML 重构为 ${framework} 组件代码。`,
      `   - 必须将组件文件命名为 {ComponentName}${ext} (与文件夹同名)。`,
      `   - 将该文件保存到刚才创建的文件夹中`,
    ];

    if (imagesDir) {
      instructions.push(`3. [图片资源内聚]:`);
      instructions.push(`   - 原始图片目录: ${imagesDir}`);
      instructions.push(`   - 请帮忙将该目录下的所有图片，复制到 {ComponentName} 下的 "images" 子目录中`);
      instructions.push(`   - **重要**: 在生成的代码中，请确保图片引用路径更新为相对路径，例如 src="./images/logo.png"。`);
    } else {
      instructions.push(`3. [图片资源]: 未检测到 images 目录，无需处理。`);
    }

    instructions.push(`4. [最终确认]: 操作完成后，请输出"已创建组件: {ComponentName}"。`);

    contentArr.push({ type: 'text', text: instructions.join('\n') });

    return {
      content: contentArr
    };
  }
}