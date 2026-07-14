# 2D 插畫小屋：Demo 原型設計規格

> 文件狀態：已確認的實作設計（取代 `graybox-implementation-plan.md` 的 3D 灰盒路線）
> 對應文件：`product-concept.md`、`primary-user-journey.md`、`llm-experience-strategy.md`
> 決策日期：2026-07-14（demo 前一天內）
> 決策：呈現方式採 2D 插畫，不做 3D

## 1. 決策背景與理由

限制條件：

- 可開發時間不足一天。
- 單人開發（使用者 + Claude）。
- Demo 形式為台上投影、自行操作。
- 主要疑慮：3D 開發成本太高，一天內無法完成流程。

決策理由：

- 產品北極星是「溫暖、安定、陪伴感」，不是技術展示。一天內 2D 插畫的質感天花板遠高於 3D 灰盒；幾何體小伴傳達不出陪伴感。
- 移除 WebGL 相容性、效能與鏡位風險，台上 demo 更穩。
- 省下的時間用來完成完整 8 格 Storyboard（3D 路線只能做前三格）。

## 2. 唯一交付物

一個可在桌機瀏覽器開啟的 Web 頁面：

- 單一固定構圖的 2D 插畫小屋。
- 中央有會呼吸、眨眼、移動的 2D 角色「小伴」。
- `CALM` / `STORM` 兩種市場狀態，STORM 時窗外變天、室內暖光增強。
- 完整走完 primary-user-journey 的 8 格 Storyboard，含「今天只想坐坐」分支。
- 所有市場內容來自單一靜態 Demo JSON（2025/04/09 的 0050）。

## 3. 技術選擇

- Next.js + TypeScript + Tailwind CSS + Framer Motion。
- 全新目錄 `prototype-2d/`，不沿用也不修改 `prototype_t/`。
- 場景為分層 SVG 元件，動畫只用 transform 與 opacity。
- 單一 `useReducer` 狀態機管理體驗流程。
- 不需要：後端、資料庫、登入、LLM 呼叫、R3F/Three.js、狀態管理套件。

### 不接 LLM 的說明

台詞全部使用文件中已定稿的文案模板。`llm-experience-strategy.md` 本就規定 LLM 失敗時退回模板且不得阻塞流程；Demo 直接以模板路徑呈現，LLM 架構於 pitch 中說明。

## 4. 場景佈局

橫向構圖，投影友善：

```text
[窗＋雨＋窗簾]   [牆上路線圖]   [收音機]
                 [小伴・中央]
[門口大腳印]                  [書桌＋日記]
```

元件樹：

```text
Scene
├── Sky / Rain（窗外天色與雨滴粒子）
├── Window（窗框、窗簾）
├── Room（牆、地板、暖燈光暈）
├── Radio / PlanMap / Footprints / Desk（可點擊物件）
├── Companion（小伴）
└── DialoguePanel（台詞與 2–4 個選項）
```

### 市場狀態

```ts
type MarketState = "CALM" | "STORM";
```

- `CALM`：窗外明亮霧藍、雨關閉或極弱、室內柔和奶油光。
- `STORM`：窗外深霧藍、雨滴與窗簾擺動增加（有上限）、室內暖琥珀光增強（放射漸層）、UI 一次只顯示一個主要選擇。
- 禁止：全畫面紅色、閃爍、倒數、災難感。

色彩沿用 product-concept 第 18 節：奶油白、溫暖米色、鼠尾草綠、霧藍、暖琥珀、柔和珊瑚。

## 5. 小伴角色與動畫

SVG 圓潤生物：身體橢圓、頭、耳朵、眼睛，輪廓穩定、不做毛髮與複雜表情。

動畫清單（皆為 transform/opacity）：

| 動畫 | 內容 |
|---|---|
| `breathe` | 縮放循環，常駐 |
| `blink` | 眼皮開合 |
| `approach` | 位移＋放大靠近 |
| `close_window` | 移到窗邊、窗簾下降 |
| `sit_together` | 坐下、靠近鏡頭 |
| `inspect` | 拿放大鏡蹲在腳印旁 |
| `write_diary` | 移到書桌書寫 |

`prefers-reduced-motion` 時動畫改為淡入淡出，流程仍可完成。

## 6. 體驗流程：完整 8 格

依 `primary-user-journey.md` 的 Storyboard：

```text
ARRIVAL（抵達，先被接住）
  → GROUNDING（關窗、遞熱飲）
  → PLAN_RECALL（牆上路線圖，明天是投入日）
  → RADIO_EXPLORE（196 則發文，多數中性）
  → FOOTPRINT_EXPLORE（法人連續三日賣超）
  → TIMESCALE（一週 -16.9% vs 十年計畫）
  → REFLECTION（四個反思選項，無正解）
  → DIARY（共同日記、安心離開）→ REST
```

分支：`ARRIVAL → SIT_TOGETHER → REST`（今天只想坐坐，不再推送資料）。
任何狀態都可選「今天先到這裡」直接進入 REST。

實作順序按格數推進，每一格結尾都是完整可 demo 的狀態；時間不足時砍後面的格數，不砍品質。

## 7. 資料

單一靜態 JSON，內容同 graybox 計畫第 2 節（2025/04/09、0050、跌 4.6%、週報酬 -16.93%、法人賣超 42,058.918 張、論壇 196 則/看多 65/看空 10/中性 121、每月 10 日投入 5,000 元）。

介面角落低調標示：

> 2025 模擬市場 · 現在是 2025/12/31

## 8. 明確不做

- 3D 與 R3F。
- 視差 2.5D（僅為全部完成後的 stretch goal）。
- LLM 呼叫。
- 手機版精修（投影為桌機比例，手機能看即可）。
- 換裝、養成、商城、多標的、多日期、即時行情、後端。

## 9. 驗收標準

1. 桌機瀏覽器可直接開啟，第一眼先看到小伴。
2. CALM/STORM 可切換，STORM 安定而不災難。
3. 小伴至少具備呼吸、眨眼、靠近、關窗、陪坐。
4. 主線 8 格可完整走完，陪坐分支不追加問題。
5. 所有數字來自單一 Demo JSON。
6. 減少動態效果後流程仍可完成。
7. 90–180 秒內可在台上走完主線。
