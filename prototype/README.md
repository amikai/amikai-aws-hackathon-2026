# 一小角 · 茶席（Isometric 2.5D）

Web 原生**等距（isometric）**溫暖茶室。互動刻意簡化：點擊熱區，不做自由移動與碰撞。

- 引擎：**Phaser 3** + Vite
- 場景圖：`public/assets/iso/tea-room.jpg` / `tea-room-rainy.jpg`
- 晴／雨：每次進入隨機

## 目前狀態（精簡版）

| 有 | 沒有（刻意砍） |
|----|----------------|
| 整張房間圖（晴／雨） | 角色行走 / spritesheet |
| 點擊熱區：茶席、收音機、書櫃 | Arcade 物理、碰撞 box |
| UI 標題／提示 | walk poly、點地板移動 |

角色素材仍在 `public/assets/character/`，之後若要「固定位置 idle」可再掛回，**不做走格子**。

## 為什麼這樣簡化

Doc 的核心是 **8 格 storyboard（對話 + 點物件探索）**，不是 RPG。
有限的幾張圖最適合：

1. 背景＝整張插畫  
2. 熱區＝隱形 click zone（對齊家具）  
3. 流程＝UI 對話狀態機  

碰撞與 depth-sort 需要分層切圖 + 角色移動，成本高、demo 收益低。

## 啟動

```bash
cd prototype
npm install
npm run dev
```

## 素材對應 doc

| 房間物件 | 資料意義（doc） | 現在 |
|----------|-----------------|------|
| 窗外晴／雨 | CALM / STORM | 兩張圖隨機 |
| 茶席 | 安定、熱飲 | hotspot |
| 收音機 | 論壇聲量 | hotspot |
| 書櫃 | 日記／路線 | hotspot |
| 角色小伴 | 陪伴、呼吸 | 背影坐姿 + 呼吸 |
