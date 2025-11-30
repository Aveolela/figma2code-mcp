import * as path from 'path';
import fs from 'fs-extra';

/**
 * 将 base64 图片内容保存为文件
 * @param images base64 图片数据（如：data:image/png;base64,...）
 * @param imagesDir 图片保存目录
 * @returns 图片文件的绝对路径
 */
export async function saveBase64ImageToFile(images: Record<string, string>, imagesDir: string): Promise<string[]> {
  const savedPaths: string[] = [];
  console.log('🖼️ Saving base64 images to files...', imagesDir);
  await fs.ensureDir(imagesDir);
  for (const [key, base64Data] of Object.entries(images)) {
    if (!base64Data.startsWith('data:image/')) {
      throw new Error(`不是有效的 base64 图片数据: ${key}`);
    }
    const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      throw new Error(`base64 图片数据格式不正确: ${key}`);
    }
    const ext = matches[1];
    const base64Content = matches[2];
    const buffer = Buffer.from(base64Content, 'base64');
    const fileName = `${key}.${ext}`;
    const imagePath = path.join(imagesDir, fileName);
    await fs.writeFile(imagePath, buffer);
    savedPaths.push(imagePath);
  }
  return savedPaths;
}
