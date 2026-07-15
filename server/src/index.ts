import { createApp } from "./app";
import { loadCsvDataFromDir } from "./csvData";
import { createDocClient } from "./memoryStore";
import { createBedrockClient } from "./bedrockClient";

const PORT = 3001;
const REGION = "us-east-1";
const DATA_DIR = new URL("../../Delivery_Hackathon_DataPackage_20260624", import.meta.url).pathname;

const dataset = loadCsvDataFromDir(DATA_DIR);
const doc = createDocClient(REGION);
const bedrock = createBedrockClient(REGION);

const app = createApp({ dataset, doc, bedrock });

app.listen(PORT, () => {
  console.log(`StockMate server listening on http://localhost:${PORT}`);
});
