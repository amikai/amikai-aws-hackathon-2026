import Phaser from "phaser";
import { Companion } from "./Companion";
import {
  COMPANION_BASE_SCALE,
  COMPANION_SIT,
  GAZE_POINTS,
} from "./roomData";
import {
  DIALOGUE,
  MAIN_ORDER,
  QUIET_MS,
  type GazeTarget,
  type StoryStep,
} from "./story";
import { startSession, getBeatDialogue } from "./apiClient";
import type { ChoicePayload } from "./UIScene";

/**
 * One tea room, 8-beat main path (gaze + dialogue + fact cards).
 * Sit branch: arrival → sit → quiet → diary → rest.
 * Diary is two-phase: collect optional feeling → generate & save → leave.
 */
export class RoomScene extends Phaser.Scene {
  private room!: Phaser.GameObjects.Image;
  private gazeGfx!: Phaser.GameObjects.Graphics;
  private gazeTween?: Phaser.Tweens.Tween;

  private layerScale = 1;
  private layerOffset = { x: 0, y: 0 };
  private layerSize = { w: 0, h: 0 };

  private weather: "sunny" | "rainy" = "sunny";
  private readonly forceWeather: "sunny" | "rainy" | null = "rainy";

  private step: StoryStep = "arrival";
  private busy = false;
  private mainIndex = 0;
  private serverMainIndex = 0;
  /** Choice id from reflect / sit that led into diary. */
  private pendingDiaryChoice?: string;
  private diaryPhase: "input" | "result" = "input";

  constructor() {
    super("RoomScene");
  }

  create(): void {
    const { width, height } = this.scale;
    this.weather = this.forceWeather ?? "rainy";

    this.cameras.main.setBackgroundColor(
      this.weather === "rainy" ? 0x0c1218 : 0x1a1410,
    );

    const ambience = this.add.graphics().setDepth(0);
    if (this.weather === "rainy") {
      ambience.fillGradientStyle(0x121c28, 0x121c28, 0x060a10, 0x060a10, 1);
    } else {
      ambience.fillGradientStyle(0x2a221c, 0x2a221c, 0x0e0b09, 0x0e0b09, 1);
    }
    ambience.fillRect(0, 0, width, height);

    const key =
      this.weather === "rainy" ? "tea-room-rainy" : "tea-room-sunny";
    this.room = this.add.image(width / 2, height / 2 - 8, key).setDepth(1);
    this.fitRoom();

    const sit = this.normToWorld(COMPANION_SIT.x, COMPANION_SIT.y);
    new Companion(this, sit.x, sit.y, COMPANION_BASE_SCALE * this.layerScale);

    this.gazeGfx = this.add.graphics().setDepth(4);

    this.game.events.on("ui:choice", this.onChoice, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off("ui:choice", this.onChoice, this);
      this.gazeTween?.stop();
    });

    startSession()
      .then((session) => {
        this.serverMainIndex = session.mainIndex;
      })
      .catch(() => {
        this.serverMainIndex = 0;
      })
      .finally(() => {
        this.time.delayedCall(700, () => this.showStep("arrival"));
      });
  }

  // --- Story ---------------------------------------------------------------

  private showStep(step: StoryStep, choice?: string): void {
    if (step === "diary") {
      this.enterDiaryInput(choice);
      return;
    }

    this.step = step;
    this.busy = true;
    const d = DIALOGUE[step];
    this.setGaze(d.gaze ?? "none");

    getBeatDialogue(step, choice)
      .then((response) => {
        this.busy = false;
        this.game.events.emit("ui:dialogue", {
          speaker: d.speaker ?? "小伴",
          beat: d.beat,
          beatTotal: d.beat != null ? 8 : undefined,
          text: response.text,
          fact: response.fact,
          choices: d.choices,
        });
      })
      .catch((error: Error) => {
        this.busy = false;
        this.game.events.emit("ui:dialogue", {
          speaker: d.speaker ?? "小伴",
          beat: d.beat,
          beatTotal: d.beat != null ? 8 : undefined,
          text: error.message,
          choices: d.choices,
        });
      });
  }

  /** Diary phase 1: local prompt + optional feeling, no backend call yet. */
  private enterDiaryInput(choice?: string): void {
    this.step = "diary";
    this.diaryPhase = "input";
    this.pendingDiaryChoice = choice;
    this.busy = false;
    const d = DIALOGUE.diary;
    this.setGaze(d.gaze ?? "none");
    this.game.events.emit("ui:dialogue", {
      speaker: d.speaker ?? "小伴",
      beat: d.beat,
      beatTotal: 8,
      text: d.text,
      allowInput: {
        placeholder: "想留一句話給未來的自己…（選填）",
      },
      choices: d.choices,
    });
  }

  /** Diary phase 2: generate + persist with the user's feeling. */
  private submitDiary(feeling?: string): void {
    this.busy = true;
    const d = DIALOGUE.diary;
    getBeatDialogue("diary", this.pendingDiaryChoice, feeling)
      .then((response) => {
        this.diaryPhase = "result";
        this.busy = false;
        this.game.events.emit("ui:dialogue", {
          speaker: d.speaker ?? "小伴",
          beat: d.beat,
          beatTotal: 8,
          text: response.text,
          fact: response.fact,
          choices: [{ id: "leave", label: "今天先到這裡", primary: true }],
        });
      })
      .catch((error: Error) => {
        this.diaryPhase = "result";
        this.busy = false;
        this.game.events.emit("ui:dialogue", {
          speaker: d.speaker ?? "小伴",
          beat: d.beat,
          beatTotal: 8,
          text: error.message,
          choices: [{ id: "leave", label: "今天先到這裡", primary: true }],
        });
      });
  }

  private onChoice = (payload: ChoicePayload | string) => {
    if (this.busy) return;

    const id = typeof payload === "string" ? payload : payload.id;
    const feeling = typeof payload === "string" ? undefined : payload.text;

    if (this.step === "arrival") {
      if (id === "sit") {
        this.showStep("sit_reply", id);
        return;
      }
      if (id === "look") {
        this.mainIndex = this.serverMainIndex;
        this.showStep(MAIN_ORDER[this.mainIndex], id);
        return;
      }
    }

    if (this.step === "sit_reply" && id === "quiet") {
      this.enterQuietThen(() => this.showStep("diary", id));
      return;
    }

    // Main path linear continues
    if (id === "next") {
      this.advanceMain(id);
      return;
    }

    // Reflect four options — all land on diary input
    if (this.step === "reflect") {
      this.showStep("diary", id);
      return;
    }

    if (this.step === "diary" && this.diaryPhase === "input" && id === "write") {
      this.submitDiary(feeling);
      return;
    }

    if (this.step === "diary" && this.diaryPhase === "result" && id === "leave") {
      this.enterQuietThen(() => this.showStep("rest", id));
      return;
    }

    if (this.step === "rest") {
      if (id === "again") {
        this.mainIndex = 0;
        this.showStep("arrival", id);
        return;
      }
      if (id === "sit_again") {
        this.showStep("sit_reply", id);
      }
    }
  };

  private advanceMain(choice: string): void {
    const i = MAIN_ORDER.indexOf(this.step as (typeof MAIN_ORDER)[number]);
    if (i < 0) return;
    if (i >= MAIN_ORDER.length - 1) {
      this.showStep("rest", choice);
      return;
    }
    this.mainIndex = i + 1;
    this.showStep(MAIN_ORDER[this.mainIndex], choice);
  }

  private enterQuietThen(then: () => void): void {
    this.busy = true;
    this.setGaze("none");
    this.game.events.emit("ui:hide");
    this.time.delayedCall(QUIET_MS, () => {
      this.busy = false;
      then();
    });
  }

  // --- Gaze marker ---------------------------------------------------------

  private setGaze(target: GazeTarget): void {
    this.gazeTween?.stop();
    this.gazeGfx.clear();
    if (target === "none" || !(target in GAZE_POINTS)) return;

    const g = GAZE_POINTS[target as keyof typeof GAZE_POINTS];
    const p = this.normToWorld(g.x, g.y);
    const r = g.radius * this.layerSize.w;

    const state = { t: 0 };
    this.gazeTween = this.tweens.add({
      targets: state,
      t: 1,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
      onUpdate: () => {
        this.gazeGfx.clear();
        const pulse = 0.35 + state.t * 0.35;
        const rr = r * (0.85 + state.t * 0.2);
        this.gazeGfx.lineStyle(2.5, 0xf0e0c0, pulse);
        this.gazeGfx.strokeCircle(p.x, p.y, rr);
        this.gazeGfx.fillStyle(0xf5e6c8, 0.06 + state.t * 0.06);
        this.gazeGfx.fillCircle(p.x, p.y, rr * 0.55);
      },
    });
  }

  // --- Layout --------------------------------------------------------------

  private fitRoom(): void {
    const { width, height } = this.scale;
    const margin = 24;
    const maxW = width - margin * 2;
    const maxH = height - 72;
    this.layerScale = Math.min(
      maxW / this.room.width,
      maxH / this.room.height,
    );
    this.room.setScale(this.layerScale);
    this.layerSize = {
      w: this.room.displayWidth,
      h: this.room.displayHeight,
    };
    this.layerOffset = { x: this.room.x, y: this.room.y };
  }

  private normToWorld(nx: number, ny: number): { x: number; y: number } {
    const left = this.layerOffset.x - this.layerSize.w / 2;
    const top = this.layerOffset.y - this.layerSize.h / 2;
    return {
      x: left + nx * this.layerSize.w,
      y: top + ny * this.layerSize.h,
    };
  }
}
