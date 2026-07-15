import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "csv-parse/sync";

const STOCK_CODE = "0050";

export interface PriceRow {
  closePrice: number;
  changePercent: number;
}

export interface InstitutionalRow {
  totalNet: number;
}

export interface ReturnRow {
  weeklyReturn: number | null;
}

export interface ForumRow {
  bullPosts: number;
  bearPosts: number;
  neutralPosts: number;
  replyCount: number;
}

export interface CsvDataset {
  price: Map<string, PriceRow>;
  institutional: Map<string, InstitutionalRow>;
  returnRate: Map<string, ReturnRow>;
  forum: Map<string, ForumRow>;
  availableDates: string[];
}

export interface RawCsvFiles {
  price: string;
  institutional: string;
  returnRate: string;
  forum: string;
}

function normalizeDate(raw: string): string {
  return raw.replace(/-/g, "");
}

function parseRows(content: string): Record<string, string>[] {
  return parse(content, {
    columns: true,
    bom: true,
    skip_empty_lines: true,
  }) as Record<string, string>[];
}

function toNumber(value: string | undefined): number {
  if (value === undefined || value === "") return 0;
  return Number(value);
}

function toNullableNumber(value: string | undefined): number | null {
  if (value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export function parseCsvDataset(files: RawCsvFiles): CsvDataset {
  const price = new Map<string, PriceRow>();
  for (const row of parseRows(files.price)) {
    if (row["股票代號"] !== STOCK_CODE) continue;
    price.set(normalizeDate(row["日期"]), {
      closePrice: toNumber(row["收盤價"]),
      changePercent: toNumber(row["漲幅(%)"]),
    });
  }

  const institutional = new Map<string, InstitutionalRow>();
  for (const row of parseRows(files.institutional)) {
    if (row["股票代號"] !== STOCK_CODE) continue;
    institutional.set(normalizeDate(row["日期"]), {
      totalNet: toNumber(row["買賣超合計"]),
    });
  }

  const returnRate = new Map<string, ReturnRow>();
  for (const row of parseRows(files.returnRate)) {
    if (row["股票代號"] !== STOCK_CODE) continue;
    returnRate.set(normalizeDate(row["日期"]), {
      weeklyReturn: toNullableNumber(row["週報酬率(%)"]),
    });
  }

  const forum = new Map<string, ForumRow>();
  for (const row of parseRows(files.forum)) {
    if (row["股票代號"] !== STOCK_CODE) continue;
    forum.set(normalizeDate(row["日期"]), {
      bullPosts: toNumber(row["看多發文"]),
      bearPosts: toNumber(row["看空發文"]),
      neutralPosts: toNumber(row["中性發文"]),
      replyCount: toNumber(row["回文則數"]),
    });
  }

  const availableDates = Array.from(institutional.keys()).sort();

  return { price, institutional, returnRate, forum, availableDates };
}

export function loadCsvDataFromDir(dataDir: string): CsvDataset {
  return parseCsvDataset({
    price: readFileSync(join(dataDir, "01_Price_Valuation_2025.csv"), "utf-8"),
    institutional: readFileSync(join(dataDir, "02_Institutional_Trading_2025.csv"), "utf-8"),
    returnRate: readFileSync(join(dataDir, "03_Return_Rate_2025.csv"), "utf-8"),
    forum: readFileSync(join(dataDir, "10_Forum_Posts_Replies_Daily_Stats_2025.csv"), "utf-8"),
  });
}

export function getAvailableDates(dataset: CsvDataset): string[] {
  return dataset.availableDates;
}

export function pickRandomDate(dataset: CsvDataset): string {
  const dates = dataset.availableDates;
  return dates[Math.floor(Math.random() * dates.length)];
}
