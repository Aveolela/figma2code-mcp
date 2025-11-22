import { Tool, ToolHandler, ToolResult } from './types.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

export const figmaHelperTool: Tool = {
  name: 'figma_helper',
  description: 'Figma设计相关的辅助工具',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['generate_component_code', 'color_palette', 'spacing_guide'],
        description: '要执行的Figma操作'
      },
      component_type: {
        type: 'string',
        enum: ['button', 'card', 'input', 'modal'],
        description: '组件类型（当action为generate_component_code时使用）'
      },
      colors: {
        type: 'array',
        items: { type: 'string' },
        description: '颜色列表（当action为color_palette时使用）'
      }
    },
    required: ['action']
  }
};

export class FigmaHelperHandler implements ToolHandler {
  async handle(args: any): Promise<ToolResult> {
    const { action, component_type, colors } = args;
    
    let result: string;
    switch (action) {
      case 'generate_component_code':
        if (!component_type) {
          throw new McpError(ErrorCode.InvalidParams, '需要指定组件类型');
        }
        result = this.generateComponentCode(component_type);
        break;
        
      case 'color_palette':
        if (!colors || !Array.isArray(colors)) {
          throw new McpError(ErrorCode.InvalidParams, '需要提供颜色数组');
        }
        result = this.generateColorPalette(colors);
        break;
        
      case 'spacing_guide':
        result = this.generateSpacingGuide();
        break;
        
      default:
        throw new McpError(ErrorCode.InvalidParams, `不支持的Figma操作: ${action}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: result
        }
      ]
    };
  }

  private generateComponentCode(componentType: string): string {
    const templates = {
      button: `// React Button Component
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  disabled = false 
}) => {
  return (
    <button 
      className={\`btn btn-\${variant}\`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};`,

      card: `// React Card Component
interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ title, children, className }) => {
  return (
    <div className={\`card \${className || ''}\`}>
      {title && <div className="card-header">{title}</div>}
      <div className="card-content">
        {children}
      </div>
    </div>
  );
};`,

      input: `// React Input Component
interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'password';
  disabled?: boolean;
}

export const Input: React.FC<InputProps> = ({ 
  value, 
  onChange, 
  placeholder, 
  type = 'text', 
  disabled = false 
}) => {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="input"
    />
  );
};`,

      modal: `// React Modal Component
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          {title && <h2>{title}</h2>}
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};`
    };

    return templates[componentType as keyof typeof templates] || 
           `// 暂不支持 ${componentType} 组件模板`;
  }

  private generateColorPalette(colors: string[]): string {
    const cssVars = colors.map((color, index) => 
      `  --color-${index + 1}: ${color};`
    ).join('\n');
    
    const scssVars = colors.map((color, index) => 
      `$color-${index + 1}: ${color};`
    ).join('\n');

    return `CSS 颜色变量：
:root {
${cssVars}
}

SCSS 颜色变量：
${scssVars}

Tailwind 配置：
module.exports = {
  theme: {
    extend: {
      colors: {
${colors.map((color, index) => `        'custom-${index + 1}': '${color}',`).join('\n')}
      }
    }
  }
}`;
  }

  private generateSpacingGuide(): string {
    return `设计系统间距指南：

CSS 间距变量：
:root {
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-2xl: 48px;
  --spacing-3xl: 64px;
}

Tailwind 间距类：
- p-1 (4px)
- p-2 (8px) 
- p-4 (16px)
- p-6 (24px)
- p-8 (32px)
- p-12 (48px)
- p-16 (64px)

使用建议：
- 组件内部间距：4px-8px
- 组件间间距：16px-24px  
- 页面布局间距：32px-64px`;
  }
}