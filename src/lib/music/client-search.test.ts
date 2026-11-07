import { describe, expect, it, vi } from "vitest";
import { PIPED_SEARCH_HOSTS, SEARCH_TIMEOUT_MS, searchMusic, videoId } from "./client-search";

describe("client music rules", () => {
  it("uses the four requested search hosts in order", () => {
    expect(PIPED_SEARCH_HOSTS).toEqual(["https://pipedapi.kavin.rocks", "https://pipedapi.adminforge.de", "https://api.piped.private.coffee", "https://pipedapi.drgns.space"]);
  });
  it("limits each provider request to four seconds", () => { expect(SEARCH_TIMEOUT_MS).toBe(4000); });
  it("extracts a video ID after v=", () => { expect(videoId("/watch?v=abcdefghijk")).toBe("abcdefghijk"); expect(videoId("/watch?v=invalid")).toBeNull(); });
  it("tries the next host when one fails", async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce({ ok: true, json: async () => ({ items: [{ url: "/watch?v=abcdefghijk", title: "Song", uploaderName: "Artist" }] }) });
    vi.stubGlobal("fetch", fetcher);
    try { const rows = await searchMusic("song", new AbortController().signal); expect(rows[0]?.id).toBe("abcdefghijk"); expect(fetcher).toHaveBeenCalledTimes(2); }
    finally { vi.unstubAllGlobals(); }
  });
  it("does not search for an empty query", async () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    try { expect(await searchMusic("", new AbortController().signal)).toEqual([]); expect(fetcher).not.toHaveBeenCalled(); }
    finally { vi.unstubAllGlobals(); }
  });
});