import fs from 'fs-extra';
import * as path from 'path';

/**
 * 清理文件名，移除非法字符
 * @param fileName - 原始文件名
 * @returns 清理后的文件名
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName) {
    return 'untitled';
  }
  
  return fileName
    .replace(/[<>:"/\\|?*]/g, '') // 移除Windows非法字符
    .replace(/\s+/g, '-') // 空格替换为横线
    .replace(/[^\w\-_.]/g, '') // 只保留字母数字横线下划线点
    .slice(0, 50) // 限制长度
    .toLowerCase();
}

/**
 * 保存base64图片到文件
 * @param base64Data - base64格式的图片数据
 * @param saveDir - 保存目录
 * @param fileName - 文件名
 * @returns 保存的文件路径
 */
export async function saveBase64Image(base64Data: string, saveDir: string, fileName: string): Promise<string> {
  try {
    // 确保目录存在
    await fs.ensureDir(saveDir);
    
    // 提取base64数据部分
    const matches = base64Data.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
    if (!matches) {
      throw new Error('Invalid base64 image data format');
    }
    
    const [, imageType, base64Content] = matches;
    
    // 根据图片类型设置文件扩展名
    const ext = imageType.toLowerCase();
    const finalFileName = fileName.replace(/\.[^.]*$/, `.${ext}`);
    
    // 转换base64为Buffer
    const imageBuffer = Buffer.from(base64Content, 'base64');
    
    // 保存文件
    const filePath = path.join(saveDir, finalFileName);
    await fs.writeFile(filePath, imageBuffer);
    
    console.log(`✅ Image saved: ${finalFileName} (${(imageBuffer.length / 1024).toFixed(2)} KB)`);
    return filePath;
  } catch (error) {
    console.error(`❌ Error saving image ${fileName}:`, error);
    throw error;
  }
}

/**
 * 检查路径是否存在
 * @param filePath - 文件或目录路径
 * @returns 是否存在
 */
export async function pathExists(filePath: string): Promise<boolean> {
  try {
    return await fs.pathExists(filePath);
  } catch (error) {
    return false;
  }
}
