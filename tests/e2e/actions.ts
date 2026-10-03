import type { APIRequestContext } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";

type ActionManifest = { node: Record<string, { exportedName: string; filename: string; workers: Record<string, unknown> }> };

/** Calls the real exported action through Next's Flight transport. No auth stubs. */
export async function callAction(request: APIRequestContext, url: string, name: string, args: unknown[]) {
  const manifest: ActionManifest = JSON.parse(await readFile(".next/dev/server/server-reference-manifest.json", "utf8"));
  const entry = Object.entries(manifest.node).find(([, entry]) => entry.exportedName === name);
  if (!entry) throw new Error(`Exported action ${name} not compiled; visit its feature route first`);
  const boundary = `e2e-${randomBytes(16).toString("hex")}`;
  const fields: [string, string][] = [];
  let formIndex = 0;
  const serialized = args.map((arg) => {
    if (arg === undefined) return "$undefined";
    if (!(arg instanceof FormData)) return arg;
    const id = String(++formIndex);
    for (const [key, value] of arg.entries()) {
      if (typeof value !== "string") throw new Error("This helper supports string form fields only");
      fields.push([`${id}_${key}`, value]);
    }
    return `$K${id}`;
  });
  fields.unshift(["0", JSON.stringify(serialized)]);
  const body = fields.map(([name, value]) => `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`).join("") + `--${boundary}--\r\n`;
  const route = entry[1].filename.includes("/recipes/") ? "/recipes/new"
    : entry[1].filename.includes("/pantry/") ? "/pantry"
    : entry[1].filename.includes("/settings/") ? "/settings"
    : entry[1].filename.includes("/plans/") ? "/plans/2030-02-04"
    : "/login";
  return request.post(`${url}${route}`, {
    headers: {"Next-Action": entry[0], Origin: url, "Content-Type": `multipart/form-data; boundary=${boundary}`},
    data: body, maxRedirects: 0,
  });
}

export function form(values: Record<string, string | string[]>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    for (const item of Array.isArray(value) ? value : [value]) data.append(key, item);
  }
  return data;
}
