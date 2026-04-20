import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { postService } from '../services/post.service';
import { parsePagination } from '../utils/pagination';

const router = Router();

const createPostSchema = z.object({
  profile_id: z.string().uuid(),
  caption: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  post_type: z.enum(['image', 'video', 'text', 'carousel', 'template']),
  media_ids: z.array(z.string().uuid()).optional(),
  original_post_id: z.string().uuid().optional(),
});

const updatePostSchema = z.object({
  caption: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  media_ids: z.array(z.string().uuid()).optional(),
});

const schedulePostSchema = z.object({
  scheduled_at: z.string().datetime(),
  platform_account_ids: z.array(z.string().uuid()).min(1),
});

const publishNowSchema = z.object({
  platform_account_ids: z.array(z.string().uuid()).min(1),
});

const listQuerySchema = z.object({
  profile_id: z.string().uuid(),
  platform: z.enum(['facebook', 'instagram', 'tiktok']).optional(),
  status: z.enum(['draft', 'scheduled', 'published']).optional(),
  post_type: z.enum(['image', 'video', 'text', 'carousel', 'template']).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
});

router.get('/', authenticate, validate(listQuerySchema, 'query'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const q = req.query as z.infer<typeof listQuerySchema>;
    const result = await postService.list(
      {
        profile_id: q.profile_id!,
        platform: q.platform,
        status: q.status,
        post_type: q.post_type,
        from: q.from ? new Date(q.from) : undefined,
        to: q.to ? new Date(q.to) : undefined,
        page,
        limit,
      },
      req.user!.id
    );
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/', authenticate, validate(createPostSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await postService.create({ ...req.body, user_id: req.user!.id });
    res.status(201).json(post);
  } catch (err) { next(err); }
});

router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await postService.getById(req.params.id, req.user!.id);
    res.json(post);
  } catch (err) { next(err); }
});

router.put('/:id', authenticate, validate(updatePostSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await postService.update(req.params.id, req.user!.id, req.body);
    res.json(post);
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await postService.delete(req.params.id, req.user!.id);
    res.status(204).send();
  } catch (err) { next(err); }
});

router.post('/:id/schedule', authenticate, validate(schedulePostSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await postService.schedule(req.params.id, req.user!.id, {
      scheduled_at: new Date(req.body.scheduled_at),
      platform_account_ids: req.body.platform_account_ids,
    });
    res.json(post);
  } catch (err) { next(err); }
});

router.post('/:id/publish', authenticate, validate(publishNowSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await postService.publishNow(req.params.id, req.user!.id, req.body.platform_account_ids);
    res.json(post);
  } catch (err) { next(err); }
});

export default router;
