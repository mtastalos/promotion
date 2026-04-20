import { PostQueue, QueueStatus, QueueJobRow } from '../types/models';
import { BaseRepository } from './base.repository';
import { PoolClient } from 'pg';

export class PostQueueRepository extends BaseRepository {
  async findById(id: string): Promise<PostQueue | null> {
    return this.queryOne<PostQueue>(
      'SELECT * FROM post_queue WHERE id = $1',
      [id]
    );
  }

  async findPending(limit: number): Promise<PostQueue[]> {
    return this.queryMany<PostQueue>(
      `SELECT * FROM post_queue
       WHERE status IN ('pending', 'failed')
         AND run_at <= NOW()
         AND attempt_count < max_attempts
       ORDER BY run_at ASC
       LIMIT $1`,
      [limit]
    );
  }

  /**
   * Claims a batch of due queue jobs using SKIP LOCKED for concurrent worker safety.
   * Must be called inside a transaction; caller is responsible for committing/rolling back.
   */
  async claimBatch(limit: number, client: PoolClient): Promise<QueueJobRow[]> {
    const result = await client.query<QueueJobRow>(
      `SELECT
         pq.id                        AS queue_id,
         pq.platform_post_instance_id,
         pq.attempt_count,
         pq.max_attempts,
         pq.run_at,
         ppi.post_id,
         ppi.social_account_id,
         ppi.platform,
         ppi.scheduled_at,
         p.caption,
         p.hashtags,
         p.post_type,
         sa.account_id,
         sa.access_token_encrypted,
         sa.refresh_token_encrypted,
         sa.token_expires_at
       FROM post_queue pq
       JOIN platform_post_instances ppi ON ppi.id  = pq.platform_post_instance_id
       JOIN posts                   p   ON p.id    = ppi.post_id
       JOIN social_accounts         sa  ON sa.id   = ppi.social_account_id
       WHERE pq.status        IN ('pending', 'failed')
         AND pq.run_at        <= NOW()
         AND pq.attempt_count <  pq.max_attempts
         AND sa.is_active     = TRUE
       ORDER BY pq.run_at ASC
       LIMIT $1
       FOR UPDATE OF pq SKIP LOCKED`,
      [limit]
    );
    return result.rows;
  }

  async enqueue(instanceId: string, runAt: Date, maxAttempts = 3): Promise<PostQueue> {
    const row = await this.queryOne<PostQueue>(
      `INSERT INTO post_queue (platform_post_instance_id, run_at, max_attempts)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [instanceId, runAt, maxAttempts]
    );
    return row!;
  }

  async markProcessing(id: string, client: PoolClient): Promise<void> {
    await client.query(
      `UPDATE post_queue
       SET status            = 'processing',
           last_attempted_at = NOW(),
           attempt_count     = attempt_count + 1,
           updated_at        = NOW()
       WHERE id = $1`,
      [id]
    );
  }

  async markCompleted(id: string): Promise<void> {
    await this.query(
      `UPDATE post_queue SET status = 'completed', updated_at = NOW() WHERE id = $1`,
      [id]
    );
  }

  async markFailed(id: string, errorMessage: string, retryAt?: Date): Promise<void> {
    await this.query(
      `UPDATE post_queue
       SET status        = CASE WHEN attempt_count >= max_attempts THEN 'failed' ELSE 'pending' END,
           error_message = $2,
           run_at        = COALESCE($3, run_at),
           updated_at    = NOW()
       WHERE id = $1`,
      [id, errorMessage, retryAt ?? null]
    );
  }

  async cancel(id: string): Promise<void> {
    await this.query(
      `UPDATE post_queue SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
      [id]
    );
  }

  async findByStatus(
    status: QueueStatus,
    platform: string | null,
    limit: number,
    offset: number
  ): Promise<{ rows: PostQueue[]; total: number }> {
    const [dataResult, countResult] = await Promise.all([
      this.query<PostQueue>(
        `SELECT pq.* FROM post_queue pq
         JOIN platform_post_instances ppi ON ppi.id = pq.platform_post_instance_id
         WHERE ($1::queue_status_enum IS NULL OR pq.status = $1)
           AND ($2::platform_enum     IS NULL OR ppi.platform = $2)
         ORDER BY pq.run_at ASC
         LIMIT $3 OFFSET $4`,
        [status, platform, limit, offset]
      ),
      this.query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM post_queue pq
         JOIN platform_post_instances ppi ON ppi.id = pq.platform_post_instance_id
         WHERE ($1::queue_status_enum IS NULL OR pq.status = $1)
           AND ($2::platform_enum     IS NULL OR ppi.platform = $2)`,
        [status, platform]
      ),
    ]);

    return {
      rows: dataResult.rows,
      total: parseInt(countResult.rows[0]?.count ?? '0', 10),
    };
  }
}

export const postQueueRepository = new PostQueueRepository();
