/**
 * Translate raw API errors into calm, plainspoken user-facing messages.
 * App Reviewers and ordinary readers should never see "error 500" or a
 * raw Anthropic stack — they should see one sentence explaining what
 * happened and what to do.
 */
export function friendlyError(raw: string | null | undefined): string {
  if (!raw) return 'Something went sideways. Try again in a moment.';
  const lower = raw.toLowerCase();

  // Configuration on the server — no Anthropic key set.
  if (
    lower.includes('anthropic_api_key') ||
    lower.includes('api key') ||
    lower.includes('apikey')
  ) {
    return "The reading service isn't configured yet. Try again once the developer has set their key.";
  }

  // Offline / can't reach the API.
  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed') ||
    lower.includes('typeerror: load') ||
    lower.includes('load failed')
  ) {
    return 'No connection right now. The reading will load when you reconnect.';
  }

  // Rate / overload.
  if (
    lower.includes('rate') ||
    lower.includes('429') ||
    lower.includes('overloaded') ||
    lower.includes('5xx') ||
    lower.startsWith('error 5')
  ) {
    return 'The reading service is busy. Wait a few seconds and try again.';
  }

  // Bad request — usually a stale blueprint shape.
  if (
    lower.includes('missing blueprint') ||
    lower.includes('invalid json') ||
    lower.includes('400')
  ) {
    return 'Your saved data looks out of date. Edit your birth info from /about and try again.';
  }

  // Unknown error — keep it generic, not technical.
  return 'Something went sideways. Try again in a moment.';
}
