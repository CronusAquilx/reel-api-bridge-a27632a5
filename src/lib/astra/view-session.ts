export type ViewSession = {
  id: string;
  name: string | null;
  notify: boolean;
};

const safeId = (value: unknown) => typeof value === "string" && /^[a-zA-Z0-9-]{8,80}$/.test(value);
const safeName = (value: unknown) => typeof value === "string" && value.trim() ? value.trim().slice(0, 60) : null;

/** Keeps view privacy in the existing command message, so old clients and the current schema remain compatible. */
export function encodeViewSession(session: ViewSession) {
  return JSON.stringify({ v: 1, id: session.id, name: session.name?.slice(0, 60) ?? null, notify: session.notify });
}

export function parseViewSession(raw: string): ViewSession | null {
  if (safeId(raw)) return { id: raw, name: null, notify: true };
  try {
    const value = JSON.parse(raw) as { v?: unknown; id?: unknown; name?: unknown; notify?: unknown };
    if (value.v !== 1 || !safeId(value.id)) return null;
    return { id: value.id as string, name: safeName(value.name), notify: value.notify !== false };
  } catch {
    return null;
  }
}
