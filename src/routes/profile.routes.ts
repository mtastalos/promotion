import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { profileRepository } from '../repositories/profile.repository';
import { socialAccountRepository } from '../repositories/socialAccount.repository';
import { encrypt } from '../utils/encryption';

const router = Router();

const createProfileSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  avatar_url: z.string().url().optional(),
});

const updateProfileSchema = createProfileSchema.partial();

const createAccountSchema = z.object({
  platform: z.enum(['facebook', 'instagram', 'tiktok']),
  account_id: z.string().min(1),
  access_token: z.string().min(1),
  refresh_token: z.string().optional(),
  token_expires_at: z.string().datetime().optional(),
});

const updateAccountSchema = z.object({
  access_token: z.string().optional(),
  refresh_token: z.string().optional(),
  token_expires_at: z.string().datetime().optional(),
  is_active: z.boolean().optional(),
});

// ── Profiles ──────────────────────────────────────────────────────────────────

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profiles = await profileRepository.findByUserId(req.user!.id);
    res.json(profiles);
  } catch (err) { next(err); }
});

router.post('/', authenticate, validate(createProfileSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await profileRepository.create({ ...req.body, user_id: req.user!.id });
    res.status(201).json(profile);
  } catch (err) { next(err); }
});

router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await profileRepository.findByIdAndUserId(req.params.id, req.user!.id);
    if (!profile) { res.status(404).json({ error: 'Profile not found' }); return; }
    res.json(profile);
  } catch (err) { next(err); }
});

router.put('/:id', authenticate, validate(updateProfileSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await profileRepository.findByIdAndUserId(req.params.id, req.user!.id);
    if (!existing) { res.status(404).json({ error: 'Profile not found' }); return; }
    const updated = await profileRepository.update(req.params.id, req.body);
    res.json(updated);
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await profileRepository.findByIdAndUserId(req.params.id, req.user!.id);
    if (!existing) { res.status(404).json({ error: 'Profile not found' }); return; }
    await profileRepository.delete(req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
});

// ── Social Accounts ───────────────────────────────────────────────────────────

router.get('/:id/accounts', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await profileRepository.findByIdAndUserId(req.params.id, req.user!.id);
    if (!profile) { res.status(404).json({ error: 'Profile not found' }); return; }
    const accounts = await socialAccountRepository.findByProfileId(req.params.id);
    // Never return raw encrypted tokens to the client
    const safe = accounts.map(({ access_token_encrypted: _, refresh_token_encrypted: __, ...a }) => a);
    res.json(safe);
  } catch (err) { next(err); }
});

router.post('/:id/accounts', authenticate, validate(createAccountSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await profileRepository.findByIdAndUserId(req.params.id, req.user!.id);
    if (!profile) { res.status(404).json({ error: 'Profile not found' }); return; }

    const account = await socialAccountRepository.create({
      profile_id: req.params.id,
      platform: req.body.platform,
      account_id: req.body.account_id,
      access_token_encrypted: encrypt(req.body.access_token),
      refresh_token_encrypted: req.body.refresh_token ? encrypt(req.body.refresh_token) : undefined,
      token_expires_at: req.body.token_expires_at ? new Date(req.body.token_expires_at) : undefined,
    });

    const { access_token_encrypted: _, refresh_token_encrypted: __, ...safe } = account;
    res.status(201).json(safe);
  } catch (err) { next(err); }
});

router.put('/:id/accounts/:accountId', authenticate, validate(updateAccountSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await profileRepository.findByIdAndUserId(req.params.id, req.user!.id);
    if (!profile) { res.status(404).json({ error: 'Profile not found' }); return; }

    const updated = await socialAccountRepository.update(req.params.accountId, {
      access_token_encrypted: req.body.access_token ? encrypt(req.body.access_token) : undefined,
      refresh_token_encrypted: req.body.refresh_token ? encrypt(req.body.refresh_token) : undefined,
      token_expires_at: req.body.token_expires_at ? new Date(req.body.token_expires_at) : undefined,
      is_active: req.body.is_active,
    });

    if (!updated) { res.status(404).json({ error: 'Account not found' }); return; }
    const { access_token_encrypted: _, refresh_token_encrypted: __, ...safe } = updated;
    res.json(safe);
  } catch (err) { next(err); }
});

router.delete('/:id/accounts/:accountId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await profileRepository.findByIdAndUserId(req.params.id, req.user!.id);
    if (!profile) { res.status(404).json({ error: 'Profile not found' }); return; }
    await socialAccountRepository.delete(req.params.accountId);
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
