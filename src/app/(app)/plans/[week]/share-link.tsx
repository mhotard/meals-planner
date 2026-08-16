"use client";

import { useState } from "react";

export default function ShareLink({ url, path }: { url: string; path: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setFailed(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setFailed(true);
    }
  }

  return (
    <div className="no-print card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Share this week</p>
          <p className="truncate text-xs text-muted">
            Anyone with the link can view the plan and shopping list — no login needed
          </p>
        </div>
        <button type="button" onClick={copy} className="btn-secondary shrink-0">
          {copied ? "Copied ✓" : "Copy link"}
        </button>
        <a href={path} target="_blank" rel="noreferrer" className="btn-ghost shrink-0">
          Preview
        </a>
      </div>

      {failed && (
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="input mt-3 font-mono text-xs"
        />
      )}
    </div>
  );
}
