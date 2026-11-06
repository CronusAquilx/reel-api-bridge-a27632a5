import { describe, expect, it } from "vitest";
import { parseYoutubeSearch } from "./youtube-search";

const page = (items: unknown[]) => `<html><script>var ytInitialData = ${JSON.stringify({ contents: items })};</script></html>`;

describe("key-free YouTube song discovery", () => {
  it("reads real video choices and their duration from public search data", () => {
    expect(parseYoutubeSearch(page([
      { videoRenderer: { videoId: "A2VpR8HahKc", title: { runs: [{ text: "One More Time" }] }, ownerText: { runs: [{ text: "Daft Punk" }] }, lengthText: { simpleText: "5:21" } } },
    ]))).toEqual([{ id: "A2VpR8HahKc", title: "One More Time", channel: "Daft Punk", duration: 321 }]));
  });

  it("deduplicates videos and ignores non-video entries", () => {
    const video = { videoRenderer: { videoId: "fa5IWHDbftI", title: { simpleText: "One More Time" } } };
    expect(parseYoutubeSearch(page([video, { nested: video }, { playlistRenderer: { playlistId: "PL123" } }])).map(item => item.id)).toEqual(["fa5IWHDbftI"]);
  });

  it("rejects pages without usable search data", () => {
    expect(() => parseYoutubeSearch("<html>Unavailable</html>")).toThrow("YouTube search data unavailable");
  });
});
