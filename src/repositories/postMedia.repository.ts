import { PostMedia } from '../types/models';
import { BaseRepository } from './base.repository';

export class PostMediaRepository extends BaseRepository {
  async findByPostId(postId: string): Promise<PostMedia[]> {
    return this.queryMany<PostMedia>(
      'SELECT * FROM post_media WHERE post_id = $1 ORDER BY display_order ASC',
      [postId]
    );
  }

  async attach(postId: string, mediaId: string, displayOrder = 0): Promise<PostMedia> {
    const row = await this.queryOne<PostMedia>(
      `INSERT INTO post_media (post_id, media_id, display_order)
       VALUES ($1, $2, $3)
       ON CONFLICT (post_id, media_id) DO UPDATE SET display_order = EXCLUDED.display_order
       RETURNING *`,
      [postId, mediaId, displayOrder]
    );
    return row!;
  }

  async detach(postId: string, mediaId: string): Promise<void> {
    await this.query(
      'DELETE FROM post_media WHERE post_id = $1 AND media_id = $2',
      [postId, mediaId]
    );
  }

  async detachAll(postId: string): Promise<void> {
    await this.query('DELETE FROM post_media WHERE post_id = $1', [postId]);
  }
}

export const postMediaRepository = new PostMediaRepository();
