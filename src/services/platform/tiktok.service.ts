import { IPlatformClient, PublishPayload, PublishResult, PlatformCredentials } from './platform.interface';
import { AnalyticsUpdate } from '../../repositories/postAnalytics.repository';

class TikTokService implements IPlatformClient {
  async publish(payload: PublishPayload): Promise<PublishResult> {
    // Integration point: TikTok Content Posting API
    // POST https://open.tiktokapis.com/v2/post/publish/video/init/
    // https://developers.tiktok.com/doc/content-posting-api-get-started-overview
    throw new Error('TikTok publish not yet implemented. Integrate Content Posting API here.');
  }

  async delete(platformPostId: string, credentials: PlatformCredentials): Promise<void> {
    // POST https://open.tiktokapis.com/v2/video/delete/
    throw new Error('TikTok delete not yet implemented.');
  }

  async fetchAnalytics(platformPostId: string, credentials: PlatformCredentials): Promise<AnalyticsUpdate> {
    // POST https://open.tiktokapis.com/v2/video/query/
    // fields: like_count, comment_count, share_count, view_count
    throw new Error('TikTok analytics not yet implemented.');
  }
}

export const tiktokService = new TikTokService();
