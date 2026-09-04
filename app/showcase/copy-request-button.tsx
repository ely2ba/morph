'use client';

import { Check, Copy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export function CopyRequestButton({ request }: { request: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  const copyRequest = async () => {
    try {
      await navigator.clipboard.writeText(request);
      setStatus('copied');
    } catch {
      setStatus('failed');
    }

    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setStatus('idle'), 2200);
  };

  return (
    <button
      type="button"
      className="ysw-copy-button"
      onClick={() => void copyRequest()}
      aria-label={status === 'copied' ? 'Request copied' : 'Copy request'}
    >
      {status === 'copied' ? (
        <Check size={15} aria-hidden="true" />
      ) : (
        <Copy size={15} aria-hidden="true" />
      )}
      <span aria-live="polite">
        {status === 'copied'
          ? 'Copied'
          : status === 'failed'
            ? 'Copy failed'
            : 'Copy request'}
      </span>
    </button>
  );
}
