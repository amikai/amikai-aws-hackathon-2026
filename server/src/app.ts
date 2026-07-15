import express from "express";
import cors from "cors";
import type { CsvDataset } from "./csvData";
import { pickRandomDate } from "./csvData";
import { computeFact, factToSummaryLine } from "./factEngine";
import { buildBeatPrompt } from "./promptBuilder";
import { loadUserState, saveUserState, appendRecentEvent } from "./memoryStore";
import type { DocClientLike } from "./memoryStore";
import { generateBeatText, generateDiaryUpdate } from "./bedrockClient";
import type { InvokeClientLike } from "./bedrockClient";
import { MAIN_ORDER, type BeatRequestBody } from "./types";

export interface AppDependencies {
  dataset: CsvDataset;
  doc: DocClientLike;
  bedrock: InvokeClientLike;
}

export function createApp(deps: AppDependencies) {
  const { dataset, doc, bedrock } = deps;
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/ping", (_req, res) => {
    res.status(200).send("ok");
  });

  app.post("/api/session/start", async (_req, res) => {
    try {
      const existing = await loadUserState(doc);
      const state = {
        ...existing,
        currentDate: pickRandomDate(dataset),
        visitCount: existing.visitCount + 1,
      };
      await saveUserState(doc, state);
      res.json({
        currentDate: state.currentDate,
        mainIndex: state.mainIndex,
        visitCount: state.visitCount,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "連線失敗，請確認後端伺服器" });
    }
  });

  app.post("/api/beat", async (req, res) => {
    const { beat, choice, feeling } = req.body as BeatRequestBody;
    const feelingTrimmed = feeling?.trim() ? feeling.trim() : null;
    try {
      const state = await loadUserState(doc);
      const fact = computeFact(dataset, beat, state.currentDate);
      const { system, user } = buildBeatPrompt(
        beat,
        state.currentDate,
        fact,
        state,
        choice,
        feelingTrimmed ?? undefined
      );

      let text: string;
      let nextState = state;

      if (beat === "diary") {
        const result = await generateDiaryUpdate(bedrock, system, user);
        text = result.diaryText;
        nextState = { ...state, summary: result.updatedSummary };
      } else {
        text = await generateBeatText(bedrock, system, user);
      }

      nextState = appendRecentEvent(nextState, {
        date: state.currentDate,
        beat,
        choice: choice ?? null,
        fact: factToSummaryLine(fact),
        textExcerpt: text.slice(0, 40),
        feeling: beat === "diary" ? feelingTrimmed : null,
      });

      const beatIndex = MAIN_ORDER.indexOf(beat);
      if (beatIndex >= 0) {
        const next = beatIndex + 1;
        // Wrap back to the start once the main path (ending at "diary") completes,
        // so MAIN_ORDER[mainIndex] always stays in bounds for the next session.
        nextState.mainIndex = next >= MAIN_ORDER.length ? 0 : next;
      }
      await saveUserState(doc, nextState);

      res.json({ text, fact });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "連線失敗，請確認後端伺服器" });
    }
  });

  return app;
}
