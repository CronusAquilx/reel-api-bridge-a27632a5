import type { Track } from "./player";
import { findFullSongs } from "./full-song.functions";

export const PIPED_SEARCH_HOSTS = ["https://pipedapi.kavin.rocks", "https://pipedapi.adminforge.de", "https://api.piped.private.coffee", "https://pipedapi.drgns.space"];
export const SEARCH_TIMEOUT_MS = 4000;
export function videoId(url: string): string | null {
  try { const id = new URL(url, "https://www.youtube.com").searchParams.get("v"); return id && /^[\w-]{11}$/.test(id) ? id : null; } catch { return null; }
}
function track(id: string, title: string, artist: string, art: string, preview = "", duration = 0, source: Track["source"] = "piped"): Track {
  return { id, title, artist, art, preview, duration, source, artistId: "", album: "", albumId: "" };
}
let callbackSequence = 0;
function jsonp(url: string, signal: AbortSignal): Promise<any> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException("Aborted", "AbortError")); return; }
    const name = `birchMusicJsonp${++callbackSequence}`;
    const callbacks = window as unknown as Record<string, unknown>;
    const script = document.createElement("script");
    const finish = (data?: unknown, error?: Error) => {
      clearTimeout(timer); signal.removeEventListener("abort", abort); script.remove(); delete callbacks[name];
      if (error) reject(error); else resolve(data);
    };
    const abort = () => finish(undefined, new DOMException("Aborted", "AbortError"));
    const timer = setTimeout(() => finish(undefined, new Error("Unavailable")), SEARCH_TIMEOUT_MS);
    callbacks[name] = (data: unknown) => finish(data);
    script.src = `${url}&callback=${name}`;
    script.onerror = () => finish(undefined, new Error("Unavailable"));
    signal.addEventListener("abort", abort, { once: true }); document.head.appendChild(script);
  });
}
export async function searchPreviews(query: string, signal: AbortSignal): Promise<Track[]> {
  try {
    const data = await jsonp(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=10`, signal);
    const rows = (Array.isArray(data.results) ? data.results : []).filter((r: any) => typeof r.previewUrl === "string").map((r: any) => track(String(r.trackId), r.trackName, r.artistName, r.artworkUrl100 ?? "", r.previewUrl, 30, "itunes"));
    if (rows.length) return rows;
  } catch { if (signal.aborted) return []; }
  try {
    const data = await jsonp(`https://api.deezer.com/search?q=${encodeURIComponent(query)}&output=jsonp`, signal);
    return (Array.isArray(data.data) ? data.data : []).filter((r: any) => typeof r.preview === "string" && r.preview).map((r: any) => track(String(r.id), r.title, r.artist?.name ?? "", r.album?.cover_medium ?? "", r.preview, 30, undefined));
  } catch { return []; }
}
export async function searchMusic(query: string, signal: AbortSignal, fullOnly = false): Promise<Track[]> {
  if (!query.trim() || signal.aborted) return [];
  for (const host of PIPED_SEARCH_HOSTS) {
    if (signal.aborted) return [];
    const controller = new AbortController();
    const abort = () => controller.abort(); signal.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(abort, SEARCH_TIMEOUT_MS);
    try {
      const response = await fetch(`${host}/search?q=${encodeURIComponent(query)}&filter=videos`, { signal: controller.signal });
      if (!response.ok) continue;
      const data = await response.json();
      const rows: Track[] = [];
      for (const item of Array.isArray(data.items) ? data.items : []) {
        const id = typeof item.url === "string" ? videoId(item.url) : null;
        if (id && typeof item.title === "string") rows.push(track(id, item.title, item.uploaderName ?? "", item.thumbnail ?? "", "", item.duration ?? 0));
      }
      if (rows.length && !signal.aborted) return rows;
    } catch { /* Continue to the next independent host. */ }
    finally { clearTimeout(timer); signal.removeEventListener("abort", abort); }
  }
  if (signal.aborted) return [];
  try {
    const songs = await findFullSongs({ data: { query: query.slice(0, 200) }, signal });
    if (signal.aborted) return [];
    if (songs.length) return songs;
  } catch { if (signal.aborted) return []; }
  return signal.aborted || fullOnly ? [] : searchPreviews(query, signal);
}