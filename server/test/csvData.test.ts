import { describe, it, expect } from "vitest";
import { loadFixtureDataset } from "./fixtures";
import { getAvailableDates, pickRandomDate } from "../src/csvData";

describe("parseCsvDataset", () => {
  it("filters rows to stock 0050 only", () => {
    const dataset = loadFixtureDataset();
    expect(dataset.price.has("20250102")).toBe(true);
    expect(dataset.price.get("20250102")?.closePrice).toBe(194.05);
  });

  it("normalizes hyphenated dates from the forum file", () => {
    const dataset = loadFixtureDataset();
    expect(dataset.forum.has("20250102")).toBe(true);
    expect(dataset.forum.get("20250102")?.bullPosts).toBe(14);
  });

  it("parses institutional net trading totals", () => {
    const dataset = loadFixtureDataset();
    expect(dataset.institutional.get("20250102")?.totalNet).toBeCloseTo(-9814.491);
    expect(dataset.institutional.get("20250106")?.totalNet).toBeCloseTo(9348.257);
  });

  it("collects available dates from the institutional file, sorted", () => {
    const dataset = loadFixtureDataset();
    expect(getAvailableDates(dataset)).toEqual(["20250102", "20250103", "20250106"]);
  });
});

describe("pickRandomDate", () => {
  it("always returns one of the available dates", () => {
    const dataset = loadFixtureDataset();
    for (let i = 0; i < 20; i++) {
      expect(dataset.availableDates).toContain(pickRandomDate(dataset));
    }
  });
});
