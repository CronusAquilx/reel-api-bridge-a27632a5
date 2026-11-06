import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export const TROLLS: { id: string; label: string; emoji: string }[] = [
  { id: "invert", label: "Invert colors", emoji: "🔄" },
  { id: "virus", label: "Virus mode", emoji: "🦠" },
  { id: "rickroll", label: "Rick roll", emoji: "🎵" },
  { id: "flip", label: "Upside down", emoji: "🙃" },
  { id: "mirror", label: "Mirror", emoji: "🪞" },
  { id: "spin", label: "Spin", emoji: "🌀" },
  { id: "shake", label: "Earthquake", emoji: "📳" },
  { id: "drunk", label: "Drunk", emoji: "🥴" },
  { id: "blur", label: "Blurry", emoji: "👓" },
  { id: "rainbow", label: "Rainbow", emoji: "🌈" },
  { id: "tiny", label: "Shrink", emoji: "🐜" },
  { id: "comic", label: "Comic Sans", emoji: "🤡" },
  { id: "emoji", label: "Emoji rain", emoji: "💩" },
  { id: "hacker", label: "Fake hack", emoji: "💻" },
  { id: "bsod", label: "Fake crash", emoji: "💀" },
  { id: "update", label: "Fake update", emoji: "⏳" },
  { id: "cursor", label: "Hide cursor", emoji: "🫥" },
  { id: "runaway", label: "Runaway buttons", emoji: "🏃" },
  { id: "grayscale", label: "Old movie", emoji: "🎞️" },
  { id: "sepia", label: "Vintage", emoji: "📜" },
  { id: "saturate", label: "Neon colors", emoji: "🎨" },
  { id: "tilt", label: "Tilt", emoji: "📐" },
  { id: "squash", label: "Squash", emoji: "🥞" },
  { id: "bounce", label: "Bouncy screen", emoji: "🏀" },
  { id: "confetti", label: "Party rain", emoji: "🎊" },
  { id: "freeze", label: "Simulated freeze", emoji: "🧊" },
];

export const RICKROLL_ID = "dQw4w9WgXcQ";
export function youtubeId(input: string) {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([\w-]{11})/);
  return m?.[1] ?? null;
}

const RAW_CSS: Record<string, string> = {
  invert: "html{filter:invert(1) hue-rotate(180deg)!important}",
  flip: "body{transform:rotate(180deg)!important;transform-origin:50% 50vh}",
  mirror: "body{transform:scaleX(-1)!important}",
  spin: "@keyframes trl-spin{to{transform:rotate(360deg)}}body{animation:trl-spin 6s linear infinite!important;transform-origin:50% 50vh}",
  shake: "@keyframes trl-shake{0%,100%{transform:translate(0)}20%{transform:translate(-8px,4px)}40%{transform:translate(7px,-6px)}60%{transform:translate(-5px,-3px)}80%{transform:translate(6px,5px)}}body{animation:trl-shake .25s infinite!important}",
  drunk: "@keyframes trl-drunk{0%,100%{transform:rotate(-2deg) skewX(2deg)}50%{transform:rotate(2deg) skewX(-3deg) scale(1.02)}}html{filter:blur(1.2px)}body{animation:trl-drunk 3s ease-in-out infinite!important}",
  blur: "html{filter:blur(4px)!important}",
  rainbow: "@keyframes trl-hue{to{filter:hue-rotate(360deg) saturate(2)}}html{animation:trl-hue 3s linear infinite!important}",
  tiny: "body{transform:scale(.4)!important;transform-origin:50% 0}",
  comic: "*{font-family:'Comic Sans MS','Comic Sans',cursive!important}",
  cursor: "*{cursor:none!important}",
  grayscale: "html{filter:grayscale(1)!important}",
  sepia: "html{filter:sepia(.9)!important}",
  saturate: "html{filter:saturate(3)!important}",
  tilt: "body{transform:rotate(3deg) scale(.92)!important;transform-origin:50% 50vh}",
  squash: "body{transform:scaleY(.7)!important;transform-origin:50% 50vh}",
  bounce: "@keyframes trl-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(20px)}}body{animation:trl-bounce 1.5s ease-in-out infinite!important}",
};
// Root filters/transforms can blank fixed desktop/video compositing layers.
const CSS = Object.fromEntries(Object.entries(RAW_CSS).map(([id, css]) => [id,
  css.replace(/\b(?:html|body)\{/g, "#birch-app-surface{").replace(/\*\{/g, "#birch-app-surface *{"),
]));

const ADS = [
  "🎉 CONGRATULATIONS! You are the 1,000,000th visitor! Claim your FREE iPhone!",
  "⚠️ YOUR COMPUTER HAS 37 VIRUSES! Click here to clean now!",
  "🔥 HOT SINGLE GAMERS in your area want to 1v1 you!",
  "💰 Make $5000 a day from home with this ONE weird trick!",
  "🎮 RAID: SHADOW LEGENDS — Download now for FREE!",
  "🍔 Free Robux! Free V-Bucks! Just enter your password!",
  "🚨 Battery critically low (2%). Download more RAM?",
  "🏆 You WON a $1000 gift card! Act fast — 00:59 left!",
  "📦 Your package could not be delivered. Click to reschedule.",
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
      id: ++n.current, x: Math.random() * 75, y: Math.random() * 70,
      ad: ADS[Math.floor(Math.random() * ADS.length)] ?? "",
      video: n.current % 6 === 0 ? VIRUS_VIDEOS[Math.floor(Math.random() * VIRUS_VIDEOS.length)] : undefined,
    }))].slice(-12));
    const t = setInterval(() => { add(); if (ctx) beep(ctx); }, 700);
    add(3);
    return () => { clearInterval(t); void ctx?.close(); };
  }, []);
  return <div className="pointer-events-none fixed inset-0 z-[9996] overflow-hidden" data-screen-share="skip">
    {pops.map((p) => (
      <div key={p.id} className="pointer-events-auto absolute w-72 animate-in zoom-in-50 overflow-hidden rounded border-2 border-destructive bg-card text-card-foreground shadow-2xl" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
        <div className="flex items-center justify-between bg-destructive px-2 py-1 text-xs font-bold text-destructive-foreground">
          <span>⚠ WARNING.exe</span>
          <Button size="icon" variant="ghost" aria-label="Close" onClick={() => setPops((all) => all.filter((x) => x.id !== p.id))}>✕</Button>
        </div>
        {p.video
          ? <iframe title="ad" className="aspect-video w-full" src={`https://www.youtube-nocookie.com/embed/${p.video}?autoplay=1&controls=0`} allow="autoplay" />
          : <p className="animate-pulse p-3 text-sm font-semibold">{p.ad}</p>}
        <Button size="sm" className="m-2" onClick={() => setPops((all) => [...all, { ...p, id: ++n.current, x: Math.random() * 75, y: Math.random() * 70 }].slice(-12))}>CLAIM NOW!!!</Button>
      </div>
    ))}
  </div>;
}

function Emoji({ party = false }: { party?: boolean }) {
  const items = useRef(Array.from({ length: 40 }, () => ({ l: Math.random() * 100, d: 3 + Math.random() * 5, delay: Math.random() * 5, e: (party ? ["🎊", "🎉", "⭐", "🎈", "✨", "🥳", "🎵"] : ["💩", "😂", "🤡", "🐸", "🍕", "👀", "🔥"])[Math.floor(Math.random() * 7)] })));
  return <div className="pointer-events-none fixed inset-0 z-[9996] overflow-hidden" data-screen-share="skip">
    <style>{"@keyframes trl-fall{from{transform:translateY(-10vh) rotate(0)}to{transform:translateY(110vh) rotate(720deg)}}"}</style>
    {items.current.map((x, i) => <span key={i} className="absolute text-4xl" style={{ left: `${x.l}%`, top: 0, animation: `trl-fall ${x.d}s linear ${x.delay}s infinite` }}>{x.e}</span>)}
  </div>;
}

function Hacker() {
  const [lines, setLines] = useState<string[]>([]);
  useEffect(() => {
    const words = ["ACCESSING MAINFRAME", "BYPASSING FIREWALL", "DOWNLOADING HOMEWORK", "DECRYPTING PASSWORDS", "UPLOADING BROWSER HISTORY", "INSTALLING MINECRAFT", "SENDING MEMES"];
    const t = setInterval(() => setLines((l) => [...l, `[${(Math.random() * 100).toFixed(0)}%] ${words[Math.floor(Math.random() * words.length)]} 0x${Math.random().toString(16).slice(2, 10)}`].slice(-40)), 120);
    return () => clearInterval(t);
  }, []);
  return <div className="fixed inset-0 z-[9996] overflow-hidden bg-background/95 p-6 font-mono text-sm text-primary">
    <p className="mb-4 text-2xl font-bold">☠ YOU HAVE BEEN HACKED ☠</p>
    {lines.map((l, i) => <p key={i}>{l}</p>)}
  </div>;
}

function Bsod() {
  return <div className="fixed inset-0 z-[9996] flex flex-col justify-center gap-6 bg-primary p-16 text-primary-foreground" style={{ cursor: "none" }}>
    <p className="text-8xl">:(</p>
    <p className="max-w-2xl text-2xl">Your PC ran into a problem and needs to restart. We're just collecting some error info, and then we'll restart for you.</p>
    <p className="text-xl">69% complete</p>
    <p className="text-sm">Stop code: TOO_MUCH_SKILL_ISSUE</p>
  </div>;
}

function Update() {
  const [p, setP] = useState(0);
  useEffect(() => { const t = setInterval(() => setP((x) => (x >= 99 ? 99 : x + (Math.random() > 0.8 ? 1 : 0))), 900); return () => clearInterval(t); }, []);
  return <div className="fixed inset-0 z-[9996] grid place-items-center bg-background text-foreground">
    <div className="text-center"><div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="text-2xl">Working on updates {p}%</p><p className="mt-2 text-muted-foreground">Don't turn off your computer. This will take a while.</p></div>
  </div>;
}

function Runaway() {
  useEffect(() => {
    const move = (e: PointerEvent) => {
      document.querySelectorAll<HTMLElement>("#birch-app-surface button, #birch-app-surface a").forEach((b) => {
        const r = b.getBoundingClientRect();
        const dx = r.left + r.width / 2 - e.clientX, dy = r.top + r.height / 2 - e.clientY;
        if (Math.hypot(dx, dy) < 90) b.style.transform = `translate(${Math.sign(dx) * (60 + Math.random() * 80)}px, ${Math.sign(dy) * (40 + Math.random() * 60)}px)`;
      });
    };
    window.addEventListener("pointermove", move);
    return () => { window.removeEventListener("pointermove", move); document.querySelectorAll<HTMLElement>("button, a").forEach((b) => (b.style.transform = "")); };
  }, []);
  return null;
}

/** Renders the active staff troll (cleared by "untroll" or after 10 minutes). */
export function TrollLayer({ troll, onEnd }: { troll: string; onEnd: () => void }) {
  const endRef = useRef(onEnd); endRef.current = onEnd;
  useEffect(() => {
    const t = setTimeout(() => endRef.current(), 60_000);
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape") endRef.current(); };
    window.addEventListener("keydown", escape);
    return () => { clearTimeout(t); window.removeEventListener("keydown", escape); };
  }, [troll]);
  return <ActiveTroll troll={troll} />;
}

function ActiveTroll({ troll }: { troll: string }) {
  const [kind = "", arg = ""] = troll.split(":");
  if (kind === "video" || kind === "rickroll") {
    const id = kind === "rickroll" ? RICKROLL_ID : arg;
    return <div className="fixed inset-0 z-[9996] bg-background">
      <iframe title="video" className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&controls=0&loop=1&playlist=${id}`} allow="autoplay; fullscreen" />
    </div>;
  }
  if (CSS[kind]) return <style>{CSS[kind]}{"@media(prefers-reduced-motion:reduce){#birch-app-surface{animation:none!important}}"}</style>;
  if (kind === "virus") return <Virus />;
  if (kind === "emoji" || kind === "confetti") return <Emoji party={kind === "confetti"} />;
  if (kind === "freeze") return <div className="fixed inset-0 z-[9996] grid place-items-center bg-background/80 text-foreground"><p className="text-2xl font-semibold">🧊 Simulated freeze</p></div>;
  if (kind === "hacker") return <Hacker />;
  if (kind === "bsod") return <Bsod />;
  if (kind === "update") return <Update />;
  if (kind === "runaway") return <Runaway />;
  return null;
}
