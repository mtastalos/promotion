import { IPlatformClient, PublishPayload, PublishResult, PlatformCredentials } from './platform.interface';
import { AnalyticsUpdate } from '../../repositories/postAnalytics.repository';

class InstagramService implements IPlatformClient {
  async publish(payload: PublishPayload): Promise<PublishResult> {
    // Integration point: use Instagram Graph API (two-step: create container, then publish)
    // Step 1: POST /{ig-user-id}/media  → get creation_id
    // Step 2: POST /{ig-user-id}/media_publish?creation_id=...
    // https://developers.facebook.com/docs/instagram-api/guides/content-publishing
    throw new Error('Instagram publish not yet implemented. Integrate Graph API here.');
  }

  async delete(platformPostId: string, credentials: PlatformCredentials): Promise<void> {
    // DELETE /{media-id}
    throw new Error('Instagram delete not yet implemented.');
  }

  async fetchAnalytics(platformPostId: string, credentials: PlatformCredentials): Promise<AnalyticsUpdate> {
    // GET /{media-id}/insights?metric=impressions,reach,likes,comments,shares
    throw new Error('Instagram analytics not yet implemented.');
  }
}

export const instagramService = new InstagramService();
