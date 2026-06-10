'use client';

import { useEffect, useRef, useState } from 'react';
import {
  addAttachment,
  removeAttachment,
  getAttachment,
  makeAttachmentId,
} from '@/lib/attachments';
import { attachAudio, detachAudio, MAX_AUDIO_PER_ENTRY } from '@/lib/savedDays';
import { tap as hapticTap } from '@/lib/haptics';

interface Props {
  dateIso: string;
  audioIds: string[];
  onChange: () => void;
}

/**
 * Voice-note strip for a saved-day entry.
 *
 * Uses the browser's MediaRecorder API. Captures audio/webm + opus where
 * supported (Chromium, Firefox), audio/mp4 + aac in Safari. The recorded
 * blob is whatever the platform produced; we store it as-is and let
 * <audio> play it back natively.
 *
 * Tap once to start, tap again to stop. A small dot pulses while
 * recording with the elapsed seconds counter. Auto-stops at 5 minutes
 * so a forgotten recorder doesn't fill the user's IDB quota.
 *
 * Microphone permission failure shows a calm one-line error instead of
 * a confusing silent no-op.
 */
const MAX_RECORDING_MS = 5 * 60_000;

export default function VoiceNoteStrip({ dateIso, audioIds, onChange }: Props) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);

  // Resolve object URLs for every audio id on mount / change. Revokes
  // on cleanup.
  useEffect(() => {
    let cancelled = false;
    const next: Record<string, string> = {};
    (async () => {
      for (const id of audioIds) {
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
  }, [audioIds.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup any active recording on unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        try { recorderRef.current.stop(); } catch {/* ignore */}
        recorderRef.current.stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  async function startRecording() {
    if (recording) return;
    setErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        // Release the mic ASAP so the OS indicator clears.
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        if (blob.size === 0) return;
        try {
          const id = makeAttachmentId(dateIso, 'audio');
          await addAttachment(id, blob, {
            mime: recorder.mimeType || 'audio/webm',
          });
          attachAudio(dateIso, id);
          hapticTap('medium');
          onChange();
        } catch (e) {
          console.error('voice note save failed', e);
          setErr("Couldn't save that recording.");
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setRecording(true);
      setElapsed(0);
      timerRef.current = window.setInterval(() => {
        const e = (Date.now() - startedAtRef.current) / 1000;
        setElapsed(e);
        if (e * 1000 >= MAX_RECORDING_MS) stopRecording();
      }, 250);
      hapticTap('light');
    } catch (e) {
      console.error('mic permission failed', e);
      setErr('Microphone permission was declined.');
    }
  }

  function stopRecording() {
    if (!recorderRef.current || recorderRef.current.state === 'inactive') return;
    try { recorderRef.current.stop(); } catch {/* ignore */}
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);
    setElapsed(0);
    hapticTap('light');
  }

  async function onRemove(audioId: string) {
    if (!confirm('Remove this voice note?')) return;
    hapticTap('light');
    detachAudio(dateIso, audioId);
    try {
      await removeAttachment(audioId);
    } catch {/* ignore */}
    onChange();
  }

  const atCap = audioIds.length >= MAX_AUDIO_PER_ENTRY;

  return (
    <div className="mt-2 space-y-1.5">
      {audioIds.map((id) => {
        const url = urls[id];
        return (
          <div
            key={id}
            className="flex items-center gap-2 border border-hairline px-2 py-1.5"
          >
            {url ? (
              <audio src={url} controls preload="metadata" className="flex-1 h-7" />
            ) : (
              <div className="flex-1 h-7 bg-hairline animate-pulse" aria-hidden />
            )}
            <button
              type="button"
              onClick={() => { void onRemove(id); }}
              className="small-label caps text-ink-faint hover:text-accent text-[9px]"
              style={{ letterSpacing: '0.14em' }}
              aria-label="remove this voice note"
              title="remove"
            >
              ×
            </button>
          </div>
        );
      })}
      {!atCap && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={recording ? stopRecording : startRecording}
            className={`small-label caps text-[10px] px-2 py-1 border transition-colors ${
              recording
                ? 'border-accent text-accent'
                : 'border-hairline text-ink-faint hover:text-ink hover:border-ink-faint'
            }`}
            style={{ letterSpacing: '0.16em' }}
            aria-pressed={recording}
            aria-label={recording ? 'stop recording' : 'record a voice note'}
          >
            {recording ? '■ stop' : '● record'}
          </button>
          {recording && (
            <span
              className="small-label caps text-accent text-[10px] tabular-nums"
              style={{ letterSpacing: '0.16em' }}
            >
              ● {elapsed.toFixed(1)}s
            </span>
          )}
          {err && (
            <span className="small-label text-accent text-[10px]">{err}</span>
          )}
        </div>
      )}
    </div>
  );
}
