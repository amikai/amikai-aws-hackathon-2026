# 簡化架構：整圖 + 熱區（非 RPG）

## 決策

不做「角色在榻榻米上走 + 碰撞」。  
Doc 需求是 **被接住 → 點物件探索 → 對話選擇**，用現有幾張圖就能對齊。

## 層級（現在）

| 層 | 內容 | 實作 |
|----|------|------|
| Background | 晴／雨整張房間 | `tea-room.jpg` / `tea-room-rainy.jpg` |
| Objects | 隱形 click 熱區 | `roomData.INTERACTABLES` + Zone |
| UI | 標題／提示／之後對話 | `UIScene` |

**刻意不做：** Player 層、Collision body、walk poly、地板點擊移動。

## Scene

| Scene | 職責 |
|-------|------|
| `BootScene` | 載入房間圖、啟動 Room + UI |
| `RoomScene` | 顯示房間、熱區 hover／click |
| `UIScene` | 前景 UI（`ui:set`） |

## 操作

- **點茶席／收音機／書櫃** → 提示文字（之後接 storyboard）
- 角色素材保留於 `assets/character/`，未載入

## 之後若加回「小伴」

建議固定位置 + idle（呼吸 scale），**不要**走格子：

```text
[房間整圖]
  └── [小伴 sprite，茶席旁固定]
        └── [熱區仍點家具，不點地板走路]
```

分層切圖（floor / furniture / props）只在需要蒸汽 loop、前後遮擋時再做。
