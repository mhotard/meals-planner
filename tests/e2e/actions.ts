import type { APIRequestContext, APIResponse } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { join } from "node:path";

// Use the installed React Flight encoder rather than copying a wire format
// that changes between Next patch versions (including FormData prefixes).
const { encodeReply } = createRequire(join(process.cwd(), "package.json"))("next/dist/compiled/react-server-dom-webpack/client.node") as {
  encodeReply: (args: unknown[]) => Promise<string | FormData>;
};

type ActionManifest = { node: Record<string, { exportedName: string; filename: string; workers: Record<string, unknown> }> };

/** Calls the real exported action through Next's Flight transport. No auth stubs. */
export async function callAction(request: APIRequestContext, url: string, name: string, args: unknown[]) {
  const manifest: ActionManifest = JSON.parse(await readFile(".next/dev/server/server-reference-manifest.json", "utf8"));
  const entry = Object.entries(manifest.node).find(([, entry]) => entry.exportedName === name);
  if (!entry) throw new Error(`Exported action ${name} not compiled; visit its feature route first`);
  const boundary = `e2e-${randomBytes(16).toString("hex")}`;
  const fields: [string, string][] = [];
  const encoded = await encodeReply(args);
  if (typeof encoded === "string") fields.push(["0", encoded]);
  else for (const [key, value] of encoded.entries()) {
    if (typeof value !== "string") throw new Error("This helper supports string form fields only");
    fields.push([key, value]);
  }
  const body = fields.map(([name, value]) => `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`).join("") + `--${boundary}--\r\n`;
  const route = entry[1].filename.includes("/recipes/") ? "/recipes/new"
    : entry[1].filename.includes("/pantry/") ? "/pantry"
    : entry[1].filename.includes("/settings/") ? "/settings"
    : entry[1].filename.includes("/plans/") ? "/plans/2030-02-04"
    : "/login";
  try {
    return await request.post(`${url}${route}`, {
      headers: {"Next-Action": entry[0], Origin: url, "Content-Type": `multipart/form-data; boundary=${boundary}`},
      data: body, maxRedirects: 0,
    });
  } catch {
    // Request diagnostics can contain session cookies and encoded passwords.
    // Preserve the failure without copying private headers/body into reports.
    throw new Error(`Exported action ${name} request failed`);
  }
}

/** Read only the root action promise, never unrelated page/error-boundary props. */
export async function actionResult(response: APIResponse): Promise<Record<string, unknown>> {
  const records = new Map<string, unknown>();
  for (const line of (await response.text()).split("\n")) {
    const match = /^([0-9a-f]+):(.*)$/.exec(line);
    if (!match) continue;
    try { records.set(match[1], JSON.parse(match[2])); } catch { /* Flight metadata rows. */ }
  }
  const root = records.get("0") as {a?: unknown} | undefined;
  let result = root?.a;
  if (typeof result === "string" && /^\$@?[0-9a-f]+$/.test(result)) result = records.get(result.replace(/^\$@?/, ""));
  if (!result || typeof result !== "object" || Array.isArray(result)) throw new Error("Flight action result was not an object");
  return result as Record<string, unknown>;
}

export function form(values: Record<string, string | string[]>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    for (const item of Array.isArray(value) ? value : [value]) data.append(key, item);
  }
  return data;
}
