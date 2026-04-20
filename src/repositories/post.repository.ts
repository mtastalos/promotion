import { Post, PostStatus, PostType, Platform, PostWithInstances } from '../types/models';
import { BaseRepository } from './base.repository';
import { toOffset } from '../utils/pagination';

export interface CreatePostInput {
  profile_id: string;
  user_id: string;
  caption?: string;
  hashtags?: string[];
  post_type: PostType;
  original_post_id?: string;
}

export interface UpdatePostInput {
  caption?: string;
  hashtags?: string[];
  status?: PostStatus;
  scheduled_at?: Date | null;
  published_at?: Date | null;
}

export interface PostFilters {
  profile_id: string;
  platform?: Platform;
  status?: PostStatus;
  post_type?: PostType;
  from?: Date;
  to?: Date;
  page: number;
  limit: number;
}

export class PostRepository extends BaseRepository {
  async findById(id: string): Promise<Post | null> {
    return this.queryOne<Post>(
      'SELECT * FROM posts WHERE id = $1',
      [id]
    );
  }

  async findByIdAndUserId(id: string, userId: string): Promise<Post | null> {
    return this.queryOne<Post>(
      'SELECT * FROM posts WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
  }

  async findWithFilters(filters: PostFilters): Promise<{ rows: PostWithInstances[]; total: number }> {
    const offset = toOffset(filters.page, filters.limit);

    const baseWhere = `
      p.profile_id = $1
      AND ($2::platform_enum    IS NULL OR ppi.platform  = $2)
      AND ($3::post_status_enum IS NULL OR p.status      = $3)
      AND ($4::post_type_enum   IS NULL OR p.post_type   = $4)
      AND ($5::timestamptz      IS NULL OR p.scheduled_at >= $5)
      AND ($6::timestamptz      IS NULL OR p.scheduled_at <= $6)
    `;

    const params: unknown[] = [
      filters.profile_id,
      filters.platform ?? null,
      filters.status ?? null,
      filters.post_type ?? null,
      filters.from ?? null,
      filters.to ?? null,
    ];

    const [dataResult, countResult] = await Promise.all([
      this.query<PostWithInstances>(
        `SELECT
           p.id, p.profile_id, p.user_id, p.original_post_id,
           p.caption, p.hashtags, p.status, p.post_type,
           p.scheduled_at, p.published_at, p.created_at, p.updated_at,
           COALESCE(
             JSON_AGG(
               JSON_BUILD_OBJECT(
                 'instance_id',   ppi.id,
                 'platform',      ppi.platform,
                 'status',        ppi.status,
                 'posted_at',     ppi.posted_at,
                 'error_message', ppi.error_message
               )
             ) FILTER (WHERE ppi.id IS NOT NULL),
             '[]'
           ) AS platform_instances
         FROM posts p
         LEFT JOIN platform_post_instances ppi ON ppi.post_id = p.id
         WHERE ${baseWhere}
         GROUP BY p.id
         ORDER BY p.created_at DESC
         LIMIT $7 OFFSET $8`,
        [...params, filters.limit, offset]
      ),
      this.query<{ count: string }>(
        `SELECT COUNT(DISTINCT p.id) AS count
         FROM posts p
         LEFT JOIN platform_post_instances ppi ON ppi.post_id = p.id
         WHERE ${baseWhere}`,
        params
      ),
    ]);

    return {
      rows: dataResult.rows,
      total: parseInt(countResult.rows[0]?.count ?? '0', 10),
    };
  }

  async create(input: CreatePostInput): Promise<Post> {
    const post = await this.queryOne<Post>(
      `INSERT INTO posts (profile_id, user_id, caption, hashtags, post_type, original_post_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        input.profile_id,
        input.user_id,
        input.caption ?? null,
        input.hashtags ?? null,
        input.post_type,
        input.original_post_id ?? null,
      ]
    );
    return post!;
  }

  async update(id: string, input: UpdatePostInput): Promise<Post | null> {
    return this.queryOne<Post>(
      `UPDATE posts
       SET caption      = COALESCE($2, caption),
           hashtags     = COALESCE($3, hashtags),
           status       = COALESCE($4, status),
           scheduled_at = CASE WHEN $5::boolean THEN $6::timestamptz ELSE scheduled_at END,
           published_at = CASE WHEN $7::boolean THEN $8::timestamptz ELSE published_at END,
           updated_at   = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        input.caption ?? null,
        input.hashtags ?? null,
        input.status ?? null,
        'scheduled_at' in input,
        input.scheduled_at ?? null,
        'published_at' in input,
        input.published_at ?? null,
      ]
    );
  }

  async delete(id: string): Promise<void> {
    await this.query('DELETE FROM posts WHERE id = $1', [id]);
  }
}

export const postRepository = new PostRepository();
