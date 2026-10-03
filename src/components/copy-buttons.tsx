"use client";

import { useCopy } from "@/hooks/use-copy";

type Format = { id: string; label: string; hint: string; text: string };

/**
 * Trello turns a multi-line paste into one card per line (or one checklist
 * item per line), so the Trello format is deliberately bare: no headings, no
 * bullet characters, one item per line.
 */
export default function CopyButtons({ formats }: { formats: Format[] }) {
  const { copied, failedText, copy } = useCopy();

  return (
    <div className="no-print space-y-3">
      <div className="flex flex-wrap gap-2">
        {formats.map((format) => (
          <button
            key={format.id}
            type="button"
            onClick={() => copy(format.text, format.id)}
            className="btn-secondary"
            title={format.hint}
          >
            {copied === format.id ? "Copied ✓" : format.label}
          </button>
        ))}
        <button type="button" onClick={() => window.print()} className="btn-ghost">
          Print
        </button>
      </div>

      {failedText && (
        <div>
          <p className="mb-1 text-xs text-muted">
            Couldn&apos;t reach the clipboard — select and copy:
          </p>
          <textarea
            readOnly
            rows={10}
            value={failedText}
            className="input font-mono text-xs"
            onFocus={(e) => e.currentTarget.select()}
          />
        </div>
      )}
    </div>
  );
}
