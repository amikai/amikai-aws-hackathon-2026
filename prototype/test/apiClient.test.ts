import { describe, it, expect, vi, afterEach } from "vitest";
import { startSession, getBeatDialogue } from "../src/game/apiClient";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("startSession", () => {
  it("posts to /api/session/start and returns the parsed response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ currentDate: "20250102", mainIndex: 0, visitCount: 1 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await startSession();

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/api/session/start",
      expect.objectContaining({ method: "POST" })
    );
    expect(result).toEqual({ currentDate: "20250102", mainIndex: 0, visitCount: 1 });
  });
});

describe("getBeatDialogue", () => {
  it("posts the beat and choice, and returns text/fact", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: "法人今天悄悄往外走了一步。", fact: { title: "法人動向", lines: ["a"] } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getBeatDialogue("feet", "next");

    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ beat: "feet", choice: "next" });
    expect(result.text).toBe("法人今天悄悄往外走了一步。");
  });

  it("throws the server error message when the response is not ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "連線失敗，請確認後端伺服器" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getBeatDialogue("feet")).rejects.toThrow("連線失敗，請確認後端伺服器");
  });
});
