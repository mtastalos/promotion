import { AiConfiguration } from '../types/models';
import { BaseRepository } from './base.repository';

export interface CreateAiConfigInput {
  profile_id: string;
  provider: string;
  model: string;
  system_prompt?: string;
  temperature?: number;
  max_tokens?: number;
  custom_settings?: Record<string, unknown>;
}

export interface UpdateAiConfigInput {
  provider?: string;
  model?: string;
  system_prompt?: string;
  temperature?: number;
  max_tokens?: number;
  custom_settings?: Record<string, unknown>;
}

export class AiConfigurationRepository extends BaseRepository {
  async findByProfileId(profileId: string): Promise<AiConfiguration | null> {
    return this.queryOne<AiConfiguration>(
      'SELECT * FROM ai_configurations WHERE profile_id = $1',
      [profileId]
    );
  }

  async upsert(input: CreateAiConfigInput): Promise<AiConfiguration> {
    const row = await this.queryOne<AiConfiguration>(
      `INSERT INTO ai_configurations
         (profile_id, provider, model, system_prompt, temperature, max_tokens, custom_settings)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (profile_id) DO UPDATE
         SET provider        = EXCLUDED.provider,
             model           = EXCLUDED.model,
             system_prompt   = EXCLUDED.system_prompt,
             temperature     = EXCLUDED.temperature,
             max_tokens      = EXCLUDED.max_tokens,
             custom_settings = EXCLUDED.custom_settings,
             updated_at      = NOW()
       RETURNING *`,
      [
        input.profile_id,
        input.provider,
        input.model,
        input.system_prompt ?? null,
        input.temperature ?? null,
        input.max_tokens ?? null,
        input.custom_settings ? JSON.stringify(input.custom_settings) : null,
      ]
    );
    return row!;
  }
}

export const aiConfigurationRepository = new AiConfigurationRepository();
