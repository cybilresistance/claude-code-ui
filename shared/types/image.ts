export interface StoredImage {
  id: string;
  filename: string;
  originalName: string;
  storedAs?: string;
  mimeType: string;
  size: number;
  sha256?: string;
  uploadedAt: string;
  storagePath?: string;
  chatId?: string;
}

export interface ImageUploadResult {
  success: boolean;
  images?: StoredImage[];
  image?: StoredImage;
  errors?: string[];
  error?: string;
}
