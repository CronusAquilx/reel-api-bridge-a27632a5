import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import { Eye, EyeOff, Maximize, Minimize, MousePointer2, PanelRight, RefreshCw, Search, Square, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { ControlEvent, ScreenFrame, ScreenItem } from "@/lib/astra/screen-share";
import { encodeViewSession } from "@/lib/astra/view-session";
import { sendStaffCommand, visitorTarget, type StaffTarget } from "@/lib/astra/staff-commands";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { LiveVisitor } from "./SiteControl";
import { TROLLS, youtubeId } from "./TrollLayer";

export function TrollGrid({ to, name, active, onActive, searchable = false }: {
  to: StaffTarget;
  name: string;
  active?: string | null;
  onActive?: (id: string | null) => void;
  searchable?: boolean;
}) {
  const [query, setQuery] = useState("");
  const fire = async (id: string, label: string) => {
    const ok = await sendStaffCommand("troll", to, id, true);
    if (ok) { onActive?.(id); toast.success(`${label} sent to ${name}`); }
  };
  const visible = TROLLS.filter((troll) => !query || troll.label.toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-3">
    {searchable && <div className="relative"><Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" /><Input aria-label="Find a troll effect" placeholder="Find an effect" value={query} onChange={(event) => setQuery(event.target.value)} className="pl-8" /></div>}
    <div className="grid grid-cols-2 gap-1.5">
      {visible.map((troll) => <Button key={troll.id} size="sm" variant={active === troll.id ? "default" : "outline"} className="justify-start" onClick={() => void fire(troll.id, troll.label)}><span aria-hidden="true">{troll.emoji}</span><span className="truncate">{troll.label}</span></Button>)}
    </div>
    {visible.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No matching effects.</p>}
    <div className="grid grid-cols-2 gap-1.5 border-t border-border pt-3">
      <Button size="sm" variant="outline" onClick={() => { const url = prompt("YouTube link to play full screen"); const id = url ? youtubeId(url) : null; if (id) void fire(`video:${id}`, "YouTube video"); else if (url) toast.error("That isn't a YouTube link."); }}>📺 YouTube</Button>
      <Button size="sm" variant="destructive" onClick={() => void sendStaffCommand("untroll", to, undefined, true).then((ok) => { if (ok) { onActive?.(null); toast.success("Troll stopped"); } })}><Square />Stop effect</Button>
    </div>
  </div>;
}

function OutlineItem({ item, index }: { item: ScreenItem; index: number }) {
  const style = {
    position: "absolute" as const, left: item.x, top: item.y, width: item.w, height: item.h,
    background: item.bg, border: item.bd ? `1px solid ${item.bd}` : undefined, borderRadius: item.r,
    color: item.c, fontSize: item.fs, fontWeight: item.fw,
  };
  if (item.img) return <img key={index} src={item.img} alt="" style={{ ...style, objectFit: item.media || item.icon ? "contain" : "cover" }} />;
  return <div key={index} className={item.media ? "flex items-center justify-center overflow-hidden bg-muted text-xs text-muted-foreground" : "flex items-center overflow-hidden whitespace-nowrap"} style={{ ...style, lineHeight: 1.2, textOverflow: "ellipsis" }}>{item.media ? "▶ protected video / game" : item.t}</div>;
}

/** Non-modal staff dock: a real screenshot when possible, DOM outline fallback, scoped remote input and reversible effects. */
export function ScreenViewer({ visitor, canControl, canTroll, onClose }: {
  visitor: LiveVisitor;
  canControl: boolean;
  canTroll: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [frame, setFrame] = useState<ScreenFrame | null>(null);
  const [lastFrame, setLastFrame] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [connected, setConnected] = useState(false);
  const [control, setControl] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [notify, setNotify] = useState(true);
  const [activeTroll, setActiveTroll] = useState<string | null>(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [full, setFull] = useState(false);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const chRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const subscribedRef = useRef(false);
  const sessionId = useRef(crypto.randomUUID());
  const displayName = String(user?.user_metadata?.["username"] ?? user?.user_metadata?.["display_name"] ?? user?.user_metadata?.["name"] ?? user?.email?.split("@")[0] ?? "Staff");

  const announceView = () => {
    if (!subscribedRef.current) return;
    void sendStaffCommand("view", visitorTarget(visitor), encodeViewSession({
      id: sessionId.current, name: anonymous ? null : displayName, notify,
    }), true);
  };

  useEffect(() => {
    const to = visitorTarget(visitor);
    const id = sessionId.current;
    const channel = supabase.channel(`screen-${id}`, { config: { broadcast: { ack: false } } })
      .on("broadcast", { event: "frame" }, ({ payload }) => {
        const next = payload as ScreenFrame;
        setFrame((previous) => next.mediaOnly && previous
          ? { ...previous, path: next.path, items: [...previous.items.filter((item) => !item.media), ...next.items] }
          : next);
        setLastFrame(Date.now());
      });
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        subscribedRef.current = true; setConnected(true);
        void sendStaffCommand("view", to, encodeViewSession({ id, name: anonymous ? null : displayName, notify }), true);
      }
    });
    chRef.current = channel;
    return () => {
      subscribedRef.current = false; chRef.current = null;
      void sendStaffCommand("unview", to, id, true);
      void supabase.removeChannel(channel);
    };
  }, [visitor.userId, visitor.deviceId]);

  useEffect(() => { announceView(); }, [anonymous, notify]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 2000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape" && (document.fullscreenElement || wrapRef.current?.contains(document.activeElement))) onClose();
    };
    window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key);
  }, [onClose]);
  useEffect(() => {
    const change = () => setFull(document.fullscreenElement === wrapRef.current);
    document.addEventListener("fullscreenchange", change); return () => document.removeEventListener("fullscreenchange", change);
  }, []);
  useEffect(() => {
    const stage = stageRef.current; if (!stage) return;
    const update = () => setStageSize({ width: stage.clientWidth, height: stage.clientHeight });
    const observer = new ResizeObserver(update); observer.observe(stage); update();
    return () => observer.disconnect();
  }, [toolsOpen, canTroll]);

  const toggleFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void wrapRef.current?.requestFullscreen?.().catch(() => toast.error("Full screen isn't available in this browser."));
  };
  const ctl = (payload: ControlEvent) => { if (control) void chRef.current?.send({ type: "broadcast", event: "control", payload }); };
  const scale = frame && stageSize.width && stageSize.height ? Math.min(stageSize.width / frame.w, stageSize.height / frame.h) : 1;
  const point = (event: ReactMouseEvent) => {
    const rect = boxRef.current!.getBoundingClientRect();
    return { x: Math.round((event.clientX - rect.left) / scale), y: Math.round((event.clientY - rect.top) / scale) };
  };
  const click = (event: ReactMouseEvent) => {
    if (!control || !frame) return;
    const p = point(event); ctl({ type: "click", ...p });
    const id = Date.now(); setRipples((all) => [...all, { id, ...p }]);
    setTimeout(() => setRipples((all) => all.filter((ripple) => ripple.id !== id)), 500);
  };
  const fresh = Boolean(frame && now - lastFrame < 25_000);

  return createPortal(<div className="pointer-events-none fixed inset-0 z-[10020]">
    <section ref={wrapRef} role="dialog" aria-modal="false" aria-label={`Screen viewer for ${visitor.name}`} className={`pointer-events-auto absolute flex flex-col overflow-hidden border border-border bg-background text-foreground shadow-2xl ${full ? "inset-0 h-dvh w-full rounded-none" : "bottom-4 right-4 h-[min(680px,calc(100dvh-2rem))] w-[min(880px,calc(100vw-2rem))] resize-none rounded-xl sm:resize"}`}>
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className={`size-2.5 shrink-0 rounded-full ${fresh ? "bg-primary" : "bg-muted-foreground"}`} />
        <div className="min-w-0"><h2 className="truncate text-sm font-semibold">Watching {visitor.name}</h2><p className="truncate text-xs text-muted-foreground">{frame ? `${frame.path} · ${frame.w}×${frame.h}` : connected ? "Connected · waiting for the first picture" : "Connecting…"}</p></div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {canTroll && <Button size="sm" variant="ghost" aria-pressed={toolsOpen} onClick={() => setToolsOpen((open) => !open)}><PanelRight /><span className="hidden sm:inline">Effects</span></Button>}
        <Button size="sm" variant="ghost" onClick={toggleFull}>{full ? <Minimize /> : <Maximize />}<span className="hidden sm:inline">{full ? "Exit full screen" : "Full screen"}</span></Button>
        <Button size="sm" variant="destructive" onClick={onClose}><X />Stop viewing</Button>
      </div>
    </header>

    <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-muted/30 px-4 py-2">
      <div className="flex items-center gap-1 rounded-md border border-border bg-background p-0.5" aria-label="Viewer identity">
        <Button size="sm" variant={!anonymous ? "secondary" : "ghost"} aria-pressed={!anonymous} onClick={() => setAnonymous(false)}><Eye />Show my name</Button>
        <Button size="sm" variant={anonymous ? "secondary" : "ghost"} aria-pressed={anonymous} onClick={() => setAnonymous(true)}><EyeOff />Anonymous</Button>
      </div>
      <label className="flex items-center gap-2 text-xs font-medium"><Switch checked={notify} onCheckedChange={setNotify} aria-label="Tell this person I am viewing their screen" />{notify ? "Viewing notice on" : "Viewing notice off"}</label>
      <span className="text-xs text-muted-foreground">{anonymous ? "They see “Staff” if the notice is on." : `They see “${displayName}” if the notice is on.`}</span>
      <div className="ml-auto flex items-center gap-1">
        <Button size="sm" variant="secondary" onClick={() => void chRef.current?.send({ type: "broadcast", event: "refresh", payload: {} })}><RefreshCw />Refresh</Button>
        {canControl && <Button size="sm" variant={control ? "default" : "secondary"} aria-pressed={control} onClick={() => { setControl((value) => !value); boxRef.current?.focus(); }}><MousePointer2 />{control ? "Controlling" : "Take control"}</Button>}
      </div>
    </div>

    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <main ref={stageRef} className="relative min-h-56 flex-1 overflow-hidden bg-muted/50 p-3 lg:min-h-0">
        {frame ? <div ref={boxRef} tabIndex={0} aria-label="Shared screen. Select to use remote keyboard control." className={`absolute left-1/2 top-1/2 overflow-hidden rounded-md border border-border bg-background shadow-2xl outline-none ${control ? "cursor-crosshair ring-2 ring-primary" : ""}`}
          style={{ width: frame.w * scale, height: frame.h * scale, transform: "translate(-50%, -50%)", background: frame.bg }}
          onClick={click}
          onDoubleClick={toggleFull}
          onWheel={(event) => { if (control) { event.preventDefault(); ctl({ type: "scroll", ...point(event), dy: Math.round(event.deltaY) }); } }}
          onKeyDown={(event) => { if (!control) return; event.preventDefault(); if (event.key.length === 1) ctl({ type: "type", text: event.key }); else ctl({ type: "key", key: event.key }); }}>
          <div className="absolute left-0 top-0 origin-top-left" style={{ width: frame.w, height: frame.h, transform: `scale(${scale})`, pointerEvents: "none" }}>
            {frame.shot && <img src={frame.shot} alt="" className="absolute inset-0 size-full select-none" draggable={false} />}
            {frame.items.map((item, index) => <OutlineItem key={index} item={item} index={index} />)}
            {ripples.map((ripple) => <span key={ripple.id} className="absolute size-8 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-primary/60" style={{ left: ripple.x, top: ripple.y }} />)}
          </div>
        </div> : <div className="grid h-full place-items-center text-center"><div><RefreshCw className="mx-auto size-8 animate-spin text-muted-foreground" /><p className="mt-4 text-sm font-medium">Waiting for their screen…</p><p className="mt-1 text-xs text-muted-foreground">Keep this window open while they stay online.</p></div></div>}
        {frame && !fresh && <div className="absolute left-1/2 top-5 -translate-x-1/2 rounded-full bg-destructive px-3 py-1 text-xs text-destructive-foreground shadow">Connection paused · trying to refresh</div>}
      </main>

      {canTroll && toolsOpen && <aside className="flex max-h-[42vh] w-full shrink-0 flex-col border-t border-border bg-card lg:max-h-none lg:w-80 lg:border-l lg:border-t-0 xl:w-88">
        <div className="border-b border-border p-4"><h3 className="text-sm font-semibold">Troll {visitor.name}</h3><p className="mt-1 text-xs text-muted-foreground">Effects are reversible. They can stop them with Escape.</p></div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3"><TrollGrid to={visitorTarget(visitor)} name={visitor.name} active={activeTroll} onActive={setActiveTroll} searchable /></div>
      </aside>}
    </div>

    <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-card px-4 py-2 text-xs text-muted-foreground">
      <span>{control ? "Click their screen to click, scroll to scroll, and type while it is selected." : "Choose Take control only when you need to interact."}</span>
      <span className="shrink-0">{frame?.shot ? "Live picture" : "Layout fallback"} · {fresh ? "Live" : "Waiting"}</span>
    </footer>
    </section>
  </div>, document.body);
}
