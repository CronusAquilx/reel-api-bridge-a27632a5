import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPlayer, playList, stop, type Track } from "./player";
import { searchMusic, searchPreviews } from "./client-search";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/astra/proxy", () => ({ openProxied: vi.fn() }));
vi.mock("./client-search", () => ({ searchMusic: vi.fn(), searchPreviews: vi.fn() }));

type Events = { onReady: (e: { target: FakePlayer }) => void; onStateChange: (e: { data: number }) => void; onError: (e: { data: number }) => void };
const instances: FakePlayer[] = [];
class FakePlayer {
  events: Events;
  loadVideoById = vi.fn();
  playVideo = vi.fn(); pauseVideo = vi.fn(); stopVideo = vi.fn();
  setVolume = vi.fn(); setPlaybackRate = vi.fn(); seekTo = vi.fn();
  getCurrentTime = () => 14; getDuration = () => 240;
  destroy = vi.fn();
  constructor(_host: HTMLElement, options: { events: Events }) {
    this.events = options.events; instances.push(this);
    queueMicrotask(() => this.events.onReady({ target: this }));
  }
}
const song = (id: string): Track => ({ id, source: "piped", title: id, artist: "Artist", artistId: "", album: "", albumId: "", art: "", duration: 240 });
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };

beforeEach(() => {
  instances.length = 0;
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  Object.assign(window, { YT: { Player: FakePlayer } });
  vi.mocked(searchMusic).mockResolvedValue([]);
  vi.mocked(searchPreviews).mockResolvedValue([]);
});
afterEach(() => { stop(); vi.restoreAllMocks(); vi.clearAllMocks(); });

describe("song switching recovery", () => {
  it("ignores a failed previous song after switching back to the working song", async () => {
    const a = song("aaaaaaaaaaa"), b = song("bbbbbbbbbbb");
    await playList([a, b], 0);
    await playList([a, b], 1);
    const failed = instances[1];
    failed?.events.onError({ data: 150 });
    await playList([a, b], 0);
    await flush();
    failed?.events.onError({ data: 152 });
    failed?.events.onStateChange({ data: 0 });
    instances.at(-1)?.events.onStateChange({ data: 1 });
    expect(getPlayer().queue[getPlayer().cur]?.id).toBe("aaaaaaaaaaa");
    expect(getPlayer().mode).toBe("video");
    expect(getPlayer().paused).toBe(false);
    expect(instances.at(-1)?.loadVideoById).toHaveBeenCalledWith("aaaaaaaaaaa");
  });
  it("tries an alternative full version for embed-restricted songs", async () => {
    vi.mocked(searchMusic).mockResolvedValue([song("ccccccccccc")]);
    await playList([song("bbbbbbbbbbb")], 0);
    instances[0]?.events.onError({ data: 150 });
    await flush();
    expect(instances[0]?.destroy).toHaveBeenCalled();
    expect(instances[1]?.loadVideoById).toHaveBeenCalledWith("ccccccccccc");
    expect(searchPreviews).not.toHaveBeenCalled();
  });
  it("resets a broken embed once and stops retrying when no version works", async () => {
    await playList([song("aaaaaaaaaaa")], 0);
    instances[0]?.events.onError({ data: 152 });
    await flush();
    expect(instances[1]?.loadVideoById).toHaveBeenCalledWith("aaaaaaaaaaa");
    instances[1]?.events.onError({ data: 152 });
    await flush();
    expect(instances).toHaveLength(2);
    expect(getPlayer().loading).toBe(false);
    expect(getPlayer().status).toBe("Couldn't play that one");
    await playList([song("bbbbbbbbbbb")], 0);
    instances[2]?.events.onStateChange({ data: 1 });
    expect(getPlayer().paused).toBe(false);
    expect(getPlayer().cur).toBe(0);
  });
});