import { demoData } from "./demo-data";
import type { ExperienceAction, StoryStep } from "./types";

export interface StepOption {
  label: string;
  action: ExperienceAction;
}

export interface StepCopy {
  eyebrow: string;
  dialogue: string;
  hint?: string;
  options: StepOption[];
}

export const diaryEntry = `2025/04/09
明天是原定投入日。
今天 0050 波動很大，論壇也明顯變吵；但多數發文是中性。
法人連續三日賣超。
小安感到擔心，選擇先記錄感受，明天再確認計畫。`;

const advance: ExperienceAction = { type: "ADVANCE" };

export const stepCopy: Record<Exclude<StoryStep, "REST">, StepCopy> = {
  ARRIVAL: {
    eyebrow: "歡迎回來",
    dialogue: "你來了。今天外面的風有點大，我幫你把重要的事情留在桌上了。",
    options: [
      { label: "陪我看一下", action: { type: "CHOOSE_LOOK" } },
      { label: "今天只想坐坐", action: { type: "CHOOSE_SIT" } },
    ],
  },
  SIT_TOGETHER: {
    eyebrow: "今天只坐一下",
    dialogue: "沒關係，我們今天不用理解所有事情。坐一下也很好。",
    options: [{ label: "今天先到這裡", action: advance }],
  },
  GROUNDING: {
    eyebrow: "先慢一點",
    dialogue: "我們不用一次看完。先從一件事情開始就好。",
    options: [{ label: "好", action: advance }],
  },
  PLAN_RECALL: {
    eyebrow: "原本的路線",
    dialogue: "我記得我們原本約好明天一起往前走一步。今天你是不是有點想改變路線？",
    hint: `每月 ${demoData.plan.day} 日投入 ${demoData.plan.amount.toLocaleString("zh-TW")} 元 · 十年以上長期累積`,
    options: [
      { label: "我想暫停這次投入", action: advance },
      { label: "我只是有點擔心", action: advance },
      { label: "我的生活需求改變了", action: advance },
      { label: "我還說不上來", action: advance },
    ],
  },
  RADIO_EXPLORE: {
    eyebrow: "市場的聲音",
    dialogue: "外面確實比平常吵很多。不過仔細聽，大部分聲音其實沒有明確看多或看空。",
    hint: `${demoData.forum.posts} 則發文 · ${demoData.forum.authors} 位發文者\n看多 ${demoData.forum.bullish} · 看空 ${demoData.forum.bearish} · 中性 ${demoData.forum.neutral}`,
    options: [{ label: "去門口看看腳印", action: advance }],
  },
  FOOTPRINT_EXPLORE: {
    eyebrow: "門口的腳印",
    dialogue: "這些腳印是真的，而且連續往外走了幾天。但留下腳印的人，可能和我們有不同的目的與時間。",
    hint: `4/7–4/9 三大法人連續 ${demoData.institutional.consecutiveSellDays} 日賣超\n4/9 合計賣超 ${Math.abs(demoData.institutional.netBuySell).toLocaleString("zh-TW")} 張`,
    options: [{ label: "把時間尺度放在一起看", action: advance }],
  },
  TIMESCALE: {
    eyebrow: "兩張卡",
    dialogue: "短期的變化很大，讓人擔心很正常。它可能是重新檢視計畫的理由，但不必自動替你做決定。",
    hint: `短期市場：最近一週 ${demoData.stock.weeklyReturn}%\n我的計畫：十年以上長期累積`,
    options: [{ label: "我想好了", action: advance }],
  },
  REFLECTION: {
    eyebrow: "把選擇交還給你",
    dialogue: "看完這些線索，你現在怎麼想？",
    hint: "沒有綠色正解，也沒有紅色錯誤。",
    options: [
      { label: "我想維持原本計畫", action: { type: "CHOOSE_REFLECTION", choice: "KEEP" } },
      { label: "我想有理由地調整計畫", action: { type: "CHOOSE_REFLECTION", choice: "ADJUST" } },
      { label: "我想先記下感受，明天再確認", action: { type: "CHOOSE_REFLECTION", choice: "WAIT" } },
      { label: "我現在還沒有答案", action: { type: "CHOOSE_REFLECTION", choice: "UNSURE" } },
    ],
  },
  DIARY: {
    eyebrow: "共同日記",
    dialogue: "可以。暫時不決定，也是一個有意識的選擇。我把今天寫下來了。",
    hint: diaryEntry,
    options: [{ label: "今天先到這裡", action: advance }],
  },
};

export const restCopy: StepCopy = {
  eyebrow: "安心離開",
  dialogue: "今天我們只看了一件事，已經很夠了。你的計畫還在這裡，我也會幫你記得。",
  options: [{ label: "重新開始", action: { type: "RESTART" } }],
};
