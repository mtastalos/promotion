import { Post, PostType, Platform, PostWithInstances } from '../types/models';
import { postRepository, CreatePostInput, PostFilters } from '../repositories/post.repository';
import { postMediaRepository } from '../repositories/postMedia.repository';
import { platformPostInstanceRepository } from '../repositories/platformPostInstance.repository';
import { postQueueRepository } from '../repositories/postQueue.repository';
import { profileRepository } from '../repositories/profile.repository';
import { socialAccountRepository } from '../repositories/socialAccount.repository';
import { buildPaginatedResult, PaginatedResult } from '../utils/pagination';

export interface CreatePostPayload {
  profile_id: string;
  user_id: string;
  caption?: string;
  hashtags?: string[];
  post_type: PostType;
  media_ids?: string[];
  original_post_id?: string;
}

export interface SchedulePostPayload {
  scheduled_at: Date;
  platform_account_ids: string[];
}

export const postService = {
  async create(payload: CreatePostPayload): Promise<Post> {
    await assertProfileOwnership(payload.profile_id, payload.user_id);

    const post = await postRepository.create({
      profile_id: payload.profile_id,
      user_id: payload.user_id,
      caption: payload.caption,
      hashtags: payload.hashtags,
      post_type: payload.post_type,
      original_post_id: payload.original_post_id,
    });

    if (payload.media_ids?.length) {
      await Promise.all(
        payload.media_ids.map((mediaId, i) =>
          postMediaRepository.attach(post.id, mediaId, i)
        )
      );
    }

    return post;
  },

  async list(
    filters: Omit<PostFilters, 'page' | 'limit'> & { page: number; limit: number },
    userId: string
  ): Promise<PaginatedResult<PostWithInstances>> {
    await assertProfileOwnership(filters.profile_id, userId);
    const { rows, total } = await postRepository.findWithFilters(filters);
    return buildPaginatedResult(rows, total, filters.page, filters.limit);
  },

  async getById(id: string, userId: string): Promise<Post> {
    const post = await postRepository.findByIdAndUserId(id, userId);
    if (!post) throw notFound('Post');
    return post;
  },

  async update(
    id: string,
    userId: string,
    updates: { caption?: string; hashtags?: string[]; media_ids?: string[] }
  ): Promise<Post> {
    const post = await postRepository.findByIdAndUserId(id, userId);
    if (!post) throw notFound('Post');
    if (post.status === 'published') {
      throw Object.assign(new Error('Cannot edit a published post'), { statusCode: 422 });
    }

    const updated = await postRepository.update(id, {
      caption: updates.caption,
      hashtags: updates.hashtags,
    });

    if (updates.media_ids !== undefined) {
      await postMediaRepository.detachAll(id);
      await Promise.all(
        updates.media_ids.map((mediaId, i) =>
          postMediaRepository.attach(id, mediaId, i)
        )
      );
    }

    return updated!;
  },

  async schedule(id: string, userId: string, payload: SchedulePostPayload): Promise<Post> {
    const post = await postRepository.findByIdAndUserId(id, userId);
    if (!post) throw notFound('Post');
    if (post.status === 'published') {
      throw Object.assign(new Error('Post already published'), { statusCode: 422 });
    }

    // Create an instance + queue entry for each target account
    await Promise.all(
      payload.platform_account_ids.map(async (accountId) => {
        const account = await socialAccountRepository.findById(accountId);
        if (!account) throw notFound('Social account');

        const instance = await platformPostInstanceRepository.create({
          post_id: id,
          social_account_id: accountId,
          platform: account.platform,
          scheduled_at: payload.scheduled_at,
        });

        await postQueueRepository.enqueue(instance.id, payload.scheduled_at);
      })
    );

    return (await postRepository.update(id, {
      status: 'scheduled',
      scheduled_at: payload.scheduled_at,
    }))!;
  },

  async publishNow(id: string, userId: string, platformAccountIds: string[]): Promise<Post> {
    const post = await postRepository.findByIdAndUserId(id, userId);
    if (!post) throw notFound('Post');

    const runAt = new Date();

    await Promise.all(
      platformAccountIds.map(async (accountId) => {
        const account = await socialAccountRepository.findById(accountId);
        if (!account) throw notFound('Social account');

        const instance = await platformPostInstanceRepository.create({
          post_id: id,
          social_account_id: accountId,
          platform: account.platform,
          scheduled_at: runAt,
        });

        await postQueueRepository.enqueue(instance.id, runAt);
      })
    );

    return (await postRepository.update(id, { status: 'scheduled' }))!;
  },

  async delete(id: string, userId: string): Promise<void> {
    const post = await postRepository.findByIdAndUserId(id, userId);
    if (!post) throw notFound('Post');
    await postRepository.delete(id);
  },
};

async function assertProfileOwnership(profileId: string, userId: string): Promise<void> {
  const profile = await profileRepository.findByIdAndUserId(profileId, userId);
  if (!profile) throw notFound('Profile');
}

function notFound(entity: string): Error {
  return Object.assign(new Error(`${entity} not found`), { statusCode: 404 });
}
