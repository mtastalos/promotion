import { Platform } from '../types/models';
import {
  postAnalyticsRepository,
  PlatformAnalyticsSummary,
} from '../repositories/postAnalytics.repository';
import { postRepository } from '../repositories/post.repository';
import { buildPaginatedResult, PaginatedResult } from '../utils/pagination';

export interface AnalyticsOverview {
  by_platform: PlatformAnalyticsSummary[];
  totals: {
    total_posts: number;
    total_views: number;
    total_likes: number;
    total_comments: number;
    total_shares: number;
  };
}

export const analyticsService = {
  async groupByPlatform(
    profileId: string,
    from?: Date,
    to?: Date
  ): Promise<PlatformAnalyticsSummary[]> {
    return postAnalyticsRepository.groupByPlatform(profileId, from, to);
  },

  async overview(profileId: string, from?: Date, to?: Date): Promise<AnalyticsOverview> {
    const byPlatform = await postAnalyticsRepository.groupByPlatform(profileId, from, to);

    const totals = byPlatform.reduce(
      (acc, row) => ({
        total_posts: acc.total_posts + row.total_posts,
        total_views: acc.total_views + Number(row.total_views),
        total_likes: acc.total_likes + Number(row.total_likes),
        total_comments: acc.total_comments + Number(row.total_comments),
        total_shares: acc.total_shares + Number(row.total_shares),
      }),
      { total_posts: 0, total_views: 0, total_likes: 0, total_comments: 0, total_shares: 0 }
    );

    return { by_platform: byPlatform, totals };
  },
};
