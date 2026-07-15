import type { BeatId, FactBlock, UserState } from "./types";
import { factToSummaryLine } from "./factEngine";

const SYSTEM_PROMPT = `你是「股伴」，一隻陪伴使用者觀察 2025 年台股市場的溫暖電子寵物。
規則：
- 只能根據我提供的「已確認事實」說話，不能自己編造或誇大數字
- 不給投資建議、不做漲跌預測，你的角色是陪伴與翻譯，不是分析師
- 不要把法人買賣超包裝成「聰明錢」要使用者跟隨——法人只是線索之一
- 語氣：好奇、溫暖、平靜，像朋友在旁邊陪著看，不是教學或說教
- 每次回覆 1-3 句繁體中文短句，適合顯示在對話卡（不要長篇大論）
- 若記憶摘要顯示使用者曾經表達擔心/堅定等情緒，要延續而非忽略`;

const BEAT_GOALS: Record<BeatId, string> = {
  arrival: "開場問候，帶入今天是隨機抽到的哪一天",
  sit_reply: "回應玩家想坐下來聊聊的邀請",
  ground: "延續現有文案語氣，慢慢開始，不用一次看完",
  plan: "回顧使用者的定期投資計畫，給予安定感",
  radio: "轉述論壇聲音的多空氛圍，強調並非一致意見",
  feet: "描述法人買賣超方向與連續性",
  scale: "比較當日與近一週兩個時間尺度的報酬，安定情緒",
  reflect: "引導使用者說出今天的感受",
  diary: "把今天寫進日記；若使用者有親筆感受，如實納入，不要替他改寫情緒；同時更新長期記憶摘要",
  rest: "溫和地收尾這次的陪伴時光",
};

export interface PromptResult {
  system: string;
  user: string;
}

function formatDate(date: string): string {
  return `${date.slice(0, 4)}/${date.slice(4, 6)}/${date.slice(6, 8)}`;
}

function formatRecentEvents(state: UserState): string {
  if (state.recentEvents.length === 0) return "（尚無過去紀錄）";
  return state.recentEvents
    .map((event) => {
      const feeling =
        event.feeling && event.feeling.trim().length > 0
          ? `，感受「${event.feeling.trim()}」`
          : "";
      return `[${formatDate(event.date)} ${event.beat}: ${event.fact}, 選擇${event.choice ?? "無"}${feeling}]`;
    })
    .join(", ");
}

function formatFeeling(feeling: string | undefined): string {
  const trimmed = feeling?.trim();
  if (trimmed) return `使用者親筆感受：「${trimmed}」`;
  return "使用者親筆感受：（未留下文字）";
}

export function buildBeatPrompt(
  beat: BeatId,
  date: string,
  fact: FactBlock | undefined,
  state: UserState,
  choice: string | undefined,
  feeling?: string
): PromptResult {
  const goal = BEAT_GOALS[beat];
  const factLine = `已確認事實：${factToSummaryLine(fact)}`;
  const choiceLine = choice
    ? `玩家上一步選擇：「${choice}」`
    : "（這是本次場次的第一步，玩家還沒做過選擇）";

  const closing =
    beat === "diary"
      ? "請生成寫進共同日記的短文；若有親筆感受請如實納入，不要替使用者改寫或誇大情緒。"
      : "請生成股伴此刻要說的一句話。";

  const user = [
    `今天模擬日期：${formatDate(date)}`,
    `這個 beat 的任務：${goal}`,
    factLine,
    choiceLine,
    formatFeeling(feeling),
    `長期記憶摘要：${state.summary || "（尚無長期記憶）"}`,
    `最近事件：${formatRecentEvents(state)}`,
    "",
    closing,
  ].join("\n");

  return { system: SYSTEM_PROMPT, user };
}
