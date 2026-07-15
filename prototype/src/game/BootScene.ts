import Phaser from "phaser";

/** Loads room + companion idle, then starts Room + UI. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload(): void {
    const { width, height } = this.scale;
    const barW = 240;
    const cx = width / 2;
    const cy = height / 2;

    this.add
      .text(cx, cy - 28, "一小角 · 載入中…", {
        fontFamily: "system-ui, 'PingFang TC', sans-serif",
        fontSize: "16px",
        color: "#e8dcc8",
      })
      .setOrigin(0.5);

    this.add.rectangle(cx, cy, barW, 10, 0x3a322c).setOrigin(0.5);
    const fill = this.add
      .rectangle(cx - barW / 2, cy, 4, 8, 0xc8b48a)
      .setOrigin(0, 0.5);

    this.load.on("progress", (value: number) => {
      fill.width = Math.max(4, (barW - 2) * value);
    });

    this.load.image("tea-room-sunny", "assets/iso/tea-room.jpg");
    this.load.image("tea-room-rainy", "assets/iso/tea-room-rainy.jpg");
    this.load.image("player-sit", "assets/character/player-sit.png");
  }

  create(): void {
    this.scene.start("RoomScene");
    this.scene.launch("UIScene");
  }
}
