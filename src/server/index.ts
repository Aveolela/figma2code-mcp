import { FigmaServer, ServerOptions } from './server.js'

let figmaServer: FigmaServer | null = null;

export async function startFigmaServer(options: ServerOptions = {}) {
  if (figmaServer && figmaServer.getStatus().isRunning) return figmaServer;
  figmaServer = new FigmaServer(options);
  await figmaServer.start();
  return figmaServer;
}

export function getFigmaServer() {
  return figmaServer;
}