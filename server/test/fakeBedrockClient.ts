import type { InvokeClientLike } from "../src/bedrockClient";

export function fakeBedrockClient(responseText: string): InvokeClientLike {
  const body = JSON.stringify({ content: [{ type: "text", text: responseText }] });
  return {
    async send() {
      return { body: new TextEncoder().encode(body) };
    },
  };
}
