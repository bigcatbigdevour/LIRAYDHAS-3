/**
 * IndexedDB store for binary attachments on saved-day entries.
 *
 * Why IDB and not localStorage: localStorage caps at ~5–10 MB per origin
 * and stores strings only. One unprocessed iPhone photo would blow that
 * cap. IDB handles hundreds of MB of binary blobs cleanly across browsers.
 *
 * Design: a single object store keyed by an entry-relative attachment id
 * (e.g. "2026-03-09-photo-1709950800000"). Each record stores the blob,
 * MIME type, an optional originalFilename, and the createdAt timestamp.
 *
 * The SavedDay schema in lib/savedDays.ts only carries the ATTACHMENT IDS
 * — never the blob itself — so the journal export, search, and
 * cross-tab sync stay lightweight. Renderers call getAttachment(id) when
 * they need to show the actual image.
 */

const DB_NAME = 'liraydhas';
const DB_VERSION = 1;
const STORE = 'attachments';

export interface Attachment {
  /** Stable id, set by addAttachment(). */
  id: string;
  /** The original blob. */
  blob: Blob;
  /** MIME type — usually image/jpeg, image/png, image/webp, audio/webm, etc. */
  mime: string;
  /** Whatever the user picked it as (best-effort). */
  filename?: string;
  /** Epoch ms when stored. */
  createdAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('attachments: no window'));
      return;
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Generate a stable attachment id for a given day. Includes the entry's
 * dateIso so attachment ids are visibly tied to their day in IDB inspection.
 */
export function makeAttachmentId(dateIso: string, kind: 'photo' | 'audio'): string {
  return `${dateIso}-${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function addAttachment(
  id: string,
  blob: Blob,
  opts: { mime: string; filename?: string } = { mime: blob.type || 'application/octet-stream' },
): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const record: Attachment = {
      id,
      blob,
      mime: opts.mime,
      filename: opts.filename,
      createdAt: Date.now(),
    };
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  db.close();
}

export async function getAttachment(id: string): Promise<Attachment | null> {
  const db = await openDB();
  const result = await new Promise<Attachment | null>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const req = store.get(id);
    req.onsuccess = () => resolve((req.result as Attachment | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

export async function removeAttachment(id: string): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  db.close();
}

/**
 * Wipe every attachment — used by the "clear saved journal" path on
 * /about so a full reset really does clear everything.
 */
export async function clearAllAttachments(): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  db.close();
}

/**
 * Convenience: take a Blob, store it, return an object URL that the UI
 * can render. URLs revoke themselves on tab close, but callers should
 * still revoke when unmounting to free memory sooner.
 */
export async function objectUrlFor(id: string): Promise<string | null> {
  const a = await getAttachment(id);
  if (!a) return null;
  return URL.createObjectURL(a.blob);
}
