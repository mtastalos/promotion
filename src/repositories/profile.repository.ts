import { Profile } from '../types/models';
import { BaseRepository } from './base.repository';

export interface CreateProfileInput {
  user_id: string;
  name: string;
  description?: string;
  avatar_url?: string;
}

export interface UpdateProfileInput {
  name?: string;
  description?: string;
  avatar_url?: string;
}

export class ProfileRepository extends BaseRepository {
  async findById(id: string): Promise<Profile | null> {
    return this.queryOne<Profile>(
      'SELECT * FROM profiles WHERE id = $1',
      [id]
    );
  }

  async findByUserId(userId: string): Promise<Profile[]> {
    return this.queryMany<Profile>(
      'SELECT * FROM profiles WHERE user_id = $1 ORDER BY created_at ASC',
      [userId]
    );
  }

  async findByIdAndUserId(id: string, userId: string): Promise<Profile | null> {
    return this.queryOne<Profile>(
      'SELECT * FROM profiles WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
  }

  async create(input: CreateProfileInput): Promise<Profile> {
    const profile = await this.queryOne<Profile>(
      `INSERT INTO profiles (user_id, name, description, avatar_url)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [input.user_id, input.name, input.description ?? null, input.avatar_url ?? null]
    );
    return profile!;
  }

  async update(id: string, input: UpdateProfileInput): Promise<Profile | null> {
    return this.queryOne<Profile>(
      `UPDATE profiles
       SET name        = COALESCE($2, name),
           description = COALESCE($3, description),
           avatar_url  = COALESCE($4, avatar_url),
           updated_at  = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, input.name ?? null, input.description ?? null, input.avatar_url ?? null]
    );
  }

  async delete(id: string): Promise<void> {
    await this.query('DELETE FROM profiles WHERE id = $1', [id]);
  }
}

export const profileRepository = new ProfileRepository();
