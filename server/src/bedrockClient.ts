import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

export const MODEL_ID = "us.anthropic.claude-sonnet-4-6";
const REGION = "us-east-1";

export interface InvokeClientLike {
  send(command: InvokeModelCommand): Promise<{ body: Uint8Array }>;
}

export function createBedrockClient(region: string = REGION): InvokeClientLike {
  return new BedrockRuntimeClient({ region }) as unknown as InvokeClientLike;
}

interface TextResponseBody {
  content: Array<{ type: string; text?: string }>;
}

function extractText(body: TextResponseBody): string {
  const block = body.content.find((entry) => entry.type === "text");
  if (!block?.text) {
    throw new Error("Bedrock response contained no text block");
  }
  return block.text;
}

export async function generateBeatText(
  client: InvokeClientLike,
  system: string,
  user: string
): Promise<string> {
  const body = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 500,
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: user }],
  };

  const response = await client.send(
    new InvokeModelCommand({
      modelId: MODEL_ID,
      body: JSON.stringify(body),
      contentType: "application/json",
      accept: "application/json",
    })
  );
  const parsed = JSON.parse(Buffer.from(response.body).toString("utf-8")) as TextResponseBody;
  return extractText(parsed);
}

export interface DiaryUpdate {
  diaryText: string;
  updatedSummary: string;
}

export async function generateDiaryUpdate(
  client: InvokeClientLike,
  system: string,
  user: string
): Promise<DiaryUpdate> {
  const body = {
    anthropic_version: "bedrock-2023-05-31",
    // diary_text + updated_summary in Chinese, plus JSON schema overhead,
    // was getting cut off mid-string at lower budgets and failing JSON.parse.
    // Generous headroom since updated_summary keeps absorbing more history over time.
    max_tokens: 1500,
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            diary_text: { type: "string" },
            updated_summary: { type: "string" },
          },
          required: ["diary_text", "updated_summary"],
          additionalProperties: false,
        },
      },
    },
    messages: [{ role: "user", content: user }],
  };

  const response = await client.send(
    new InvokeModelCommand({
      modelId: MODEL_ID,
      body: JSON.stringify(body),
      contentType: "application/json",
      accept: "application/json",
    })
  );
  const parsed = JSON.parse(Buffer.from(response.body).toString("utf-8")) as TextResponseBody;
  const text = extractText(parsed);
  const parsedJson = JSON.parse(text) as { diary_text: string; updated_summary: string };
  return { diaryText: parsedJson.diary_text, updatedSummary: parsedJson.updated_summary };
}
