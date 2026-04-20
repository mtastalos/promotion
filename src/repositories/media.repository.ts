import { Media, MediaType } from '../types/models';
import { BaseRepository } from './base.repository';
import { toOffset } from '../utils/pagination';

export interface CreateMediaInput {
  user_id: string;
  type: MediaType;
  file_path: string;
  filename: string;
  mime_type: string;
  file_size_bytes: number;
  width?: number;
  height?: number;
  duration_seconds?: number;
  metadata?: Record<string, unknown>;
}

export class MediaRepository extends BaseRepository {
  async findById(id: string): Promise<Media | null> {
    return this.queryOne<Media>(
      'SELECT * FROM media WHERE id = $1',
      [id]
    );
  }

  async findByIdAndUserId(id: string, userId: string): Promise<Media | null> {
    return this.queryOne<Media>(
      'SELECT * FROM media WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
  }

  async findByUserId(
    userId: string,
    type: MediaType | null,
    page: number,
    limit: number
  ): Promise<{ rows: Media[]; total: number }> {
    const offset = toOffset(page, limit);
    const [dataResult, countResult] = await Promise.all([
      this.query<Media>(
        `SELECT * FROM media
         WHERE user_id = $1
           AND ($2::media_type_enum IS NULL OR type = $2)
         ORDER BY created_at DESC
         LIMIT $3 OFFSET $4`,
        [userId, type, limit, offset]
      ),
      this.query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM media
         WHERE user_id = $1
           AND ($2::media_type_enum IS NULL OR type = $2)`,
        [userId, type]
      ),
    ]);

    return {
      rows: dataResult.rows,
      total: parseInt(countResult.rows[0]?.count ?? '0', 10),
    };
  }

  async create(input: CreateMediaInput): Promise<Media> {
    const media = await this.queryOne<Media>(
      `INSERT INTO media
         (user_id, type, file_path, filename, mime_type, file_size_bytes,
          width, height, duration_seconds, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        input.user_id,
        input.type,
        input.file_path,
        input.filename,
        input.mime_type,
        input.file_size_bytes,
        input.width ?? null,
        input.height ?? null,
        input.duration_seconds ?? null,
        input.metadata ? JSON.stringify(input.metadata) : null,
      ]
    );
    return media!;
  }

  async delete(id: string): Promise<void> {
    await this.query('DELETE FROM media WHERE id = $1', [id]);
  }
}

export const mediaRepository = new MediaRepository();
