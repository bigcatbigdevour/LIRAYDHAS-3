import type { PsycheSession } from './types';

const KEY = 'liraydhas.session.v1';

export function loadSession(): PsycheSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PsycheSession;
  } catch {
    return null;
  }
}

export function saveSession(session: PsycheSession): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // ignore quota errors — the session still lives in React state
  }
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function newSessionId(): string {
  // Simple time + random id; no external deps.
  return (
    Date.now().toString(36) +
    '-' +
    Math.random().toString(36).slice(2, 10)
  );
}
