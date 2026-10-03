"use client";

import { useCopy } from "@/hooks/use-copy";

export default function ShareLink({ url, path }: { url: string; path: string }) {
  const { copied, failedText, copy } = useCopy();

  return (
    <div className="no-print card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Share this week</p>
          <p className="truncate text-xs text-muted">
            Anyone with the link can view the plan and shopping list — no login needed
          </p>
        </div>
        <button type="button" onClick={() => copy(url)} className="btn-secondary shrink-0">
          {copied ? "Copied ✓" : "Copy link"}
        </button>
        <a href={path} target="_blank" rel="noreferrer" className="btn-ghost shrink-0">
          Preview
        </a>
      </div>

      {failedText && (
        <input
          readOnly
          value={failedText}
          onFocus={(e) => e.currentTarget.select()}
          className="input mt-3 font-mono text-xs"
        />
      )}
    </div>
  );
}
