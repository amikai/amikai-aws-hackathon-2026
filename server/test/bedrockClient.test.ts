import { describe, it, expect } from "vitest";
import { generateBeatText, generateDiaryUpdate } from "../src/bedrockClient";
import { fakeBedrockClient } from "./fakeBedrockClient";
import type { InvokeClientLike } from "../src/bedrockClient";

describe("generateBeatText", () => {
  it("extracts the text block from the Bedrock response", async () => {
    const client = fakeBedrockClient("法人今天悄悄往外走了一步。");
    const text = await generateBeatText(client, "system prompt", "user prompt");
    expect(text).toBe("法人今天悄悄往外走了一步。");
  });

  it("throws when the response has no text block", async () => {
    const client: InvokeClientLike = {
      async send() {
        const body = JSON.stringify({ content: [{ type: "thinking" }] });
        return { body: new TextEncoder().encode(body) };
      },
    };
    await expect(generateBeatText(client, "s", "u")).rejects.toThrow("no text block");
  });
});

describe("generateDiaryUpdate", () => {
  it("parses the JSON diary payload", async () => {
    const client = fakeBedrockClient(
      JSON.stringify({ diary_text: "今天的日記。", updated_summary: "新的摘要。" })
    );
    const result = await generateDiaryUpdate(client, "system prompt", "user prompt");
    expect(result.diaryText).toBe("今天的日記。");
    expect(result.updatedSummary).toBe("新的摘要。");
  });
});
