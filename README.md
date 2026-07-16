# 股伴 StockMate

資料驅動的投資陪伴電子寵物。以 2025 年台股資料（CMoney 提供的 300 檔示範籃子）為世界觀，玩家每天陪股伴走過一段 8-beat 的小茶室對話，法人動向、論壇聲量、報酬變化都會轉譯成股伴當下要說的一句話——不是即時行情，也不做投資建議。

## Live Demo

- **前端**：https://main.dg7vvw3z036fo.amplifyapp.com
- **後端 API**：https://st-95bc52f4ab4949ab9d4c66765d71c02e.ecs.us-east-1.on.aws

## 專案結構

```
prototype/    前端 — Phaser 4 + Vite + TypeScript，茶室場景與 8-beat 對話流程
server/       後端 — Express + TypeScript，讀 CSV 算事實、呼叫 Bedrock 生成台詞、DynamoDB 存長期記憶
Delivery_Hackathon_DataPackage_20260624/   CMoney 提供的 2025 年台股 CSV 資料包
docs/         產品設計文件 + 這次功能的 spec / 實作計畫
```

## 運作方式

1. 玩家每次進入遊戲，後端從 243 個交易日中隨機抽一天，當次場次的 8 個 beat 都引用同一天的真實資料
2. 每個 beat（法人動向、論壇聲量、報酬比較……）先用程式從 CSV 算出確定性事實，再交給 **Claude Sonnet 4.6**（透過 Amazon Bedrock）把事實翻譯成股伴此刻要說的話
3. 玩家跨場次的記憶（進度、近期事件、感受、長期摘要）存在 **DynamoDB**，讓股伴記得你們一起經歷過什麼

詳細設計：`docs/superpowers/specs/2026-07-16-llm-dialogue-bedrock-design.md`
實作計畫：`docs/superpowers/plans/2026-07-16-llm-dialogue-bedrock-plan.md`

## 本機啟動

需要能存取 Bedrock（`us.anthropic.claude-sonnet-4-6`）與 DynamoDB 的 AWS 憑證（`us-east-1`）。

```bash
# 後端
cd server
npm install
npm run setup:dynamodb   # 第一次執行，建立 DynamoDB table（冪等）
npm run dev              # http://localhost:3001

# 前端（另開一個 terminal）
cd prototype
npm install
npm run dev              # http://localhost:5173
```

測試：

```bash
cd server && npm test      # 35 個測試
cd prototype && npm test   # 4 個測試
```

## 部署架構

| 元件 | AWS 服務 |
|---|---|
| 後端 | Amazon ECS Express Mode（Fargate，自動 ALB + HTTPS + health check） |
| 前端 | AWS Amplify Hosting |
| Container image | Amazon ECR |
| 模型 | Amazon Bedrock — `us.anthropic.claude-sonnet-4-6` |
| 記憶 | Amazon DynamoDB — `StockMateUserState` |

`server/Dockerfile` 直接用 `tsx` 執行 TypeScript 原始碼，不經過編譯步驟。IAM 採最小權限：後端 task role 只有 `bedrock:InvokeModel`（限定該 inference profile）與 `dynamodb:GetItem`/`PutItem`（限定該表）。

## 資料來源與限制

- 僅涵蓋 300 檔示範籃子（產業分層抽樣），不代表全市場
- 資料世界以 **2025/12/31 為「現在」**，不接即時行情
- 不做漲跌預測、不給投資建議——股伴的角色是陪伴與翻譯，不是分析師
