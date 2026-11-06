export function fitScreen(w: number, h: number, availableW: number, availableH: number) {
  if (w <= 0 || h <= 0 || availableW <= 0 || availableH <= 0) return 1;
  return Math.min(availableW / w, availableH / h);
}
export function screenPoint(x: number, y: number, left: number, top: number, scale: number) {
  return { x: Math.round((x - left) / scale), y: Math.round((y - top) / scale) };
}