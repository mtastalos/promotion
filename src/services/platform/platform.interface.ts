import { Post } from '../../types/models';
import { AnalyticsUpdate } from '../../repositories/postAnalytics.repository';

export interface PlatformCredentials {
  accessToken: string;
  accountId: string;
}

export interface PublishPayload {
  post: Post;
  mediaFilePaths: string[];
  credentials: PlatformCredentials;
}

export interface PublishResult {
  platformPostId: string;
}

export interface IPlatformClient {
  publish(payload: PublishPayload): Promise<PublishResult>;
  delete(platformPostId: string, credentials: PlatformCredentials): Promise<void>;
  fetchAnalytics(platformPostId: string, credentials: PlatformCredentials): Promise<AnalyticsUpdate>;
}
