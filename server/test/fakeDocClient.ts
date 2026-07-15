import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { DocClientLike } from "../src/memoryStore";

export class FakeDocClient implements DocClientLike {
  private table = new Map<string, Record<string, unknown>>();

  async send(command: GetCommand | PutCommand): Promise<any> {
    if (command instanceof GetCommand) {
      return { Item: this.table.get(command.input.Key!.user_id as string) };
    }
    if (command instanceof PutCommand) {
      this.table.set(command.input.Item!.user_id as string, command.input.Item!);
      return {};
    }
    throw new Error("unsupported command in FakeDocClient");
  }
}
