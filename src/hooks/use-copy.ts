"use client";

import { useState } from "react";

/**
 * Clipboard copy with a two-second "Copied" flag and a fallback for when the
 * clipboard is blocked: `failedText` holds the text so the UI can show it for
 * copying by hand.
 */
export function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const [failedText, setFailedText] = useState<string | null>(null);

  async function copy(text: string, id: string = text) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setFailedText(null);
      setTimeout(() => setCopied((current) => (current === id ? null : current)), 2000);
    } catch {
      setFailedText(text);
    }
  }

  return { copied, failedText, copy };
}
