// TypeScript interfaces mirroring database rows

export type Platform = 'facebook' | 'instagram' | 'tiktok';
export type MediaType = 'image' | 'video' | 'template';
export type PostStatus = 'draft' | 'scheduled' | 'published';
export type PostType = 'image' | 'video' | 'text' | 'carousel' | 'template';
export type InstanceStatus = 'pending' | 'posted' | 'failed';
export type QueueStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type AiOutputType = 'text' | 'image' | 'video';
export type AiGenStatus = 'pending' | 'completed' | 'failed';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface SocialAccount {
  id: string;
  profile_id: string;
  platform: Platform;
  account_id: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string | null;
  token_expires_at: Date | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AiConfiguration {
  id: string;
  profile_id: string;
  provider: string;
  model: string;
  system_prompt: string | null;
  temperature: number | null;
  max_tokens: number | null;
  custom_settings: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}

export interface Media {
  id: string;
  user_id: string;
  type: MediaType;
  file_path: string;
  filename: string;
  mime_type: string;
  file_size_bytes: number;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}

export interface Post {
  id: string;
  profile_id: string;
  user_id: string;
  original_post_id: string | null;
  caption: string | null;
  hashtags: string[] | null;
  status: PostStatus;
  post_type: PostType;
  scheduled_at: Date | null;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface PostMedia {
  id: string;
  post_id: string;
  media_id: string;
  display_order: number;
  created_at: Date;
}

export interface PlatformPostInstance {
  id: string;
  post_id: string;
  social_account_id: string;
  platform: Platform;
  platform_post_id: string | null;
  status: InstanceStatus;
  error_message: string | null;
  scheduled_at: Date | null;
  posted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface PostAnalytics {
  id: string;
  platform_post_instance_id: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  last_updated_at: Date | null;
  created_at: Date;
}

export interface AiGeneration {
  id: string;
  profile_id: string;
  post_id: string | null;
  ai_configuration_id: string;
  prompt: string;
  output_type: AiOutputType;
  output_text: string | null;
  output_media_id: string | null;
  model_used: string;
  tokens_used: number | null;
  generation_time_ms: number | null;
  status: AiGenStatus;
  error_message: string | null;
  created_at: Date;
}

export interface PostQueue {
  id: string;
  platform_post_instance_id: string;
  run_at: Date;
  status: QueueStatus;
  attempt_count: number;
  max_attempts: number;
  last_attempted_at: Date | null;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
}

// ── Composite types for queries ───────────────────────────────────────────────

export interface PostWithInstances extends Post {
  platform_instances: Array<{
    instance_id: string;
    platform: Platform;
    status: InstanceStatus;
    posted_at: Date | null;
    error_message: string | null;
  }>;
}

export interface QueueJobRow {
  queue_id: string;
  platform_post_instance_id: string;
  attempt_count: number;
  max_attempts: number;
  run_at: Date;
  post_id: string;
  social_account_id: string;
  platform: Platform;
  scheduled_at: Date | null;
  caption: string | null;
  hashtags: string[] | null;
  post_type: PostType;
  account_id: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string | null;
  token_expires_at: Date | null;
}

// ── Pagination ────────────────────────────────────────────────────────────────

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
