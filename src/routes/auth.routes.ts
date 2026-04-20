import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validation.middleware';
import { authService } from '../services/auth.service';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(1),
});

router.post('/register', validate(registerSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user, tokens } = await authService.register(req.body.email, req.body.password);
    res.status(201).json({ user, ...tokens });
  } catch (err) {
    next(err);
  }
});

router.post('/login', validate(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user, tokens } = await authService.login(req.body.email, req.body.password);
    res.json({ user, ...tokens });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', validate(refreshSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tokens = await authService.refresh(req.body.refresh_token);
    res.json(tokens);
  } catch (err) {
    next(err);
  }
});

export default router;
