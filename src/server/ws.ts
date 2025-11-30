import { WebSocketServer, WebSocket } from 'ws';
import * as path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeFileName, saveBase64Image } from './utils/fileUtils.js';

type IncomingExportMessage = {
  type: 'exportHTML';
  payload: {
    projectName?: string;
    fileName?: string;
    htmlContent: string;
    metadata?: Record<string, any>;
    images?: Record<string, string>;
  };
};

type OutgoingMessage = {
  type: 'export-result' | 'export-error' | 'export-progress';
  payload: any;
};

enum EMessageType {
  CHECK_SERVER_HEALTH = 'checkServerHealth',
  FIGMA_DATA = 'figma-data'
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const base64Regex = /background-image:\s*url\(['"]data:image\/(\w+);base64,([^'\"]+)['"]\)/g;

function getExportsDir(): string {
  return path.join(__dirname, '../exports');
}

function processHtmlImages(
  htmlContent: string,
  savedImages: Record<string, string>,
  originalImages: Record<string, string> = {}
): string {
  if (!savedImages || Object.keys(savedImages).length === 0) return htmlContent;

  const base64ToElementId: Record<string, string> = {};
  for (const [elementId, base64Data] of Object.entries(originalImages)) {
    if (typeof base64Data === 'string' && base64Data.startsWith('data:image/')) {
      const base64Content = base64Data.split(',')[1];
      if (base64Content) {
        const signature = base64Content.substring(0, 200);
        base64ToElementId[signature] = elementId;
      }
    }
  }

  let processedHtml = htmlContent;
  processedHtml = processedHtml.replace(base64Regex, (match, imageType, base64Data) => {
    const signature = base64Data.substring(0, 200);
    let matchedElementId: string | null = null;
    for (const [savedSignature, elementId] of Object.entries(base64ToElementId)) {
      if (savedSignature === signature) {
        matchedElementId = elementId;
        break;
      }
    }

    if (!matchedElementId) {
      const elementIds = Object.keys(savedImages);
      if (elementIds.length > 0) matchedElementId = elementIds[0];
    }

    if (matchedElementId && savedImages[matchedElementId]) {
      const fileName = path.basename(savedImages[matchedElementId]);
      const relativePath = `./images/${fileName}`;
      return `background-image: url('${relativePath}')`;
    }

    return match;
  });

  return processedHtml;
}

function handleHealth(ws: WebSocket, msg: any) {
  // 返回健康状态
  ws.send(JSON.stringify({
    id: msg.id,
    type: 'checkServerHealth',
    payload: { ok: true }
  }));
}

async function handleFigmaData(ws: WebSocket, msg: IncomingExportMessage) {
  const { projectName, fileName, htmlContent, metadata, images } = msg.payload;
  if (!htmlContent) {
    const errMsg: OutgoingMessage = { type: 'export-error', payload: { message: 'HTML内容不能为空' } };
    ws.send(JSON.stringify(errMsg));
    return;
  }

  const EXPORTS_DIR = getExportsDir();
  const exportId = uuidv4();
  const timestamp = Date.now();
  const dateStr = new Date().toISOString().split('T')[0];

  const safeProjectName = sanitizeFileName(projectName || 'figma-export');
  const safeFileName = sanitizeFileName(fileName || `export-${dateStr}`);
  const finalFileName = `${safeFileName}-${exportId.slice(0, 8)}.html`;

  const folderName = fileName || exportId.slice(0, 8);
  const exportDir = path.join(EXPORTS_DIR, folderName);
  console.log(`[WebSocket Export] 使用导出目录: ${exportDir}`);
  await fs.ensureDir(exportDir);

  const imagesDir = path.join(exportDir, 'images');
  await fs.ensureDir(imagesDir);
  const savedImages: Record<string, string> = {};
  if (images && typeof images === 'object') {
    for (const [elementId, base64Data] of Object.entries(images)) {
      if (typeof base64Data === 'string' && base64Data.startsWith('data:image/')) {
        try {
          const imagePath = await saveBase64Image(base64Data, imagesDir, `${elementId}.png`);
          savedImages[elementId] = imagePath;
        } catch (imgErr) {
          console.warn(`Failed to save image for element ${elementId}:`, (imgErr as Error).message);
        }
      }
    }
  }

  const processedHtml = processHtmlImages(htmlContent, savedImages, images || {});

  const htmlFilePath = path.join(exportDir, finalFileName);
  await fs.writeFile(htmlFilePath, processedHtml, 'utf8');

  const exportMetadata = {
    id: exportId,
    projectName: safeProjectName,
    fileName: finalFileName,
    originalFileName: fileName,
    folderName,
    timestamp,
    dateCreated: new Date().toISOString(),
    htmlFilePath: finalFileName,
    htmlFileSize: (await fs.stat(htmlFilePath)).size,
    metadata: metadata || {},
    images: savedImages,
    imageCount: Object.keys(savedImages).length
  };

  const metadataPath = path.join(exportDir, 'metadata.json');
  await fs.writeFile(metadataPath, JSON.stringify(exportMetadata, null, 2), 'utf8');

  const resultMsg: OutgoingMessage = {
    type: 'export-result',
    payload: {
      id: exportId,
      fileName: finalFileName,
      projectName: safeProjectName,
      timestamp,
      htmlUrl: `/exports/${folderName}/${finalFileName}`,
      previewUrl: `/api/preview/${folderName}`,
      detailUrl: `/api/export/${folderName}`,
      imageCount: Object.keys(savedImages).length
    }
  };

  ws.send(JSON.stringify(resultMsg));
}

let wss: WebSocketServer | null = null;
let singleClient: WebSocket | null = null;

export function setupWebSocketExport(serverOrPort: any) {
  wss = new WebSocketServer({ port: serverOrPort });

  wss.on('connection', (ws: WebSocket) => {
    console.log('🛰️ WebSocket connection established!');

    // 单客户端场景：保存当前连接为 singleClient
    singleClient = ws;

    ws.on('message', async (data: WebSocket.RawData) => {
      try {
        const msg = JSON.parse(data.toString());
        if (!msg) return;

        switch (msg.type) {
          case EMessageType.CHECK_SERVER_HEALTH:
            handleHealth(ws, msg);
            break;
          case EMessageType.FIGMA_DATA:
            await handleFigmaData(ws, msg);
            break;
          default:
            break;
        }
      } catch (err) {
        console.error('WebSocket message handling error:', err);
      }
    });

    ws.on('close', () => {
      // 清理 singleClient
      if (singleClient === ws) singleClient = null;
    });
  });

  return wss;
}

export function fetchFigmaData(timeout = 5000): Promise<{ sent: number; response?: any }> {
  return new Promise((resolve) => {
    if (!wss) return resolve({ sent: 0 });
    if (!singleClient || singleClient.readyState !== singleClient.OPEN) return resolve({ sent: 0 });

    const client = singleClient;
    const requestId = uuidv4();
    const payload = {
      type: 'figma-data',
      id: requestId,
      payload: { time: new Date().toISOString() }
    };

    let settled = false;
    const handler = (data: WebSocket.RawData) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg && msg.type === 'figma-data-response' && msg.id === requestId) {
          if (!settled) {
            settled = true;
            try { client.removeListener('message', handler); } catch (e) { }
            return resolve({ sent: 1, response: msg.payload });
          }
        }
      } catch (e) { }
    };

    client.on('message', handler);
    try { client.send(JSON.stringify(payload)); } catch (e) {
      try { client.removeListener('message', handler); } catch (e) { }
      return resolve({ sent: 0 });
    }

    setTimeout(() => {
      if (!settled) {
        settled = true;
        try { client.removeListener('message', handler); } catch (e) { }
        resolve({ sent: 1 });
      }
    }, timeout);
  });
}
