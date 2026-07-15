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
