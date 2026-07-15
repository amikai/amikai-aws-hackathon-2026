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

/**
 * One tea room, 8-beat main path (gaze + dialogue + fact cards).
 * Sit branch: arrival → sit → quiet → diary → rest.
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

    this.time.delayedCall(700, () => this.showStep("arrival"));
  }

  // --- Story ---------------------------------------------------------------

  private showStep(step: StoryStep): void {
    this.step = step;
    this.busy = false;
    const d = DIALOGUE[step];
    this.setGaze(d.gaze ?? "none");

    this.game.events.emit("ui:dialogue", {
      speaker: d.speaker ?? "小伴",
      beat: d.beat,
      beatTotal: d.beat != null ? 8 : undefined,
      text: d.text,
      fact: d.fact,
      choices: d.choices,
    });
  }

  private onChoice = (id: string) => {
    if (this.busy) return;

    if (this.step === "arrival") {
      if (id === "sit") {
        this.showStep("sit_reply");
        return;
      }
      if (id === "look") {
        this.mainIndex = 0;
        this.showStep(MAIN_ORDER[0]);
        return;
      }
    }

    if (this.step === "sit_reply" && id === "quiet") {
      this.enterQuietThen(() => this.showStep("diary"));
      return;
    }

    // Main path linear continues
    if (id === "next") {
      this.advanceMain();
      return;
    }

    // Reflect four options — all land on diary
    if (this.step === "reflect") {
      this.showStep("diary");
      return;
    }

    if (this.step === "diary" && id === "leave") {
      this.enterQuietThen(() => this.showStep("rest"));
      return;
    }

    if (this.step === "rest") {
      if (id === "again") {
        this.mainIndex = 0;
        this.showStep("arrival");
        return;
      }
      if (id === "sit_again") {
        this.showStep("sit_reply");
      }
    }
  };

  private advanceMain(): void {
    const i = MAIN_ORDER.indexOf(this.step as (typeof MAIN_ORDER)[number]);
    if (i < 0) return;
    if (i >= MAIN_ORDER.length - 1) {
      this.showStep("rest");
      return;
    }
    this.mainIndex = i + 1;
    this.showStep(MAIN_ORDER[this.mainIndex]);
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
