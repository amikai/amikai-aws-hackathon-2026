# 美術風格說明：日系 Chibi 像素角色

> 用途：角色設計、spritesheet 規格、AI／畫師 brief、與場景風格對齊  
> 參考：玩家提供的銀髮制服 chibi 像素立繪  
> 專案：`prototype/`（一小角 · 茶席）

---

## 一句話

**日系 Q 版像素角色（chibi pixel）／現代二創感的日本 2D 遊戲角色立繪風格。**

---

## 細項特徵

| 面向 | 描述 |
|------|------|
| **比例** | **大頭小身**（頭約佔身高 1/2～1/3），手腳短、重心可愛 |
| **視角** | 略俯視的 **3/4 正面**（像 RPG／養成遊戲裡可操控角色） |
| **線條** | 清楚 **深色外框**，內部色塊分明，偏「可讀性高」的遊戲用像素 |
| **解析度感** | 中高細節像素：五官、髮絲分層、衣服褶皺都有，但不是寫實 |
| **五官** | 大眼睛、高光明顯，小鼻子／小嘴，表情偏安靜、可愛 |
| **上色** | 平塗為主，少量陰影；頭髮有層次與反光，服裝對比清楚 |
| **題材** | 現代日本學生／日常系（制服、短裙、短靴） |
| **氛圍** | 可愛、乾淨、輕鬆，接近手機乙女／放置／小品日式遊戲，不是暗黑硬核 |

---

## 常見對標（感覺接近，不是同一款）

- 日式 **chibi** 角色（Q 版）
- 像素版的 **動畫／手遊立繪** 感
- 部分 **RPG Maker／獨立日系 RPG** 的自訂角色風格
- 比 16×16 復古點陣更精緻，比高清立繪更「遊戲 sprite」

---

## 英文關鍵詞（給畫師／AI）

```text
Japanese chibi pixel art character, big head small body,
clean dark outlines, soft shading, anime school uniform,
cute pink eyes, silver bob hair, 3/4 top-down game sprite,
readable game asset, cozy 2D Japanese indie game style
```

### 延伸關鍵詞（可選）

```text
chibi, pixel art, anime, schoolgirl, bob cut, soft blush,
game sprite sheet, 4-direction walk cycle, transparent background,
indie JRPG character, cute mascot proportions
```

---

## 與本專案場景的關係

| 元素 | 風格 |
|------|------|
| **角色** | 日系 chibi 像素 |
| **房間** | 等距、偏插畫／精緻 2.5D 室內 |

兩者都是「日系、溫暖、可愛」，但技術語言略不同：

- 角色更偏 **sprite／像素立繪**
- 房間更偏 **isometric 場景插畫**

合在一起仍可讀成「日系放鬆小品遊戲」。

---

## 實作備註（本 repo）

| 項目 | 路徑／說明 |
|------|------------|
| 角色素材 | `public/assets/character/`（保留為美術參考，目前不載入執行場景） |
| 互動腳本 | 目前沒有角色、移動或泡茶互動；等待新的互動設計 |
| 格線 | 新互動方向確定前不採用角色移動格線 |

### 建議 spritesheet 規範

- 透明背景
- 各幀等大、對齊「腳底」便於 isometric 深度排序
- 方向列順序建議：`down → up → left → right`（或 left + flip 當 right）
- 避免寫實光影、避免過度抖動雜訊

---

## 不做什麼（風格邊界）

- 不要寫實人體比例
- 不要恐怖／黑暗厚塗
- 不要純 8-bit 極低解析（除非另開「復古模式」）
- 不要與房間風格衝突的歐美卡通大色塊（除非整體改版）
