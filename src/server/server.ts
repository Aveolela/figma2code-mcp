import * as path from 'path';
import { fileURLToPath } from 'url';
import { setupWebSocketExport } from './ws.js';

// 兼容ESM环境的__dirname写法（提升到文件顶部，供全文件使用）
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class FigmaServer {
  private wss?: any;
  private port: number;
  private exportsDir: string;
  private isRunning = false;

  constructor() {
    this.port = 12899;
    this.exportsDir = path.join(__dirname, '../exports');
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.wss = setupWebSocketExport(this.port);
        this.isRunning = true;
        console.log(`🛰️ Figma HTML Export WebSocket running on ws://localhost:${this.port}`);
        console.log(`📁 Export directory: ${this.exportsDir}`);
        resolve();
      } catch (error) {
        this.isRunning = false;
        reject(error);
      }
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.wss && this.isRunning) {
        try {
          this.wss.close(() => {
            this.isRunning = false;
            console.log('🛑 Figma HTML Export WebSocket stopped');
            resolve();
          });
        } catch (e) {
          this.isRunning = false;
          resolve();
        }
      } else {
        resolve();
      }
    });
  }
}