import { AiGeneration, AiOutputType, AiGenStatus } from '../types/models';
import { BaseRepository } from './base.repository';

export interface CreateAiGenerationInput {
  profile_id: string;
  post_id?: string;
  ai_configuration_id: string;
  prompt: string;
  output_type: AiOutputType;
  model_used: string;
}

export class AiGenerationRepository extends BaseRepository {
  async findById(id: string): Promise<AiGeneration | null> {
    return this.queryOne<AiGeneration>(
      'SELECT * FROM ai_generations WHERE id = $1',
      [id]
    );
  }

  async findByProfileId(profileId: string, limit = 20, offset = 0): Promise<AiGeneration[]> {
    return this.queryMany<AiGeneration>(
      `SELECT * FROM ai_generations
       WHERE profile_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [profileId, limit, offset]
    );
  }

  async create(input: CreateAiGenerationInput): Promise<AiGeneration> {
    const row = await this.queryOne<AiGeneration>(
      `INSERT INTO ai_generations
         (profile_id, post_id, ai_configuration_id, prompt, output_type, model_used)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        input.profile_id,
        input.post_id ?? null,
        input.ai_configuration_id,
        input.prompt,
        input.output_type,
        input.model_used,
      ]
    );
    return row!;
  }

  async complete(
    id: string,
    outputText: string | null,
    outputMediaId: string | null,
    tokensUsed: number,
    generationTimeMs: number
  ): Promise<void> {
    await this.query(
      `UPDATE ai_generations
       SET status             = 'completed',
           output_text        = $2,
           output_media_id    = $3,
           tokens_used        = $4,
           generation_time_ms = $5
       WHERE id = $1`,
      [id, outputText, outputMediaId, tokensUsed, generationTimeMs]
    );
  }

  async fail(id: string, errorMessage: string): Promise<void> {
    await this.query(
      `UPDATE ai_generations SET status = 'failed', error_message = $2 WHERE id = $1`,
      [id, errorMessage]
    );
  }
}

export const aiGenerationRepository = new AiGenerationRepository();
