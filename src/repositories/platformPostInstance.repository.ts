import { PlatformPostInstance, InstanceStatus, Platform } from '../types/models';
import { BaseRepository } from './base.repository';
import { PoolClient } from 'pg';

export interface CreateInstanceInput {
  post_id: string;
  social_account_id: string;
  platform: Platform;
  scheduled_at?: Date;
}

export class PlatformPostInstanceRepository extends BaseRepository {
  async findById(id: string): Promise<PlatformPostInstance | null> {
    return this.queryOne<PlatformPostInstance>(
      'SELECT * FROM platform_post_instances WHERE id = $1',
      [id]
    );
  }

  async findByPostId(postId: string): Promise<PlatformPostInstance[]> {
    return this.queryMany<PlatformPostInstance>(
      'SELECT * FROM platform_post_instances WHERE post_id = $1',
      [postId]
    );
  }

  async create(input: CreateInstanceInput, client?: PoolClient): Promise<PlatformPostInstance> {
    const row = await this.queryOne<PlatformPostInstance>(
      `INSERT INTO platform_post_instances
         (post_id, social_account_id, platform, scheduled_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [input.post_id, input.social_account_id, input.platform, input.scheduled_at ?? null],
      client
    );
    return row!;
  }

  async updateStatus(
    id: string,
    status: InstanceStatus,
    platformPostId?: string,
    errorMessage?: string,
    client?: PoolClient
  ): Promise<void> {
    await this.query(
      `UPDATE platform_post_instances
       SET status           = $2,
           platform_post_id = COALESCE($3, platform_post_id),
           error_message    = $4,
           posted_at        = CASE WHEN $2 = 'posted' THEN NOW() ELSE posted_at END,
           updated_at       = NOW()
       WHERE id = $1`,
      [id, status, platformPostId ?? null, errorMessage ?? null],
      client
    );
  }
}

export const platformPostInstanceRepository = new PlatformPostInstanceRepository();
