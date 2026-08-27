/**
 * Small helper for components that run async actions which can be
 * superseded (by a new run with newer inputs) or invalidated (by the
 * component unmounting). Returns an `start()` function that creates a
 * fresh AbortController, automatically aborting the previous one and
 * any in-flight stream.
 *
 * Why this exists: every page that streams an LLM reading was
 * vulnerable to the same race —
 *   user pulls-to-refresh quickly, or navigates between pages with a
 *   stream mid-flight → old stream's setStreamParagraph() fires after
 *   a new fetch has already started, briefly painting stale text into
 *   the UI; on unmount it produces a React warning about setState on
 *   an unmounted component.
 *
 * Usage:
 *   const start = useAbortableAction();
 *   async function fetchDaily() {
 *     const { signal, stale } = start();
 *     const res = await fetch(url, { signal });
 *     if (stale()) return;
 *     await readSseStream(res, handlers, signal);
 *   }
 *
 * Inside callbacks pass `signal` through to fetch / readSseStream, or
 * gate setState calls behind `stale()` for non-async work.
 */

import { useEffect, useRef } from 'react';

export interface AbortableHandle {
  signal: AbortSignal;
  /** True once a newer call has started or the component has unmounted. */
  stale: () => boolean;
}

export function useAbortableAction(): () => AbortableHandle {
  const ctrlRef = useRef<AbortController | null>(null);
  const unmountedRef = useRef(false);

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      ctrlRef.current?.abort();
      ctrlRef.current = null;
    };
  }, []);

  return function start(): AbortableHandle {
    // Abort the previous run if any.
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    return {
      signal: ctrl.signal,
      stale: () => unmountedRef.current || ctrl.signal.aborted || ctrlRef.current !== ctrl,
    };
  };
}

/**
 * True when an exception was raised by an AbortController. Useful in
 * catch blocks: we want to silently drop the error if the caller
 * intentionally cancelled, not flash an error banner.
 */
export function isAbortError(e: unknown): boolean {
  return (
    e instanceof DOMException && e.name === 'AbortError'
  ) || (
    typeof e === 'object' && e !== null &&
    (e as { name?: string }).name === 'AbortError'
  );
}
