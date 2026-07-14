# 2D 插畫小屋「股伴」Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 一天內完成可在台上投影操作的 2D 插畫小屋 Demo：小伴角色、CALM/STORM 情緒環境、完整 8 格 storyboard。

**Architecture:** 單頁 Next.js App。一個 1600×900 viewBox 的分層 SVG 場景（房間、窗、雨、物件、小伴），HTML 對話面板疊在下方。所有互動經由對話面板的按鈕 dispatch 到單一 `useReducer` 狀態機；場景元件只讀 state 做視覺反應。台詞與數字全部來自靜態模組，不呼叫 LLM。

**Tech Stack:** Next.js（App Router）+ TypeScript + Tailwind CSS + Framer Motion + Vitest（僅測狀態機與文案完整性）+ bun。

**Spec:** `docs/2d-prototype-design.md`

## Global Constraints

- 新目錄 `prototype-2d/`，絕不修改 `prototype_t/`。
- 動畫只用 transform 與 opacity；`prefers-reduced-motion` 時改淡入淡出，流程仍可完成。
- 禁止全畫面紅色、閃爍、倒數、災難感；STORM 用深霧藍 + 暖琥珀燈增強表達。
- 色盤：奶油白 `#FBF7EF`、米色 `#EFE4D3`、鼠尾草綠 `#A9BFA1`、霧藍（CALM `#DCE9F0` / STORM `#4E6478`）、暖琥珀 `#F0B96B`、柔和珊瑚 `#E9A493`、墨色 `#5B5348`。
- 台詞逐字取自 `primary-user-journey.md`，不即興改寫。
- 所有市場數字來自單一 `lib/demo-data.ts`（2025/04/09 的 0050）。
- 介面左上角固定標示「2025 模擬市場 · 現在是 2025/12/31」。
- 互動全部經由對話面板按鈕，不做場景物件點擊（減少台上誤觸；spec 允許）。
- 桌機優先；手機能看即可，不精修。
- 套件版本安裝後鎖定於 lockfile，不手動放寬。

## File Structure

```text
prototype-2d/
├── app/
│   ├── layout.tsx          （create-next-app 產生，改 metadata 與 lang）
│   ├── page.tsx            （useReducer、reduced-motion hook、組裝）
│   └── globals.css         （Tailwind + body 底色）
├── components/
│   ├── scene/
│   │   ├── Scene.tsx       （SVG 容器與圖層組合）
│   │   ├── Room.tsx        （牆、地板、門、暖燈光暈）
│   │   ├── SkyWindow.tsx   （天色、雨、窗簾、窗框）
│   │   ├── PlanMap.tsx     （牆上路線圖）
│   │   ├── Radio.tsx       （收音機與聲波）
│   │   ├── Footprints.tsx  （門口法人腳印）
│   │   ├── Desk.tsx        （書桌、檯燈、日記）
│   │   ├── Companion.tsx   （小伴：呼吸、眨眼、移動、坐下）
│   │   └── Highlight.tsx   （共用的當前焦點光框）
│   └── ui/
│       ├── DialoguePanel.tsx（台詞、選項、隨時離開）
│       └── SimBadge.tsx    （模擬市場標示）
├── lib/
│   ├── types.ts            （MarketState、StoryStep、State、Action）
│   ├── experience-machine.ts（reducer + initialState）
│   ├── demo-data.ts        （唯一資料來源）
│   ├── copy.ts             （全部台詞與選項）
│   ├── palette.ts          （色盤常數）
│   └── targets.ts          （step → 場景焦點物件）
├── tests/
│   ├── experience-machine.test.ts
│   └── copy.test.ts
└── vitest.config.ts
```

---

### Task 1: 專案腳手架

**Files:**
- Create: `prototype-2d/`（create-next-app 產生）
- Modify: `prototype-2d/package.json`（scripts）
- Modify: `prototype-2d/app/layout.tsx`
- Modify: `prototype-2d/app/globals.css`

**Interfaces:**
- Produces: 可啟動的 Next.js App、`bun run dev` / `bun run typecheck` / `bun run test` 三個指令、`@/*` import alias。

- [ ] **Step 1: 建立專案**

```bash
cd /Users/amikai/Workspace/0714_hackathon/cmoney-aws-summit-hackathon
bunx create-next-app@latest prototype-2d --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-bun --yes
cd prototype-2d
bun add framer-motion
bun add -d vitest
```

Expected: 安裝完成無錯誤，`bun.lock` 產生。

- [ ] **Step 2: 加入 scripts**

`package.json` 的 `scripts` 改為：

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint .",
  "typecheck": "tsc --noEmit",
  "test": "vitest run"
}
```

- [ ] **Step 3: layout 與底色**

`app/layout.tsx` 全文：

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "股伴的小屋",
  description: "市場越激動，介面越安定",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body className="bg-[#FBF7EF] text-[#5B5348] antialiased">{children}</body>
    </html>
  );
}
```

`app/globals.css` 全文（create-next-app 預設 CSS 換成）：

```css
@import "tailwindcss";

html,
body {
  height: 100%;
  overscroll-behavior: none;
}
```

- [ ] **Step 4: 驗證啟動**

```bash
bun run dev
```

Expected: `http://localhost:3000` 開得起來（預設頁即可）。`bun run typecheck` 通過。

- [ ] **Step 5: Commit**

```bash
cd /Users/amikai/Workspace/0714_hackathon/cmoney-aws-summit-hackathon
git add prototype-2d
git commit -m "feat(2d): scaffold prototype-2d (next + tailwind + framer-motion + vitest)"
```

---

### Task 2: 型別與體驗狀態機（TDD）

**Files:**
- Create: `prototype-2d/lib/types.ts`
- Create: `prototype-2d/lib/experience-machine.ts`
- Create: `prototype-2d/vitest.config.ts`
- Test: `prototype-2d/tests/experience-machine.test.ts`

**Interfaces:**
- Produces:
  - `types.ts`：`MarketState`、`StoryStep`、`ReflectionChoice`、`ExperienceState`、`ExperienceAction`（下方逐字定義，全專案共用）。
  - `experience-machine.ts`：`initialState: ExperienceState`、`experienceReducer(state, action): ExperienceState`。

- [ ] **Step 1: vitest 設定**

`vitest.config.ts` 全文：

```ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname) } },
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
```

- [ ] **Step 2: 型別定義**

`lib/types.ts` 全文：

```ts
export type MarketState = "CALM" | "STORM";

export type StoryStep =
  | "ARRIVAL"
  | "SIT_TOGETHER"
  | "GROUNDING"
  | "PLAN_RECALL"
  | "RADIO_EXPLORE"
  | "FOOTPRINT_EXPLORE"
  | "TIMESCALE"
  | "REFLECTION"
  | "DIARY"
  | "REST";

export type ReflectionChoice = "KEEP" | "ADJUST" | "WAIT" | "UNSURE";

export interface ExperienceState {
  step: StoryStep;
  market: MarketState;
  windowClosed: boolean;
  reflection: ReflectionChoice | null;
}

export type ExperienceAction =
  | { type: "CHOOSE_LOOK" }
  | { type: "CHOOSE_SIT" }
  | { type: "ADVANCE" }
  | { type: "CHOOSE_REFLECTION"; choice: ReflectionChoice }
  | { type: "LEAVE" }
  | { type: "TOGGLE_MARKET" }
  | { type: "RESTART" };
```

- [ ] **Step 3: 先寫失敗測試**

`tests/experience-machine.test.ts` 全文：

```ts
import { describe, expect, it } from "vitest";
import { experienceReducer, initialState } from "@/lib/experience-machine";
import type { ExperienceState } from "@/lib/types";

describe("experience machine", () => {
  it("初始為 ARRIVAL + STORM，窗未關", () => {
    expect(initialState.step).toBe("ARRIVAL");
    expect(initialState.market).toBe("STORM");
    expect(initialState.windowClosed).toBe(false);
  });

  it("主線：陪我看一下 → 8 格走到 REST", () => {
    let s = experienceReducer(initialState, { type: "CHOOSE_LOOK" });
    expect(s.step).toBe("GROUNDING");
    expect(s.windowClosed).toBe(true);
    for (const expected of ["PLAN_RECALL", "RADIO_EXPLORE", "FOOTPRINT_EXPLORE", "TIMESCALE", "REFLECTION"] as const) {
      s = experienceReducer(s, { type: "ADVANCE" });
      expect(s.step).toBe(expected);
    }
    // REFLECTION 不能用 ADVANCE 跳過，必須選擇
    s = experienceReducer(s, { type: "ADVANCE" });
    expect(s.step).toBe("REFLECTION");
    s = experienceReducer(s, { type: "CHOOSE_REFLECTION", choice: "WAIT" });
    expect(s.step).toBe("DIARY");
    expect(s.reflection).toBe("WAIT");
    s = experienceReducer(s, { type: "ADVANCE" });
    expect(s.step).toBe("REST");
  });

  it("分支：今天只想坐坐 → 不推送資料，直接可休息", () => {
    let s = experienceReducer(initialState, { type: "CHOOSE_SIT" });
    expect(s.step).toBe("SIT_TOGETHER");
    expect(s.windowClosed).toBe(false);
    s = experienceReducer(s, { type: "ADVANCE" });
    expect(s.step).toBe("REST");
  });

  it("任何主線狀態都能 LEAVE 到 REST", () => {
    let s = experienceReducer(initialState, { type: "CHOOSE_LOOK" });
    s = experienceReducer(s, { type: "ADVANCE" }); // PLAN_RECALL
    s = experienceReducer(s, { type: "LEAVE" });
    expect(s.step).toBe("REST");
  });

  it("TOGGLE_MARKET 切換 CALM/STORM，RESTART 保留 market 並重置其他", () => {
    let s: ExperienceState = experienceReducer(initialState, { type: "TOGGLE_MARKET" });
    expect(s.market).toBe("CALM");
    s = experienceReducer(s, { type: "CHOOSE_LOOK" });
    s = experienceReducer(s, { type: "RESTART" });
    expect(s).toEqual({ ...initialState, market: "CALM" });
  });

  it("非法轉換是 no-op：ARRIVAL 收到 ADVANCE 不動", () => {
    const s = experienceReducer(initialState, { type: "ADVANCE" });
    expect(s.step).toBe("ARRIVAL");
  });
});
```

- [ ] **Step 4: 確認測試失敗**

```bash
bun run test
```

Expected: FAIL（`experience-machine` 模組不存在）。

- [ ] **Step 5: 實作 reducer**

`lib/experience-machine.ts` 全文：

```ts
import type { ExperienceAction, ExperienceState, StoryStep } from "./types";

export const initialState: ExperienceState = {
  step: "ARRIVAL",
  market: "STORM",
  windowClosed: false,
  reflection: null,
};

const mainPath: StoryStep[] = [
  "GROUNDING",
  "PLAN_RECALL",
  "RADIO_EXPLORE",
  "FOOTPRINT_EXPLORE",
  "TIMESCALE",
  "REFLECTION",
];

export function experienceReducer(state: ExperienceState, action: ExperienceAction): ExperienceState {
  switch (action.type) {
    case "CHOOSE_LOOK":
      return state.step === "ARRIVAL" ? { ...state, step: "GROUNDING", windowClosed: true } : state;
    case "CHOOSE_SIT":
      return state.step === "ARRIVAL" ? { ...state, step: "SIT_TOGETHER" } : state;
    case "ADVANCE": {
      const idx = mainPath.indexOf(state.step);
      if (idx >= 0 && idx < mainPath.length - 1) {
        return { ...state, step: mainPath[idx + 1] };
      }
      if (state.step === "DIARY" || state.step === "SIT_TOGETHER") {
        return { ...state, step: "REST" };
      }
      return state;
    }
    case "CHOOSE_REFLECTION":
      return state.step === "REFLECTION" ? { ...state, step: "DIARY", reflection: action.choice } : state;
    case "LEAVE":
      return { ...state, step: "REST" };
    case "TOGGLE_MARKET":
      return { ...state, market: state.market === "CALM" ? "STORM" : "CALM" };
    case "RESTART":
      return { ...initialState, market: state.market };
    default:
      return state;
  }
}
```

- [ ] **Step 6: 確認測試通過**

```bash
bun run test && bun run typecheck
```

Expected: 全部 PASS。

- [ ] **Step 7: Commit**

```bash
git add prototype-2d/lib prototype-2d/tests prototype-2d/vitest.config.ts
git commit -m "feat(2d): experience state machine with tests"
```

---

### Task 3: Demo 資料、色盤與全部台詞

**Files:**
- Create: `prototype-2d/lib/demo-data.ts`
- Create: `prototype-2d/lib/palette.ts`
- Create: `prototype-2d/lib/copy.ts`
- Create: `prototype-2d/lib/targets.ts`
- Test: `prototype-2d/tests/copy.test.ts`

**Interfaces:**
- Consumes: `types.ts` 的 `StoryStep`、`ExperienceAction`、`ReflectionChoice`。
- Produces:
  - `demoData`（唯一資料來源，形狀見下）。
  - `palette`（色盤常數物件）。
  - `stepCopy: Record<Exclude<StoryStep, "REST">, StepCopy>`、`restCopy: StepCopy`、`diaryEntry: string`，其中 `StepCopy = { eyebrow: string; dialogue: string; hint?: string; options: { label: string; action: ExperienceAction }[] }`。
  - `activeTargetForStep: Partial<Record<StoryStep, SceneTarget>>`，`SceneTarget = "plan" | "radio" | "footprints" | "diary"`。

- [ ] **Step 1: 資料與色盤**

`lib/demo-data.ts` 全文：

```ts
export const demoData = {
  date: "2025-04-09",
  stock: { symbol: "0050", name: "元大台灣50", close: 146.2, dailyReturn: -4.6, weeklyReturn: -16.931 },
  institutional: { netBuySell: -42058.918, consecutiveSellDays: 3 },
  forum: { posts: 196, authors: 135, bullish: 65, bearish: 10, neutral: 121, replies: 1069 },
  plan: { frequency: "monthly", day: 10, amount: 5000, goalYears: 10 },
} as const;
```

`lib/palette.ts` 全文：

```ts
export const palette = {
  cream: "#FBF7EF",
  beige: "#EFE4D3",
  sage: "#A9BFA1",
  skyCalm: "#DCE9F0",
  skyStorm: "#4E6478",
  amber: "#F0B96B",
  coral: "#E9A493",
  ink: "#5B5348",
  wall: "#F4EDE0",
  floor: "#E3D5BF",
  wood: "#C9A87C",
  woodDark: "#B08F63",
  rain: "#A9C0D0",
  footprint: "#8FA5B5",
} as const;
```

- [ ] **Step 2: 先寫文案完整性測試**

`tests/copy.test.ts` 全文：

```ts
import { describe, expect, it } from "vitest";
import { restCopy, stepCopy } from "@/lib/copy";
import type { StoryStep } from "@/lib/types";

const steps: Exclude<StoryStep, "REST">[] = [
  "ARRIVAL", "SIT_TOGETHER", "GROUNDING", "PLAN_RECALL",
  "RADIO_EXPLORE", "FOOTPRINT_EXPLORE", "TIMESCALE", "REFLECTION", "DIARY",
];

describe("copy", () => {
  it("每個非 REST 步驟都有台詞與至少一個選項", () => {
    for (const step of steps) {
      expect(stepCopy[step].dialogue.length).toBeGreaterThan(0);
      expect(stepCopy[step].options.length).toBeGreaterThanOrEqual(1);
      expect(stepCopy[step].options.length).toBeLessThanOrEqual(4);
    }
  });

  it("REFLECTION 有四個反思選項且都導向 CHOOSE_REFLECTION", () => {
    expect(stepCopy.REFLECTION.options).toHaveLength(4);
    for (const opt of stepCopy.REFLECTION.options) {
      expect(opt.action.type).toBe("CHOOSE_REFLECTION");
    }
  });

  it("REST 提供重新開始", () => {
    expect(restCopy.options[0].action.type).toBe("RESTART");
  });
});
```

Run: `bun run test` → Expected: copy.test FAIL（模組不存在）。

- [ ] **Step 3: 實作台詞模組**

`lib/copy.ts` 全文（台詞逐字取自 primary-user-journey.md）：

```ts
import { demoData } from "./demo-data";
import type { ExperienceAction, StoryStep } from "./types";

export interface StepOption {
  label: string;
  action: ExperienceAction;
}

export interface StepCopy {
  eyebrow: string;
  dialogue: string;
  hint?: string;
  options: StepOption[];
}

export const diaryEntry = `2025/04/09
明天是原定投入日。
今天 0050 波動很大，論壇也明顯變吵；但多數發文是中性。
法人連續三日賣超。
小安感到擔心，選擇先記錄感受，明天再確認計畫。`;

const advance: ExperienceAction = { type: "ADVANCE" };

export const stepCopy: Record<Exclude<StoryStep, "REST">, StepCopy> = {
  ARRIVAL: {
    eyebrow: "歡迎回來",
    dialogue: "你來了。今天外面的風有點大，我幫你把重要的事情留在桌上了。",
    options: [
      { label: "陪我看一下", action: { type: "CHOOSE_LOOK" } },
      { label: "今天只想坐坐", action: { type: "CHOOSE_SIT" } },
    ],
  },
  SIT_TOGETHER: {
    eyebrow: "今天只坐一下",
    dialogue: "沒關係，我們今天不用理解所有事情。坐一下也很好。",
    options: [{ label: "今天先到這裡", action: advance }],
  },
  GROUNDING: {
    eyebrow: "先慢一點",
    dialogue: "我們不用一次看完。先從一件事情開始就好。",
    options: [{ label: "好", action: advance }],
  },
  PLAN_RECALL: {
    eyebrow: "原本的路線",
    dialogue: "我記得我們原本約好明天一起往前走一步。今天你是不是有點想改變路線？",
    hint: `每月 ${demoData.plan.day} 日投入 ${demoData.plan.amount.toLocaleString("zh-TW")} 元 · 十年以上長期累積`,
    options: [
      { label: "我想暫停這次投入", action: advance },
      { label: "我只是有點擔心", action: advance },
      { label: "我的生活需求改變了", action: advance },
      { label: "我還說不上來", action: advance },
    ],
  },
  RADIO_EXPLORE: {
    eyebrow: "市場的聲音",
    dialogue: "外面確實比平常吵很多。不過仔細聽，大部分聲音其實沒有明確看多或看空。",
    hint: `${demoData.forum.posts} 則發文 · ${demoData.forum.authors} 位發文者\n看多 ${demoData.forum.bullish} · 看空 ${demoData.forum.bearish} · 中性 ${demoData.forum.neutral}`,
    options: [{ label: "去門口看看腳印", action: advance }],
  },
  FOOTPRINT_EXPLORE: {
    eyebrow: "門口的腳印",
    dialogue: "這些腳印是真的，而且連續往外走了幾天。但留下腳印的人，可能和我們有不同的目的與時間。",
    hint: `4/7–4/9 三大法人連續 ${demoData.institutional.consecutiveSellDays} 日賣超\n4/9 合計賣超 ${Math.abs(demoData.institutional.netBuySell).toLocaleString("zh-TW")} 張`,
    options: [{ label: "把時間尺度放在一起看", action: advance }],
  },
  TIMESCALE: {
    eyebrow: "兩張卡",
    dialogue: "短期的變化很大，讓人擔心很正常。它可能是重新檢視計畫的理由，但不必自動替你做決定。",
    hint: `短期市場：最近一週 ${demoData.stock.weeklyReturn}%\n我的計畫：十年以上長期累積`,
    options: [{ label: "我想好了", action: advance }],
  },
  REFLECTION: {
    eyebrow: "把選擇交還給你",
    dialogue: "看完這些線索，你現在怎麼想？",
    hint: "沒有綠色正解，也沒有紅色錯誤。",
    options: [
      { label: "我想維持原本計畫", action: { type: "CHOOSE_REFLECTION", choice: "KEEP" } },
      { label: "我想有理由地調整計畫", action: { type: "CHOOSE_REFLECTION", choice: "ADJUST" } },
      { label: "我想先記下感受，明天再確認", action: { type: "CHOOSE_REFLECTION", choice: "WAIT" } },
      { label: "我現在還沒有答案", action: { type: "CHOOSE_REFLECTION", choice: "UNSURE" } },
    ],
  },
  DIARY: {
    eyebrow: "共同日記",
    dialogue: "可以。暫時不決定，也是一個有意識的選擇。我把今天寫下來了。",
    hint: diaryEntry,
    options: [{ label: "今天先到這裡", action: advance }],
  },
};

export const restCopy: StepCopy = {
  eyebrow: "安心離開",
  dialogue: "今天我們只看了一件事，已經很夠了。你的計畫還在這裡，我也會幫你記得。",
  options: [{ label: "重新開始", action: { type: "RESTART" } }],
};
```

`lib/targets.ts` 全文：

```ts
import type { StoryStep } from "./types";

export type SceneTarget = "plan" | "radio" | "footprints" | "diary";

export const activeTargetForStep: Partial<Record<StoryStep, SceneTarget>> = {
  PLAN_RECALL: "plan",
  RADIO_EXPLORE: "radio",
  FOOTPRINT_EXPLORE: "footprints",
  TIMESCALE: "plan",
  DIARY: "diary",
};
```

- [ ] **Step 4: 測試通過**

```bash
bun run test && bun run typecheck
```

Expected: 全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add prototype-2d/lib prototype-2d/tests
git commit -m "feat(2d): demo data, palette, full storyboard copy"
```

---

### Task 4: 靜態場景構圖

**Files:**
- Create: `prototype-2d/components/scene/Scene.tsx`
- Create: `prototype-2d/components/scene/Room.tsx`
- Create: `prototype-2d/components/scene/SkyWindow.tsx`（本任務為靜態版，Task 5 換成動態版）
- Create: `prototype-2d/components/scene/PlanMap.tsx`
- Create: `prototype-2d/components/scene/Radio.tsx`
- Create: `prototype-2d/components/scene/Footprints.tsx`
- Create: `prototype-2d/components/scene/Desk.tsx`
- Create: `prototype-2d/components/scene/Companion.tsx`（本任務為靜態版，Task 6 換成動態版）
- Create: `prototype-2d/components/scene/Highlight.tsx`
- Create: `prototype-2d/components/ui/SimBadge.tsx`
- Modify: `prototype-2d/app/page.tsx`（全部重寫）

**Interfaces:**
- Consumes: `palette`、`ExperienceState`、`experienceReducer`、`initialState`、`activeTargetForStep`。
- Produces:
  - `Scene({ state, reducedMotion }: { state: ExperienceState; reducedMotion: boolean })`。
  - 各物件元件皆收 `active: boolean`；`Companion({ step, reducedMotion })`；`Highlight({ x, y, width, height, show })`。
  - `useReducedMotion(): boolean` hook（定義於 page.tsx，之後不外用）。

構圖（viewBox 0 0 1600 900）：

```text
門(40,280)  窗(208–572, 138–442)   路線圖(700–980, 180–380)   收音機(1120–1360, 330–560)
                          小伴（約 800, 500）
腳印（220–560, 660–780 往門口）                书桌+檯燈+日記（1080–1460, 560–800）
```

- [ ] **Step 1: 共用光框**

`components/scene/Highlight.tsx` 全文：

```tsx
"use client";

import { motion } from "framer-motion";
import { palette } from "@/lib/palette";

export default function Highlight({ x, y, width, height, show }: {
  x: number; y: number; width: number; height: number; show: boolean;
}) {
  if (!show) return null;
  return (
    <motion.rect
      x={x} y={y} width={width} height={height} rx={18}
      fill="none" stroke={palette.amber} strokeWidth={5}
      animate={{ opacity: [0.15, 0.85, 0.15] }}
      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}
```

- [ ] **Step 2: 房間**

`components/scene/Room.tsx` 全文：

```tsx
import { palette } from "@/lib/palette";
import type { MarketState } from "@/lib/types";

export default function Room({ market }: { market: MarketState }) {
  return (
    <g>
      <rect x={0} y={0} width={1600} height={620} fill={palette.wall} />
      <rect x={0} y={620} width={1600} height={280} fill={palette.floor} />
      {/* 門 */}
      <rect x={40} y={280} width={140} height={340} rx={10} fill={palette.beige} stroke={palette.ink} strokeOpacity={0.15} strokeWidth={4} />
      <circle cx={160} cy={455} r={7} fill={palette.woodDark} />
      {/* 暖燈光暈：STORM 時增強 */}
      <defs>
        <radialGradient id="lampGlow">
          <stop offset="0%" stopColor={palette.amber} stopOpacity={market === "STORM" ? 0.5 : 0.28} />
          <stop offset="100%" stopColor={palette.amber} stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx={1340} cy={500} r={280} fill="url(#lampGlow)" />
    </g>
  );
}
```

- [ ] **Step 3: 窗（靜態版）**

`components/scene/SkyWindow.tsx` 全文（Task 5 會整檔換成動態版）：

```tsx
import { palette } from "@/lib/palette";
import type { MarketState } from "@/lib/types";

export default function SkyWindow({ market, windowClosed, reducedMotion }: {
  market: MarketState; windowClosed: boolean; reducedMotion: boolean;
}) {
  void reducedMotion;
  return (
    <g>
      <rect x={220} y={150} width={340} height={280} rx={18} fill={market === "STORM" ? palette.skyStorm : palette.skyCalm} />
      {/* 窗簾 */}
      <rect x={214} y={144} width={352} height={windowClosed ? 200 : 46} rx={12} fill={palette.beige} />
      {/* 窗框 */}
      <rect x={208} y={138} width={364} height={304} rx={20} fill="none" stroke={palette.ink} strokeOpacity={0.25} strokeWidth={10} />
      <line x1={390} y1={150} x2={390} y2={430} stroke={palette.ink} strokeOpacity={0.2} strokeWidth={6} />
    </g>
  );
}
```

- [ ] **Step 4: 路線圖、收音機、腳印、書桌**

`components/scene/PlanMap.tsx` 全文：

```tsx
"use client";

import Highlight from "./Highlight";
import { palette } from "@/lib/palette";

export default function PlanMap({ active }: { active: boolean }) {
  return (
    <g>
      <rect x={700} y={180} width={280} height={200} rx={14} fill="#F7EFDF" stroke="#D9C9AC" strokeWidth={4} />
      <polyline points="730,340 790,300 850,310 910,260 950,240" fill="none" stroke={palette.sage} strokeWidth={6} strokeLinecap="round" />
      {[[730, 340], [790, 300], [850, 310], [910, 260]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={9} fill={palette.sage} />
      ))}
      {/* 明天的節點：尚未完成 */}
      <circle cx={950} cy={240} r={10} fill={palette.cream} stroke={palette.coral} strokeWidth={5} />
      <Highlight x={692} y={172} width={296} height={216} show={active} />
    </g>
  );
}
```

`components/scene/Radio.tsx` 全文：

```tsx
"use client";

import { motion } from "framer-motion";
import Highlight from "./Highlight";
import { palette } from "@/lib/palette";

export default function Radio({ active }: { active: boolean }) {
  return (
    <g>
      {/* 矮櫃 */}
      <rect x={1120} y={430} width={240} height={130} rx={12} fill={palette.beige} stroke={palette.ink} strokeOpacity={0.1} strokeWidth={3} />
      {/* 收音機 */}
      <rect x={1150} y={330} width={180} height={100} rx={16} fill="#D8B98E" />
      <circle cx={1200} cy={380} r={28} fill={palette.woodDark} />
      <rect x={1250} y={355} width={60} height={10} rx={5} fill={palette.woodDark} />
      <rect x={1250} y={375} width={60} height={10} rx={5} fill={palette.woodDark} />
      {/* 聲波 */}
      {[0, 1, 2].map((i) => (
        <motion.path
          key={i}
          d={`M ${1345 + i * 18} ${358 - i * 8} q ${12 + i * 4} 22 0 ${44 + i * 14}`}
          fill="none" stroke={palette.coral} strokeWidth={4} strokeLinecap="round"
          animate={active ? { opacity: [0.2, 0.9, 0.2] } : { opacity: 0.25 }}
          transition={active ? { duration: 1.6, repeat: Infinity, delay: i * 0.2 } : { duration: 0.3 }}
        />
      ))}
      <Highlight x={1138} y={318} width={214} height={126} show={active} />
    </g>
  );
}
```

`components/scene/Footprints.tsx` 全文：

```tsx
"use client";

import { motion } from "framer-motion";
import Highlight from "./Highlight";
import { palette } from "@/lib/palette";

const STEPS: Array<[number, number]> = [
  [520, 700], [470, 742], [410, 702], [356, 746], [300, 706], [248, 748],
];

export default function Footprints({ active, reducedMotion }: { active: boolean; reducedMotion: boolean }) {
  return (
    <g>
      {STEPS.map(([x, y], i) => (
        <g key={i} transform={`rotate(-70 ${x} ${y})`}>
          <motion.ellipse
            cx={x} cy={y} rx={16} ry={26} fill={palette.footprint}
            animate={active && !reducedMotion ? { opacity: [0.25, 0.8, 0.25] } : { opacity: 0.4 }}
            transition={active && !reducedMotion ? { duration: 2.4, repeat: Infinity, delay: i * 0.25 } : { duration: 0.3 }}
          />
        </g>
      ))}
      <Highlight x={216} y={656} width={350} height={126} show={active} />
    </g>
  );
}
```

`components/scene/Desk.tsx` 全文：

```tsx
"use client";

import Highlight from "./Highlight";
import { palette } from "@/lib/palette";

export default function Desk({ active }: { active: boolean }) {
  return (
    <g>
      {/* 桌面與桌腳 */}
      <rect x={1080} y={640} width={380} height={26} rx={10} fill={palette.wood} />
      <rect x={1100} y={666} width={22} height={130} fill={palette.woodDark} />
      <rect x={1420} y={666} width={22} height={130} fill={palette.woodDark} />
      {/* 檯燈 */}
      <rect x={1390} y={560} width={10} height={80} fill={palette.woodDark} />
      <path d="M1368 560 h54 l-13 -30 h-28 z" fill={palette.amber} />
      {/* 日記本 */}
      <rect x={1160} y={606} width={110} height={34} rx={6} fill={palette.coral} />
      <line x1={1215} y1={606} x2={1215} y2={640} stroke={palette.cream} strokeWidth={3} />
      <Highlight x={1140} y={590} width={150} height={64} show={active} />
    </g>
  );
}
```

- [ ] **Step 5: 小伴（靜態版）**

`components/scene/Companion.tsx` 全文（Task 6 會整檔換成動態版）：

```tsx
import { palette } from "@/lib/palette";
import type { StoryStep } from "@/lib/types";

export default function Companion({ step, reducedMotion }: { step: StoryStep; reducedMotion: boolean }) {
  void step;
  void reducedMotion;
  return (
    <g transform="translate(800 500)">
      {/* 尾巴 */}
      <circle cx={54} cy={28} r={14} fill={palette.sage} />
      {/* 身體 */}
      <ellipse cx={0} cy={20} rx={62} ry={56} fill="#F2E7D2" stroke="#DECCAA" strokeWidth={3} />
      {/* 耳朵 */}
      <circle cx={-34} cy={-58} r={16} fill="#F2E7D2" stroke="#DECCAA" strokeWidth={3} />
      <circle cx={34} cy={-58} r={16} fill="#F2E7D2" stroke="#DECCAA" strokeWidth={3} />
      {/* 頭 */}
      <circle cx={0} cy={-34} r={44} fill="#F2E7D2" stroke="#DECCAA" strokeWidth={3} />
      {/* 眼睛與腮紅 */}
      <ellipse cx={-16} cy={-36} rx={5} ry={7} fill={palette.ink} />
      <ellipse cx={16} cy={-36} rx={5} ry={7} fill={palette.ink} />
      <circle cx={-28} cy={-22} r={6} fill={palette.coral} opacity={0.5} />
      <circle cx={28} cy={-22} r={6} fill={palette.coral} opacity={0.5} />
    </g>
  );
}
```

- [ ] **Step 6: 場景組合與頁面**

`components/scene/Scene.tsx` 全文：

```tsx
"use client";

import type { ExperienceState } from "@/lib/types";
import { activeTargetForStep } from "@/lib/targets";
import Room from "./Room";
import SkyWindow from "./SkyWindow";
import PlanMap from "./PlanMap";
import Radio from "./Radio";
import Footprints from "./Footprints";
import Desk from "./Desk";
import Companion from "./Companion";

export default function Scene({ state, reducedMotion }: { state: ExperienceState; reducedMotion: boolean }) {
  const target = activeTargetForStep[state.step];
  return (
    <svg viewBox="0 0 1600 900" className="h-full w-full" preserveAspectRatio="xMidYMid slice" role="img" aria-label="股伴的小屋">
      <Room market={state.market} />
      <SkyWindow market={state.market} windowClosed={state.windowClosed} reducedMotion={reducedMotion} />
      <PlanMap active={target === "plan"} />
      <Radio active={target === "radio"} />
      <Footprints active={target === "footprints"} reducedMotion={reducedMotion} />
      <Desk active={target === "diary"} />
      <Companion step={state.step} reducedMotion={reducedMotion} />
    </svg>
  );
}
```

`components/ui/SimBadge.tsx` 全文：

```tsx
export default function SimBadge() {
  return (
    <div className="absolute left-4 top-4 rounded-full bg-[#EFE4D3]/85 px-4 py-1.5 text-xs text-[#8A7B63]">
      2025 模擬市場 · 現在是 2025/12/31
    </div>
  );
}
```

`app/page.tsx` 全文：

```tsx
"use client";

import { useEffect, useReducer, useState } from "react";
import Scene from "@/components/scene/Scene";
import SimBadge from "@/components/ui/SimBadge";
import { experienceReducer, initialState } from "@/lib/experience-machine";

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

export default function Home() {
  const [state, dispatch] = useReducer(experienceReducer, initialState);
  const reducedMotion = useReducedMotion();

  return (
    <main className="relative h-dvh w-dvw overflow-hidden">
      <Scene state={state} reducedMotion={reducedMotion} />
      <SimBadge />
      <button
        onClick={() => dispatch({ type: "TOGGLE_MARKET" })}
        className="absolute right-4 top-4 rounded-full bg-[#EFE4D3]/85 px-4 py-1.5 text-xs text-[#8A7B63] transition hover:bg-[#E7D8BF]"
      >
        {state.market === "STORM" ? "外面：風雨" : "外面：平靜"}
      </button>
    </main>
  );
}
```

- [ ] **Step 7: 視覺驗證**

```bash
bun run dev
```

打開 `http://localhost:3000` 確認：
1. 第一眼先看到小伴（畫面中央）。
2. 門、窗、路線圖、收音機、腳印、書桌全部可辨識，構圖不重疊。
3. 右上按鈕可切換天空顏色（其餘動態 Task 5 才做）。
4. `bun run typecheck` 通過。

- [ ] **Step 8: Commit**

```bash
git add prototype-2d
git commit -m "feat(2d): static scene composition with all room objects"
```

---

### Task 5: CALM/STORM 情緒環境

**Files:**
- Modify: `prototype-2d/components/scene/SkyWindow.tsx`（整檔替換為動態版）

**Interfaces:**
- Consumes: 同 Task 4 的 props（`market`、`windowClosed`、`reducedMotion`），介面不變。
- Produces: STORM 時天色漸變深霧藍＋窗內雨滴動畫；`windowClosed` 時窗簾平滑下降；reduced-motion 時雨改為靜態霧面。

- [ ] **Step 1: 動態版窗戶**

`components/scene/SkyWindow.tsx` 全文替換：

```tsx
"use client";

import { motion } from "framer-motion";
import { palette } from "@/lib/palette";
import type { MarketState } from "@/lib/types";

// 決定性位置，避免 SSR/CSR 不一致
const DROPS = Array.from({ length: 22 }, (_, i) => ({
  x: 236 + ((i * 53) % 300),
  delay: (i % 7) * 0.16,
}));

export default function SkyWindow({ market, windowClosed, reducedMotion }: {
  market: MarketState; windowClosed: boolean; reducedMotion: boolean;
}) {
  const storm = market === "STORM";
  return (
    <g>
      <defs>
        <clipPath id="windowClip">
          <rect x={220} y={150} width={340} height={280} rx={18} />
        </clipPath>
      </defs>
      {/* 天空 */}
      <motion.rect
        x={220} y={150} width={340} height={280} rx={18}
        animate={{ fill: storm ? palette.skyStorm : palette.skyCalm }}
        transition={{ duration: 1.2 }}
      />
      {/* 雨：只在 STORM；reduced-motion 用靜態霧面替代 */}
      <g clipPath="url(#windowClip)">
        {storm && !reducedMotion && DROPS.map((d, i) => (
          <motion.line
            key={i}
            x1={d.x} y1={140} x2={d.x - 8} y2={164}
            stroke={palette.rain} strokeWidth={3} strokeLinecap="round"
            initial={{ y: 0, opacity: 0 }}
            animate={{ y: 300, opacity: [0, 0.8, 0] }}
            transition={{ duration: 1.15, repeat: Infinity, delay: d.delay, ease: "linear" }}
          />
        ))}
        {storm && reducedMotion && (
          <rect x={220} y={150} width={340} height={280} fill={palette.rain} opacity={0.18} />
        )}
      </g>
      {/* 窗簾 */}
      <motion.rect
        x={214} y={144} width={352} rx={12} fill={palette.beige}
        initial={false}
        animate={{ height: windowClosed ? 200 : 46 }}
        transition={reducedMotion ? { duration: 0 } : { duration: 1.4, ease: "easeInOut" }}
      />
      {/* 窗框 */}
      <rect x={208} y={138} width={364} height={304} rx={20} fill="none" stroke={palette.ink} strokeOpacity={0.25} strokeWidth={10} />
      <line x1={390} y1={150} x2={390} y2={430} stroke={palette.ink} strokeOpacity={0.2} strokeWidth={6} />
    </g>
  );
}
```

- [ ] **Step 2: 視覺驗證**

`bun run dev` 後確認：
1. 右上切換到「外面：風雨」→ 天空 1.2 秒漸變深霧藍、雨滴落下、暖光更亮（Room 的 lampGlow）。
2. 切回「外面：平靜」→ 雨停、天色轉亮。
3. 無紅色、無閃爍；雨只出現在窗框內。
4. 系統開啟「減少動態效果」（macOS：設定 → 輔助使用 → 顯示器 → 減少動態）→ 雨變成靜態霧面，畫面不再有循環動畫。
5. `bun run typecheck` 通過。

- [ ] **Step 3: Commit**

```bash
git add prototype-2d/components/scene/SkyWindow.tsx
git commit -m "feat(2d): CALM/STORM weather with rain, curtain, reduced-motion fallback"
```

---

### Task 6: 小伴動畫

**Files:**
- Modify: `prototype-2d/components/scene/Companion.tsx`（整檔替換為動態版）

**Interfaces:**
- Consumes: props 不變：`{ step: StoryStep; reducedMotion: boolean }`。
- Produces: 常駐呼吸與眨眼；隨 `step` 移動到對應位置（關窗時到窗邊、聽收音機時到櫃旁、看腳印時蹲低、寫日記時到書桌）；坐姿時身體壓扁。

- [ ] **Step 1: 動態版小伴**

`components/scene/Companion.tsx` 全文替換：

```tsx
"use client";

import { motion } from "framer-motion";
import { palette } from "@/lib/palette";
import type { StoryStep } from "@/lib/types";

const POSES: Record<StoryStep, { x: number; y: number; sit?: boolean }> = {
  ARRIVAL: { x: 800, y: 500 },
  SIT_TOGETHER: { x: 780, y: 585, sit: true },
  GROUNDING: { x: 500, y: 500 },
  PLAN_RECALL: { x: 880, y: 480 },
  RADIO_EXPLORE: { x: 1060, y: 510 },
  FOOTPRINT_EXPLORE: { x: 480, y: 590, sit: true },
  TIMESCALE: { x: 800, y: 520 },
  REFLECTION: { x: 800, y: 520 },
  DIARY: { x: 1150, y: 560 },
  REST: { x: 800, y: 545, sit: true },
};

export default function Companion({ step, reducedMotion }: { step: StoryStep; reducedMotion: boolean }) {
  const pose = POSES[step];
  return (
    <motion.g
      initial={false}
      animate={{ x: pose.x, y: pose.y }}
      transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 50, damping: 15 }}
    >
      {/* 呼吸：以底部為原點的縮放循環 */}
      <motion.g
        animate={reducedMotion ? undefined : { scaleY: [1, 1.045, 1] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
      >
        {/* 尾巴 */}
        <circle cx={54} cy={28} r={14} fill={palette.sage} />
        {/* 身體：坐姿壓扁 */}
        <motion.ellipse
          cx={0} cy={20} rx={62}
          animate={{ ry: pose.sit ? 46 : 56 }}
          transition={{ duration: 0.5 }}
          fill="#F2E7D2" stroke="#DECCAA" strokeWidth={3}
        />
        {/* 耳朵 */}
        <circle cx={-34} cy={-58} r={16} fill="#F2E7D2" stroke="#DECCAA" strokeWidth={3} />
        <circle cx={34} cy={-58} r={16} fill="#F2E7D2" stroke="#DECCAA" strokeWidth={3} />
        {/* 頭 */}
        <circle cx={0} cy={-34} r={44} fill="#F2E7D2" stroke="#DECCAA" strokeWidth={3} />
        {/* 眼睛：眨眼 */}
        {[-16, 16].map((ex) => (
          <motion.ellipse
            key={ex}
            cx={ex} cy={-36} rx={5} ry={7} fill={palette.ink}
            animate={reducedMotion ? undefined : { scaleY: [1, 1, 0.12, 1] }}
            transition={{ duration: 4.2, times: [0, 0.9, 0.94, 1], repeat: Infinity }}
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
          />
        ))}
        {/* 腮紅 */}
        <circle cx={-28} cy={-22} r={6} fill={palette.coral} opacity={0.5} />
        <circle cx={28} cy={-22} r={6} fill={palette.coral} opacity={0.5} />
      </motion.g>
    </motion.g>
  );
}
```

- [ ] **Step 2: 視覺驗證**

`bun run dev` 後確認：
1. 小伴持續緩慢呼吸、每 4 秒左右眨眼一次。
2. 動作平滑（spring），不彈跳誇張。
3. 減少動態效果時：呼吸與眨眼停止、位置瞬移，但仍可辨識。
4. `bun run typecheck` 通過。

（step 切換的移動要等 Task 7 接上流程後才看得到，此處先確認常駐動畫。）

- [ ] **Step 3: Commit**

```bash
git add prototype-2d/components/scene/Companion.tsx
git commit -m "feat(2d): companion breathe/blink and per-step poses"
```

---

### Task 7: 對話面板與完整 8 格流程

**Files:**
- Create: `prototype-2d/components/ui/DialoguePanel.tsx`
- Modify: `prototype-2d/app/page.tsx`（加入 DialoguePanel）

**Interfaces:**
- Consumes: `stepCopy`、`restCopy`、`ExperienceState`、`ExperienceAction`、`Dispatch`。
- Produces: `DialoguePanel({ state, dispatch }: { state: ExperienceState; dispatch: Dispatch<ExperienceAction> })`。

- [ ] **Step 1: 對話面板**

`components/ui/DialoguePanel.tsx` 全文：

```tsx
"use client";

import type { Dispatch } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { restCopy, stepCopy } from "@/lib/copy";
import type { ExperienceAction, ExperienceState, StoryStep } from "@/lib/types";

const LEAVE_STEPS = new Set<StoryStep>([
  "GROUNDING", "PLAN_RECALL", "RADIO_EXPLORE", "FOOTPRINT_EXPLORE", "TIMESCALE", "REFLECTION",
]);

export default function DialoguePanel({ state, dispatch }: {
  state: ExperienceState;
  dispatch: Dispatch<ExperienceAction>;
}) {
  const copy = state.step === "REST" ? restCopy : stepCopy[state.step];
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-5">
      <AnimatePresence mode="wait">
        <motion.div
          key={state.step}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
          className="pointer-events-auto w-full max-w-2xl rounded-3xl border border-[#E5D9C3] bg-[#FBF7EF]/95 p-6 shadow-xl"
        >
          <p className="text-xs tracking-widest text-[#A08F76]">{copy.eyebrow}</p>
          <p className="mt-2 text-lg leading-relaxed">{copy.dialogue}</p>
          {copy.hint && (
            <p className="mt-2 whitespace-pre-line rounded-xl bg-[#F4EDE0] p-3 text-sm text-[#8A7B63]">{copy.hint}</p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {copy.options.map((opt) => (
              <button
                key={opt.label}
                onClick={() => dispatch(opt.action)}
                className="rounded-full bg-[#EFE4D3] px-5 py-2.5 transition hover:bg-[#E7D8BF]"
              >
                {opt.label}
              </button>
            ))}
            {LEAVE_STEPS.has(state.step) && (
              <button
                onClick={() => dispatch({ type: "LEAVE" })}
                className="rounded-full px-3 py-2.5 text-sm text-[#A08F76] underline-offset-4 hover:underline"
              >
                今天先到這裡
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: 接上頁面**

`app/page.tsx` 的 `<main>` 內、`</main>` 前加入（import 一併補上）：

```tsx
import DialoguePanel from "@/components/ui/DialoguePanel";
// ... <main> 內最後：
      <DialoguePanel state={state} dispatch={dispatch} />
```

- [ ] **Step 3: 全流程驗證**

`bun run dev` 後逐格走：
1. **主線**：陪我看一下 →（窗簾下降、小伴到窗邊）→ 好 →（路線圖亮框）四選項任選 →（收音機亮框、小伴移過去、聲波跳動、數字揭露）→（腳印亮框、小伴蹲到腳印旁）→（兩張卡 hint）→ 四個反思選項 →（日記亮框、小伴到書桌、日記全文）→ 今天先到這裡 → REST 結尾與「重新開始」。
2. **分支**：重新開始 → 今天只想坐坐 → 小伴坐下、無資料推送 → 今天先到這裡 → REST。
3. **隨時離開**：主線中途按「今天先到這裡」→ 直接 REST，無責怪文案。
4. 每格選項數 ≤ 4；hint 數字與 `demo-data.ts` 一致。
5. `bun run test && bun run typecheck` 通過。

- [ ] **Step 4: Commit**

```bash
git add prototype-2d
git commit -m "feat(2d): dialogue panel wiring full 8-frame storyboard with branches"
```

---

### Task 8: 潤飾與台上彩排

**Files:**
- Modify: 視彩排結果微調（構圖重疊、字級、色彩對比、動畫節奏）
- Modify: `prototype-2d/README.md`（新增操作小抄）

**Interfaces:**
- Consumes: 全部前置任務。
- Produces: 通過 spec 驗收清單、可上台的 build。

- [ ] **Step 1: production build 驗證**

```bash
bun run build && bun run start
```

Expected: build 無錯誤，`http://localhost:3000` 生產模式下全流程可走。

- [ ] **Step 2: 以 spec 驗收清單逐項檢查**

對照 `docs/2d-prototype-design.md` 第 9 節：
1. 第一眼先看到小伴。
2. CALM/STORM 可切換且 STORM 安定不災難。
3. 呼吸、眨眼、靠近、關窗（窗簾）、陪坐都有。
4. 主線 8 格走完；陪坐分支不追加問題。
5. 數字全部來自 demo-data。
6. 減少動態效果流程仍可完成。
7. 計時一次完整主線 demo：90–180 秒內。

任何一項不過：只調整現有元件的數值（位置、字級、時長），不加新功能。

- [ ] **Step 3: 操作小抄**

`prototype-2d/README.md` 全文：

```markdown
# 股伴的小屋（2D Demo）

台上操作：`bun run start` 後開 http://localhost:3000（demo 前先 `bun run build`）。

- 右上「外面：風雨／平靜」：pitch 時展示情緒環境對比。
- 主線：陪我看一下 → 好 → 我只是有點擔心 → 去門口看看腳印 → 把時間尺度放在一起看 → 我想好了 → 我想先記下感受，明天再確認 → 今天先到這裡。
- 備用分支：今天只想坐坐（示範不推送資料的陪伴）。
- 任何一步都有「今天先到這裡」可安全收尾。

設計規格：`../docs/2d-prototype-design.md`
```

- [ ] **Step 4: 最終 Commit**

```bash
git add prototype-2d
git commit -m "feat(2d): polish pass and stage-demo runbook"
```
