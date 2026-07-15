# 一小角 · 茶席（Isometric 2.5D）

Web 原生**等距（isometric）**溫暖茶室：可走動、可泡抹茶。

- 引擎：**Phaser 3** + Vite
- 美術方向：對齊參考圖的 **isometric pixel / 精緻 2.5D 室內**（斜 45°、暖木色、家具密度高）
- 場景圖：`public/assets/iso/tea-room.jpg`（依參考風格重製的茶室）
- 蒸汽：Kenney Smoke Particles（CC0）
- 參考：`docs/references/pixel-style-office.png`

## 操作

| 按鍵 | 作用 |
|------|------|
| WASD / 方向鍵 | 走動 |
| E | 互動 |
| 按住 E | 刷茶（進度走開後保留） |

## 啟動

```bash
cd prototype
npm install
npm run dev
```

瀏覽器打開終端機顯示的 Local URL（通常是 http://localhost:5173）。

## 專案位置

本倉庫的**唯一 prototype** 目錄為 `prototype/`（由 `prototype-cozy-2d` 更名；其他 prototype 目錄已移除）。
