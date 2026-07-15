import { createBedrockClient, generateBeatText } from "../src/bedrockClient";

async function main() {
  const client = createBedrockClient();
  const text = await generateBeatText(
    client,
    "你是「股伴」，一隻陪伴使用者觀察 2025 年台股市場的溫暖電子寵物。回覆 1-3 句繁體中文短句。",
    "今天模擬日期：2025/01/06\n已確認事實：外資買賣超 +847.96 張（由賣轉買）\n請生成股伴此刻要說的一句話。"
  );
  console.log("Bedrock replied:", text);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
