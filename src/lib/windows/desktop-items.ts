export type DesktopItemKind = "folder" | "file";
export type DesktopItem = { id: string; name: string; kind: DesktopItemKind; content: string };
export type DesktopRectangle = { left: number; top: number; right: number; bottom: number };

export function makeDesktopItem(kind: DesktopItemKind, existing: DesktopItem[], id: string): DesktopItem {
  const base = kind === "folder" ? "New folder" : "New Text Document";
  const names = new Set(existing.map(item => item.name.toLowerCase()));
  let name = base;
  for (let index = 2; names.has(name.toLowerCase()); index++) name = `${base} (${index})`;
  return { id, kind, name, content: "" };
}

export function rectanglesIntersect(a: DesktopRectangle, b: DesktopRectangle): boolean {
  return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
}

export function normalizedRectangle(start: { x: number; y: number }, end: { x: number; y: number }): DesktopRectangle {
  return { left: Math.min(start.x, end.x), right: Math.max(start.x, end.x), top: Math.min(start.y, end.y), bottom: Math.max(start.y, end.y) };
}
