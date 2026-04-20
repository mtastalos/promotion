import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { postQueueRepository } from '../repositories/postQueue.repository';
import { schedulerService } from '../services/scheduler.service';
import { parsePagination, toOffset } from '../utils/pagination';
import { buildPaginatedResult } from '../utils/pagination';

const router = Router();

const listQuerySchema = z.object({
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']).optional(),
  platform: z.enum(['facebook', 'instagram', 'tiktok']).optional(),
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
});

router.get('/', authenticate, validate(listQuerySchema, 'query'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const q = req.query as z.infer<typeof listQuerySchema>;
    const { rows, total } = await postQueueRepository.findByStatus(
      q.status as any ?? null,
      q.platform ?? null,
      limit,
      toOffset(page, limit)
    );
    res.json(buildPaginatedResult(rows, total, page, limit));
  } catch (err) { next(err); }
});

router.post('/:id/retry', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await schedulerService.retryJob(req.params.id, req.user!.id);
    res.json({ message: 'Job re-queued' });
  } catch (err) { next(err); }
});

export default router;
