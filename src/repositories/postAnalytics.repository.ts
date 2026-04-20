import { PostAnalytics, Platform } from '../types/models';
import { BaseRepository } from './base.repository';

export interface AnalyticsUpdate {
  views: number;
  likes: number;
  comments: number;
  shares: number;
}

export interface PlatformAnalyticsSummary {
  platform: Platform;
  total_posts: number;
  total_views: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  engagement_rate_pct: number;
  last_synced_at: Date | null;
}

export class PostAnalyticsRepository extends BaseRepository {
  async findByInstanceId(instanceId: string): Promise<PostAnalytics | null> {
    return this.queryOne<PostAnalytics>(
      'SELECT * FROM post_analytics WHERE platform_post_instance_id = $1',
      [instanceId]
    );
  }

  async upsert(instanceId: string, data: AnalyticsUpdate): Promise<PostAnalytics> {
    const row = await this.queryOne<PostAnalytics>(
      `INSERT INTO post_analytics
         (platform_post_instance_id, views, likes, comments, shares, last_updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (platform_post_instance_id) DO UPDATE
         SET views           = EXCLUDED.views,
             likes           = EXCLUDED.likes,
             comments        = EXCLUDED.comments,
             shares          = EXCLUDED.shares,
             last_updated_at = NOW()
       RETURNING *`,
      [instanceId, data.views, data.likes, data.comments, data.shares]
    );
    return row!;
  }

  async groupByPlatform(
    profileId: string,
    from?: Date,
    to?: Date
  ): Promise<PlatformAnalyticsSummary[]> {
    return this.queryMany<PlatformAnalyticsSummary>(
      `SELECT
         ppi.platform,
         COUNT(DISTINCT ppi.id)::int                          AS total_posts,
         COALESCE(SUM(pa.views), 0)::bigint                   AS total_views,
         COALESCE(SUM(pa.likes), 0)::bigint                   AS total_likes,
         COALESCE(SUM(pa.comments), 0)::bigint                AS total_comments,
         COALESCE(SUM(pa.shares), 0)::bigint                  AS total_shares,
         CASE
           WHEN SUM(pa.views) > 0
           THEN ROUND(
             (SUM(pa.likes) + SUM(pa.comments) + SUM(pa.shares))::NUMERIC
             / NULLIF(SUM(pa.views), 0) * 100, 2
           )
           ELSE 0
         END                                                   AS engagement_rate_pct,
         MAX(pa.last_updated_at)                               AS last_synced_at
       FROM posts p
       JOIN platform_post_instances ppi ON ppi.post_id = p.id
       JOIN post_analytics          pa  ON pa.platform_post_instance_id = ppi.id
       WHERE p.profile_id = $1
         AND ppi.status   = 'posted'
         AND ($2::timestamptz IS NULL OR ppi.posted_at >= $2)
         AND ($3::timestamptz IS NULL OR ppi.posted_at <= $3)
       GROUP BY ppi.platform
       ORDER BY total_views DESC`,
      [profileId, from ?? null, to ?? null]
    );
  }

  async findPostedInstancesByProfile(profileId: string): Promise<
    Array<{ instance_id: string; platform: Platform }>
  > {
    return this.queryMany(
      `SELECT ppi.id AS instance_id, ppi.platform
       FROM platform_post_instances ppi
       JOIN posts p ON p.id = ppi.post_id
       WHERE p.profile_id = $1
         AND ppi.status   = 'posted'
         AND ppi.platform_post_id IS NOT NULL`,
      [profileId]
    );
  }
}

export const postAnalyticsRepository = new PostAnalyticsRepository();
