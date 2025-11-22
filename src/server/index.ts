import { FigmaServer, ServerOptions } from './server.js'

// 创建并启动服务器
const figmaServer = new FigmaServer({
  exportsPath: './exports'
});
figmaServer.start();