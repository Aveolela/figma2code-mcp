import { FigmaServer } from './server.js'

let figmaServer: FigmaServer | null = null;

export async function startFigmaServer() {
  figmaServer = new FigmaServer();
  await figmaServer.start();
  return figmaServer;
}

export function getFigmaServer() {
  return figmaServer;
}