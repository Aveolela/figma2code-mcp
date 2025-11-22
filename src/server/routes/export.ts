import { Router, Request, Response } from 'express';
import * as path from 'path';
import { fileURLToPath } from 'url';
// ESM 环境下的 __dirname 兼容写法
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeFileName, saveBase64Image } from '../utils/fileUtils.js';
import { ExportRequest, ExportResponse, ExportMetadata } from '../types.js';

const router = Router();

// 动态获取导出目录，而不是硬编码
function getExportsDir(): string {
  // 默认路径
  return path.join(__dirname, '../../exports');
}

/**
 * 处理HTML中的base64图片，替换为相对路径
 * @param htmlContent - 原始HTML内容
 * @param savedImages - 已保存的图片映射 {elementId: filePath}
 * @param projectName - 项目名称
 * @param exportId - 导出ID
 * @param originalImages - 原始图片数据映射 {elementId: base64Data}
 * @returns 处理后的HTML内容
 */
const processHtmlImages = (
  htmlContent: string, 
  savedImages: Record<string, string>, 
  projectName: string, 
  exportId: string, 
  originalImages: Record<string, string> = {}
): string => {
  if (!savedImages || Object.keys(savedImages).length === 0) {
    return htmlContent;
  }

  console.log(`🖼️ Processing ${Object.keys(savedImages).length} images in HTML...`);
  
  // 创建base64数据到元素ID的映射
  const base64ToElementId: Record<string, string> = {};
  for (const [elementId, base64Data] of Object.entries(originalImages)) {
    if (typeof base64Data === 'string' && base64Data.startsWith('data:image/')) {
      // 提取纯base64数据部分
      const base64Content = base64Data.split(',')[1];
      if (base64Content) {
        // 使用前200个字符作为签名进行匹配
        const signature = base64Content.substring(0, 200);
        base64ToElementId[signature] = elementId;
      }
    }
  }
  
  // 正则表达式匹配base64图片
  const base64Regex = /background-image:\s*url\(['"]data:image\/(\w+);base64,([^'"]+)['"]\)/g;
  
  let processedHtml = htmlContent;
  let replacementCount = 0;
  
  // 替换所有base64图片引用
  processedHtml = processedHtml.replace(base64Regex, (match, imageType, base64Data) => {
    // 使用base64数据的前200个字符进行匹配
    const signature = base64Data.substring(0, 200);
    let matchedElementId: string | null = null;
    
    // 查找匹配的元素ID
    for (const [savedSignature, elementId] of Object.entries(base64ToElementId)) {
      if (savedSignature === signature) {
        matchedElementId = elementId;
        break;
      }
    }
    
    // 如果通过签名没找到，尝试遍历所有已保存的图片
    if (!matchedElementId) {
      const elementIds = Object.keys(savedImages);
      if (elementIds.length > 0) {
        // 简单策略：使用第一个可用的元素ID
        matchedElementId = elementIds[0];
        console.log(`  ⚠️ Using fallback element ID: ${matchedElementId}`);
      }
    }
    
    if (matchedElementId && savedImages[matchedElementId]) {
      // 计算相对路径: 从 {folderName}/{file}.html 到 {folderName}/images/{elementId}.ext
      const fileName = path.basename(savedImages[matchedElementId]);
      const relativePath = `./images/${fileName}`;
      replacementCount++;
      
      console.log(`  ✅ Replaced base64 image (${matchedElementId}) with: ${relativePath}`);
      return `background-image: url('${relativePath}')`;
    }
    
    // 如果没有找到匹配的图片文件，保持原样
    console.log(`  ⚠️ No matching image file found for base64 data`);
    return match;
  });
  
  console.log(`🎯 Replaced ${replacementCount} base64 images with relative paths`);
  return processedHtml;
};

// POST /api/export/html - 导出HTML文件
router.post('/export/html', async (req: Request<{}, ExportResponse, ExportRequest>, res: Response<ExportResponse>) => {
  try {
    const { projectName, fileName, htmlContent, metadata, images } = req.body;

    // 验证必需字段
    if (!htmlContent) {
      return res.status(400).json({
        success: false,
        message: 'HTML内容不能为空'
      });
    }

    // 获取当前的导出目录
    const EXPORTS_DIR = getExportsDir();
    console.log(`[Export Route] 使用导出目录: ${EXPORTS_DIR}`);

    // 生成唯一ID和时间戳
    const exportId = uuidv4();
    const timestamp = Date.now();
    const dateStr = new Date().toISOString().split('T')[0];
    
    // 处理文件名
    const safeProjectName = sanitizeFileName(projectName || 'figma-export');
    const safeFileName = sanitizeFileName(fileName || `export-${dateStr}`);
    const finalFileName = `${safeFileName}-${exportId.slice(0, 8)}.html`;

    // 创建本次导出的唯一文件夹
    const folderName = fileName || exportId.slice(0, 8);
    const exportDir = path.join(EXPORTS_DIR, folderName);
    await fs.ensureDir(exportDir);

    // 处理图片资源（先保存图片）
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

    // 处理HTML中的图片引用（将base64替换为相对路径）
    const processedHtml = processHtmlImages(htmlContent, savedImages, safeProjectName, exportId, images);

    // 保存处理后的HTML文件
    const htmlFilePath = path.join(exportDir, finalFileName);
    await fs.writeFile(htmlFilePath, processedHtml, 'utf8');

    // 保存元数据
    const exportMetadata: ExportMetadata = {
      id: exportId,
      projectName: safeProjectName,
      fileName: finalFileName,
      originalFileName: fileName,
      folderName: folderName,
      timestamp,
      dateCreated: new Date().toISOString(),
      htmlFilePath: finalFileName, // 文件夹内相对路径
      htmlFileSize: (await fs.stat(htmlFilePath)).size,
      metadata: metadata || {},
      images: savedImages,
      imageCount: Object.keys(savedImages).length
    };

    const metadataPath = path.join(exportDir, 'metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify(exportMetadata, null, 2), 'utf8');

    console.log(`✅ HTML exported successfully: ${finalFileName} (ID: ${exportId})`);

    res.json({
      success: true,
      message: 'HTML文件导出成功',
      data: {
        id: exportId,
        fileName: finalFileName,
        projectName: safeProjectName,
        timestamp,
        htmlUrl: `/exports/${folderName}/${finalFileName}`,
        previewUrl: `/api/preview/${folderName}`,
        detailUrl: `/api/export/${folderName}`,
        imageCount: Object.keys(savedImages).length
      }
    });

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      message: '导出失败',
      error: (error as Error).message
    });
  }
});

export default router;