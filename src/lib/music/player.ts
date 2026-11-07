import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { openProxied } from "@/lib/astra/proxy";
import type { Prefs } from "@/lib/astra/prefs";
import { nextQueueIndex } from "./qaisify";
import { searchMusic, searchPreviews } from "./client-search";

export type Track = { id: string; title: string; artist: string; artistId: string; album: string; albumId: string; art: string; duration: number; preview?: string; source?: "piped" | "itunes" };
export const SERVERS = [
  { id: "youtube", name: "YouTube · Qaisify" }, { id: "auto", name: "Auto · audio sources" },
  { id: "saavn", name: "JioSaavn" }, { id: "piped", name: "Piped" }, { id: "soundcloud", name: "SoundCloud" },
  { id: "audius", name: "Audius" }, { id: "deezer", name: "Deezer · preview" },
] as const;
export type Server = (typeof SERVERS)[number]["id"];
type State = { queue: Track[]; cur: number; status: string; paused: boolean; time: number; dur: number; server: Server; mode: "audio" | "video" | null; volume: number; shuffle: boolean; repeat: "off" | "all" | "one"; loading: boolean; fallbackId: string | null; speed: number; sleepUntil: number | null; history: Track[] };
let state: State = { queue: [], cur: -1, status: "", paused: true, time: 0, dur: 0, server: "youtube", mode: null, volume: .7, shuffle: false, repeat: "off", loading: false, fallbackId: null, speed: 1, sleepUntil: null, history: [] };
const subs = new Set<() => void>();
const set = (p: Partial<State>) => { state = { ...state, ...p }; subs.forEach(f => f()); };
let recordedPlay = -1;
function recordPlayback() { const current = state.queue[state.cur]; if (!current || recordedPlay === playId) return; recordedPlay = playId; set({ history: [current, ...state.history].slice(0, 200) }); }
let audio: HTMLAudioElement | null = null;
let token = "";
let playId = 0;
let prefsRef: Prefs | null = null;
interface YTPlayer { loadVideoById(id: string): void; playVideo(): void; pauseVideo(): void; stopVideo(): void; setVolume(v: number): void; setPlaybackRate?(v: number): void; seekTo(t: number, ahead: boolean): void; getCurrentTime(): number; getDuration(): number; destroy(): void; }
type YTWindow = Window & { YT?: { Player: new (el: HTMLElement, options: Record<string, unknown>) => YTPlayer }; onYouTubeIframeAPIReady?: () => void };
let yt: YTPlayer | null = null;
let ytReady: Promise<YTPlayer> | null = null;
let cancelYoutubeMount: (() => void) | null = null;
let candidates: string[] = [];
let candidateIndex = 0;
let ytGeneration = 0;
let searchedAlternatives = false;
let retriedPlayer = false;
let poll: ReturnType<typeof setInterval> | null = null;
let playbackRequest: AbortController | null = null;
let playbackWatchdog: ReturnType<typeof setTimeout> | null = null;
function cancelPlaybackRequest() { playbackRequest?.abort(); if (playbackWatchdog) clearTimeout(playbackWatchdog); playbackWatchdog = null; }

export async function musicToken() { const { data } = await supabase.auth.getSession(); token = data.session?.access_token ?? "guest"; return token; }
export const artUrl = (src: string) => src && token && /^https:\/\/([a-z0-9-]+\.)*(dzcdn\.net|deezer\.com|mzstatic\.com)\//i.test(src) ? `/api/music?op=art&src=${encodeURIComponent(src)}&token=${encodeURIComponent(token)}` : src;
export async function musicApi<T>(params: Record<string, string>): Promise<T> {
  await musicToken();
  const res = await fetch(`/api/music?${new URLSearchParams(params)}`, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) { const body = await res.json().catch(() => null); throw new Error(res.status === 401 ? "Session expired — sign in again" : body?.error ?? `Music couldn't load (${res.status})`); }
  return res.json();
}
export function downloadUrl(t: Track) { return `/api/music?${new URLSearchParams({ op: "download", title: t.title, artist: t.artist, duration: String(t.duration || 0), preview: t.preview ?? "", token })}`; }
function stopPolling() { if (poll) clearInterval(poll); poll = null; }
function ensure() {
  if (typeof document === "undefined" || audio) return;
  audio = new Audio(); audio.preload = "none"; audio.volume = state.volume;
  audio.addEventListener("timeupdate", () => { if (audio && state.mode === "audio") set({ time: audio.currentTime, dur: Number.isFinite(audio.duration) ? audio.duration : state.dur }); });
  audio.addEventListener("play", () => { if (state.mode === "audio") { recordPlayback(); set({ paused: false, loading: false }); } });
  audio.addEventListener("pause", () => { if (state.mode === "audio") set({ paused: true }); });
  audio.addEventListener("ended", () => next());
  audio.addEventListener("error", () => { if (state.mode === "audio") set({ paused: true, loading: false, status: "Audio unavailable — try YouTube" }); });
}
function resetYoutubePlayer() {
  // Invalidate before destroy: a failed iframe can emit delayed events while switching.
  ytGeneration++;
  cancelYoutubeMount?.(); cancelYoutubeMount = null;
  const previous = yt; yt = null; ytReady = null;
  try { previous?.destroy(); } catch { /* Already detached. */ }
  document.querySelectorAll(".qaisify-playback-host").forEach(el => el.remove());
}
function youtubePlayer(my: number): Promise<YTPlayer> {
  if (yt) return Promise.resolve(yt);
  if (ytReady) return ytReady;
  const win = window as YTWindow;
  const generation = ytGeneration;
  const active = () => generation === ytGeneration && my === playId && !playbackRequest?.signal.aborted;
  ytReady = new Promise((resolve, reject) => {
    let mounted = false;
    let instance: YTPlayer | null = null;
    const fail = (message: string) => { clearTimeout(timer); cancelYoutubeMount = null; ytReady = null; try { instance?.destroy(); } catch { /* Detached. */ } reject(new Error(message)); };
    const timer = setTimeout(() => fail("YouTube player unavailable"), 8000);
    cancelYoutubeMount = () => fail("Playback changed");
    const mount = () => {
      if (!active() || mounted || !win.YT?.Player) return;
      mounted = true;
      const host = document.createElement("div"); host.id = "qaisify-playback-host"; host.className = "qaisify-playback-host";
      host.setAttribute("aria-hidden", "true");
      document.body.appendChild(host);
      instance = new win.YT.Player(host, { width: 320, height: 200, playerVars: { playsinline: 1, rel: 0, origin: location.origin, widget_referrer: location.href }, events: {
        onReady: (event: { target: YTPlayer }) => {
          if (!active()) { event.target.destroy(); return; }
          clearTimeout(timer); cancelYoutubeMount = null; yt = event.target;
          const frame = document.querySelector<HTMLIFrameElement>("iframe.qaisify-playback-host");
          if (frame) { frame.referrerPolicy = "strict-origin-when-cross-origin"; frame.tabIndex = -1; frame.setAttribute("aria-hidden", "true"); }
          yt.setVolume(state.volume * 100); resolve(yt);
        },
        onStateChange: (event: { data: number }) => {
          if (state.mode !== "video" || !active()) return;
          if (event.data === 1) { recordPlayback(); set({ paused: false, loading: false, status: "YouTube · may have ads" }); stopPolling(); poll = setInterval(() => { if (yt && state.mode === "video") set({ time: yt.getCurrentTime() || 0, dur: yt.getDuration() || state.dur }); }, 250); }
          else if (event.data === 2) { stopPolling(); set({ paused: true, loading: false }); }
          else if (event.data === 3) set({ loading: true });
          else if (event.data === 0) next();
        },
        onError: (event: { data: number }) => {
          if (state.mode !== "video" || !active()) return;
          void recoverYoutube(my, event.data);
        },
        onAutoplayBlocked: () => { if (active() && state.mode === "video") set({ paused: true, loading: false, status: "Press play to start your song" }); },
      } });
    };
    if (win.YT?.Player) mount();
    else {
      const previous = win.onYouTubeIframeAPIReady;
      win.onYouTubeIframeAPIReady = () => { previous?.(); mount(); };
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) { const script = document.createElement("script"); script.src = "https://www.youtube.com/iframe_api"; script.onerror = () => { script.remove(); fail("YouTube is blocked on this network"); }; document.head.appendChild(script); }
    }
  });
  return ytReady;
}
async function startYoutube(my: number) {
  const id = candidates[candidateIndex];
  if (!id || my !== playId || playbackRequest?.signal.aborted) return;
  const player = await youtubePlayer(my);
  if (my !== playId || playbackRequest?.signal.aborted) return;
  set({ mode: "video", loading: true, status: "Starting your song…" });
  player.loadVideoById(id); player.setVolume(state.volume * 100); player.setPlaybackRate?.(state.speed);
  if (playbackWatchdog) clearTimeout(playbackWatchdog);
  playbackWatchdog = setTimeout(() => { if (my === playId && state.loading && state.mode === "video") set({ loading: false, paused: true, status: "Press play to start your song" }); }, 12000);
}
async function recoverYoutube(my: number, code: number) {
  const t = state.queue[state.cur];
  const signal = playbackRequest?.signal;
  if (!t || !signal || signal.aborted || my !== playId) return;
  stopPolling(); resetYoutubePlayer();
  if (playbackWatchdog) clearTimeout(playbackWatchdog);
  set({ mode: null, loading: true, paused: true, status: "Finding another playable version…" });
  try {
    // A transport/embed failure gets one clean reset, not an endless retry loop.
    if ([5, 152, 153].includes(code) && !retriedPlayer) {
      retriedPlayer = true; await startYoutube(my); return;
    }
    if (!searchedAlternatives) {
      searchedAlternatives = true;
      const results = await searchMusic(`${t.artist} ${t.title}`, signal, true);
      if (my !== playId || signal.aborted) return;
      candidates = [...new Set([...candidates, ...results.filter(row => !row.preview).map(row => row.id)])].slice(0, 5);
    }
    candidateIndex++;
    if (candidates[candidateIndex]) { await startYoutube(my); return; }
  } catch { /* Fall back only for the same requested song. */ }
  if (my === playId && !signal.aborted) await audioFallback(t, my);
}
export function setServer(s: Server) { set({ server: s }); }
let sleepTimeout: ReturnType<typeof setTimeout> | null = null;
export function setSleepTimer(minutes: number | null) {
  if (sleepTimeout) clearTimeout(sleepTimeout);
  sleepTimeout = null;
  set({ sleepUntil: minutes === null ? null : Date.now() + minutes * 60_000 });
  if (minutes !== null) sleepTimeout = setTimeout(() => { audio?.pause(); yt?.pauseVideo(); stopPolling(); set({ paused: true, loading: false, sleepUntil: null }); }, minutes * 60_000);
}
export function setPlaybackSpeed(speed: number) { const value = Math.max(.5, Math.min(2, speed)); if (audio) audio.playbackRate = value; yt?.setPlaybackRate?.(value); set({ speed: value }); }
export function clearMusicHistory() { set({ history: [] }); }
export function setVolume(v: number) { ensure(); const volume = Math.max(0, Math.min(1, v)); if (audio) audio.volume = volume; yt?.setVolume(volume * 100); set({ volume }); }
export function setPlayerPrefs(p: Prefs) { prefsRef = p; }
export function toggleShuffle() { set({ shuffle: !state.shuffle }); }
export function toggleRepeat() { set({ repeat: state.repeat === "off" ? "all" : state.repeat === "all" ? "one" : "off" }); }
export function addToQueue(t: Track) { set({ queue: [...state.queue, t] }); }
export function removeFromQueue(i: number) { if (i === state.cur) return; set({ queue: state.queue.filter((_, n) => i !== n), cur: i < state.cur ? state.cur - 1 : state.cur }); }
export async function playList(list: Track[], i: number) {
  ensure(); const t = list[i]; if (!t || !audio) return;
  cancelPlaybackRequest(); playbackRequest = new AbortController();
  const signal = playbackRequest.signal;
  const my = ++playId; clearProxy(); stopPolling(); resetYoutubePlayer(); audio.pause(); audio.removeAttribute("src"); audio.load();
  candidates = []; candidateIndex = 0; searchedAlternatives = false; retriedPlayer = false;
  set({ queue: list, cur: i, status: "Finding your song…", paused: true, loading: true, time: 0, dur: t.duration, mode: null, fallbackId: null });
  audio.playbackRate = state.speed;
  try {
    const results = t.source === "piped" && !t.preview && /^[\w-]{11}$/.test(t.id) ? [t] : await searchMusic(`${t.artist} ${t.title}`, signal, true);
    if (my !== playId || signal.aborted) return;
    const first = results[0];
    if (!first) { await audioFallback(t, my); return; }
    if (first.preview) { await audioFallback({ ...t, preview: first.preview }, my); return; }
    candidates = results.map(row => row.id); candidateIndex = 0;
    await startYoutube(my);
  } catch { if (my === playId && !signal.aborted) await audioFallback(t, my); }
}
let proxyFrame: HTMLIFrameElement | null = null;
function clearProxy() { proxyFrame?.remove(); proxyFrame = null; if (typeof document !== "undefined") document.querySelectorAll<HTMLElement>(".qaisify-playback-host").forEach(el => { el.style.visibility = ""; }); }
// Previews are a last resort after full-song lookup and official embedding fail.
async function audioFallback(t: Track, my: number) {
  ensure();
  if (my !== playId || !audio || !playbackRequest || playbackRequest.signal.aborted) return;
  stopPolling(); resetYoutubePlayer();
  if (playbackWatchdog) clearTimeout(playbackWatchdog);
  try {
    const preview = t.preview ? t : (await searchPreviews(`${t.artist} ${t.title}`, playbackRequest.signal))[0];
    if (my !== playId || playbackRequest.signal.aborted || !audio) return;
    if (!preview?.preview) throw new Error("Unavailable");
    audio.src = preview.preview;
    set({ mode: "audio", dur: 30, status: "30s preview" });
    await audio.play();
    if (my === playId) set({ loading: false, paused: false });
  } catch {
    if (my === playId) set({ mode: null, loading: false, paused: true, fallbackId: null, status: "Couldn't play that one" });
  }
}
export function toggle() { ensure(); if (proxyFrame) { clearProxy(); set({ paused: true }); return; } if (state.mode === "audio" && audio?.src) { if (audio.paused) void audio.play().catch(() => set({ status: "Press play again", loading: false })); else audio.pause(); } else if (state.mode === "video" && yt) { if (state.paused) yt.playVideo(); else yt.pauseVideo(); } else if (state.cur >= 0) void playList(state.queue, state.cur); }
export function next() { const index = nextQueueIndex(state.cur, state.queue.length, state.repeat, state.shuffle); if (index >= 0) void playList(state.queue, index); else { audio?.pause(); yt?.pauseVideo(); stopPolling(); set({ paused: true, loading: false }); } }
export function prev() { if (state.time > 3) { seek(0); return; } void playList(state.queue, Math.max(0, state.cur - 1)); }
export function seek(t: number) { const time = Math.max(0, Math.min(t, state.dur)); if (state.mode === "audio" && audio) audio.currentTime = time; if (state.mode === "video") yt?.seekTo(time, true); set({ time }); }
export function stop() { cancelPlaybackRequest(); playId++; clearProxy(); if (typeof document !== "undefined") resetYoutubePlayer(); audio?.pause(); stopPolling(); set({ cur: -1, queue: [], mode: null, paused: true, loading: false, fallbackId: null }); }
export function getAudio() { ensure(); return audio; }
export function getPlayer() { return state; }
export async function openMusicProxy(iframe: HTMLIFrameElement) { const t = state.queue[state.cur]; const videoId = state.fallbackId ?? candidates[candidateIndex]; if (!prefsRef || !t || !videoId) return; yt?.pauseVideo(); set({ paused: true, mode: null }); await openProxied(iframe, `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`, prefsRef); }
export function usePlayer() { return useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f); }, () => state, () => state); }
