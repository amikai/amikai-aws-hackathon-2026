# 房間圖切割規格（分層 + 互動）

> 實務建議：Photoshop / Clip Studio / GIMP / Photopea  
> 輸出：**PNG 透明** · 英文小寫 + 底線命名 · 盡量同原圖解析度

## 推薦切割（8+ 部分）

### 1. 背景牆壁層 — `bg_walls.png`

**包含：** 左右木框、紙門（shoji）、上方牆壁、牆面光影  
**不包含：** 地板、大型家具、道具

### 2. 榻榻米地板 — `floor_tatami.png`（最重要）

**包含：** 整片地板、邊緣木條、入口石階／踏板  
**用途：** 角色移動基準（walkable 對齊這層）

### 3. 大型固定家具 — `furniture_base.png`

**包含：**

- 書櫃整體（之後可再拆上／下）
- 矮茶桌（**不含**茶具）
- 兩個坐墊（zabuton）

### 4. 可互動小道具（各一檔）

| 檔名 | 內容 | 備註 |
|------|------|------|
| `props/teapot.png` | 茶壺 | 與蒸汽分開 |
| `props/steam.png` | 蒸汽 | **一定單獨**，方便動畫 |
| `props/teacup.png` | 綠茶碗 | |
| `props/radio.png` | 復古收音機 | |
| `props/bonsai_big.png` | 大盆栽 | |
| `props/plants_small.png` | 小盆栽（可合或再拆） | |
| `props/hanging_plant.png` | 懸掛植物 | |

### 5. 前景遮擋 — `foreground/foreground_details.png`

茶桌前緣、會遮住角色的葉片等。角色 depth 介於 furniture 與 foreground 之間時可產生前後感。

### 6. 角色（spritesheet）

`assets/character/player-sheet.png` — 上下左右行走（之後可再畫）

---

## 本 repo 路徑

```text
public/assets/layers/
  bg_walls.png
  floor_tatami.png
  furniture_base.png
  LAYER_MANIFEST.md
  props/
    teapot.png
    steam.png
    teacup.png
    radio.png
    bonsai_big.png
    plants_small.png
    hanging_plant.png
  foreground/
    foreground_details.png
  # 舊實驗檔（可刪）
  background.png / floor.png / furniture.png / full-reference.png
```

## 切割注意

1. **蒸汽一定單獨切**，才能 loop 動畫  
2. 書櫃可先整張，再決定是否拆  
3. 地板接縫要乾淨，避免拼貼感  
4. 理想情況：同畫布對齊座標再疊加；若道具是「獨立居中裁切」，在程式用座標放置  

## 引擎對應層

| 邏輯層 | 素材 |
|--------|------|
| Background | `bg_walls.png` |
| Floor | `floor_tatami.png` |
| Collision | 隱形 body（見 `roomData.ts`） |
| Objects | props + interactive zones |
| Furniture visual | `furniture_base.png` + props |
| Player | character sheet |
| Foreground | `foreground_details.png` |
| UI | UIScene |
