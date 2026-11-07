import type { ReactNode } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LAYOUT_NAMES, type AppearanceLayout, type AppearanceProfile } from "@/lib/astra/appearance";

type Patch = (patch: Partial<AppearanceProfile>) => void;
type Option<T extends string> = { value: T; label: string };

function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Option<T>[]; onChange: (value: T) => void }) {
  return <label className="personalization-control"><span>{label}</span><Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label} className="w-44"><SelectValue /></SelectTrigger><SelectContent>{options.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></label>;
}

const shellNames: Partial<Record<AppearanceLayout, string>> = {
  sony: "PlayStation Home",
  series: "Xbox dashboard & Guide",
  wii: "Wii channels",
  neutral: "Neutral dashboard",
  windows: "Windows desktop & taskbar",
  windows2: "Windows 2.0 desktop & taskbar",
  macos: "macOS Dock & Launchpad",
  ipad: "iPad Home Screen & Dock",
  switch: "Switch tiles & app dock",
};

function positionOptions(layout: AppearanceLayout): Option<AppearanceProfile["taskbarPosition"]>[] {
  if (layout === "sony") return [{ value: "native", label: "PlayStation default" }, { value: "top", label: "Top" }, { value: "bottom", label: "Bottom" }];
  if (layout === "switch") return [{ value: "native", label: "Switch default" }, { value: "bottom", label: "Bottom" }, { value: "top", label: "Top" }];
  if (["series", "wii", "neutral"].includes(layout)) return [{ value: "native", label: "Layout default" }, { value: "left", label: "Left side" }, { value: "right", label: "Right side" }, { value: "top", label: "Top bar" }];
  return [{ value: "native", label: "Layout default" }, { value: "bottom", label: "Bottom" }, { value: "top", label: "Top" }, { value: "left", label: "Left side" }, { value: "right", label: "Right side" }];
}

export function LayoutAppearanceControls({ layout, look, onChange }: { layout: AppearanceLayout; look: AppearanceProfile; onChange: Patch }) {
  const shell = shellNames[layout];
  const positionLabel = layout === "macos" || layout === "ipad" || layout === "switch" ? "Dock position" : ["sony", "series", "wii", "neutral"].includes(layout) ? "Navigation position" : "Taskbar position";
  const supportsAlignment = ["windows", "windows2", "macos", "ipad"].includes(layout);
  const rows: ReactNode[] = [
    <Choice key="shape" label="App icon shape" value={look.appIconShape} onChange={appIconShape => onChange({ appIconShape })} options={[
      { value: "native", label: "Layout default" }, { value: "circle", label: "Round" }, { value: "rounded", label: "Rounded" }, { value: "square", label: "Square" }, { value: "rectangle", label: "Rectangle" }, { value: "liquid", label: "Liquid glass" },
    ]} />,
    <Choice key="logo" label="App logo style" value={look.appLogoStyle} onChange={appLogoStyle => onChange({ appLogoStyle })} options={[
      { value: "color", label: "Full color" }, { value: "monochrome", label: "Monochrome" }, { value: "outline", label: "Outline" },
    ]} />,
    <Choice key="size" label="App & icon size" value={look.tileSize} onChange={tileSize => onChange({ tileSize })} options={[
      { value: "small", label: "Small" }, { value: "standard", label: "Standard" }, { value: "large", label: "Large" },
    ]} />,
    <Choice key="arrangement" label="App arrangement" value={look.appArrangement} onChange={appArrangement => onChange({ appArrangement })} options={[
      { value: "native", label: "Layout default" }, { value: "shelf", label: "Horizontal shelf" }, { value: "grid", label: "Grid" }, { value: "list", label: "Vertical list" },
    ]} />,
    <Choice key="font" label="Interface font" value={look.fontFamily} onChange={fontFamily => onChange({ fontFamily })} options={[
      { value: "native", label: "Layout default" }, { value: "clean", label: "Clean · Geist" }, { value: "rounded", label: "Rounded · Outfit" }, { value: "serif", label: "Editorial · Instrument" }, { value: "mono", label: "Digital · JetBrains" },
    ]} />,
    <Choice key="overlay" label="Wallpaper overlay" value={look.wallpaperOverlay} onChange={wallpaperOverlay => onChange({ wallpaperOverlay })} options={[
      { value: "native", label: "Layout default" }, { value: "none", label: "None" }, { value: "black", label: "Black dim" }, { value: "gradient", label: "Black gradient" }, { value: "frosted", label: "Frosted glass" },
    ]} />,
  ];
  if (shell) {
    rows.push(<Choice key="position" label={positionLabel} value={look.taskbarPosition} onChange={taskbarPosition => onChange({ taskbarPosition })} options={positionOptions(layout)} />);
  }
  if (supportsAlignment) {
    rows.push(<Choice key="alignment" label={layout === "macos" || layout === "ipad" ? "Dock alignment" : "Taskbar alignment"} value={look.taskbarAlignment} onChange={taskbarAlignment => onChange({ taskbarAlignment })} options={[
      { value: "native", label: "Layout default" }, { value: "start", label: "Start" }, { value: "center", label: "Center" }, { value: "end", label: "End" },
    ]} />);
  }
  return <section className="layout-appearance-controls border-b py-3" aria-label={`${LAYOUT_NAMES[layout]} app and navigation personalization`}>
    <div className="pb-2"><h2 className="text-sm font-medium">{shell ?? `${LAYOUT_NAMES[layout]} apps`}</h2><p className="mt-1 text-xs text-muted-foreground">Saved only for {LAYOUT_NAMES[layout]}; your other layouts stay unchanged.</p></div>
    {rows}
  </section>;
}
