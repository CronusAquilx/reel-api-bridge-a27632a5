import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TrollLayer } from "./TrollLayer";

afterEach(() => { cleanup(); vi.useRealTimers(); });
describe("bounded visual effects", () => {
  it("lets the target stop an effect with Escape", () => {
    const end = vi.fn();
    render(<TrollLayer troll="freeze" onEnd={end} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(end).toHaveBeenCalledTimes(1);
  });
  it("expires after one minute even when its callback changes", () => {
    vi.useFakeTimers();
    const end = vi.fn();
    const view = render(<TrollLayer troll="grayscale" onEnd={() => {}} />);
    act(() => vi.advanceTimersByTime(30_000));
    view.rerender(<TrollLayer troll="grayscale" onEnd={end} />);
    act(() => vi.advanceTimersByTime(29_999));
    expect(end).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(end).toHaveBeenCalledTimes(1);
  });
});