'use client';

import { useEffect, useState } from 'react';
import {
  addAttachment,
  removeAttachment,
  getAttachment,
  makeAttachmentId,
} from '@/lib/attachments';
import { attachPhoto, detachPhoto, MAX_PHOTOS_PER_ENTRY } from '@/lib/savedDays';
import { tap as hapticTap } from '@/lib/haptics';

interface Props {
  dateIso: string;
  photoIds: string[];
  /** Called after any add/remove so the parent can re-read savedDays. */
  onChange: () => void;
  /** Larger thumbnails when shown inside the read-mode overlay. */
  variant?: 'inline' | 'reader';
}

/**
 * Photo strip for a saved-day entry.
 *
 * Lazy-loads object URLs from IndexedDB on mount, revokes them on unmount
 * to keep memory tidy. Two variants: a small inline thumbnail row for
 * the journal-list view, and a wider grid for the full-screen reader.
 *
 * The "+ photo" tile opens a file picker via a hidden <input
 * type="file" accept="image/*" capture>. On iOS Safari this offers the
 * camera too, which makes attaching a photo feel native — snap the
 * thing you're writing about, attach it, done.
 */
export default function PhotoStrip({ dateIso, photoIds, onChange, variant = 'inline' }: Props) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  // Resolve object URLs for every photo id. Re-runs when the id list
  // changes, and revokes the prior URLs on cleanup so a long-lived
  // /saved page doesn't accrete blob handles.
  useEffect(() => {
    let cancelled = false;
    const next: Record<string, string> = {};
    (async () => {
      for (const id of photoIds) {
        if (cancelled) return;
        const a = await getAttachment(id);
        if (!a) continue;
        next[id] = URL.createObjectURL(a.blob);
      }
      if (!cancelled) setUrls(next);
    })();
    return () => {
      cancelled = true;
      for (const url of Object.values(next)) URL.revokeObjectURL(url);
    };
  }, [photoIds.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onFile(file: File) {
    if (busy) return;
    setBusy(true);
    try {
      const id = makeAttachmentId(dateIso, 'photo');
      await addAttachment(id, file, { mime: file.type || 'image/jpeg', filename: file.name });
      attachPhoto(dateIso, id);
      hapticTap('medium');
      onChange();
    } catch (e) {
      console.error('photo attach failed', e);
      alert("Couldn't attach that photo. It may be too large for this device.");
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(photoId: string) {
    if (!confirm('Remove this photo from the entry?')) return;
    hapticTap('light');
    detachPhoto(dateIso, photoId);
    try {
      await removeAttachment(photoId);
    } catch {/* ignore — record may be gone */}
    onChange();
  }

  const atCap = photoIds.length >= MAX_PHOTOS_PER_ENTRY;
  const tile = variant === 'reader' ? 'w-28 h-28' : 'w-16 h-16';

  return (
    <div className={`mt-3 flex flex-wrap gap-2 ${variant === 'reader' ? '' : 'items-center'}`}>
      {photoIds.map((id) => {
        const url = urls[id];
        return (
          <div key={id} className={`relative ${tile} group`}>
            {url ? (
              <img
                src={url}
                alt="entry photo"
                className="w-full h-full object-cover border border-hairline"
                loading="lazy"
              />
            ) : (
              <div className={`w-full h-full bg-hairline animate-pulse border border-hairline`} aria-hidden />
            )}
            <button
              type="button"
              onClick={() => { void onRemove(id); }}
              className="absolute top-0 right-0 small-label caps bg-bg/85 text-ink-faint hover:text-accent text-[9px] px-1 py-0.5 border border-hairline"
              style={{ letterSpacing: '0.14em' }}
              aria-label="remove this photo"
              title="remove"
            >
              ×
            </button>
          </div>
        );
      })}
      {!atCap && (
        <label
          className={`${tile} flex items-center justify-center border border-dashed border-hairline cursor-pointer hover:border-ink-faint transition-colors`}
          title="add a photo"
        >
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.currentTarget.files?.[0];
              if (file) void onFile(file);
              e.currentTarget.value = '';
            }}
            disabled={busy}
          />
          <span
            className="small-label caps text-ink-faint text-[10px]"
            style={{ letterSpacing: '0.16em' }}
          >
            {busy ? '…' : '+ photo'}
          </span>
        </label>
      )}
    </div>
  );
}
