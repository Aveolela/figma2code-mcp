// 导出相关的类型定义

export interface ExportMetadata {
  id: string;
  projectName: string;
  fileName: string;
  originalFileName?: string;
  folderName: string;
  timestamp: number;
  dateCreated: string;
  htmlFilePath: string;
  htmlFileSize: number;
  metadata?: Record<string, any>;
  images: Record<string, string>;
  imageCount: number;
}

export interface ExportRequest {
  projectName?: string;
  fileName?: string;
  htmlContent: string;
  metadata?: Record<string, any>;
  images?: Record<string, string>;
}

export interface ExportResponse {
  success: boolean;
  message: string;
  data?: {
    id: string;
    fileName: string;
    projectName: string;
    timestamp: number;
    htmlUrl: string;
    previewUrl: string;
    detailUrl: string;
    imageCount: number;
  };
  error?: string;
}
