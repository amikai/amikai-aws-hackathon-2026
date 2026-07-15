import { createApp } from "./app";
import { loadCsvDataFromDir } from "./csvData";
import { createDocClient } from "./memoryStore";
import { createBedrockClient } from "./bedrockClient";

const PORT = Number(process.env.PORT ?? 3001);
const REGION = process.env.AWS_REGION ?? "us-east-1";
// In the Docker image the CSV data is copied to an absolute path (DATA_DIR env var).
// Locally, fall back to the repo-root data directory relative to this file.
const DATA_DIR =
  process.env.DATA_DIR ??
  new URL("../../Delivery_Hackathon_DataPackage_20260624", import.meta.url).pathname;

const dataset = loadCsvDataFromDir(DATA_DIR);
const doc = createDocClient(REGION);
const bedrock = createBedrockClient(REGION);

const app = createApp({ dataset, doc, bedrock });

app.listen(PORT, () => {
  console.log(`StockMate server listening on http://localhost:${PORT}`);
});
