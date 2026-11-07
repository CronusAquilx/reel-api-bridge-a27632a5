import { useEffect, useRef, useState } from "react";
import { BarChart3, ChevronLeft, ChevronRight, Disc3, Heart, Home, Library, ListMusic, ListPlus, Loader2, Music2, Play, Plus, Search, Settings, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrefs } from "@/lib/astra/prefs";
import { searchMusic } from "@/lib/music/client-search";
import { addToQueue, playList, removeFromQueue, usePlayer, type Track } from "@/lib/music/player";
import { QAISIFY_ROWS } from "@/lib/music/qaisify";
import { MusicSettings } from "./MusicSettings";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Playlist = { id: string; name: string; tracks: Track[] };
type Section = "home" | "browse" | "library" | "liked" | "stats" | "settings";
export function MusicPlayback() {
  const prefs = usePrefs();
  const player = usePlayer();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [section, setSection] = useState<Section>("home");
  const [collapsed, setCollapsed] = useState(false);
  const [mine, setMine] = useState<Playlist[]>([]);
  const [playlistId, setPlaylistId] = useState<string | null>(null);
  const [shelves, setShelves] = useState<{ title: string; tracks: Track[] }[]>([]);
  const request = useRef<AbortController | null>(null);
  const current = player.queue[player.cur];
  const liked = mine.find(row => row.name === "Liked Songs");
  const selected = mine.find(row => row.id === playlistId);
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
  useEffect(() => {
    const controller = new AbortController();
    // Two runtime shelves; no hard-coded songs or legacy music APIs.
    void (async () => {
      for (const row of QAISIFY_ROWS.slice(0, 2)) {
        const tracks = await searchMusic(row.term, controller.signal);
        if (controller.signal.aborted) return;
        setShelves(previous => [...previous.filter(s => s.title !== row.title), { title: row.title, tracks: tracks.slice(0, 8) }]);
      }
    })();
    return () => controller.abort();
  }, []);
  useEffect(() => {
    let live = true;
    setMine([]);
    if (user) void supabase.from("playlists").select("id,name,tracks").order("updated_at", { ascending: false }).then(({ data }) => {
      if (live) setMine((data ?? []).map(row => ({ id: row.id, name: row.name, tracks: (row.tracks as unknown as Track[]) ?? [] })));
    });
    return () => { live = false; };
  }, [user?.id]);
  async function createPlaylist(name: string, tracks: Track[] = []) {
    if (!user) { toast("Sign in to save playlists"); return; }
    const { data, error } = await supabase.from("playlists").insert({ user_id: user.id, name, tracks: tracks as never }).select("id,name").single();
    if (error || !data) { toast("Couldn't save playlist"); return; }
    setMine(previous => [...previous, { ...data, tracks }]);
  }
  async function saveTracks(list: Playlist, tracks: Track[]) {
    const { error } = await supabase.from("playlists").update({ tracks: tracks as never, updated_at: new Date().toISOString() }).eq("id", list.id);
    if (error) { toast("Couldn't save playlist"); return; }
    setMine(previous => previous.map(row => row.id === list.id ? { ...row, tracks } : row));
  }
  const newPlaylist = () => { const name = window.prompt("Playlist name"); if (name?.trim()) void createPlaylist(name.trim()); };
  const like = (song: Track) => { if (!liked) void createPlaylist("Liked Songs", [song]); else void saveTracks(liked, liked.tracks.some(t => t.id === song.id) ? liked.tracks.filter(t => t.id !== song.id) : [...liked.tracks, song]); };
  const go = (next: Section) => { setSection(next); setPlaylistId(null); setQueueOpen(false); };
  const play = (list: Track[], index: number) => { request.current?.abort(); setBusy(false); void playList(list, index); };
  const trackList = (rows: Track[], remove?: (index: number) => void) => <ol className="music-panel mt-3 divide-y divide-border overflow-hidden rounded-md">{rows.map((song, index) => <li key={`${song.id}-${index}`} className={cn("group flex min-w-0 items-center gap-2 px-2 py-2 hover:bg-accent", current?.id === song.id && "bg-accent")}>
    <span className="w-5 shrink-0 text-right text-xs text-muted-foreground">{index + 1}</span>
    <Button variant="ghost" className="h-auto min-w-0 flex-1 justify-start gap-3 whitespace-normal p-0 text-left" aria-label={`Play ${song.title}`} onClick={() => play(rows, index)}>
      {song.art ? <img src={song.art} alt="" loading="lazy" className="size-10 shrink-0 rounded-md object-cover"/> : <Music2 className="size-10 shrink-0 text-muted-foreground"/>}
      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{song.title}</span><span className="block truncate text-xs text-muted-foreground">{song.artist}</span></span><Play className="size-4 shrink-0"/>
    </Button>
    <Button variant="ghost" size="icon" title="Add to queue" aria-label={`Add ${song.title} to queue`} onClick={() => addToQueue(song)}><ListPlus className="size-4"/></Button>
    <Button variant="ghost" size="icon" title="Like song" aria-label={`Like ${song.title}`} aria-pressed={liked?.tracks.some(t => t.id === song.id) ?? false} onClick={() => like(song)}><Heart className={cn("size-4", liked?.tracks.some(t => t.id === song.id) && "fill-current text-primary")}/></Button>
    {mine.filter(list => list.id !== liked?.id).length > 0 && <select aria-label={`Save ${song.title} to playlist`} value="" className="max-w-20 rounded-md border bg-card text-xs" onChange={event => { const list = mine.find(row => row.id === event.target.value); if (list && !list.tracks.some(t => t.id === song.id)) void saveTracks(list, [...list.tracks, song]); }}><option value="">Save…</option>{mine.filter(list => list.id !== liked?.id).map(list => <option key={list.id} value={list.id}>{list.name}</option>)}</select>}
    {remove && <Button variant="ghost" size="icon" aria-label={`Remove ${song.title}`} onClick={() => remove(index)}><Trash2 className="size-4"/></Button>}
  </li>)}{!rows.length && <li className="py-6 text-sm text-muted-foreground">No songs yet.</li>}</ol>;
  const card = (song: Track, list: Track[], index: number) => <Button key={`${song.id}-${index}`} variant="ghost" className="music-card group block h-auto shrink-0 whitespace-normal text-left" aria-label={`Play ${song.title}`} onClick={() => play(list, index)}><div className="relative aspect-square overflow-hidden rounded-md bg-muted">{song.art ? <img src={song.art} alt="" loading="lazy" className="size-full object-cover"/> : <Music2 className="size-full p-8 text-muted-foreground"/>}<span className="absolute bottom-2 right-2 grid size-8 place-items-center rounded-full bg-primary text-primary-foreground"><Play className="size-4"/></span></div><div className="mt-2 truncate text-sm font-medium">{song.title}</div><p className="truncate text-xs text-muted-foreground">{song.artist}</p></Button>;
  return <div data-music-theme={prefs.musicTheme} className={cn("music-application qaisify-application has-native-navigation h-full min-h-0", collapsed && "qaisify-collapsed")}>
    <aside className="music-library-rail">
      <div className="native-app-wordmark"><Disc3/><span>Qaisify</span></div>
      <nav aria-label="Music navigation">{([{ id: "home", label: "Home", icon: Home }, { id: "browse", label: "Search", icon: Search }, { id: "library", label: "Library", icon: Library }, { id: "stats", label: "Stats", icon: BarChart3 }, { id: "settings", label: "Settings", icon: Settings }] as const).map(item => <Button key={item.id} variant="ghost" title={item.label} aria-pressed={section === item.id} onClick={() => go(item.id)}><item.icon/><span>{item.label}</span></Button>)}</nav>
      <div className="qaisify-library-box"><div className="music-library-label flex items-center justify-between"><span>YOUR LIBRARY</span><Button variant="ghost" size="icon" title="Create playlist" aria-label="Create playlist" onClick={newPlaylist}><Plus/></Button></div><div className="music-saved-playlists"><Button variant="ghost" onClick={() => go("liked")}><Heart className="text-primary"/><span>Liked Songs</span></Button>{mine.filter(list => list.id !== liked?.id).map(list => <Button key={list.id} variant="ghost" onClick={() => { go("library"); setPlaylistId(list.id); }}><Music2/><span className="truncate">{list.name}</span></Button>)}</div></div>
      <Button variant="ghost" size="icon" aria-label="Collapse sidebar" onClick={() => setCollapsed(value => !value)}>{collapsed ? <ChevronRight/> : <ChevronLeft/>}</Button>
      <div className="music-rail-current">{current?.art && <img src={current.art} alt=""/>}<p>{current?.title ?? "Nothing playing"}</p><span>{current?.artist ?? "Birch Music"}</span></div>
    </aside>
    <header className="flex shrink-0 items-center gap-2 border-b">
      <form className="flex min-w-0 flex-1 items-center gap-2 border bg-card px-3 py-2" onSubmit={event => event.preventDefault()}><Search className="size-4 shrink-0 text-muted-foreground"/><input aria-label="Search music" placeholder="What do you want to listen to?" value={query} onChange={event => { setQuery(event.target.value); go("browse"); }} className="min-w-0 w-full bg-transparent text-sm outline-none"/></form>
      <Button variant="ghost" size="icon" title="Queue" aria-label="Queue" aria-pressed={queueOpen} onClick={() => setQueueOpen(value => !value)}><ListMusic className="size-5"/></Button>
      <span className="hidden text-xs text-muted-foreground sm:inline">YouTube</span>
    </header>
    <main className="music-main-scroll min-h-0 flex-1 overflow-y-auto"><div className="music-main-inner">
      {queueOpen && <section className="qaisify-queue"><h2 className="text-2xl">Queue</h2>{trackList(player.queue, index => { if (index !== player.cur) removeFromQueue(index); })}</section>}
      {section === "settings" ? <MusicSettings onRefresh={() => { go("browse"); setQuery(""); }}/> : <>
        <div className="music-greeting"><h1>{selected?.name ?? ({ home: "Qaisify", browse: query.trim() ? `Results for “${query.trim()}”` : "Browse All", library: "Your library", liked: "Liked Songs", stats: "Listening stats" }[section])}</h1></div>
        {busy && section === "browse" && <p role="status" className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin"/>Searching…</p>}
        {unavailable && section === "browse" && <p className="mt-4 text-sm text-muted-foreground">Couldn't find that one. <a className="text-primary underline" target="_blank" rel="noopener noreferrer" href={`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`}>{query}</a></p>}
        {section === "home" && <>{shelves.map(row => <section key={row.title} className="mt-8"><h2 className="text-2xl">{row.title}</h2><div className="mt-3 flex gap-3 overflow-x-auto pb-3">{row.tracks.map((song, index) => card(song, row.tracks, index))}</div></section>)}<h2 className="mt-8 text-2xl">Browse by type</h2><div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">{QAISIFY_ROWS.map(row => <Button key={row.term} variant="secondary" className="h-auto justify-start whitespace-normal py-5 text-left" onClick={() => { setQuery(row.term); go("browse"); }}>{row.title}</Button>)}</div></>}
        {section === "browse" && (query.trim() ? trackList(results) : <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{QAISIFY_ROWS.map(row => <Button key={row.term} variant="secondary" className="h-auto whitespace-normal py-5" onClick={() => setQuery(row.term)}>{row.title}</Button>)}</div>)}
        {section === "liked" && trackList(liked?.tracks ?? [])}
        {section === "stats" && <><p className="mt-4 text-muted-foreground">{player.history.length} songs played this session</p>{trackList(player.history)}</>}
        {section === "library" && (selected ? <><div className="mt-4 flex gap-2"><Button disabled={!selected.tracks.length} onClick={() => play(selected.tracks, 0)}><Play/>Play</Button><Button variant="outline" onClick={() => setPlaylistId(null)}>All playlists</Button></div>{trackList(selected.tracks, index => void saveTracks(selected, selected.tracks.filter((_, i) => i !== index)))}</> : <><Button className="mt-4" variant="secondary" onClick={newPlaylist}><Plus/>New playlist</Button><div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4">{mine.map(list => <Button key={list.id} variant="ghost" className="music-card block h-auto text-left" onClick={() => setPlaylistId(list.id)}><div className="aspect-square overflow-hidden rounded-md bg-muted">{list.tracks[0]?.art ? <img src={list.tracks[0].art} alt="" className="size-full object-cover"/> : <Music2 className="size-full p-8 text-muted-foreground"/>}</div><p className="mt-2 truncate">{list.name}</p><span className="text-xs text-muted-foreground">{list.tracks.length} songs</span></Button>)}</div></>)}
      </>}
      {player.status === "Couldn't play that one" && current && <p role="status" className="mt-4 text-sm text-muted-foreground">Couldn't play that one. <a className="text-primary underline" target="_blank" rel="noopener noreferrer" href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${current.artist} ${current.title}`)}`}>Open on YouTube</a></p>}
    </div></main>
  </div>;
}
