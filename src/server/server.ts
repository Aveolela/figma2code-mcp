import express from 'express';
import cors from 'cors';
import * as path from 'path';
import { fileURLToPath } from 'url';
// 兼容ESM环境的__dirname写法（提升到文件顶部，供全文件使用）
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import exportRoutes from './routes/export.js';

export interface ServerOptions {
  port?: number;
  exportsPath?: string;
  configPath?: string;
}

export class FigmaServer {
  private app: express.Application;
  private server?: any; // http.Server
  private port: number;
  private exportsDir: string;
  private isRunning = false;

  constructor(options: ServerOptions = {}) {
    this.app = express();
    this.port = options.port || 12898;
    this.exportsDir = path.join(__dirname, '../exports');

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // CORS配置
    const corsOptions: cors.CorsOptions = {
      origin: (origin, callback) => {
        return callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
      optionsSuccessStatus: 200 // 支持老版本浏览器
    };

    this.app.use(cors(corsOptions));
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // 静态文件服务
    this.app.use('/exports', express.static(this.exportsDir));
    this.app.use(express.static(path.join(__dirname, '../')));
  }

  private setupRoutes(): void {
    // 路由配置
    this.app.use('/api', exportRoutes);

    // 根路径
    this.app.get('/', (req, res) => {
      res.json({ 
        status: 'ok', 
        message: 'Figma HTML Export Server 已启动', 
        port: this.port,
        exportsDir: this.exportsDir
      });
    });
  }

  private setupErrorHandling(): void {
    // 错误处理中间件
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Server Error:', err);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: process.env.NODE_ENV === 'development' ? err.message : '未知错误'
      });
    });

    // 404处理（不带路径以避免 path-to-regexp 解析 '*''）
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        message: '接口不存在'
      });
    });
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, 'localhost', () => {
          this.isRunning = true;
          console.log(`🚀 Figma HTML Export Server running on http://localhost:${this.port}`);
          console.log(`📁 Export directory: ${this.exportsDir}`);
          resolve();
        });

        this.server.on('error', (error: any) => {
          this.isRunning = false;
          reject(error);
        });
      } catch (error) {
        this.isRunning = false;
        reject(error);
      }
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server && this.isRunning) {
        this.server.close(() => {
          this.isRunning = false;
          console.log('🛑 Figma HTML Export Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  public getStatus() {
    return {
      isRunning: this.isRunning,
      port: this.port,
      exportsDir: this.exportsDir,
      url: `http://localhost:${this.port}`
    };
  }

  public getApp(): express.Application {
    return this.app;
  }
}