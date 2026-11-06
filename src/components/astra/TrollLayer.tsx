import { useEffect, useRef, useState, type ReactNode } from "react";

export type TrollDefinition = { id: string; label: string; emoji: string; group: "Appearance" | "Motion" | "Playful" | "Scenes" };
export const TROLLS: TrollDefinition[] = [
  { id: "invert", label: "Invert colors", emoji: "🔄", group: "Appearance" },
  { id: "blur", label: "Blurry", emoji: "👓", group: "Appearance" },
  { id: "rainbow", label: "Rainbow", emoji: "🌈", group: "Appearance" },
  { id: "grayscale", label: "Black & white", emoji: "◐", group: "Appearance" },
  { id: "sepia", label: "Old photograph", emoji: "📜", group: "Appearance" },
  { id: "contrast", label: "High contrast", emoji: "☯", group: "Appearance" },
  { id: "potato", label: "Potato quality", emoji: "🥔", group: "Appearance" },
  { id: "comic", label: "Comic Sans", emoji: "🤡", group: "Appearance" },
  { id: "flip", label: "Upside down", emoji: "🙃", group: "Motion" },
  { id: "mirror", label: "Mirror", emoji: "🪞", group: "Motion" },
  { id: "spin", label: "Spin", emoji: "🌀", group: "Motion" },
  { id: "shake", label: "Earthquake", emoji: "📳", group: "Motion" },
  { id: "drunk", label: "Drunk", emoji: "🥴", group: "Motion" },
  { id: "tiny", label: "Shrink", emoji: "🐜", group: "Motion" },
  { id: "zoom", label: "Too close", emoji: "🔎", group: "Motion" },
  { id: "tilt", label: "Tilted", emoji: "📐", group: "Motion" },
  { id: "stretch", label: "Stretched", emoji: "↔️", group: "Motion" },
  { id: "wobble", label: "Wobble", emoji: "〰️", group: "Motion" },
  { id: "virus", label: "Virus mode", emoji: "🦠", group: "Playful" },
  { id: "emoji", label: "Emoji rain", emoji: "💩", group: "Playful" },
  { id: "snow", label: "Snow storm", emoji: "❄️", group: "Playful" },
  { id: "confetti", label: "Confetti", emoji: "🎊", group: "Playful" },
  { id: "matrix", label: "Matrix rain", emoji: "🟩", group: "Playful" },
  { id: "ducks", label: "Duck invasion", emoji: "🦆", group: "Playful" },
  { id: "trail", label: "Cursor sparkles", emoji: "✨", group: "Playful" },
  { id: "notifications", label: "Notification spam", emoji: "🔔", group: "Playful" },
  { id: "cursor", label: "Hide cursor", emoji: "🫥", group: "Playful" },
  { id: "runaway", label: "Runaway buttons", emoji: "🏃", group: "Playful" },
  { id: "rickroll", label: "Rick roll", emoji: "🎵", group: "Scenes" },
  { id: "hacker", label: "Fake hack", emoji: "💻", group: "Scenes" },
  { id: "bsod", label: "Fake crash", emoji: "💀", group: "Scenes" },
  { id: "update", label: "Fake update", emoji: "⏳", group: "Scenes" },
  { id: "error", label: "Fake error", emoji: "⚠️", group: "Scenes" },
  { id: "loading", label: "Endless loading", emoji: "🔄", group: "Scenes" },
];

export const RICKROLL_ID = "dQw4w9WgXcQ";
export function youtubeId(input: string) {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([\w-]{11})/);
  return m?.[1] ?? null;
}

// Only the app surface moves. Body/html transforms can collapse fixed desktops and expose a blank grey viewport.
export const TROLL_CSS: Record<string, string> = {
  invert: "#site-content{filter:invert(1) hue-rotate(180deg)!important}",
  blur: "#site-content{filter:blur(4px)!important}",
  grayscale: "#site-content{filter:grayscale(1)!important}",
  sepia: "#site-content{filter:sepia(.9) contrast(1.1)!important}",
  contrast: "#site-content{filter:contrast(1.8) saturate(1.35)!important}",
  potato: "#site-content{filter:blur(3px) contrast(.85) saturate(.7)!important}",
  rainbow: "@keyframes trl-hue{to{filter:hue-rotate(360deg) saturate(2)}}#site-content{animation:trl-hue 5s linear infinite!important}",
  flip: "#site-content{transform:rotate(180deg)!important;transform-origin:50% 50vh}",
  mirror: "#site-content{transform:scaleX(-1)!important;transform-origin:50% 50vw}",
  spin: "@keyframes trl-spin{to{transform:rotate(360deg)}}#site-content{animation:trl-spin 8s linear infinite!important;transform-origin:50% 50vh}",
  shake: "@keyframes trl-shake{0%,100%{transform:translate(0)}20%{transform:translate(-8px,4px)}40%{transform:translate(7px,-6px)}60%{transform:translate(-5px,-3px)}80%{transform:translate(6px,5px)}}#site-content{animation:trl-shake .35s infinite!important}",
  drunk: "@keyframes trl-drunk{0%,100%{transform:rotate(-2deg) skewX(2deg);filter:blur(1px)}50%{transform:rotate(2deg) skewX(-3deg) scale(1.02);filter:blur(2px)}}#site-content{animation:trl-drunk 4s ease-in-out infinite!important}",
  tiny: "#site-content{transform:scale(.45)!important;transform-origin:50% 50vh}",
  zoom: "#site-content{transform:scale(1.45)!important;transform-origin:50% 50vh}",
  tilt: "#site-content{transform:rotate(-7deg) scale(1.08)!important;transform-origin:50% 50vh}",
  stretch: "#site-content{transform:scaleX(1.35) scaleY(.85)!important;transform-origin:50% 50vh}",
  wobble: "@keyframes trl-wobble{0%,100%{transform:skewX(-3deg) rotate(-1deg)}50%{transform:skewX(3deg) rotate(1deg)}}#site-content{animation:trl-wobble 2.5s ease-in-out infinite!important;transform-origin:50% 50vh}",
  comic: "#site-content *{font-family:'Comic Sans MS','Comic Sans',cursive!important}",
  cursor: "#site-content *{cursor:none!important}",
};

const ADS = [
  "🎉 CONGRATULATIONS! You are the 1,000,000th visitor!",
  "⚠️ YOUR COMPUTER HAS 37 VIRUSES! Definitely real.",
  "🔥 HOT SINGLE GAMERS in your area want to 1v1 you!",
  "💰 Make $5000 a day with this ONE weird trick!",
  "🎮 RAID: SHADOW LEGENDS — Download now for FREE!",
  "🍔 Free Robux! Free V-Bucks! Totally legit!",
  "🚨 Battery critically low (2%). Download more RAM?",
  "🏆 You WON a $1000 gift card! Act fast — 00:59 left!",
  "📦 Your package could not be delivered. Again.",
  "🧠 Doctors HATE him! Learn this simple brain hack!",
];
const VIRUS_VIDEOS = ["dQw4w9WgXcQ", "ZZ5LpwO-An4", "y6120QOlsfU"];

function beep(ctx: AudioContext) {
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.type = Math.random() > 0.5 ? "square" : "sawtooth";
  o.frequency.value = 200 + Math.random() * 900;
  g.gain.value = 0.06; o.connect(g); g.connect(ctx.destination);
  o.start(); o.stop(ctx.currentTime + 0.15 + Math.random() * 0.2);
}

type Pop = { id: number; x: number; y: number; ad: string; video?: string | undefined };
function Virus() {
  const [pops, setPops] = useState<Pop[]>([]);
  const n = useRef(0);
  useEffect(() => {
    let ctx: AudioContext | null = null;
    try { ctx = new AudioContext(); } catch { /* no audio */ }
    const add = (count = 1) => setPops((p) => [...p, ...Array.from({ length: count }, () => ({
      id: ++n.current, x: Math.random() * 70, y: Math.random() * 65,
      ad: ADS[Math.floor(Math.random() * ADS.length)] ?? "",
      video: n.current % 6 === 0 ? VIRUS_VIDEOS[Math.floor(Math.random() * VIRUS_VIDEOS.length)] : undefined,
    }))].slice(-24));
    const t = setInterval(() => { add(); if (ctx) beep(ctx); }, 850);
    add(3);
    return () => { clearInterval(t); void ctx?.close(); };
  }, []);
  return <div className="pointer-events-none fixed inset-0 z-[9996] overflow-hidden">
    {pops.map((p) => <div key={p.id} className="pointer-events-auto absolute w-72 animate-in zoom-in-50 overflow-hidden rounded border-2 border-destructive bg-card text-card-foreground shadow-2xl" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
      <div className="flex items-center justify-between bg-destructive px-2 py-1 text-xs font-bold text-destructive-foreground"><span>⚠ WARNING.exe</span><button type="button" aria-label="Close popup" onClick={() => setPops((all) => all.filter((x) => x.id !== p.id))}>✕</button></div>
      {p.video ? <iframe title="Prank video" className="aspect-video w-full" src={`https://www.youtube-nocookie.com/embed/${p.video}?autoplay=1&controls=0`} allow="autoplay" /> : <p className="animate-pulse p-3 text-sm font-semibold">{p.ad}</p>}
      <button type="button" className="m-2 rounded bg-primary px-3 py-1 text-xs font-bold text-primary-foreground" onClick={() => setPops((all) => [...all, { ...p, id: ++n.current, x: Math.random() * 70, y: Math.random() * 65 }])}>CLAIM NOW!!!</button>
    </div>)}
  </div>;
}

const PARTICLES: Record<string, string[]> = {
  emoji: ["💩", "😂", "🤡", "🐸", "🍕", "👀", "🔥"],
  snow: ["❄️", "❅", "❆"],
  confetti: ["🎊", "🎉", "🟡", "🟦", "🟥", "🟩"],
  ducks: ["🦆", "🐤", "🪿"],
};
function Particles({ kind }: { kind: keyof typeof PARTICLES }) {
  const choices = PARTICLES[kind] ?? ["✨"];
  const items = useRef(Array.from({ length: 36 }, () => ({
    left: Math.random() * 100, duration: 4 + Math.random() * 5, delay: Math.random() * 5,
    emoji: choices[Math.floor(Math.random() * choices.length)] ?? "✨",
  })));
  return <div className="pointer-events-none fixed inset-0 z-[9996] overflow-hidden">
    <style>{"@keyframes trl-fall{from{transform:translateY(-12vh) rotate(0)}to{transform:translateY(112vh) rotate(720deg)}}"}</style>
    {items.current.map((x, i) => <span key={i} className="absolute text-4xl" style={{ left: `${x.left}%`, top: 0, animation: `trl-fall ${x.duration}s linear ${x.delay}s infinite` }}>{x.emoji}</span>)}
  </div>;
}

function Matrix() {
  const columns = useRef(Array.from({ length: 30 }, () => Array.from({ length: 24 }, () => Math.random() > .5 ? "1" : "0").join(" ")));
  return <div className="pointer-events-none fixed inset-0 z-[9996] flex justify-between overflow-hidden bg-background/80 px-3 font-mono text-lg text-primary">
    <style>{"@keyframes trl-matrix{from{transform:translateY(-70%)}to{transform:translateY(70%)}}"}</style>
    {columns.current.map((line, i) => <span key={i} className="whitespace-pre-wrap break-all" style={{ animation: `trl-matrix ${4 + i % 5}s linear ${i % 4}s infinite` }}>{line}</span>)}
  </div>;
}

function CursorTrail() {
  const [points, setPoints] = useState<{ id: number; x: number; y: number }[]>([]);
  const id = useRef(0);
  useEffect(() => {
    const move = (event: PointerEvent) => setPoints((all) => [...all.slice(-15), { id: ++id.current, x: event.clientX, y: event.clientY }]);
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);
  return <div className="pointer-events-none fixed inset-0 z-[9996] overflow-hidden">{points.map((p, i) => <span key={p.id} className="absolute animate-ping text-2xl" style={{ left: p.x, top: p.y, opacity: i / points.length }}>✨</span>)}</div>;
}

function Notifications() {
  const notes = ["BirchBlock: Your keyboard is now upside down", "Update: Downloading more RAM", "Messages: 99+ unread memes", "Calendar: Appointment with the blue screen", "Store: Duck invasion installed", "Network: Connected to Definitely Not A Virus"];
  return <div className="pointer-events-none fixed right-4 top-4 z-[9996] grid w-80 max-w-[calc(100vw-2rem)] gap-2">{notes.map((note, i) => <div key={note} className="animate-in slide-in-from-right rounded-xl border border-border bg-card p-4 text-sm text-card-foreground shadow-xl" style={{ animationDelay: `${i * 180}ms` }}>🔔 {note}</div>)}</div>;
}

function Hacker() {
  const [lines, setLines] = useState<string[]>([]);
  useEffect(() => {
    const words = ["ACCESSING MAINFRAME", "BYPASSING FIREWALL", "DOWNLOADING HOMEWORK", "DECRYPTING PASSWORDS", "UPLOADING BROWSER HISTORY", "INSTALLING MINECRAFT", "SENDING MEMES"];
    const t = setInterval(() => setLines((l) => [...l, `[${(Math.random() * 100).toFixed(0)}%] ${words[Math.floor(Math.random() * words.length)]} 0x${Math.random().toString(16).slice(2, 10)}`].slice(-40)), 140);
    return () => clearInterval(t);
  }, []);
  return <div className="fixed inset-0 z-[9996] overflow-hidden bg-background p-6 font-mono text-sm text-primary"><p className="mb-4 text-2xl font-bold">☠ YOU HAVE BEEN HACKED ☠</p>{lines.map((l, i) => <p key={i}>{l}</p>)}</div>;
}

function Scene({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`fixed inset-0 z-[9996] grid place-items-center bg-background p-6 text-foreground ${className}`}><div className="w-full max-w-2xl text-center">{children}</div></div>;
}
function Bsod() {
  return <Scene className="bg-primary text-primary-foreground"><p className="text-left text-8xl">:(</p><p className="mt-6 text-left text-2xl">Your PC ran into a problem and needs to restart. We're just collecting some error info.</p><p className="mt-6 text-left text-xl">69% complete</p><p className="mt-3 text-left text-sm">Stop code: TOO_MUCH_SKILL_ISSUE</p></Scene>;
}
function Update() {
  const [p, setP] = useState(0);
  useEffect(() => { const t = setInterval(() => setP((x) => (x >= 99 ? 99 : x + (Math.random() > 0.8 ? 1 : 0))), 900); return () => clearInterval(t); }, []);
  return <Scene><div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" /><p className="text-2xl">Working on updates {p}%</p><p className="mt-2 text-muted-foreground">Don't turn off your computer. This will take a while.</p></Scene>;
}
function FakeError() {
  return <Scene className="bg-background/85 backdrop-blur-md"><div className="rounded-xl border border-destructive bg-card p-8 text-card-foreground shadow-2xl"><p className="text-6xl">⚠️</p><h2 className="mt-4 text-2xl font-semibold">BirchBlock has stopped responding</h2><p className="mt-3 text-muted-foreground">Error 0x00000307: too much awesome detected.</p><div className="mt-6 rounded-md bg-destructive px-5 py-2 text-sm font-medium text-destructive-foreground">Definitely not OK</div></div></Scene>;
}
function Loading() {
  return <Scene className="bg-background/90"><div className="mx-auto size-16 animate-spin rounded-full border-4 border-muted border-t-primary" /><p className="mt-6 text-2xl">Loading absolutely everything…</p><p className="mt-2 text-muted-foreground">Estimated time remaining: eventually</p></Scene>;
}

function Runaway() {
  useEffect(() => {
    const move = (e: PointerEvent) => {
      document.querySelectorAll<HTMLElement>("#site-content button, #site-content a").forEach((b) => {
        const r = b.getBoundingClientRect();
        const dx = r.left + r.width / 2 - e.clientX, dy = r.top + r.height / 2 - e.clientY;
        if (Math.hypot(dx, dy) < 90) b.style.transform = `translate(${Math.sign(dx) * (60 + Math.random() * 80)}px, ${Math.sign(dy) * (40 + Math.random() * 60)}px)`;
      });
    };
    window.addEventListener("pointermove", move);
    return () => { window.removeEventListener("pointermove", move); document.querySelectorAll<HTMLElement>("#site-content button, #site-content a").forEach((b) => (b.style.transform = "")); };
  }, []);
  return null;
}

/** Renders one reversible staff effect. Escape or the corner button always stops it; it also expires after ten minutes. */
export function TrollLayer({ troll, onEnd }: { troll: string; onEnd: () => void }) {
  const endRef = useRef(onEnd); endRef.current = onEnd;
  useEffect(() => {
    const timer = setTimeout(() => endRef.current(), 10 * 60 * 1000);
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") endRef.current(); };
    window.addEventListener("keydown", key);
    return () => { clearTimeout(timer); window.removeEventListener("keydown", key); };
  }, [troll]);
  const [kind = "", arg = ""] = troll.split(":");
  let effect: ReactNode = null;
  if (kind === "video" || kind === "rickroll") {
    const id = kind === "rickroll" ? RICKROLL_ID : youtubeId(arg);
    if (id) effect = <div className="fixed inset-0 z-[9996] bg-background"><iframe title="Prank video" className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&controls=0&loop=1&playlist=${id}`} allow="autoplay; fullscreen" /></div>;
  } else if (TROLL_CSS[kind]) effect = <style data-troll-effect={kind}>{TROLL_CSS[kind]}</style>;
  else if (kind === "virus") effect = <Virus />;
  else if (kind === "emoji" || kind === "snow" || kind === "confetti" || kind === "ducks") effect = <Particles kind={kind} />;
  else if (kind === "matrix") effect = <Matrix />;
  else if (kind === "trail") effect = <CursorTrail />;
  else if (kind === "notifications") effect = <Notifications />;
  else if (kind === "hacker") effect = <Hacker />;
  else if (kind === "bsod") effect = <Bsod />;
  else if (kind === "update") effect = <Update />;
  else if (kind === "error") effect = <FakeError />;
  else if (kind === "loading") effect = <Loading />;
  else if (kind === "runaway") effect = <Runaway />;
  return <>{effect}<button type="button" data-screen-share="skip" aria-label="Stop visual effect" title="Stop effect (Escape)" onClick={() => endRef.current()} className="fixed bottom-3 right-3 z-[10002] size-9 rounded-full border border-border bg-background/70 text-lg text-foreground opacity-40 shadow backdrop-blur transition-opacity hover:opacity-100">×</button></>;
}
