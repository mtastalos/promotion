import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { analyticsService } from '../services/analytics.service';

const router = Router();

const analyticsQuerySchema = z.object({
  profile_id: z.string().uuid(),
  platform: z.enum(['facebook', 'instagram', 'tiktok']).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

router.get('/posts', authenticate, validate(analyticsQuerySchema, 'query'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = req.query as z.infer<typeof analyticsQuerySchema>;
    const data = await analyticsService.groupByPlatform(
      q.profile_id,
      q.from ? new Date(q.from) : undefined,
      q.to ? new Date(q.to) : undefined
    );
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/overview', authenticate, validate(analyticsQuerySchema, 'query'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = req.query as z.infer<typeof analyticsQuerySchema>;
    const data = await analyticsService.overview(
      q.profile_id,
      q.from ? new Date(q.from) : undefined,
      q.to ? new Date(q.to) : undefined
    );
    res.json(data);
  } catch (err) { next(err); }
});

export default router;
