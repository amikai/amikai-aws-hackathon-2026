import type { FactBlock } from "./story";

const API_BASE_URL = "http://localhost:3001";

export interface SessionStartResponse {
  currentDate: string;
  mainIndex: number;
  visitCount: number;
}

export interface BeatResponse {
  text: string;
  fact?: FactBlock;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const payload = await response
      .json()
      .catch(() => ({ error: "連線失敗，請確認後端伺服器" }));
    throw new Error(payload.error ?? "連線失敗，請確認後端伺服器");
  }
  return (await response.json()) as T;
}

export function startSession(): Promise<SessionStartResponse> {
  return postJson<SessionStartResponse>("/api/session/start", {});
}

export function getBeatDialogue(beat: string, choice?: string): Promise<BeatResponse> {
  return postJson<BeatResponse>("/api/beat", { beat, choice });
}
