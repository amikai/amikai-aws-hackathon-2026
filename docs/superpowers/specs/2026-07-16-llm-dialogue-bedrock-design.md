# 股伴對話 LLM 動態生成設計（Bedrock + DynamoDB）

## 1. 目標

把 `prototype/` 現有的 8-beat 固定劇本對話（`story.ts` 裡寫死的文字）改成由 **Claude Sonnet 4.6（透過 Amazon Bedrock）** 即時生成，並具備跨場次的長期記憶，讓股伴的回覆能根據：

- 當次場次隨機抽到的交易日之真實市場資料（法人動向、論壇情緒等）
- 玩家過去做過的選擇與累積的互動記憶

而每次不重複、有個人化感受。8-beat 的**流程本身不變**（beat 順序、分支選項按鈕的文字/id 全部維持現狀），只有股伴的台詞內容改為動態生成。

## 2. 背景與限制

- `prototype/` 是純前端 Vite + Phaser + TypeScript 專案，目前無任何後端、無 `.env`、無網路呼叫（詳見專案探索紀錄）。
- AWS 帳號（`WSParticipantRole`，us-east-1）已驗證可透過 Bedrock 存取 `us.anthropic.claude-sonnet-4-6`（cross-region inference profile），但 `claude-sonnet-5`／`claude-opus-4-8/4-7`／`claude-fable-5` 目前皆為 `AccessDeniedException`。本設計固定使用 **`us.anthropic.claude-sonnet-4-6`**。
- 真實資料來源為 `Delivery_Hackathon_DataPackage_20260624/` 下的 CSV，固定只使用股票代號 **0050**。時間基準為「2025 全年為這個世界的一整年」，`02_Institutional_Trading_2025.csv` 等逐日資料涵蓋 **243 個交易日**（2025/01/02 ～ 2025/12/31）。
- 不可將 AWS 憑證暴露在瀏覽器端 —— 因此必須新增一個本機後端服務作為 Bedrock 與 DynamoDB 的呼叫代理層。

## 3. 整體架構

```
┌─────────────────────────┐         ┌──────────────────────────────┐
│  前端 (Phaser + Vite)     │  HTTP   │  後端 (本機 Node/Express)       │
│  prototype/src/          │────────▶│  server/                     │
│                          │◀────────│                              │
│  RoomScene.showStep()   │  JSON   │  ├─ csvData.ts (載入/查詢CSV)  │
│  → 呼叫 apiClient         │         │  ├─ factEngine.ts (算確定性事實)│
│  → 顯示 loading (busy)    │         │  ├─ promptBuilder.ts          │
│  → 收到台詞後 emit         │         │  ├─ bedrockClient.ts          │
│    ui:dialogue           │         │  ├─ memoryStore.ts (DynamoDB) │
└─────────────────────────┘         │  └─ index.ts (Express routes) │
                                     └──────────┬───────────────────┘
                                                │
                                    ┌───────────┴────────────┐
                                    ▼                        ▼
                          Amazon Bedrock              Amazon DynamoDB
                          us.anthropic.claude-        （demo_user 進度
                          sonnet-4-6                    + 長期記憶）
```

CSV 資料（僅 0050 需要的欄位/整年資料）在後端伺服器啟動時一次性載入記憶體，避免每次請求重新解析檔案。

## 4. 核心決策：逐 beat 即時生成

每次玩家進入一個 beat（或做出選擇後進入下一個 beat），前端才呼叫後端生成該 beat 的台詞，而非在場次開始時一次生成全部 8 個 beat。

**理由：** 只有逐 beat 生成才能把玩家「實際做的選擇」即時餵給 LLM，讓下一句話真正回應玩家剛才的反應；若整場一次生成，要嘛得預先生成所有分支的台詞（浪費 token 且無法回應真實選擇），要嘛得預先猜測玩家會選哪條路，個人化程度打折。單次呼叫小、延遲低，也更適合搭配既有的 `busy` loading 狀態。

已排除「前端直接呼叫 Bedrock」的方案，因為會把 AWS 憑證暴露在瀏覽器。

## 5. 日期選取邏輯

- 每次開新場次（呼叫 `POST /api/session/start`）時，後端從 `02_Institutional_Trading_2025.csv` 的 243 個不重複交易日中**隨機抽一天**，設為這個場次的 `current_date`。
- 該場次全部 8 個 beat（及分支步驟）都引用**同一天**的真實資料，確保單一場次內的敘事一致（法人腳印、論壇情緒、價格波動都對應同一個真實市場事件）。
- 8-beat 主線的進度（`main_index`，即玩家目前跑到第幾個 beat）**跨場次持續累積**，與隨機抽到的日期是兩件獨立的事：例如上次玩到第 3 個 beat 就跳出，下次開新場次只是抽到不同的隨機日期，但仍從第 4 個 beat 接續往下跑。
- 之所以用隨機而非依時間序推進，是為了方便 demo 時能快速看到不同天的資料對比，不需要等待逐日推進。

## 6. DynamoDB Schema

單一 table，Partition Key 為 `user_id`。本專案為單一使用者展示情境，固定值 `"demo_user"`，不需要登入/註冊。

```json
{
  "user_id": "demo_user",
  "current_date": "20250106",
  "visit_count": 3,
  "main_index": 2,
  "summary": "使用者對法人連續賣超感到擔心，但堅持定期投資計畫，傾向先觀察不躁動。",
  "recent_events": [
    {
      "date": "20250102",
      "beat": "feet",
      "choice": "next",
      "fact": "外資買賣超 -7070.6 張（賣超），已連續 3 天同方向賣超",
      "text_excerpt": "法人今天悄悄往外走了一步..."
    },
    {
      "date": "20250103",
      "beat": "plan",
      "choice": "next",
      "fact": "使用者的定期投資計畫：每月10日投入新台幣5,000元",
      "text_excerpt": "書櫃那邊的路線，我們依然約好了。"
    }
  ],
  "updated_at": "2026-07-16T08:12:00Z"
}
```

| 欄位 | 用途 |
|---|---|
| `current_date` | 本場次隨機抽到、用來查 CSV 的交易日 |
| `main_index` | 玩家目前跑到 8-beat 主線的第幾步，跨場次接續 |
| `recent_events` | 只保留**最近 N 天**（預設 N=5）的完整事件，含玩家實際選擇、當天確定性事實（**壓縮成單行文字**，供下次 prompt 當記憶用，與回傳給前端的 `FactBlock` 結構是兩回事）、生成文字摘錄。超過 N 筆時，把最舊的一筆從陣列移除。 |
| `summary` | 被擠出 `recent_events` 的舊事件，濃縮成一句自然語言記憶摘要，避免 prompt 隨天數增加無限變長 |

**摘要更新時機：** 不額外多打一次 Bedrock。在每次玩到 `diary`（日記）beat 時，用 **Structured Output** 讓 Sonnet 4.6 一次回傳兩個欄位：`diary_text`（要顯示的日記台詞）與 `updated_summary`（把這次事件併入摘要後的新版本），與台詞生成同一次 API 呼叫完成。

## 7. 後端 API 設計

只需要兩支 API，且都只服務單一固定的 `demo_user`。

### `POST /api/session/start`
- 不需要 request body
- 動作：讀取（或初始化）DynamoDB 上 `demo_user` 的記錄 → 從 243 個交易日中隨機抽一天設為 `current_date` → 寫回 DynamoDB
- 回傳：`{ current_date, resume_beat, visit_count }`
  - `resume_beat` 依 `main_index` 對應到前端 `story.ts` 的 `MAIN_ORDER`，讓玩家從上次中斷的 beat 接續

### `POST /api/beat`
- Request：`{ beat: string, choice?: string }`（`choice` 是玩家在上一個 beat 選的按鈕 id；第一個 beat 沒有）
- 動作：
  1. 讀取 DynamoDB 目前的 `current_date`／`summary`／`recent_events`
  2. 依「beat → CSV 來源」對照表（完整列表見第 8.2 節），用 `factEngine` 算出這個 beat 需要的確定性事實
  3. 用 `promptBuilder` 組出完整 prompt（見第 8 節）
  4. 呼叫 `us.anthropic.claude-sonnet-4-6`；若 `beat === "diary"`，改用 Structured Output 要求回傳 `{diary_text, updated_summary}`
  5. 更新 DynamoDB：把本次事件塞進 `recent_events`（超過 N 筆丟最舊）、更新 `main_index`；`diary` beat 額外覆寫 `summary`
- 回傳：`{ text, fact }` — `fact` 是第 2 步算出的**確定性事實**，型別為 `story.ts` 既有的 `FactBlock`（`{title: string, lines: string[]}`，非 LLM 生成、無 fact 的 beat 則為 `undefined`），前端直接塞進既有 `DialoguePayload.fact`
- 失敗（Bedrock 逾時／`AccessDeniedException`／限流／DynamoDB 錯誤）→ 回 HTTP 500 並帶錯誤訊息文字

選項按鈕的文字與 id 完全留在前端 `story.ts` 的 `DIALOGUE[step].choices`，後端不接觸，維持 API 輕薄。

## 8. Prompt 設計

### 8.1 系統提示詞（所有 beat 共用，加上 `cache_control` 做 Prompt Caching）

```
你是「股伴」，一隻陪伴使用者觀察 2025 年台股市場的溫暖電子寵物。
規則：
- 只能根據我提供的「已確認事實」說話，不能自己編造或誇大數字
- 不給投資建議、不做漲跌預測，你的角色是陪伴與翻譯，不是分析師
- 不要把法人買賣超包裝成「聰明錢」要使用者跟隨——法人只是線索之一
- 語氣：好奇、溫暖、平靜，像朋友在旁邊陪著看，不是教學或說教
- 每次回覆 1-3 句繁體中文短句，適合顯示在對話卡（不要長篇大論）
- 若記憶摘要顯示使用者曾經表達擔心/堅定等情緒，要延續而非忽略
```

### 8.2 每個 beat 的敘事目標與事實來源

**修正說明：** 依實際 `prototype/src/game/story.ts` 的 `DIALOGUE`／`MAIN_ORDER` 內容核對後，beat 對應的資料來源與先前草稿不同——法人動向實際對應的是 `feet` beat（既有文案「門口方向，像是有人連續往外走了幾天」對應 `DEMO.institutionalSellLots`／`institutionalSellDays`），`scale` beat 對應的是週報酬率與當日漲跌幅的兩個時間尺比較，`ground` beat 目前完全沒有 fact block。以下為修正後、與現有程式碼一致的對照表：

| beat | 敘事目標 | 事實來源 |
|---|---|---|
| `arrival` | 開場問候，帶入今天是隨機抽到的哪一天 | 無 |
| `ground` | 延續現有文案語氣（不用一次看完，慢慢來），無新事實 | 無 |
| `plan` | 回顧使用者的定期投資計畫，給予安定感 | 產品設定（每月10日投入5,000元，非 CSV） |
| `radio` | 轉述論壇聲音的多空氛圍（強調非一致） | `10_Forum_Posts_Replies_Daily_Stats_2025.csv` |
| `feet` | 描述法人買賣超方向與連續性（既有「門口大腳印」意象） | `02_Institutional_Trading_2025.csv`（含連續同方向買賣超天數計算） |
| `scale` | 比較「當日」與「近一週」兩個時間尺度的報酬，安定情緒 | `03_Return_Rate_2025.csv`（週報酬率）＋ `01_Price_Valuation_2025.csv`（當日漲跌幅） |
| `reflect` | 引導使用者說出今天的感受，四個選項皆導向 `diary` | 無新事實，選項本身即為個人化訊號 |
| `diary` | 把今天寫進日記，同時更新長期摘要（Structured Output） | 彙整 `feet`／`scale`／`radio` 的事實＋玩家在 `reflect` 選的選項 |
| `sit_reply`／`rest` | 側支線（坐坐／道別），維持既有語氣 | 無 |

`fact` 的型別沿用 `story.ts` 既有的 `FactBlock = {title: string, lines: string[]}`，後端算出的事實要組成這個形狀直接回給前端，而不是單一字串；餵給 LLM prompt 時再把 `lines` 接成一段敘述文字。

### 8.3 User turn 組合範例（以 `feet` 為例）

```
今天模擬日期：2025/01/06
這個 beat 的任務：描述法人買賣超方向與連續性
已確認事實：外資買賣超 +847.96 張（由賣轉買），近期已連續 1 天同方向買超
玩家上一步選擇：「next」
長期記憶摘要：使用者對法人連續賣超感到擔心，但堅持定期投資計畫
最近事件：[[1/2 feet: 賣超7070.6張／連續3天賣超, 選擇next], [1/3 plan: 選擇next]]

請生成股伴此刻要說的一句話。
```

### 8.4 模型參數

- 不開 thinking（或 `adaptive` + `effort: low`）——短句生成不需要深度推理，優先壓低延遲
- `max_tokens` 約 200（3 句短話的餘裕）
- `diary` beat 用 `output_config.format`（Structured Output）強制回傳 `{diary_text, updated_summary}`，避免自行 parse 自然語言拆欄位

## 9. 前端整合

- 新增 `prototype/src/game/apiClient.ts`：封裝 `startSession()` 與 `getBeatDialogue(beat, choice?)` 兩個 `fetch` 呼叫，指向本機後端（例如 `http://localhost:3001`）
- `RoomScene.ts`：
  - `create()` 時呼叫一次 `startSession()`，取得 `resume_beat` 決定從哪個 beat 開始
  - `showStep()` 改為 async：呼叫 `getBeatDialogue()` 取得 `{text, fact}`，與 `story.ts` 該 beat 原有的 `speaker`／`choices`／`gaze` 合併成 `DialoguePayload`，再 emit `ui:dialogue`
  - 等待回應期間沿用既有的 `busy` flag 擋輸入，`UIScene.ts` 不需修改（本來就吃任意字串內容）

## 10. 錯誤處理

Bedrock 或 DynamoDB 呼叫失敗（逾時、`AccessDeniedException`、限流、網路問題）時：

- 後端回傳 HTTP 500 + 錯誤訊息
- 前端把錯誤訊息（例如「連線失敗，請確認後端伺服器」）直接當作 `text` 顯示在對話卡上
- 選項按鈕維持可點擊，讓玩家能重試或跳過；**不做自動重試邏輯**，維持實作簡單

## 11. 測試計畫

- **後端單元測試**：拿 CSV 裡已知的一列（如 0050／2025-01-02）驗證 `factEngine` 算出的事實字串正確無誤
- **Prompt 驗證腳本**：呼叫 Bedrock 前，先用一支獨立小腳本餵假事實測試 prompt，確認 Sonnet 4.6 回覆語氣符合系統提示詞規則，再接進完整流程，避免邊調 prompt 邊等前端重整
- **端到端手動測試**：`npm run dev`（前端）＋本機後端同時啟動，完整點過 8 個 beat，確認 DynamoDB 的 `recent_events`／`summary`／`main_index` 有正確更新；重啟前端場次確認能從中斷的 beat 接續

## 12. 範圍外（Out of Scope）

- 多使用者／登入系統（固定單一 `demo_user`）
- 股票代號可選（固定 0050）
- LLM 失敗時 fallback 回靜態文字（改為顯示錯誤訊息）
- 依時間序逐日推進（改為隨機抽日）
- 雲端部署（Lambda／API Gateway）——本設計僅涵蓋本機 Node/Express 伺服器
