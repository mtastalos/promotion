import { postAnalyticsRepository } from '../repositories/postAnalytics.repository';
import { socialAccountRepository } from '../repositories/socialAccount.repository';
import { platformPostInstanceRepository } from '../repositories/platformPostInstance.repository';
import { facebookService } from '../services/platform/facebook.service';
import { instagramService } from '../services/platform/instagram.service';
import { tiktokService } from '../services/platform/tiktok.service';
import { IPlatformClient } from '../services/platform/platform.interface';
import { decrypt } from '../utils/encryption';
import { env } from '../config/env';
import { Platform } from '../types/models';

const PLATFORM_CLIENTS: Record<Platform, IPlatformClient> = {
  facebook: facebookService,
  instagram: instagramService,
  tiktok: tiktokService,
};

async function syncInstance(instanceId: string, platform: Platform): Promise<void> {
  const instance = await platformPostInstanceRepository.findById(instanceId);
  if (!instance?.platform_post_id) return;

  const account = await socialAccountRepository.findById(instance.social_account_id);
  if (!account?.is_active) return;

  const credentials = {
    accessToken: decrypt(account.access_token_encrypted),
    accountId: account.account_id,
  };

  const client = PLATFORM_CLIENTS[platform];
  const analytics = await client.fetchAnalytics(instance.platform_post_id, credentials);
  await postAnalyticsRepository.upsert(instanceId, analytics);
}

async function tick(): Promise<void> {
  // Fetch all posted instances that have a platform_post_id
  const result = await postAnalyticsRepository.findPostedInstancesByProfile('');

  // In a real system, iterate over all profiles or pass profile IDs from a config.
  // For now, the query above would need to be scoped — see comment in postAnalytics.repository.
  // This worker is intentionally left as a skeleton; plug in profile iteration here.
  console.log('[analytics] Sync tick — implement profile iteration here');
}

export function startAnalyticsSyncWorker(): NodeJS.Timeout {
  console.log('[analytics] Analytics sync worker started');

  const run = async () => {
    try {
      await tick();
    } catch (err) {
      console.error('[analytics] Sync error:', err);
    }
  };

  run();
  return setInterval(run, env.ANALYTICS_SYNC_INTERVAL_MS);
}
