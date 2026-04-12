import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;

export function getClient(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. Copy .env.example to .env.local and add your key.'
    );
  }
  _client = new Anthropic({ apiKey });
  return _client;
}

export const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5';

// Extract plain text from a Messages API response.
export function textOf(response: Anthropic.Message): string {
  const parts: string[] = [];
  for (const block of response.content) {
    if (block.type === 'text') parts.push(block.text);
  }
  return parts.join('\n').trim();
}
