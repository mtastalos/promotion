import { SocialAccount, Platform } from '../types/models';
import { BaseRepository } from './base.repository';

export interface CreateSocialAccountInput {
  profile_id: string;
  platform: Platform;
  account_id: string;
  access_token_encrypted: string;
  refresh_token_encrypted?: string;
  token_expires_at?: Date;
}

export interface UpdateSocialAccountInput {
  access_token_encrypted?: string;
  refresh_token_encrypted?: string;
  token_expires_at?: Date;
  is_active?: boolean;
}

export class SocialAccountRepository extends BaseRepository {
  async findById(id: string): Promise<SocialAccount | null> {
    return this.queryOne<SocialAccount>(
      'SELECT * FROM social_accounts WHERE id = $1',
      [id]
    );
  }

  async findByProfileId(profileId: string): Promise<SocialAccount[]> {
    return this.queryMany<SocialAccount>(
      'SELECT * FROM social_accounts WHERE profile_id = $1 ORDER BY platform, created_at ASC',
      [profileId]
    );
  }

  async findByIdAndProfileId(id: string, profileId: string): Promise<SocialAccount | null> {
    return this.queryOne<SocialAccount>(
      'SELECT * FROM social_accounts WHERE id = $1 AND profile_id = $2',
      [id, profileId]
    );
  }

  async findActiveByProfileAndPlatform(
    profileId: string,
    platform: Platform
  ): Promise<SocialAccount[]> {
    return this.queryMany<SocialAccount>(
      `SELECT * FROM social_accounts
       WHERE profile_id = $1 AND platform = $2 AND is_active = TRUE`,
      [profileId, platform]
    );
  }

  async create(input: CreateSocialAccountInput): Promise<SocialAccount> {
    const account = await this.queryOne<SocialAccount>(
      `INSERT INTO social_accounts
         (profile_id, platform, account_id, access_token_encrypted,
          refresh_token_encrypted, token_expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        input.profile_id,
        input.platform,
        input.account_id,
        input.access_token_encrypted,
        input.refresh_token_encrypted ?? null,
        input.token_expires_at ?? null,
      ]
    );
    return account!;
  }

  async update(id: string, input: UpdateSocialAccountInput): Promise<SocialAccount | null> {
    return this.queryOne<SocialAccount>(
      `UPDATE social_accounts
       SET access_token_encrypted  = COALESCE($2, access_token_encrypted),
           refresh_token_encrypted = COALESCE($3, refresh_token_encrypted),
           token_expires_at        = COALESCE($4, token_expires_at),
           is_active               = COALESCE($5, is_active),
           updated_at              = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        input.access_token_encrypted ?? null,
        input.refresh_token_encrypted ?? null,
        input.token_expires_at ?? null,
        input.is_active ?? null,
      ]
    );
  }

  async delete(id: string): Promise<void> {
    await this.query('DELETE FROM social_accounts WHERE id = $1', [id]);
  }
}

export const socialAccountRepository = new SocialAccountRepository();
