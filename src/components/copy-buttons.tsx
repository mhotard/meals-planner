"use client";

import { useState } from "react";

type Format = { id: string; label: string; hint: string; text: string };

/**
 * Trello turns a multi-line paste into one card per line (or one checklist
 * item per line), so the Trello format is deliberately bare: no headings, no
 * bullet characters, one item per line.
 */
export default function CopyButtons({ formats }: { formats: Format[] }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  async function copy(format: Format) {
    try {
      await navigator.clipboard.writeText(format.text);
      setCopiedId(format.id);
      setTimeout(() => setCopiedId((id) => (id === format.id ? null : id)), 2000);
    } catch {
      // Clipboard can be blocked; show the text so it can be copied by hand.
      setPreview(format.text);
    }
  }

  return (
    <div className="no-print space-y-3">
      <div className="flex flex-wrap gap-2">
        {formats.map((format) => (
          <button
            key={format.id}
            type="button"
            onClick={() => copy(format)}
            className="btn-secondary"
            title={format.hint}
          >
            {copiedId === format.id ? "Copied ✓" : format.label}
          </button>
        ))}
        <button type="button" onClick={() => window.print()} className="btn-ghost">
          Print
        </button>
      </div>

      {preview && (
        <div>
          <p className="mb-1 text-xs text-muted">
            Couldn&apos;t reach the clipboard — select and copy:
          </p>
          <textarea
            readOnly
            rows={10}
            value={preview}
            className="input font-mono text-xs"
            onFocus={(e) => e.currentTarget.select()}
          />
        </div>
      )}
    </div>
  );
}
