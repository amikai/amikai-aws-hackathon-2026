export const demoData = {
  date: "2025-04-09",
  stock: { symbol: "0050", name: "元大台灣50", close: 146.2, dailyReturn: -4.6, weeklyReturn: -16.931 },
  institutional: { netBuySell: -42058.918, consecutiveSellDays: 3 },
  forum: { posts: 196, authors: 135, bullish: 65, bearish: 10, neutral: 121, replies: 1069 },
  plan: { frequency: "monthly", day: 10, amount: 5000, goalYears: 10 },
} as const;
