import { describe, expect, it } from "vitest";
import { albumFromItunes, trackFromItunes } from "./client-search";

describe("key-free album metadata", () => {
  it("maps album identity, artwork and track count", () => {
    expect(albumFromItunes({ collectionId: 42, collectionName: "After Hours", artistName: "The Weeknd", artworkUrl100: "https://img/100x100bb.jpg", trackCount: 14 })).toEqual({ id: "42", name: "After Hours", artist: "The Weeknd", art: "https://img/600x600bb.jpg", trackCount: 14 });
  });
  it("keeps album tracks compatible with full-song playback resolution", () => {
    const track = trackFromItunes({ trackId: 7, trackName: "Blinding Lights", artistName: "The Weeknd", artistId: 3, collectionId: 42, collectionName: "After Hours", artworkUrl100: "https://img/100x100bb.jpg", trackTimeMillis: 200000, previewUrl: "https://audio/preview.m4a" });
    expect(track.albumId).toBe("42");
    expect(track.source).toBe("itunes");
    expect(track.duration).toBe(200);
  });
  it("rejects incomplete album rows", () => {
    expect(albumFromItunes({ collectionName: "Missing an ID" })).toBeNull();
  });
});
