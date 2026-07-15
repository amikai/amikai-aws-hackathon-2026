import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { loadFixtureDataset } from "./fixtures";
import { FakeDocClient } from "./fakeDocClient";
import { fakeBedrockClient } from "./fakeBedrockClient";
import type { InvokeClientLike } from "../src/bedrockClient";

describe("GET /ping", () => {
  it("returns 200 for the ALB health check", async () => {
    const dataset = loadFixtureDataset();
    const app = createApp({ dataset, doc: new FakeDocClient(), bedrock: fakeBedrockClient("hi") });

    const response = await request(app).get("/ping");

    expect(response.status).toBe(200);
  });
});

describe("POST /api/session/start", () => {
  it("returns a date from the available dataset, mainIndex 0, and visitCount 1 on first visit", async () => {
    const dataset = loadFixtureDataset();
    const app = createApp({ dataset, doc: new FakeDocClient(), bedrock: fakeBedrockClient("hi") });

    const response = await request(app).post("/api/session/start").send({});

    expect(response.status).toBe(200);
    expect(dataset.availableDates).toContain(response.body.currentDate);
    expect(response.body.mainIndex).toBe(0);
    expect(response.body.visitCount).toBe(1);
  });
});

describe("POST /api/beat", () => {
  it("returns generated text and the computed FactBlock for the feet beat", async () => {
    const dataset = loadFixtureDataset();
    const doc = new FakeDocClient();
    const app = createApp({ dataset, doc, bedrock: fakeBedrockClient("法人今天悄悄往外走了一步。") });

    await request(app).post("/api/session/start").send({});
    const response = await request(app).post("/api/beat").send({ beat: "feet" });

    expect(response.status).toBe(200);
    expect(response.body.text).toBe("法人今天悄悄往外走了一步。");
    expect(response.body.fact.title).toBe("法人動向");
  });

  it("advances mainIndex after a main-path beat completes", async () => {
    const dataset = loadFixtureDataset();
    const doc = new FakeDocClient();
    const app = createApp({ dataset, doc, bedrock: fakeBedrockClient("...") });

    await request(app).post("/api/session/start").send({});
    await request(app).post("/api/beat").send({ beat: "ground" });
    const secondStart = await request(app).post("/api/session/start").send({});

    expect(secondStart.body.mainIndex).toBe(1);
  });

  it("wraps mainIndex back to 0 after the diary beat (the last main-path step) completes", async () => {
    const dataset = loadFixtureDataset();
    const doc = new FakeDocClient();
    const app = createApp({
      dataset,
      doc,
      bedrock: fakeBedrockClient(JSON.stringify({ diary_text: "今天的日記。", updated_summary: "摘要。" })),
    });

    await request(app).post("/api/session/start").send({});
    await request(app).post("/api/beat").send({ beat: "diary", choice: "note" });
    const secondStart = await request(app).post("/api/session/start").send({});

    expect(secondStart.body.mainIndex).toBe(0);
  });

  it("persists the user's diary feeling into recent_events", async () => {
    const dataset = loadFixtureDataset();
    const doc = new FakeDocClient();
    const app = createApp({
      dataset,
      doc,
      bedrock: fakeBedrockClient(
        JSON.stringify({ diary_text: "記下你的擔心了。", updated_summary: "擔心但願意觀察。" })
      ),
    });

    await request(app).post("/api/session/start").send({});
    const response = await request(app)
      .post("/api/beat")
      .send({ beat: "diary", choice: "note", feeling: "有點擔心，明天再說" });

    expect(response.status).toBe(200);
    expect(response.body.text).toBe("記下你的擔心了。");

    const { loadUserState } = await import("../src/memoryStore");
    const saved = await loadUserState(doc);
    expect(saved.summary).toBe("擔心但願意觀察。");
    expect(saved.recentEvents).toHaveLength(1);
    expect(saved.recentEvents[0].feeling).toBe("有點擔心，明天再說");
    expect(saved.recentEvents[0].beat).toBe("diary");
  });

  it("returns HTTP 500 with an error message when Bedrock fails", async () => {
    const dataset = loadFixtureDataset();
    const doc = new FakeDocClient();
    const failingBedrock: InvokeClientLike = {
      async send() {
        throw new Error("AccessDeniedException");
      },
    };
    const app = createApp({ dataset, doc, bedrock: failingBedrock });

    await request(app).post("/api/session/start").send({});
    const response = await request(app).post("/api/beat").send({ beat: "feet" });

    expect(response.status).toBe(500);
    expect(response.body.error).toContain("連線失敗");
  });
});
