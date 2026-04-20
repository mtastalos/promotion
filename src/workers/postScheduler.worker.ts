import { pool, withTransaction } from '../config/db';
import { postQueueRepository } from '../repositories/postQueue.repository';
import { platformPostInstanceRepository } from '../repositories/platformPostInstance.repository';
import { postRepository } from '../repositories/post.repository';
import { mediaRepository } from '../repositories/media.repository';
import { postMediaRepository } from '../repositories/postMedia.repository';
import { socialAccountRepository } from '../repositories/socialAccount.repository';
import { facebookService } from '../services/platform/facebook.service';
import { instagramService } from '../services/platform/instagram.service';
import { tiktokService } from '../services/platform/tiktok.service';
import { IPlatformClient } from '../services/platform/platform.interface';
import { decrypt } from '../utils/encryption';
import { env } from '../config/env';
import { Platform, QueueJobRow } from '../types/models';

const PLATFORM_CLIENTS: Record<Platform, IPlatformClient> = {
  facebook: facebookService,
  instagram: instagramService,
  tiktok: tiktokService,
};

async function processJob(job: QueueJobRow): Promise<void> {
  const post = await postRepository.findById(job.post_id);
  if (!post) throw new Error(`Post ${job.post_id} not found`);

  const postMediaItems = await postMediaRepository.findByPostId(job.post_id);
  const mediaFiles = await Promise.all(
    postMediaItems.map((pm) => mediaRepository.findById(pm.media_id))
  );
  const mediaFilePaths = mediaFiles
    .filter(Boolean)
    .map((m) => m!.file_path);

  const client = PLATFORM_CLIENTS[job.platform];
  const credentials = {
    accessToken: decrypt(job.access_token_encrypted),
    accountId: job.account_id,
  };

  const result = await client.publish({ post, mediaFilePaths, credentials });

  await platformPostInstanceRepository.updateStatus(
    job.platform_post_instance_id,
    'posted',
    result.platformPostId
  );

  await postQueueRepository.markCompleted(job.queue_id);

  // Mark the parent post as published if all its instances are now posted
  const instances = await platformPostInstanceRepository.findByPostId(job.post_id);
  const allPosted = instances.every((i) => i.status === 'posted');
  if (allPosted) {
    await postRepository.update(job.post_id, { status: 'published', published_at: new Date() });
  }
}

async function tick(): Promise<void> {
  const client = await pool.connect();
  let jobs: QueueJobRow[] = [];

  try {
    await client.query('BEGIN');
    jobs = await postQueueRepository.claimBatch(env.QUEUE_BATCH_SIZE, client);
    await Promise.all(jobs.map((job) => postQueueRepository.markProcessing(job.queue_id, client)));
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    client.release();
    throw err;
  }

  client.release();

  await Promise.all(
    jobs.map(async (job) => {
      try {
        await processJob(job);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const retryDelay = Math.min(60_000 * Math.pow(2, job.attempt_count), 3_600_000);
        const retryAt = new Date(Date.now() + retryDelay);
        await postQueueRepository.markFailed(job.queue_id, message, retryAt);

        await platformPostInstanceRepository.updateStatus(
          job.platform_post_instance_id,
          'failed',
          undefined,
          message
        );

        console.error(`[queue] Job ${job.queue_id} failed (attempt ${job.attempt_count}):`, message);
      }
    })
  );
}

export function startPostSchedulerWorker(): NodeJS.Timeout {
  console.log('[queue] Post scheduler worker started');

  const run = async () => {
    try {
      await tick();
    } catch (err) {
      console.error('[queue] Tick error:', err);
    }
  };

  // Run immediately on start, then on interval
  run();
  return setInterval(run, env.QUEUE_POLL_INTERVAL_MS);
}
