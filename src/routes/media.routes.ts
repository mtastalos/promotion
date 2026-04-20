import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { mediaService } from '../services/media.service';
import { parsePagination } from '../utils/pagination';
import { env } from '../config/env';

const router = Router();

const storage = multer.diskStorage({
  destination: env.MEDIA_UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: env.MAX_FILE_SIZE_BYTES },
});

const listQuerySchema = z.object({
  type: z.enum(['image', 'video', 'template']).optional(),
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
});

router.post(
  '/',
  authenticate,
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }
      const media = await mediaService.upload(req.user!.id, req.file);
      res.status(201).json(media);
    } catch (err) { next(err); }
  }
);

router.get('/', authenticate, validate(listQuerySchema, 'query'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const q = req.query as z.infer<typeof listQuerySchema>;
    const result = await mediaService.list(req.user!.id, q.type ?? null, page, limit);
    res.json(result);
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await mediaService.delete(req.params.id, req.user!.id);
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
