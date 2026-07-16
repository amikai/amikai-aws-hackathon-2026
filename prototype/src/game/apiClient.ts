import type { FactBlock } from "./story";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";
const APP_SECRET = import.meta.env.VITE_APP_SECRET;

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
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (APP_SECRET) {
    headers["X-App-Secret"] = APP_SECRET;
  }
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers,
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

export function getBeatDialogue(
  beat: string,
  choice?: string,
  feeling?: string
): Promise<BeatResponse> {
  return postJson<BeatResponse>("/api/beat", { beat, choice, feeling });
}
