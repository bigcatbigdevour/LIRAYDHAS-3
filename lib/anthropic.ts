import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;

export function getClient(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set.');
  }
  _client = new Anthropic({ apiKey });
  return _client;
}

export const MODEL =
  process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';

export function textOf(msg: Anthropic.Message): string {
  const out: string[] = [];
  for (const block of msg.content) {
    if (block.type === 'text') out.push(block.text);
  }
  return out.join('\n').trim();
}
