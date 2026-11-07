import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { parseYoutubeSearch } from "./youtube-search";

/** Public metadata only: no accounts, keys, audio extraction or private data. */
export const findFullSongs = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ query: z.string().trim().min(1).max(200) }).parse(input))
  .handler(async ({ data }) => {
    try {
      const response = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(data.query)}`, {
        signal: AbortSignal.timeout(5000), headers: { "accept-language": "en-US,en;q=0.9" },
      });
      if (!response.ok) return [];
      return parseYoutubeSearch(await response.text()).slice(0, 12).map(item => ({
        id: item.id, title: item.title, artist: item.channel, duration: item.duration,
        art: `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`, source: "piped" as const,
        artistId: "", album: "", albumId: "",
      }));
    } catch { return []; }
  });