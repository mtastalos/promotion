import path from 'path';
import fs from 'fs';
import { Media, MediaType } from '../types/models';
import { mediaRepository, CreateMediaInput } from '../repositories/media.repository';
import { buildPaginatedResult, PaginatedResult } from '../utils/pagination';
import { env } from '../config/env';

const MIME_TO_TYPE: Record<string, MediaType> = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'video/mp4': 'video',
  'video/quicktime': 'video',
  'video/webm': 'video',
};

export const mediaService = {
  async upload(
    userId: string,
    file: Express.Multer.File,
    metadata?: Record<string, unknown>
  ): Promise<Media> {
    const mediaType = MIME_TO_TYPE[file.mimetype];
    if (!mediaType) {
      throw Object.assign(new Error(`Unsupported file type: ${file.mimetype}`), { statusCode: 422 });
    }

    const input: CreateMediaInput = {
      user_id: userId,
      type: mediaType,
      file_path: file.path,
      filename: file.originalname,
      mime_type: file.mimetype,
      file_size_bytes: file.size,
      metadata,
    };

    return mediaRepository.create(input);
  },

  async list(
    userId: string,
    type: MediaType | null,
    page: number,
    limit: number
  ): Promise<PaginatedResult<Media>> {
    const { rows, total } = await mediaRepository.findByUserId(userId, type, page, limit);
    return buildPaginatedResult(rows, total, page, limit);
  },

  async delete(id: string, userId: string): Promise<void> {
    const media = await mediaRepository.findByIdAndUserId(id, userId);
    if (!media) {
      throw Object.assign(new Error('Media not found'), { statusCode: 404 });
    }

    // Remove file from disk; log but don't block on fs errors
    try {
      const fullPath = path.isAbsolute(media.file_path)
        ? media.file_path
        : path.join(process.cwd(), media.file_path);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch (err) {
      console.error(`Failed to delete file ${media.file_path}:`, err);
    }

    await mediaRepository.delete(id);
  },
};
