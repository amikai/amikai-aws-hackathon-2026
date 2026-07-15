import Phaser from "phaser";
import { Companion } from "./Companion";
import { COMPANION_BASE_SCALE, COMPANION_SIT } from "./roomData";
import { DIALOGUE, QUIET_MS, type StoryStep } from "./story";

/**
 * Shortest path:
 * ARRIVAL → sit/look reply → quiet (card hidden) → REST
 */
export class RoomScene extends Phaser.Scene {
  private room!: Phaser.GameObjects.Image;

  private layerScale = 1;
  private layerOffset = { x: 0, y: 0 };
  private layerSize = { w: 0, h: 0 };

  private weather: "sunny" | "rainy" = "sunny";
  /** Demo storm path for sit-together mood. */
  private readonly forceWeather: "sunny" | "rainy" | null = "rainy";
  private readonly rainChance = 0.35;

  private step: StoryStep = "arrival";
  private busy = false;

  constructor() {
    super("RoomScene");
  }

  create(): void {
    const { width, height } = this.scale;
    this.weather =
      this.forceWeather ??
      (Math.random() < this.rainChance ? "rainy" : "sunny");

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

    this.game.events.on("ui:choice", this.onChoice, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off("ui:choice", this.onChoice, this);
    });

    // Let the room settle, then greet.
    this.time.delayedCall(700, () => this.showStep("arrival"));
  }

  // --- Story ---------------------------------------------------------------

  private showStep(step: StoryStep): void {
    this.step = step;
    this.busy = false;
    const d = DIALOGUE[step];
    this.game.events.emit("ui:dialogue", {
      speaker: d.speaker ?? "小伴",
      text: d.text,
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
        this.showStep("look_reply");
        return;
      }
    }

    // After either reply, sit quietly then rest.
    if (
      (this.step === "sit_reply" || this.step === "look_reply") &&
      id === "continue"
    ) {
      this.enterQuietThenRest();
      return;
    }

    if (this.step === "rest" && id === "again") {
      this.showStep("arrival");
    }
  };

  /** Hide card → breathe with the room → closing line. */
  private enterQuietThenRest(): void {
    this.busy = true;
    this.game.events.emit("ui:hide");
    this.time.delayedCall(QUIET_MS, () => {
      this.showStep("rest");
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
