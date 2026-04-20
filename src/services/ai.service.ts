import { AiGeneration, AiOutputType } from '../types/models';
import { aiGenerationRepository } from '../repositories/aiGeneration.repository';
import { aiConfigurationRepository } from '../repositories/aiConfiguration.repository';

export interface GenerateTextOptions {
  profile_id: string;
  post_id?: string;
  prompt: string;
  output_type?: AiOutputType;
}

export const aiService = {
  async generate(options: GenerateTextOptions): Promise<AiGeneration> {
    const config = await aiConfigurationRepository.findByProfileId(options.profile_id);
    if (!config) {
      throw Object.assign(
        new Error('No AI configuration found for this profile. Create one first.'),
        { statusCode: 422 }
      );
    }

    const generation = await aiGenerationRepository.create({
      profile_id: options.profile_id,
      post_id: options.post_id,
      ai_configuration_id: config.id,
      prompt: options.prompt,
      output_type: options.output_type ?? 'text',
      model_used: config.model,
    });

    const started = Date.now();

    try {
      // This is the integration point for any AI provider (OpenAI, Anthropic, etc.).
      // Swap in the real SDK call here; the schema and logging are provider-agnostic.
      const outputText = await callAiProvider(config.provider, config.model, {
        systemPrompt: config.system_prompt ?? undefined,
        userPrompt: options.prompt,
        temperature: config.temperature ?? undefined,
        maxTokens: config.max_tokens ?? undefined,
      });

      await aiGenerationRepository.complete(
        generation.id,
        outputText,
        null,
        estimateTokens(options.prompt + outputText),
        Date.now() - started
      );
    } catch (err) {
      await aiGenerationRepository.fail(
        generation.id,
        err instanceof Error ? err.message : String(err)
      );
      throw err;
    }

    return (await aiGenerationRepository.findById(generation.id))!;
  },

  async listGenerations(profileId: string, limit = 20, offset = 0): Promise<AiGeneration[]> {
    return aiGenerationRepository.findByProfileId(profileId, limit, offset);
  },
};

async function callAiProvider(
  provider: string,
  model: string,
  opts: {
    systemPrompt?: string;
    userPrompt: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  // Stub — replace with real provider SDK call.
  // Example for Anthropic: import Anthropic and call client.messages.create(...)
  throw Object.assign(
    new Error(`AI provider "${provider}" not yet integrated. Plug in the SDK here.`),
    { statusCode: 501 }
  );
}

function estimateTokens(text: string): number {
  // Rough approximation: ~4 chars per token
  return Math.ceil(text.length / 4);
}
