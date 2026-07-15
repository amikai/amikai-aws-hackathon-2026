# StockMate Server

## 啟動

```bash
cd server
npm install
npm run setup:dynamodb   # 第一次執行，建立 DynamoDB table（冪等，可重複執行）
npm run dev              # 啟動於 http://localhost:3001
```

需要本機已設定好可存取 Bedrock（`us.anthropic.claude-sonnet-4-6`）與 DynamoDB 的 AWS 憑證（`us-east-1`）。

## 測試

```bash
npm test
```

## 手動打 API 確認

```bash
curl -X POST http://localhost:3001/api/session/start
curl -X POST http://localhost:3001/api/beat -H "Content-Type: application/json" -d '{"beat":"feet"}'
```
