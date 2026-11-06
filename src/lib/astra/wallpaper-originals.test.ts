import { describe, expect, it } from "vitest";
import manifest from "@/assets/wallpapers/native/manifest.json";
import { DESKTOPHUT_WALLPAPERS } from "./desktophut-wallpapers";
import { WALLPAPER_ORIGINALS, WALLPAPER_VIDEO_UPGRADES } from "./wallpaper-originals";
import { upgradeWallpaperSource } from "./wallpaper-catalog";
import { WALLPAPER_LIVE_SOURCES } from "./wallpaper-live-sources";

describe("completed native wallpaper imports", () => {
  it("connects all 987 wallpapers to portable original media links", () => {
    expect(DESKTOPHUT_WALLPAPERS).toHaveLength(987);
    expect(Object.keys(WALLPAPER_ORIGINALS)).toHaveLength(985);
    expect(Object.keys(WALLPAPER_LIVE_SOURCES)).toHaveLength(987);
    expect(DESKTOPHUT_WALLPAPERS.filter(item => item.originalQuality)).toHaveLength(987);
    expect(DESKTOPHUT_WALLPAPERS.every(item => item.image.startsWith("https://www.desktophut.com/") && item.video.startsWith("https://media.desktophut.com/"))).toBe(true);
  });
  it("uses native dimensions and working original posters for expanded catalog entries", () => {
    const item = DESKTOPHUT_WALLPAPERS.find(item => item.id === "dh-yelan-4k-live-wallpaper");
    expect(item?.resolution).toBe("3840x2160");
    expect(item?.video).toBe(WALLPAPER_LIVE_SOURCES["dh-yelan-4k-live-wallpaper"]?.video);
    expect(item?.image).toBe(WALLPAPER_LIVE_SOURCES["dh-yelan-4k-live-wallpaper"]?.image);
  });
  it("upgrades saved previews from both collections without changing custom uploads", () => {
    for (const item of manifest) {
      const original = WALLPAPER_ORIGINALS[item.id];
      if (!original) continue;
      expect(upgradeWallpaperSource(item.video, WALLPAPER_VIDEO_UPGRADES)).toBe(WALLPAPER_LIVE_SOURCES[item.id]?.video);
    }
    expect(upgradeWallpaperSource("blob:my-custom-wallpaper", WALLPAPER_VIDEO_UPGRADES)).toBe("blob:my-custom-wallpaper");
  });
});