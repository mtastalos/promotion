import { IPlatformClient, PublishPayload, PublishResult, PlatformCredentials } from './platform.interface';
import { AnalyticsUpdate } from '../../repositories/postAnalytics.repository';

class FacebookService implements IPlatformClient {
  async publish(payload: PublishPayload): Promise<PublishResult> {
    // Integration point: call the Facebook Graph API
    // POST /{page-id}/feed or /{page-id}/photos depending on post type
    // https://developers.facebook.com/docs/graph-api/reference/page/feed/
    throw new Error('Facebook publish not yet implemented. Integrate Graph API here.');
  }

  async delete(platformPostId: string, credentials: PlatformCredentials): Promise<void> {
    // DELETE /{post-id}
    throw new Error('Facebook delete not yet implemented.');
  }

  async fetchAnalytics(platformPostId: string, credentials: PlatformCredentials): Promise<AnalyticsUpdate> {
    // GET /{post-id}/insights?metric=post_impressions,post_reactions_by_type_total,...
    throw new Error('Facebook analytics not yet implemented.');
  }
}

export const facebookService = new FacebookService();
