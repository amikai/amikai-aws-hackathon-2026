import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
  ResourceNotFoundException,
} from "@aws-sdk/client-dynamodb";
import { TABLE_NAME } from "../src/memoryStore";

const REGION = "us-east-1";

async function main() {
  const client = new DynamoDBClient({ region: REGION });

  try {
    await client.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
    console.log(`Table ${TABLE_NAME} already exists, skipping creation.`);
    return;
  } catch (error) {
    if (!(error instanceof ResourceNotFoundException)) {
      throw error;
    }
  }

  await client.send(
    new CreateTableCommand({
      TableName: TABLE_NAME,
      AttributeDefinitions: [{ AttributeName: "user_id", AttributeType: "S" }],
      KeySchema: [{ AttributeName: "user_id", KeyType: "HASH" }],
      BillingMode: "PAY_PER_REQUEST",
    })
  );
  console.log(`Created table ${TABLE_NAME}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
