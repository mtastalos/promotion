import { postQueueRepository } from '../repositories/postQueue.repository';
import { platformPostInstanceRepository } from '../repositories/platformPostInstance.repository';

export const schedulerService = {
  async cancelForInstance(instanceId: string): Promise<void> {
    const pending = await postQueueRepository.findPending(100);
    const matching = pending.filter(
      (job) => job.platform_post_instance_id === instanceId
    );
    await Promise.all(matching.map((job) => postQueueRepository.cancel(job.id)));
  },

  async retryJob(jobId: string, userId: string): Promise<void> {
    const job = await postQueueRepository.findById(jobId);
    if (!job) {
      throw Object.assign(new Error('Queue job not found'), { statusCode: 404 });
    }
    if (job.status !== 'failed') {
      throw Object.assign(new Error('Only failed jobs can be retried'), { statusCode: 422 });
    }

    await postQueueRepository.enqueue(
      job.platform_post_instance_id,
      new Date(),
      job.max_attempts
    );
  },
};
