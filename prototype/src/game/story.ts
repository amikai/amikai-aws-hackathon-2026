/**
 * 8-beat main path in one tea room (gaze shifts, not scene changes).
 * Sit branch: arrival → sit → quiet → diary → rest
 */

import { DEMO } from "./demoData";

export type StoryStep =
  | "arrival"
  | "sit_reply"
  | "ground"
  | "plan"
  | "radio"
  | "feet"
  | "scale"
  | "reflect"
  | "diary"
  | "rest";

export type ChoiceDef = {
  id: string;
  label: string;
  primary?: boolean;
};

export type FactBlock = {
  title: string;
  lines: string[];
};

export type GazeTarget = "window" | "tea" | "bookshelf" | "radio" | "door" | "none";

export type DialogueDef = {
  speaker?: string;
  /** Beat index for main path UI (1–8); sit path can omit */
  beat?: number;
  text: string;
  fact?: FactBlock;
  /** Where attention should rest in the room */
  gaze?: GazeTarget;
  choices?: ChoiceDef[];
};

export const QUIET_MS = 2600;

const cont = (id = "next", label = "繼續"): ChoiceDef => ({
  id,
  label,
  primary: true,
});

export const DIALOGUE: Record<StoryStep, DialogueDef> = {
  arrival: {
    beat: 1,
    speaker: "小伴",
    gaze: "window",
    text: "你來了。今天外面的風有點大——重要的事我留在這間房裡，我們不用急。",
    choices: [
      { id: "look", label: "陪我看一下", primary: true },
      { id: "sit", label: "今天只想坐坐" },
    ],
  },

  sit_reply: {
    speaker: "小伴",
    gaze: "none",
    text: "好。那我們就這樣坐一會兒。不用急著想市場的事。",
    choices: [cont("quiet", "……")],
  },

  ground: {
    beat: 2,
    speaker: "小伴",
    gaze: "tea",
    text: "我們不用一次看完。先從一件事情開始就好——茶還熱著，房間也還在。",
    choices: [cont()],
  },

  plan: {
    beat: 3,
    speaker: "小伴",
    gaze: "bookshelf",
    text: "書櫃那邊，是我們約好的路線。明天是投入日——你今天是不是有點想改變？",
    fact: {
      title: "原本的約定",
      lines: [
        `每月 ${DEMO.monthlyInvestDay} 日投入 ${DEMO.monthlyInvestAmount.toLocaleString("zh-TW")} 元`,
        `標的 ${DEMO.symbol} ${DEMO.symbolName}`,
        `時間尺度：${DEMO.planHorizon}`,
        "明天的節點，還沒走完",
      ],
    },
    choices: [cont()],
  },

  radio: {
    beat: 4,
    speaker: "小伴",
    gaze: "radio",
    text: "收音機裡外面確實比平常吵。不過仔細聽，大部分聲音其實沒有明確看多或看空。",
    fact: {
      title: "論壇聲量",
      lines: [
        `${DEMO.asOf} · 發文 ${DEMO.forumPosts} 則（${DEMO.forumAuthors} 人）`,
        `看多 ${DEMO.bull} · 看空 ${DEMO.bear} · 中性 ${DEMO.neutral}`,
        "聲量變大 ≠ 大家一致看空",
      ],
    },
    choices: [cont()],
  },

  feet: {
    beat: 5,
    speaker: "小伴",
    gaze: "door",
    text: "門口方向，像是有人連續往外走了幾天。這些腳印是真的——但留下腳印的人，目的可能和我們不同。",
    fact: {
      title: "法人動向",
      lines: [
        `${DEMO.asOf} 三大法人合計賣超 ${DEMO.institutionalSellLots.toLocaleString("zh-TW")} 張`,
        `${DEMO.institutionalSellDays} 連續賣超`,
        "線索，不是必須跟隨的答案",
      ],
    },
    choices: [cont()],
  },

  scale: {
    beat: 6,
    speaker: "小伴",
    gaze: "tea",
    text: "短期的變化很大，擔心很正常。它可能是重新檢視的理由，但不必自動替你做決定。",
    fact: {
      title: "兩個時間尺",
      lines: [
        `最近一週：${DEMO.symbol} ${DEMO.weekReturnPct}%`,
        `當日：${DEMO.dayChangePct}%`,
        `你的計畫：${DEMO.planHorizon} · 每月紀律投入`,
      ],
    },
    choices: [cont()],
  },

  reflect: {
    beat: 7,
    speaker: "小伴",
    gaze: "none",
    text: "路線還在這裡。沒有綠色正解，也沒有紅色錯誤——你想怎麼對待明天？",
    choices: [
      { id: "keep", label: "維持原本計畫" },
      { id: "adjust", label: "有理由地調整" },
      { id: "note", label: "先記下感受", primary: true },
      { id: "unsure", label: "現在還沒答案" },
    ],
  },

  diary: {
    beat: 8,
    speaker: "小伴",
    gaze: "none",
    /** Shown before the user submits a feeling; result text comes from the backend. */
    text: "今天我們看了幾件事，已經很夠了。想留一句感受給未來的自己嗎？（選填）",
    choices: [cont("write", "寫進日記")],
  },

  rest: {
    speaker: "小伴",
    gaze: "window",
    text: "窗外雨還在下。你隨時可以再來。",
    choices: [
      { id: "again", label: "再走一次", primary: true },
      { id: "sit_again", label: "只想再坐坐" },
    ],
  },
};

/** Main-path order after choosing「陪我看一下」 */
export const MAIN_ORDER: StoryStep[] = [
  "ground",
  "plan",
  "radio",
  "feet",
  "scale",
  "reflect",
  "diary",
];
