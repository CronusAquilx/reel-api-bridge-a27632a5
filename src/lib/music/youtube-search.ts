export type YoutubeSearchCandidate = {
  id: string;
  title: string;
  channel: string;
  duration: number;
};

function textOf(value: any): string {
  if (typeof value?.simpleText === "string") return value.simpleText;
  if (Array.isArray(value?.runs)) return value.runs.map((run: any) => String(run?.text ?? "")).join("");
  return "";
}

function secondsOf(value: string): number {
  const parts = value.split(":").map(Number);
  if (!parts.length || parts.some(part => !Number.isFinite(part))) return 0;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

/** Extracts the balanced ytInitialData object without evaluating page scripts. */
function initialData(html: string): any {
  const marker = "var ytInitialData =";
  const markerAt = html.indexOf(marker);
  if (markerAt < 0) throw new Error("YouTube search data unavailable");
  const start = html.indexOf("{", markerAt + marker.length);
  if (start < 0) throw new Error("YouTube search data unavailable");
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let i = start; i < html.length; i++) {
    const char = html[i];
    if (escaped) { escaped = false; continue; }
    if (char === "\\") { escaped = true; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (quoted) continue;
    if (char === "{") depth++;
    if (char === "}" && --depth === 0) return JSON.parse(html.slice(start, i + 1));
  }
  throw new Error("YouTube search data unavailable");
}

/** Reads only public video search results; playback remains in YouTube's official player. */
export function parseYoutubeSearch(html: string): YoutubeSearchCandidate[] {
  const found: YoutubeSearchCandidate[] = [];
  const seen = new Set<string>();
  const visit = (value: any) => {
    if (!value || typeof value !== "object") return;
    const renderer = value.videoRenderer;
    const id = renderer?.videoId;
    if (typeof id === "string" && /^[A-Za-z0-9_-]{11}$/.test(id) && !seen.has(id)) {
      seen.add(id);
      found.push({
        id,
        title: textOf(renderer.title),
        channel: textOf(renderer.ownerText) || textOf(renderer.longBylineText),
        duration: secondsOf(textOf(renderer.lengthText)),
      });
    }
    if (Array.isArray(value)) value.forEach(visit);
    else Object.values(value).forEach(visit);
  };
  visit(initialData(html));
  return found;
}
