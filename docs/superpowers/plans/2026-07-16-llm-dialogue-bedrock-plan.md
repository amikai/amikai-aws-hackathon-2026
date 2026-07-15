# LLM 動態對話（Bedrock + DynamoDB）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `prototype/` 的 8-beat 固定劇本對話改成由 Claude Sonnet 4.6（透過 Amazon Bedrock）即時生成，並具備跨場次的 DynamoDB 長期記憶。

**Architecture:** 新增 `server/`（Node/Express + TypeScript）作為 Bedrock／DynamoDB 的呼叫代理層；前端 `prototype/` 新增 `apiClient.ts` 呼叫兩支 API（`/api/session/start`、`/api/beat`），並修改 `RoomScene.ts` 把原本讀 `story.ts` 靜態文字的地方改成非同步呼叫後端。

**Tech Stack:** Node.js 24 + TypeScript + Express + `@aws-sdk/client-bedrock-runtime` + `@aws-sdk/client-dynamodb` + `@aws-sdk/lib-dynamodb` + `csv-parse`；測試用 Vitest（+ `supertest` 測 Express route）。

## Global Constraints

- Bedrock 模型固定使用 `us.anthropic.claude-sonnet-4-6`（cross-region inference profile），region `us-east-1`。
- 股票代號固定 `0050`。
- DynamoDB table 名稱固定 `StockMateUserState`，partition key `user_id`（String），單一使用者固定值 `demo_user`。
- `recent_events` 最多保留 **5 筆**（`MAX_RECENT_EVENTS = 5`），超過時捨棄最舊的一筆。
- 後端伺服器監聽 port `3001`；前端 `apiClient.ts` 固定打 `http://localhost:3001`。
- 一般 beat 呼叫 Bedrock 不開 thinking，`max_tokens: 200`；`diary` beat 用 Structured Output，`max_tokens: 300`。
- `fact` 的資料形狀是 `FactBlock = {title: string, lines: string[]}`（沿用 `prototype/src/game/story.ts` 既有型別），不是純字串。
- 8-beat 主線的 beat id 與順序，**必須與 `prototype/src/game/story.ts` 現有的 `MAIN_ORDER` 完全一致**：`["ground", "plan", "radio", "feet", "scale", "reflect", "diary"]`（`arrival`／`sit_reply`／`rest` 是主線外的分支步驟）。
- 資料來源目錄：專案根目錄下的 `Delivery_Hackathon_DataPackage_20260624/`。
- LLM 或 DynamoDB 呼叫失敗時，一律回傳 HTTP 500 + `{error: "連線失敗，請確認後端伺服器"}`，前端把這段文字當作對話內容顯示，不 fallback 回靜態文字，選項按鈕維持可點擊。

---

### Task 1: 後端專案骨架

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/vitest.config.ts`
- Create: `server/.gitignore`
- Create: `server/src/types.ts`
- Test: `server/test/smoke.test.ts`

**Interfaces:**
- Produces: `BeatId`（`StoryStep` 的伺服器端對應型別）、`MAIN_ORDER: BeatId[]`、`FactBlock`、`RecentEvent`、`UserState`、`BeatRequestBody`、`BeatResponseBody`、`SessionStartResponseBody` — 後續所有 task 都會 import 這些型別。

- [ ] **Step 1: 建立 `server/package.json`**

```json
{
  "name": "stockmate-server",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts",
    "test": "vitest run",
    "setup:dynamodb": "tsx scripts/createTable.ts",
    "smoke:bedrock": "tsx scripts/smokeBedrock.ts"
  },
  "dependencies": {
    "@aws-sdk/client-bedrock-runtime": "^3.700.0",
    "@aws-sdk/client-dynamodb": "^3.700.0",
    "@aws-sdk/lib-dynamodb": "^3.700.0",
    "cors": "^2.8.5",
    "csv-parse": "^5.5.6",
    "express": "^4.19.2"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^22.9.0",
    "@types/supertest": "^6.0.2",
    "supertest": "^7.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: 安裝依賴**

Run: `cd server && npm install`
Expected: `node_modules/` 建立，無錯誤訊息。

- [ ] **Step 3: 建立 `server/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "outDir": "dist"
  },
  "include": ["src", "scripts", "test"]
}
```

- [ ] **Step 4: 建立 `server/vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
});
```

- [ ] **Step 5: 建立 `server/.gitignore`**

```
node_modules/
dist/
```

- [ ] **Step 6: 建立 `server/src/types.ts`**

```typescript
export type BeatId =
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

/**
 * Mirrors prototype/src/game/story.ts's MAIN_ORDER exactly.
 * Keep these two arrays in sync if the frontend's main path changes.
 */
export const MAIN_ORDER: BeatId[] = [
  "ground",
  "plan",
  "radio",
  "feet",
  "scale",
  "reflect",
  "diary",
];

export interface FactBlock {
  title: string;
  lines: string[];
}

export interface RecentEvent {
  date: string;
  beat: BeatId;
  choice: string | null;
  /** Compact single-line digest for memory/prompt reuse — not the FactBlock shown to the player. */
  fact: string;
  textExcerpt: string;
}

export interface UserState {
  userId: string;
  currentDate: string;
  visitCount: number;
  mainIndex: number;
  summary: string;
  recentEvents: RecentEvent[];
  updatedAt: string;
}

export interface BeatRequestBody {
  beat: BeatId;
  choice?: string;
}

export interface BeatResponseBody {
  text: string;
  fact?: FactBlock;
}

export interface SessionStartResponseBody {
  currentDate: string;
  mainIndex: number;
  visitCount: number;
}
```

- [ ] **Step 7: 寫一個 smoke test 確認 Vitest 可以跑**

```typescript
// server/test/smoke.test.ts
import { describe, it, expect } from "vitest";
import { MAIN_ORDER } from "../src/types";

describe("project scaffold", () => {
  it("exposes the 7-step main order", () => {
    expect(MAIN_ORDER).toEqual(["ground", "plan", "radio", "feet", "scale", "reflect", "diary"]);
  });
});
```

- [ ] **Step 8: 執行測試確認通過**

Run: `cd server && npm test`
Expected: `1 passed`

- [ ] **Step 9: Commit**

```bash
git add server/package.json server/tsconfig.json server/vitest.config.ts server/.gitignore server/src/types.ts server/test/smoke.test.ts
git commit -m "chore(server): scaffold Express/TypeScript backend project"
```

---

### Task 2: CSV 資料載入（csvData.ts）

**Files:**
- Create: `server/src/csvData.ts`
- Create: `server/test/fixtures.ts`
- Test: `server/test/csvData.test.ts`

**Interfaces:**
- Consumes: 無（純資料層）
- Produces: `CsvDataset`、`PriceRow`、`InstitutionalRow`、`ReturnRow`、`ForumRow`、`RawCsvFiles`、`parseCsvDataset(files: RawCsvFiles): CsvDataset`、`loadCsvDataFromDir(dataDir: string): CsvDataset`、`getAvailableDates(dataset: CsvDataset): string[]`、`pickRandomDate(dataset: CsvDataset): string` — 後續 `factEngine.ts`／`app.ts`／`index.ts` 會 import 這些。
- `test/fixtures.ts` 產出 `loadFixtureDataset(): CsvDataset`，供 Task 3、4、7 的測試重複使用。

- [ ] **Step 1: 寫 `server/test/fixtures.ts`（測試用小型 CSV，不需要讀真實檔案）**

```typescript
import { parseCsvDataset } from "../src/csvData";

export const PRICE_CSV = `﻿日期,股票代號,股票名稱,開盤價,最高價,最低價,收盤價,漲跌,漲幅(%),成交量,成交金額(千),股本(百萬),總市值(億),市值比重(%),本益比,本益比(近四季),股價淨值比,週轉率(%),漲跌停
20250102,0050,元大台灣50,195.65,195.65,193.25,194.05,-1.7,-0.87,14166,2749829,22230.0,4313.7,,,,,0.64,0
20250102,1101,台泥,10,10,10,10,0,0,100,1000,1000,100,,,,,0.1,0
20250103,0050,元大台灣50,194.05,196.00,193.00,195.50,1.45,0.75,15000,2900000,22230.0,4342.0,,,,,0.70,0
20250106,0050,元大台灣50,195.50,197.00,195.00,196.80,1.30,0.66,15200,2950000,22230.0,4370.0,,,,,0.71,0
`;

export const INSTITUTIONAL_CSV = `﻿日期,股票代號,股票名稱,外資買賣超,投信買賣超,自營商買賣超,買賣超合計,外資持股(張),外資持股比率(%),投信持股比率(%),自營商持股比率(%),法人持股比率(%),外資持股市值(百萬),法人持股市值(百萬)
20250102,0050,元大台灣50,-7070.648,551.0,-3294.843,-9814.491,114922.115,5.16,,,,22300.64,61218.2
20250103,0050,元大台灣50,-1665.623,500.0,2313.601,1147.978,109166.492,4.91,,,,21396.63,61256.75
20250106,0050,元大台灣50,847.961,2819.0,5681.296,9348.257,110413.453,4.97,,,,22320.08,65149.24
`;

export const RETURN_CSV = `﻿日期,股票代號,股票名稱,還原收盤價,日報酬率(%),週報酬率(%),月報酬率(%),季報酬率(%),半年報酬率(%),年報酬率(%),與大盤比年報酬率(%),殖利率(%)
20250102,0050,元大台灣50,46.86,-0.87,-2.119,1.226,5.692,5.229,47.954,20.07,2.53
20250103,0050,元大台灣50,47.23,0.75,-1.5,1.3,5.8,5.3,48.1,20.2,2.51
20250106,0050,元大台灣50,47.60,0.66,-0.9,1.4,5.9,5.4,48.3,20.3,2.50
`;

export const FORUM_CSV = `﻿日期,股票代號,股票名稱,發文則數,發文人數,看多發文,看空發文,中性發文,回文則數,回文人數
2025-01-02,0050,元大台灣50,23,16,14,0,9,161,71
2025-01-03,0050,元大台灣50,20,15,10,2,8,140,60
2025-01-06,0050,元大台灣50,25,18,16,1,8,170,75
`;

export function loadFixtureDataset() {
  return parseCsvDataset({
    price: PRICE_CSV,
    institutional: INSTITUTIONAL_CSV,
    returnRate: RETURN_CSV,
    forum: FORUM_CSV,
  });
}
```

- [ ] **Step 2: 寫 `server/test/csvData.test.ts`（先寫測試，此時 `../src/csvData` 還不存在）**

```typescript
import { describe, it, expect } from "vitest";
import { loadFixtureDataset } from "./fixtures";
import { getAvailableDates, pickRandomDate } from "../src/csvData";

describe("parseCsvDataset", () => {
  it("filters rows to stock 0050 only", () => {
    const dataset = loadFixtureDataset();
    expect(dataset.price.has("20250102")).toBe(true);
    expect(dataset.price.get("20250102")?.closePrice).toBe(194.05);
  });

  it("normalizes hyphenated dates from the forum file", () => {
    const dataset = loadFixtureDataset();
    expect(dataset.forum.has("20250102")).toBe(true);
    expect(dataset.forum.get("20250102")?.bullPosts).toBe(14);
  });

  it("parses institutional net trading totals", () => {
    const dataset = loadFixtureDataset();
    expect(dataset.institutional.get("20250102")?.totalNet).toBeCloseTo(-9814.491);
    expect(dataset.institutional.get("20250106")?.totalNet).toBeCloseTo(9348.257);
  });

  it("collects available dates from the institutional file, sorted", () => {
    const dataset = loadFixtureDataset();
    expect(getAvailableDates(dataset)).toEqual(["20250102", "20250103", "20250106"]);
  });
});

describe("pickRandomDate", () => {
  it("always returns one of the available dates", () => {
    const dataset = loadFixtureDataset();
    for (let i = 0; i < 20; i++) {
      expect(dataset.availableDates).toContain(pickRandomDate(dataset));
    }
  });
});
```

- [ ] **Step 3: 執行測試確認失敗**

Run: `cd server && npm test -- csvData`
Expected: FAIL — `Cannot find module '../src/csvData'`

- [ ] **Step 4: 實作 `server/src/csvData.ts`**

```typescript
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "csv-parse/sync";

const STOCK_CODE = "0050";

export interface PriceRow {
  closePrice: number;
  changePercent: number;
}

export interface InstitutionalRow {
  totalNet: number;
}

export interface ReturnRow {
  weeklyReturn: number | null;
}

export interface ForumRow {
  bullPosts: number;
  bearPosts: number;
  neutralPosts: number;
  replyCount: number;
}

export interface CsvDataset {
  price: Map<string, PriceRow>;
  institutional: Map<string, InstitutionalRow>;
  returnRate: Map<string, ReturnRow>;
  forum: Map<string, ForumRow>;
  availableDates: string[];
}

export interface RawCsvFiles {
  price: string;
  institutional: string;
  returnRate: string;
  forum: string;
}

function normalizeDate(raw: string): string {
  return raw.replace(/-/g, "");
}

function parseRows(content: string): Record<string, string>[] {
  return parse(content, {
    columns: true,
    bom: true,
    skip_empty_lines: true,
  }) as Record<string, string>[];
}

function toNumber(value: string | undefined): number {
  if (value === undefined || value === "") return 0;
  return Number(value);
}

function toNullableNumber(value: string | undefined): number | null {
  if (value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export function parseCsvDataset(files: RawCsvFiles): CsvDataset {
  const price = new Map<string, PriceRow>();
  for (const row of parseRows(files.price)) {
    if (row["股票代號"] !== STOCK_CODE) continue;
    price.set(normalizeDate(row["日期"]), {
      closePrice: toNumber(row["收盤價"]),
      changePercent: toNumber(row["漲幅(%)"]),
    });
  }

  const institutional = new Map<string, InstitutionalRow>();
  for (const row of parseRows(files.institutional)) {
    if (row["股票代號"] !== STOCK_CODE) continue;
    institutional.set(normalizeDate(row["日期"]), {
      totalNet: toNumber(row["買賣超合計"]),
    });
  }

  const returnRate = new Map<string, ReturnRow>();
  for (const row of parseRows(files.returnRate)) {
    if (row["股票代號"] !== STOCK_CODE) continue;
    returnRate.set(normalizeDate(row["日期"]), {
      weeklyReturn: toNullableNumber(row["週報酬率(%)"]),
    });
  }

  const forum = new Map<string, ForumRow>();
  for (const row of parseRows(files.forum)) {
    if (row["股票代號"] !== STOCK_CODE) continue;
    forum.set(normalizeDate(row["日期"]), {
      bullPosts: toNumber(row["看多發文"]),
      bearPosts: toNumber(row["看空發文"]),
      neutralPosts: toNumber(row["中性發文"]),
      replyCount: toNumber(row["回文則數"]),
    });
  }

  const availableDates = Array.from(institutional.keys()).sort();

  return { price, institutional, returnRate, forum, availableDates };
}

export function loadCsvDataFromDir(dataDir: string): CsvDataset {
  return parseCsvDataset({
    price: readFileSync(join(dataDir, "01_Price_Valuation_2025.csv"), "utf-8"),
    institutional: readFileSync(join(dataDir, "02_Institutional_Trading_2025.csv"), "utf-8"),
    returnRate: readFileSync(join(dataDir, "03_Return_Rate_2025.csv"), "utf-8"),
    forum: readFileSync(join(dataDir, "10_Forum_Posts_Replies_Daily_Stats_2025.csv"), "utf-8"),
  });
}

export function getAvailableDates(dataset: CsvDataset): string[] {
  return dataset.availableDates;
}

export function pickRandomDate(dataset: CsvDataset): string {
  const dates = dataset.availableDates;
  return dates[Math.floor(Math.random() * dates.length)];
}
```

- [ ] **Step 5: 執行測試確認通過**

Run: `cd server && npm test -- csvData`
Expected: `5 passed`

- [ ] **Step 6: Commit**

```bash
git add server/src/csvData.ts server/test/fixtures.ts server/test/csvData.test.ts
git commit -m "feat(server): load and index 0050 CSV rows for price/institutional/return/forum data"
```

---

### Task 3: 事實運算引擎（factEngine.ts）

**Files:**
- Create: `server/src/factEngine.ts`
- Test: `server/test/factEngine.test.ts`

**Interfaces:**
- Consumes: `CsvDataset` from `./csvData`（Task 2）；`BeatId`、`FactBlock` from `./types`（Task 1）
- Produces: `computeFact(dataset: CsvDataset, beat: BeatId, date: string): FactBlock | undefined`、`factToSummaryLine(fact: FactBlock | undefined): string` — Task 4（promptBuilder）與 Task 7（app.ts）會 import 這兩個函式。

- [ ] **Step 1: 寫 `server/test/factEngine.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { loadFixtureDataset } from "./fixtures";
import { computeFact, factToSummaryLine } from "../src/factEngine";

describe("computeFact", () => {
  const dataset = loadFixtureDataset();

  it("returns the fixed investment plan fact regardless of date", () => {
    const fact = computeFact(dataset, "plan", "20250102");
    expect(fact?.title).toBe("原本的約定");
    expect(fact?.lines).toContain("每月 10 日投入 5,000 元");
  });

  it("describes forum sentiment for the radio beat", () => {
    const fact = computeFact(dataset, "radio", "20250102");
    expect(fact?.lines[0]).toBe("1/2 · 看多 14 · 看空 0 · 中性 9");
  });

  it("describes institutional net trading direction for the feet beat", () => {
    const fact = computeFact(dataset, "feet", "20250102");
    expect(fact?.lines[0]).toContain("賣超");
    expect(fact?.lines[0]).toContain("9814.5");
  });

  it("detects a consecutive same-direction streak for the feet beat", () => {
    const fact = computeFact(dataset, "feet", "20250106");
    expect(fact?.lines[0]).toContain("買超");
    expect(fact?.lines[1]).toBe("已連續 2 天同方向買超");
  });

  it("combines weekly return and daily change for the scale beat", () => {
    const fact = computeFact(dataset, "scale", "20250102");
    expect(fact?.lines[0]).toContain("-2.119%");
    expect(fact?.lines[1]).toContain("-0.87%");
  });

  it("combines multiple facts for the diary beat", () => {
    const fact = computeFact(dataset, "diary", "20250106");
    expect(fact?.title).toBe("共同日記");
    expect(fact?.lines.some((line) => line.includes("買超"))).toBe(true);
  });

  it("returns undefined when there is no fact for the beat or the date is unknown", () => {
    expect(computeFact(dataset, "ground", "20250102")).toBeUndefined();
    expect(computeFact(dataset, "feet", "20259999")).toBeUndefined();
  });
});

describe("factToSummaryLine", () => {
  it("joins the fact block into a single line", () => {
    const dataset = loadFixtureDataset();
    const fact = computeFact(dataset, "radio", "20250102");
    expect(factToSummaryLine(fact)).toBe(
      "論壇聲量：1/2 · 看多 14 · 看空 0 · 中性 9；回文 161 則；聲量變大 ≠ 大家一致看空"
    );
  });

  it("returns a placeholder when there is no fact", () => {
    expect(factToSummaryLine(undefined)).toBe("（本次無新事實）");
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `cd server && npm test -- factEngine`
Expected: FAIL — `Cannot find module '../src/factEngine'`

- [ ] **Step 3: 實作 `server/src/factEngine.ts`**

```typescript
import type { CsvDataset } from "./csvData";
import type { BeatId, FactBlock } from "./types";

const PLAN_FACT: FactBlock = {
  title: "原本的約定",
  lines: ["每月 10 日投入 5,000 元", "標的 0050 元大台灣50", "時間尺度：十年以上"],
};

type StreakDirection = "buy" | "sell" | "flat";

function computeStreak(dataset: CsvDataset, date: string): { days: number; direction: StreakDirection } {
  const dates = dataset.availableDates;
  const idx = dates.indexOf(date);
  const currentRow = dataset.institutional.get(date);
  if (idx < 0 || !currentRow || currentRow.totalNet === 0) {
    return { days: 0, direction: "flat" };
  }
  const direction: StreakDirection = currentRow.totalNet > 0 ? "buy" : "sell";

  let days = 0;
  for (let i = idx; i >= 0; i--) {
    const row = dataset.institutional.get(dates[i]);
    if (!row) break;
    const rowDirection: StreakDirection = row.totalNet > 0 ? "buy" : row.totalNet < 0 ? "sell" : "flat";
    if (rowDirection !== direction) break;
    days += 1;
  }
  return { days, direction };
}

function formatDateShort(date: string): string {
  return `${Number(date.slice(4, 6))}/${Number(date.slice(6, 8))}`;
}

function directionLabel(direction: StreakDirection): string {
  if (direction === "buy") return "買超";
  if (direction === "sell") return "賣超";
  return "持平";
}

export function computeFact(dataset: CsvDataset, beat: BeatId, date: string): FactBlock | undefined {
  switch (beat) {
    case "plan":
      return PLAN_FACT;

    case "radio": {
      const row = dataset.forum.get(date);
      if (!row) return undefined;
      return {
        title: "論壇聲量",
        lines: [
          `${formatDateShort(date)} · 看多 ${row.bullPosts} · 看空 ${row.bearPosts} · 中性 ${row.neutralPosts}`,
          `回文 ${row.replyCount} 則`,
          "聲量變大 ≠ 大家一致看空",
        ],
      };
    }

    case "feet": {
      const row = dataset.institutional.get(date);
      if (!row) return undefined;
      const { days, direction } = computeStreak(dataset, date);
      const label = directionLabel(direction);
      return {
        title: "法人動向",
        lines: [
          `${formatDateShort(date)} 三大法人合計${label} ${Math.abs(row.totalNet).toFixed(1)} 張`,
          days > 1 ? `已連續 ${days} 天同方向${label}` : "今天由前一天反轉方向",
          "線索，不是必須跟隨的答案",
        ],
      };
    }

    case "scale": {
      const returnRow = dataset.returnRate.get(date);
      const priceRow = dataset.price.get(date);
      if (!returnRow || !priceRow) return undefined;
      return {
        title: "兩個時間尺",
        lines: [
          `最近一週：0050 ${returnRow.weeklyReturn ?? "無資料"}%`,
          `當日：${priceRow.changePercent}%`,
          "你的計畫：十年以上 · 每月紀律投入",
        ],
      };
    }

    case "diary": {
      const feet = computeFact(dataset, "feet", date);
      const scale = computeFact(dataset, "scale", date);
      const priceRow = dataset.price.get(date);
      const lines = [formatDateShort(date)];
      if (priceRow) lines.push(`0050 當日 ${priceRow.changePercent}%`);
      if (feet) lines.push(feet.lines[1]);
      if (scale) lines.push(scale.lines[0]);
      lines.push("你的感受，已經留在今天的紀錄裡。");
      return { title: "共同日記", lines };
    }

    default:
      return undefined;
  }
}

export function factToSummaryLine(fact: FactBlock | undefined): string {
  if (!fact) return "（本次無新事實）";
  return `${fact.title}：${fact.lines.join("；")}`;
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `cd server && npm test -- factEngine`
Expected: `9 passed`

- [ ] **Step 5: Commit**

```bash
git add server/src/factEngine.ts server/test/factEngine.test.ts
git commit -m "feat(server): compute deterministic FactBlocks per beat from CSV data"
```

---

### Task 4: Prompt 組裝（promptBuilder.ts）

**Files:**
- Create: `server/src/promptBuilder.ts`
- Test: `server/test/promptBuilder.test.ts`

**Interfaces:**
- Consumes: `BeatId`、`FactBlock`、`UserState` from `./types`；`factToSummaryLine` from `./factEngine`（Task 3）
- Produces: `PromptResult { system: string; user: string }`、`buildBeatPrompt(beat, date, fact, state, choice): PromptResult` — Task 7（app.ts）會 import。

- [ ] **Step 1: 寫 `server/test/promptBuilder.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { buildBeatPrompt } from "../src/promptBuilder";
import { computeFact } from "../src/factEngine";
import { loadFixtureDataset } from "./fixtures";
import type { UserState } from "../src/types";

const emptyState: UserState = {
  userId: "demo_user",
  currentDate: "20250102",
  visitCount: 1,
  mainIndex: 0,
  summary: "",
  recentEvents: [],
  updatedAt: new Date(0).toISOString(),
};

describe("buildBeatPrompt", () => {
  it("includes the date, fact, and beat goal for a fresh session", () => {
    const dataset = loadFixtureDataset();
    const fact = computeFact(dataset, "feet", "20250102");
    const { system, user } = buildBeatPrompt("feet", "20250102", fact, emptyState, undefined);
    expect(system).toContain("股伴");
    expect(user).toContain("2025/01/02");
    expect(user).toContain("三大法人合計賣超");
    expect(user).toContain("描述法人買賣超方向與連續性");
    expect(user).toContain("尚無過去紀錄");
  });

  it("includes the previous choice when provided", () => {
    const { user } = buildBeatPrompt("radio", "20250103", undefined, emptyState, "next");
    expect(user).toContain("玩家上一步選擇：「next」");
  });

  it("includes the memory summary and recent events when present", () => {
    const state: UserState = {
      ...emptyState,
      summary: "使用者對法人賣超感到擔心",
      recentEvents: [
        { date: "20250102", beat: "feet", choice: "next", fact: "法人動向：賣超9814.5張", textExcerpt: "..." },
      ],
    };
    const { user } = buildBeatPrompt("plan", "20250103", undefined, state, "next");
    expect(user).toContain("使用者對法人賣超感到擔心");
    expect(user).toContain("feet");
  });

  it("shows a placeholder fact line when there is no fact for the beat", () => {
    const { user } = buildBeatPrompt("ground", "20250102", undefined, emptyState, undefined);
    expect(user).toContain("已確認事實：（本次無新事實）");
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `cd server && npm test -- promptBuilder`
Expected: FAIL — `Cannot find module '../src/promptBuilder'`

- [ ] **Step 3: 實作 `server/src/promptBuilder.ts`**

```typescript
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
  diary: "把今天寫進日記，同時更新長期記憶摘要",
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
    .map((event) => `[${formatDate(event.date)} ${event.beat}: ${event.fact}, 選擇${event.choice ?? "無"}]`)
    .join(", ");
}

export function buildBeatPrompt(
  beat: BeatId,
  date: string,
  fact: FactBlock | undefined,
  state: UserState,
  choice: string | undefined
): PromptResult {
  const goal = BEAT_GOALS[beat];
  const factLine = `已確認事實：${factToSummaryLine(fact)}`;
  const choiceLine = choice
    ? `玩家上一步選擇：「${choice}」`
    : "（這是本次場次的第一步，玩家還沒做過選擇）";

  const user = [
    `今天模擬日期：${formatDate(date)}`,
    `這個 beat 的任務：${goal}`,
    factLine,
    choiceLine,
    `長期記憶摘要：${state.summary || "（尚無長期記憶）"}`,
    `最近事件：${formatRecentEvents(state)}`,
    "",
    "請生成股伴此刻要說的一句話。",
  ].join("\n");

  return { system: SYSTEM_PROMPT, user };
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `cd server && npm test -- promptBuilder`
Expected: `4 passed`

- [ ] **Step 5: Commit**

```bash
git add server/src/promptBuilder.ts server/test/promptBuilder.test.ts
git commit -m "feat(server): build per-beat system/user prompts from facts and memory"
```

---

### Task 5: DynamoDB 長期記憶（memoryStore.ts）

**Files:**
- Create: `server/src/memoryStore.ts`
- Create: `server/scripts/createTable.ts`
- Create: `server/test/fakeDocClient.ts`
- Test: `server/test/memoryStore.test.ts`

**Interfaces:**
- Consumes: `RecentEvent`、`UserState` from `./types`
- Produces: `TABLE_NAME`、`DEMO_USER_ID`、`DocClientLike`、`createDocClient(region): DocClientLike`、`loadUserState(doc): Promise<UserState>`、`saveUserState(doc, state): Promise<void>`、`appendRecentEvent(state, event): UserState` — Task 7（app.ts）／Task 1 的 `index.ts` 會 import；`test/fakeDocClient.ts` 匯出 `FakeDocClient`，供 Task 7 的 `app.test.ts` 重複使用。

- [ ] **Step 1: 寫 `server/test/fakeDocClient.ts`（測試替身，不打真的 DynamoDB）**

```typescript
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { DocClientLike } from "../src/memoryStore";

export class FakeDocClient implements DocClientLike {
  private table = new Map<string, Record<string, unknown>>();

  async send(command: GetCommand | PutCommand): Promise<any> {
    if (command instanceof GetCommand) {
      return { Item: this.table.get(command.input.Key!.user_id as string) };
    }
    if (command instanceof PutCommand) {
      this.table.set(command.input.Item!.user_id as string, command.input.Item!);
      return {};
    }
    throw new Error("unsupported command in FakeDocClient");
  }
}
```

- [ ] **Step 2: 寫 `server/test/memoryStore.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { loadUserState, saveUserState, appendRecentEvent, DEMO_USER_ID } from "../src/memoryStore";
import { FakeDocClient } from "./fakeDocClient";
import type { RecentEvent, UserState } from "../src/types";

describe("loadUserState", () => {
  it("returns an empty state when no record exists", async () => {
    const doc = new FakeDocClient();
    const state = await loadUserState(doc);
    expect(state.userId).toBe(DEMO_USER_ID);
    expect(state.visitCount).toBe(0);
    expect(state.recentEvents).toEqual([]);
  });

  it("round-trips a saved state", async () => {
    const doc = new FakeDocClient();
    const state: UserState = {
      userId: DEMO_USER_ID,
      currentDate: "20250102",
      visitCount: 2,
      mainIndex: 1,
      summary: "test summary",
      recentEvents: [],
      updatedAt: new Date().toISOString(),
    };
    await saveUserState(doc, state);
    const loaded = await loadUserState(doc);
    expect(loaded.currentDate).toBe("20250102");
    expect(loaded.summary).toBe("test summary");
  });
});

describe("appendRecentEvent", () => {
  const baseState: UserState = {
    userId: DEMO_USER_ID,
    currentDate: "20250102",
    visitCount: 1,
    mainIndex: 0,
    summary: "",
    recentEvents: [],
    updatedAt: new Date(0).toISOString(),
  };

  it("adds a new event to the list", () => {
    const event: RecentEvent = { date: "20250102", beat: "feet", choice: "next", fact: "f", textExcerpt: "t" };
    const next = appendRecentEvent(baseState, event);
    expect(next.recentEvents).toHaveLength(1);
    expect(next.recentEvents[0]).toEqual(event);
  });

  it("keeps at most 5 events, dropping the oldest", () => {
    let state = baseState;
    for (let i = 0; i < 6; i++) {
      state = appendRecentEvent(state, {
        date: `2025010${i + 1}`,
        beat: "feet",
        choice: null,
        fact: `fact-${i}`,
        textExcerpt: `text-${i}`,
      });
    }
    expect(state.recentEvents).toHaveLength(5);
    expect(state.recentEvents[0].fact).toBe("fact-1");
    expect(state.recentEvents[4].fact).toBe("fact-5");
  });
});
```

- [ ] **Step 3: 執行測試確認失敗**

Run: `cd server && npm test -- memoryStore`
Expected: FAIL — `Cannot find module '../src/memoryStore'`

- [ ] **Step 4: 實作 `server/src/memoryStore.ts`**

```typescript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { RecentEvent, UserState } from "./types";

export const TABLE_NAME = "StockMateUserState";
export const DEMO_USER_ID = "demo_user";
const MAX_RECENT_EVENTS = 5;

export interface DocClientLike {
  send(command: GetCommand | PutCommand): Promise<any>;
}

export function createDocClient(region: string): DocClientLike {
  const client = new DynamoDBClient({ region });
  return DynamoDBDocumentClient.from(client);
}

function emptyState(): UserState {
  return {
    userId: DEMO_USER_ID,
    currentDate: "",
    visitCount: 0,
    mainIndex: 0,
    summary: "",
    recentEvents: [],
    updatedAt: new Date().toISOString(),
  };
}

export async function loadUserState(doc: DocClientLike): Promise<UserState> {
  const result = await doc.send(
    new GetCommand({ TableName: TABLE_NAME, Key: { user_id: DEMO_USER_ID } })
  );
  if (!result.Item) return emptyState();
  return {
    userId: result.Item.user_id,
    currentDate: result.Item.current_date,
    visitCount: result.Item.visit_count,
    mainIndex: result.Item.main_index,
    summary: result.Item.summary,
    recentEvents: result.Item.recent_events,
    updatedAt: result.Item.updated_at,
  };
}

export async function saveUserState(doc: DocClientLike, state: UserState): Promise<void> {
  await doc.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        user_id: state.userId,
        current_date: state.currentDate,
        visit_count: state.visitCount,
        main_index: state.mainIndex,
        summary: state.summary,
        recent_events: state.recentEvents,
        updated_at: state.updatedAt,
      },
    })
  );
}

export function appendRecentEvent(state: UserState, event: RecentEvent): UserState {
  const recentEvents = [...state.recentEvents, event];
  while (recentEvents.length > MAX_RECENT_EVENTS) {
    recentEvents.shift();
  }
  return { ...state, recentEvents, updatedAt: new Date().toISOString() };
}
```

- [ ] **Step 5: 執行測試確認通過**

Run: `cd server && npm test -- memoryStore`
Expected: `4 passed`

- [ ] **Step 6: 寫 DynamoDB table 建立腳本 `server/scripts/createTable.ts`（一次性 setup，冪等）**

```typescript
import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
  ResourceNotFoundException,
} from "@aws-sdk/client-dynamodb";
import { TABLE_NAME } from "../src/memoryStore";

const REGION = "us-east-1";

async function main() {
  const client = new DynamoDBClient({ region: REGION });

  try {
    await client.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
    console.log(`Table ${TABLE_NAME} already exists, skipping creation.`);
    return;
  } catch (error) {
    if (!(error instanceof ResourceNotFoundException)) {
      throw error;
    }
  }

  await client.send(
    new CreateTableCommand({
      TableName: TABLE_NAME,
      AttributeDefinitions: [{ AttributeName: "user_id", AttributeType: "S" }],
      KeySchema: [{ AttributeName: "user_id", KeyType: "HASH" }],
      BillingMode: "PAY_PER_REQUEST",
    })
  );
  console.log(`Created table ${TABLE_NAME}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 7: 實際執行一次，在 AWS 帳號上建立這張表**

Run: `cd server && npm run setup:dynamodb`
Expected: `Created table StockMateUserState.`（若已存在則印出 `already exists, skipping creation.`）

- [ ] **Step 8: Commit**

```bash
git add server/src/memoryStore.ts server/scripts/createTable.ts server/test/fakeDocClient.ts server/test/memoryStore.test.ts
git commit -m "feat(server): add DynamoDB-backed user memory store and table setup script"
```

---

### Task 6: Bedrock 呼叫（bedrockClient.ts）

**Files:**
- Create: `server/src/bedrockClient.ts`
- Create: `server/scripts/smokeBedrock.ts`
- Create: `server/test/fakeBedrockClient.ts`
- Test: `server/test/bedrockClient.test.ts`

**Interfaces:**
- Consumes: 無（獨立呼叫層）
- Produces: `MODEL_ID`、`InvokeClientLike`、`createBedrockClient(region): InvokeClientLike`、`generateBeatText(client, system, user): Promise<string>`、`DiaryUpdate { diaryText: string; updatedSummary: string }`、`generateDiaryUpdate(client, system, user): Promise<DiaryUpdate>` — Task 7（app.ts）會 import；`test/fakeBedrockClient.ts` 匯出 `fakeBedrockClient(text)`，供 Task 7 的 `app.test.ts` 重複使用。

- [ ] **Step 1: 寫 `server/test/fakeBedrockClient.ts`**

```typescript
import type { InvokeClientLike } from "../src/bedrockClient";

export function fakeBedrockClient(responseText: string): InvokeClientLike {
  const body = JSON.stringify({ content: [{ type: "text", text: responseText }] });
  return {
    async send() {
      return { body: new TextEncoder().encode(body) };
    },
  };
}
```

- [ ] **Step 2: 寫 `server/test/bedrockClient.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { generateBeatText, generateDiaryUpdate } from "../src/bedrockClient";
import { fakeBedrockClient } from "./fakeBedrockClient";
import type { InvokeClientLike } from "../src/bedrockClient";

describe("generateBeatText", () => {
  it("extracts the text block from the Bedrock response", async () => {
    const client = fakeBedrockClient("法人今天悄悄往外走了一步。");
    const text = await generateBeatText(client, "system prompt", "user prompt");
    expect(text).toBe("法人今天悄悄往外走了一步。");
  });

  it("throws when the response has no text block", async () => {
    const client: InvokeClientLike = {
      async send() {
        const body = JSON.stringify({ content: [{ type: "thinking" }] });
        return { body: new TextEncoder().encode(body) };
      },
    };
    await expect(generateBeatText(client, "s", "u")).rejects.toThrow("no text block");
  });
});

describe("generateDiaryUpdate", () => {
  it("parses the JSON diary payload", async () => {
    const client = fakeBedrockClient(
      JSON.stringify({ diary_text: "今天的日記。", updated_summary: "新的摘要。" })
    );
    const result = await generateDiaryUpdate(client, "system prompt", "user prompt");
    expect(result.diaryText).toBe("今天的日記。");
    expect(result.updatedSummary).toBe("新的摘要。");
  });
});
```

- [ ] **Step 3: 執行測試確認失敗**

Run: `cd server && npm test -- bedrockClient`
Expected: FAIL — `Cannot find module '../src/bedrockClient'`

- [ ] **Step 4: 實作 `server/src/bedrockClient.ts`**

```typescript
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

export const MODEL_ID = "us.anthropic.claude-sonnet-4-6";
const REGION = "us-east-1";

export interface InvokeClientLike {
  send(command: InvokeModelCommand): Promise<{ body: Uint8Array }>;
}

export function createBedrockClient(region: string = REGION): InvokeClientLike {
  return new BedrockRuntimeClient({ region }) as unknown as InvokeClientLike;
}

interface TextResponseBody {
  content: Array<{ type: string; text?: string }>;
}

function extractText(body: TextResponseBody): string {
  const block = body.content.find((entry) => entry.type === "text");
  if (!block?.text) {
    throw new Error("Bedrock response contained no text block");
  }
  return block.text;
}

export async function generateBeatText(
  client: InvokeClientLike,
  system: string,
  user: string
): Promise<string> {
  const body = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 200,
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: user }],
  };

  const response = await client.send(
    new InvokeModelCommand({
      modelId: MODEL_ID,
      body: JSON.stringify(body),
      contentType: "application/json",
      accept: "application/json",
    })
  );
  const parsed = JSON.parse(Buffer.from(response.body).toString("utf-8")) as TextResponseBody;
  return extractText(parsed);
}

export interface DiaryUpdate {
  diaryText: string;
  updatedSummary: string;
}

export async function generateDiaryUpdate(
  client: InvokeClientLike,
  system: string,
  user: string
): Promise<DiaryUpdate> {
  const body = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 300,
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            diary_text: { type: "string" },
            updated_summary: { type: "string" },
          },
          required: ["diary_text", "updated_summary"],
          additionalProperties: false,
        },
      },
    },
    messages: [{ role: "user", content: user }],
  };

  const response = await client.send(
    new InvokeModelCommand({
      modelId: MODEL_ID,
      body: JSON.stringify(body),
      contentType: "application/json",
      accept: "application/json",
    })
  );
  const parsed = JSON.parse(Buffer.from(response.body).toString("utf-8")) as TextResponseBody;
  const text = extractText(parsed);
  const parsedJson = JSON.parse(text) as { diary_text: string; updated_summary: string };
  return { diaryText: parsedJson.diary_text, updatedSummary: parsedJson.updated_summary };
}
```

- [ ] **Step 5: 執行測試確認通過**

Run: `cd server && npm test -- bedrockClient`
Expected: `3 passed`

- [ ] **Step 6: 寫手動 smoke script（真的打 Bedrock 一次，確認 model access／region／回應格式正確）**

```typescript
// server/scripts/smokeBedrock.ts
import { createBedrockClient, generateBeatText } from "../src/bedrockClient";

async function main() {
  const client = createBedrockClient();
  const text = await generateBeatText(
    client,
    "你是「股伴」，一隻陪伴使用者觀察 2025 年台股市場的溫暖電子寵物。回覆 1-3 句繁體中文短句。",
    "今天模擬日期：2025/01/06\n已確認事實：外資買賣超 +847.96 張（由賣轉買）\n請生成股伴此刻要說的一句話。"
  );
  console.log("Bedrock replied:", text);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 7: 手動執行一次確認能連上 Bedrock**

Run: `cd server && npm run smoke:bedrock`
Expected: 印出 `Bedrock replied: ...` 加上一句繁體中文短句（需要 AWS 憑證已設定好、`us.anthropic.claude-sonnet-4-6` 有存取權限）

- [ ] **Step 8: Commit**

```bash
git add server/src/bedrockClient.ts server/scripts/smokeBedrock.ts server/test/fakeBedrockClient.ts server/test/bedrockClient.test.ts
git commit -m "feat(server): call Bedrock Sonnet 4.6 for beat text and structured diary updates"
```

---

### Task 7: Express 路由整合（app.ts + index.ts）

**Files:**
- Create: `server/src/app.ts`
- Create: `server/src/index.ts`
- Test: `server/test/app.test.ts`

**Interfaces:**
- Consumes: 全部前面的模組——`CsvDataset`／`pickRandomDate` from `./csvData`；`computeFact`／`factToSummaryLine` from `./factEngine`；`buildBeatPrompt` from `./promptBuilder`；`DocClientLike`／`loadUserState`／`saveUserState`／`appendRecentEvent`／`createDocClient` from `./memoryStore`；`InvokeClientLike`／`generateBeatText`／`generateDiaryUpdate`／`createBedrockClient` from `./bedrockClient`；`MAIN_ORDER`／`BeatId`／`BeatRequestBody` from `./types`
- Produces: `AppDependencies`、`createApp(deps): express.Express` — `index.ts` 使用這個建立真的伺服器；此為整個後端功能的最終組裝點，之後沒有 task 再 import 它。

- [ ] **Step 1: 寫 `server/test/app.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { loadFixtureDataset } from "./fixtures";
import { FakeDocClient } from "./fakeDocClient";
import { fakeBedrockClient } from "./fakeBedrockClient";
import type { InvokeClientLike } from "../src/bedrockClient";

describe("POST /api/session/start", () => {
  it("returns a date from the available dataset, mainIndex 0, and visitCount 1 on first visit", async () => {
    const dataset = loadFixtureDataset();
    const app = createApp({ dataset, doc: new FakeDocClient(), bedrock: fakeBedrockClient("hi") });

    const response = await request(app).post("/api/session/start").send({});

    expect(response.status).toBe(200);
    expect(dataset.availableDates).toContain(response.body.currentDate);
    expect(response.body.mainIndex).toBe(0);
    expect(response.body.visitCount).toBe(1);
  });
});

describe("POST /api/beat", () => {
  it("returns generated text and the computed FactBlock for the feet beat", async () => {
    const dataset = loadFixtureDataset();
    const doc = new FakeDocClient();
    const app = createApp({ dataset, doc, bedrock: fakeBedrockClient("法人今天悄悄往外走了一步。") });

    await request(app).post("/api/session/start").send({});
    const response = await request(app).post("/api/beat").send({ beat: "feet" });

    expect(response.status).toBe(200);
    expect(response.body.text).toBe("法人今天悄悄往外走了一步。");
    expect(response.body.fact.title).toBe("法人動向");
  });

  it("advances mainIndex after a main-path beat completes", async () => {
    const dataset = loadFixtureDataset();
    const doc = new FakeDocClient();
    const app = createApp({ dataset, doc, bedrock: fakeBedrockClient("...") });

    await request(app).post("/api/session/start").send({});
    await request(app).post("/api/beat").send({ beat: "ground" });
    const secondStart = await request(app).post("/api/session/start").send({});

    expect(secondStart.body.mainIndex).toBe(1);
  });

  it("returns HTTP 500 with an error message when Bedrock fails", async () => {
    const dataset = loadFixtureDataset();
    const doc = new FakeDocClient();
    const failingBedrock: InvokeClientLike = {
      async send() {
        throw new Error("AccessDeniedException");
      },
    };
    const app = createApp({ dataset, doc, bedrock: failingBedrock });

    await request(app).post("/api/session/start").send({});
    const response = await request(app).post("/api/beat").send({ beat: "feet" });

    expect(response.status).toBe(500);
    expect(response.body.error).toContain("連線失敗");
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `cd server && npm test -- app.test`
Expected: FAIL — `Cannot find module '../src/app'`

- [ ] **Step 3: 實作 `server/src/app.ts`**

```typescript
import express from "express";
import cors from "cors";
import type { CsvDataset } from "./csvData";
import { pickRandomDate } from "./csvData";
import { computeFact, factToSummaryLine } from "./factEngine";
import { buildBeatPrompt } from "./promptBuilder";
import { loadUserState, saveUserState, appendRecentEvent } from "./memoryStore";
import type { DocClientLike } from "./memoryStore";
import { generateBeatText, generateDiaryUpdate } from "./bedrockClient";
import type { InvokeClientLike } from "./bedrockClient";
import { MAIN_ORDER, type BeatRequestBody } from "./types";

export interface AppDependencies {
  dataset: CsvDataset;
  doc: DocClientLike;
  bedrock: InvokeClientLike;
}

export function createApp(deps: AppDependencies) {
  const { dataset, doc, bedrock } = deps;
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.post("/api/session/start", async (_req, res) => {
    try {
      const existing = await loadUserState(doc);
      const state = {
        ...existing,
        currentDate: pickRandomDate(dataset),
        visitCount: existing.visitCount + 1,
      };
      await saveUserState(doc, state);
      res.json({
        currentDate: state.currentDate,
        mainIndex: state.mainIndex,
        visitCount: state.visitCount,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "連線失敗，請確認後端伺服器" });
    }
  });

  app.post("/api/beat", async (req, res) => {
    const { beat, choice } = req.body as BeatRequestBody;
    try {
      const state = await loadUserState(doc);
      const fact = computeFact(dataset, beat, state.currentDate);
      const { system, user } = buildBeatPrompt(beat, state.currentDate, fact, state, choice);

      let text: string;
      let nextState = state;

      if (beat === "diary") {
        const result = await generateDiaryUpdate(bedrock, system, user);
        text = result.diaryText;
        nextState = { ...state, summary: result.updatedSummary };
      } else {
        text = await generateBeatText(bedrock, system, user);
      }

      nextState = appendRecentEvent(nextState, {
        date: state.currentDate,
        beat,
        choice: choice ?? null,
        fact: factToSummaryLine(fact),
        textExcerpt: text.slice(0, 40),
      });

      const beatIndex = MAIN_ORDER.indexOf(beat);
      if (beatIndex >= 0) {
        nextState.mainIndex = beatIndex + 1;
      }
      await saveUserState(doc, nextState);

      res.json({ text, fact });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "連線失敗，請確認後端伺服器" });
    }
  });

  return app;
}
```

- [ ] **Step 4: 實作 `server/src/index.ts`**

```typescript
import { createApp } from "./app";
import { loadCsvDataFromDir } from "./csvData";
import { createDocClient } from "./memoryStore";
import { createBedrockClient } from "./bedrockClient";

const PORT = 3001;
const REGION = "us-east-1";
const DATA_DIR = new URL("../../Delivery_Hackathon_DataPackage_20260624", import.meta.url).pathname;

const dataset = loadCsvDataFromDir(DATA_DIR);
const doc = createDocClient(REGION);
const bedrock = createBedrockClient(REGION);

const app = createApp({ dataset, doc, bedrock });

app.listen(PORT, () => {
  console.log(`StockMate server listening on http://localhost:${PORT}`);
});
```

- [ ] **Step 5: 執行測試確認通過**

Run: `cd server && npm test -- app.test`
Expected: `4 passed`

- [ ] **Step 6: 手動啟動伺服器確認能連上真實 Bedrock／DynamoDB**

Run: `cd server && npm run dev`
Expected: 印出 `StockMate server listening on http://localhost:3001`；另開一個 terminal 執行 `curl -X POST http://localhost:3001/api/session/start` 應回傳 JSON（含 `currentDate` 是 243 個交易日之一）

- [ ] **Step 7: Commit**

```bash
git add server/src/app.ts server/src/index.ts server/test/app.test.ts
git commit -m "feat(server): wire session/beat routes through Bedrock, DynamoDB, and CSV facts"
```

---

### Task 8: 前端 API Client（apiClient.ts）

**Files:**
- Create: `prototype/src/game/apiClient.ts`
- Modify: `prototype/package.json`
- Create: `prototype/vitest.config.ts`
- Test: `prototype/test/apiClient.test.ts`

**Interfaces:**
- Consumes: `FactBlock` from `./story`（既有型別）
- Produces: `SessionStartResponse`、`BeatResponse`、`startSession(): Promise<SessionStartResponse>`、`getBeatDialogue(beat: string, choice?: string): Promise<BeatResponse>` — Task 9（RoomScene.ts）會 import。

- [ ] **Step 1: 在 `prototype/package.json` 加入 Vitest**

Modify `prototype/package.json` — 在 `"scripts"` 加入 `"test": "vitest run"`，在 `"devDependencies"` 加入 `"vitest": "^2.1.0"`：

```json
{
  "name": "prototype",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "devDependencies": {
    "typescript": "~6.0.2",
    "vite": "^8.1.1",
    "vitest": "^2.1.0"
  },
  "dependencies": {
    "phaser": "^4.2.1"
  }
}
```

- [ ] **Step 2: 安裝依賴**

Run: `cd prototype && npm install`
Expected: 無錯誤訊息

- [ ] **Step 3: 建立 `prototype/vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
});
```

- [ ] **Step 4: 寫 `prototype/test/apiClient.test.ts`**

```typescript
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
```

- [ ] **Step 5: 執行測試確認失敗**

Run: `cd prototype && npm test -- apiClient`
Expected: FAIL — `Cannot find module '../src/game/apiClient'`

- [ ] **Step 6: 實作 `prototype/src/game/apiClient.ts`**

```typescript
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
```

- [ ] **Step 7: 執行測試確認通過**

Run: `cd prototype && npm test -- apiClient`
Expected: `3 passed`

- [ ] **Step 8: Commit**

```bash
git add prototype/package.json prototype/vitest.config.ts prototype/src/game/apiClient.ts prototype/test/apiClient.test.ts
git commit -m "feat(prototype): add apiClient wrapping the session/beat backend endpoints"
```

---

### Task 9: RoomScene 串接後端（改為非同步 showStep）

**Files:**
- Modify: `prototype/src/game/RoomScene.ts`

**Interfaces:**
- Consumes: `startSession`／`getBeatDialogue` from `./apiClient`（Task 8）；既有的 `DIALOGUE`／`MAIN_ORDER`／`QUIET_MS`／`GazeTarget`／`StoryStep` from `./story`
- Produces: 無新 export——這是整合的最後一塊拼圖，`UIScene.ts` 完全不需要修改。

- [ ] **Step 1: 在檔案開頭加入 `apiClient` 的 import**

修改 `prototype/src/game/RoomScene.ts` 第 1-14 行，在既有 import 之後加入一行：

```typescript
import Phaser from "phaser";
import { Companion } from "./Companion";
import {
  COMPANION_BASE_SCALE,
  COMPANION_SIT,
  GAZE_POINTS,
} from "./roomData";
import {
  DIALOGUE,
  MAIN_ORDER,
  QUIET_MS,
  type GazeTarget,
  type StoryStep,
} from "./story";
import { startSession, getBeatDialogue } from "./apiClient";
```

- [ ] **Step 2: 加入 `serverMainIndex` 欄位**

修改第 32-34 行（原本 `private step`／`busy`／`mainIndex` 三個欄位），在後面加一行：

```typescript
  private step: StoryStep = "arrival";
  private busy = false;
  private mainIndex = 0;
  private serverMainIndex = 0;
```

- [ ] **Step 3: `create()` 結尾改成先呼叫 `startSession()` 再顯示 arrival**

原本第 72 行：

```typescript
    this.time.delayedCall(700, () => this.showStep("arrival"));
```

改成：

```typescript
    startSession()
      .then((session) => {
        this.serverMainIndex = session.mainIndex;
      })
      .catch(() => {
        this.serverMainIndex = 0;
      })
      .finally(() => {
        this.time.delayedCall(700, () => this.showStep("arrival"));
      });
```

- [ ] **Step 4: `showStep()` 改為非同步呼叫後端，取代直接讀取 `d.text`／`d.fact`**

原本第 77-91 行：

```typescript
  private showStep(step: StoryStep): void {
    this.step = step;
    this.busy = false;
    const d = DIALOGUE[step];
    this.setGaze(d.gaze ?? "none");

    this.game.events.emit("ui:dialogue", {
      speaker: d.speaker ?? "小伴",
      beat: d.beat,
      beatTotal: d.beat != null ? 8 : undefined,
      text: d.text,
      fact: d.fact,
      choices: d.choices,
    });
  }
```

改成：

```typescript
  private showStep(step: StoryStep, choice?: string): void {
    this.step = step;
    this.busy = true;
    const d = DIALOGUE[step];
    this.setGaze(d.gaze ?? "none");

    getBeatDialogue(step, choice)
      .then((response) => {
        this.busy = false;
        this.game.events.emit("ui:dialogue", {
          speaker: d.speaker ?? "小伴",
          beat: d.beat,
          beatTotal: d.beat != null ? 8 : undefined,
          text: response.text,
          fact: response.fact,
          choices: d.choices,
        });
      })
      .catch((error: Error) => {
        this.busy = false;
        this.game.events.emit("ui:dialogue", {
          speaker: d.speaker ?? "小伴",
          beat: d.beat,
          beatTotal: d.beat != null ? 8 : undefined,
          text: error.message,
          choices: d.choices,
        });
      });
  }
```

- [ ] **Step 5: `onChoice()` 把選到的 `id` 傳進 `showStep()`，`look` 選項改用伺服器回傳的 `serverMainIndex` 接續進度**

原本第 93-140 行：

```typescript
  private onChoice = (id: string) => {
    if (this.busy) return;

    if (this.step === "arrival") {
      if (id === "sit") {
        this.showStep("sit_reply");
        return;
      }
      if (id === "look") {
        this.mainIndex = 0;
        this.showStep(MAIN_ORDER[0]);
        return;
      }
    }

    if (this.step === "sit_reply" && id === "quiet") {
      this.enterQuietThen(() => this.showStep("diary"));
      return;
    }

    // Main path linear continues
    if (id === "next") {
      this.advanceMain();
      return;
    }

    // Reflect four options — all land on diary
    if (this.step === "reflect") {
      this.showStep("diary");
      return;
    }

    if (this.step === "diary" && id === "leave") {
      this.enterQuietThen(() => this.showStep("rest"));
      return;
    }

    if (this.step === "rest") {
      if (id === "again") {
        this.mainIndex = 0;
        this.showStep("arrival");
        return;
      }
      if (id === "sit_again") {
        this.showStep("sit_reply");
      }
    }
  };
```

改成：

```typescript
  private onChoice = (id: string) => {
    if (this.busy) return;

    if (this.step === "arrival") {
      if (id === "sit") {
        this.showStep("sit_reply", id);
        return;
      }
      if (id === "look") {
        this.mainIndex = this.serverMainIndex;
        this.showStep(MAIN_ORDER[this.mainIndex], id);
        return;
      }
    }

    if (this.step === "sit_reply" && id === "quiet") {
      this.enterQuietThen(() => this.showStep("diary", id));
      return;
    }

    // Main path linear continues
    if (id === "next") {
      this.advanceMain(id);
      return;
    }

    // Reflect four options — all land on diary
    if (this.step === "reflect") {
      this.showStep("diary", id);
      return;
    }

    if (this.step === "diary" && id === "leave") {
      this.enterQuietThen(() => this.showStep("rest", id));
      return;
    }

    if (this.step === "rest") {
      if (id === "again") {
        this.mainIndex = 0;
        this.showStep("arrival", id);
        return;
      }
      if (id === "sit_again") {
        this.showStep("sit_reply", id);
      }
    }
  };
```

- [ ] **Step 6: `advanceMain()` 一併帶入 `choice`**

原本第 142-151 行：

```typescript
  private advanceMain(): void {
    const i = MAIN_ORDER.indexOf(this.step as (typeof MAIN_ORDER)[number]);
    if (i < 0) return;
    if (i >= MAIN_ORDER.length - 1) {
      this.showStep("rest");
      return;
    }
    this.mainIndex = i + 1;
    this.showStep(MAIN_ORDER[this.mainIndex]);
  }
```

改成：

```typescript
  private advanceMain(choice: string): void {
    const i = MAIN_ORDER.indexOf(this.step as (typeof MAIN_ORDER)[number]);
    if (i < 0) return;
    if (i >= MAIN_ORDER.length - 1) {
      this.showStep("rest", choice);
      return;
    }
    this.mainIndex = i + 1;
    this.showStep(MAIN_ORDER[this.mainIndex], choice);
  }
```

- [ ] **Step 7: 型別檢查確認沒有編譯錯誤**

Run: `cd prototype && npx tsc --noEmit`
Expected: 無輸出（無型別錯誤）

- [ ] **Step 8: 手動端到端驗證**

先啟動後端：`cd server && npm run dev`（另一個 terminal）
再啟動前端：`cd prototype && npm run dev`，用瀏覽器開啟顯示的網址

Expected：
- 進入畫面後短暫顯示「陪我看一下」／「今天只想坐坐」，點「陪我看一下」後，對話卡短暫顯示等待（因為在等 Bedrock 回應），接著顯示 LLM 生成的台詞而非 `story.ts` 裡原本寫死的文字
- 打開瀏覽器 DevTools Network tab，確認每次進入 beat 都有打 `POST http://localhost:3001/api/beat`
- 走到 `feet`／`scale`／`radio`／`diary` beat 時，對話卡下方有出現事實區塊（`FactBlock`）
- 關閉後端伺服器後重新整理頁面走一次流程，確認對話卡改成顯示「連線失敗，請確認後端伺服器」而不是白畫面或例外

- [ ] **Step 9: Commit**

```bash
git add prototype/src/game/RoomScene.ts
git commit -m "feat(prototype): fetch beat dialogue from backend instead of static story.ts text"
```

---

### Task 10: 端到端驗證與跨場次記憶確認（手動）

**Files:**
- 無新檔案——這是一個純驗證 task，確認 Task 1-9 組裝起來的整體行為符合設計文件的第 5／6／11 節。

**Interfaces:**
- 無

- [ ] **Step 1: 確認 DynamoDB 表格內容**

Run:
```bash
source /private/tmp/claude-502/-Users-amikai-Workspace-0714-hackathon-cmoney-aws-summit-hackathon/90e8902a-bb4c-424a-acc8-0591298d1230/scratchpad/venv/bin/activate
python3 -c "
import boto3
table = boto3.resource('dynamodb', region_name='us-east-1').Table('StockMateUserState')
print(table.get_item(Key={'user_id': 'demo_user'}).get('Item'))
"
```
Expected：印出一個包含 `current_date`／`main_index`／`summary`／`recent_events`／`visit_count` 的 dict（在 Task 9 Step 8 跑過至少一輪對話之後才會有資料）

- [ ] **Step 2: 驗證跨場次記憶——連續開兩個場次，確認第二次場次的 prompt 有帶到第一次的記憶**

在後端 `server/src/index.ts` 的 `app.listen` 之前暫時加一行 `console.log` 觀察 `buildBeatPrompt` 組出的 `user` 字串（或直接看 Bedrock 呼叫前的 log），依序：
1. 完整跑完一輪 8-beat 主線到 `diary`（讓 `summary` 被更新）
2. 重新整理瀏覽器頁面（模擬重開一個新場次）
3. 觀察第二次場次 `arrival` 之後選「陪我看一下」時，`/api/beat` 的 request 是否從 `MAIN_ORDER[serverMainIndex]`（而不是永遠從 `ground`）開始
4. 觀察後端 log 中的 prompt，確認「長期記憶摘要」欄位不是空的，且內容反映第一次場次發生的事

Expected：第二場次是從上次中斷的 beat 接續，且 prompt 裡的長期記憶摘要非空

- [ ] **Step 3: 驗證隨機日期**

連續開 3-4 個新場次（重新整理瀏覽器），觀察後端 log 或 DynamoDB 裡的 `current_date`，確認不是每次都一樣（隨機抽樣，允許小機率抽到重複）

- [ ] **Step 4: 執行全部自動化測試，確認整體沒有迴歸**

Run:
```bash
cd server && npm test
cd ../prototype && npm test
```
Expected：兩邊都是全部 pass

- [ ] **Step 5: 在 README 或 commit message 記錄如何啟動完整系統（給後續開發者/隊友）**

在 repo 根目錄新增 `server/README.md`：

```markdown
# StockMate Server

## 啟動

\`\`\`bash
cd server
npm install
npm run setup:dynamodb   # 第一次執行，建立 DynamoDB table（冪等，可重複執行）
npm run dev              # 啟動於 http://localhost:3001
\`\`\`

需要本機已設定好可存取 Bedrock（`us.anthropic.claude-sonnet-4-6`）與 DynamoDB 的 AWS 憑證（`us-east-1`）。

## 測試

\`\`\`bash
npm test
\`\`\`
```

- [ ] **Step 6: Commit**

```bash
git add server/README.md
git commit -m "docs(server): add startup instructions for the Bedrock dialogue backend"
```
