import { useEffect, useRef, useState } from "react";
import { ListMusic, ListPlus, Loader2, Music2, Play, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrefs } from "@/lib/astra/prefs";
import { searchMusic } from "@/lib/music/client-search";
import { addToQueue, playList, removeFromQueue, stop, usePlayer, type Track } from "@/lib/music/player";

export function MusicPlayback() {
  const prefs = usePrefs();
  const player = usePlayer();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setResults([]); setUnavailable(false); setBusy(false);
    if (!query.trim()) return () => controller.abort();
    setBusy(true);
    const timer = setTimeout(() => {
      void searchMusic(query.trim(), controller.signal).then(rows => {
        if (controller.signal.aborted) return;
        setResults(rows); setUnavailable(!rows.length); setBusy(false);
      }).catch(() => { if (!controller.signal.aborted) { setUnavailable(true); setBusy(false); } });
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);
  const play = (list: Track[], index: number) => { request.current?.abort(); setBusy(false); void playList(list, index); };
  const rows = queueOpen ? player.queue : results;
  return <div data-music-theme={prefs.musicTheme} className="music-application qaisify-application flex h-full min-h-0 flex-col">
    <header className="flex shrink-0 flex-wrap items-center gap-3 border-b px-4 py-3">
      <div className="flex items-center gap-2 font-semibold"><Music2 className="size-5 text-primary"/>Qaisify</div>
      <form className="flex min-w-0 flex-1 items-center gap-2 rounded-md border bg-card px-3 py-2" onSubmit={event => event.preventDefault()}>
        <Search className="size-4 shrink-0 text-muted-foreground"/>
        <input aria-label="Search music" placeholder="Search songs or artists" value={query} onChange={event => { setQuery(event.target.value); setQueueOpen(false); if (!event.target.value.trim()) stop(); }} className="min-w-0 w-full bg-transparent text-sm outline-none"/>
      </form>
      <Button variant="ghost" size="icon" title="Queue" aria-label="Queue" aria-pressed={queueOpen} onClick={() => setQueueOpen(value => !value)}><ListMusic className="size-5"/></Button>
    </header>
    <main className="music-main-scroll min-h-0 flex-1 overflow-y-auto px-4 py-6">
      <h1 className="font-display text-2xl">{queueOpen ? "Queue" : "Music"}</h1>
      {busy && !queueOpen && <p role="status" className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin"/>Searching…</p>}
      {unavailable && !queueOpen && <p className="mt-4 text-sm text-muted-foreground">Couldn't find that one. <a className="text-primary underline" target="_blank" rel="noopener noreferrer" href={`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`}>{query}</a></p>}
      <ol className="mt-4 divide-y divide-border">
        {rows.map((song, index) => <li key={`${song.id}-${index}`} className="flex min-w-0 items-center gap-2 py-2">
          <Button variant="ghost" className="h-auto min-w-0 flex-1 justify-start gap-3 whitespace-normal px-2 py-2 text-left" aria-label={`Play ${song.title}`} onClick={() => play(rows, index)}>
            {song.art ? <img src={song.art} alt="" loading="lazy" className="size-12 shrink-0 rounded-md object-cover"/> : <Music2 className="size-12 shrink-0 text-muted-foreground"/>}
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{song.title}</span><span className="block truncate text-xs text-muted-foreground">{song.artist}</span>{song.preview && <span className="text-xs text-primary">30s preview</span>}</span><Play className="size-4 shrink-0"/>
          </Button>
          <Button variant="ghost" size="icon" title="Add to queue" aria-label={`Add ${song.title} to queue`} onClick={() => addToQueue(song)}><ListPlus className="size-4"/></Button>
          {queueOpen && index !== player.cur && <Button variant="ghost" size="icon" aria-label={`Remove ${song.title}`} onClick={() => removeFromQueue(index)}>×</Button>}
        </li>)}
      </ol>
      {queueOpen && !rows.length && <p className="mt-4 text-sm text-muted-foreground">Queue is empty.</p>}
    </main>
  </div>;
}