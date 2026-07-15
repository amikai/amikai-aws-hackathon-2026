import Phaser from "phaser";

/**
 * Isometric-style cozy tea room.
 * Visual target: isometric pixel / polished 2.5D interior (like the office reference).
 * Room art: style-matched isometric tea room background.
 */

type MatchaStep = "idle" | "prepare" | "whisk" | "serve" | "done";

export class RoomScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private playerBody!: Phaser.GameObjects.Arc;
  private shadow!: Phaser.GameObjects.Ellipse;
  private room!: Phaser.GameObjects.Image;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private keyE!: Phaser.Input.Keyboard.Key;

  private promptText!: Phaser.GameObjects.Text;
  private holdBarBg!: Phaser.GameObjects.Rectangle;
  private holdBarFill!: Phaser.GameObjects.Rectangle;
  private teaMarker!: Phaser.GameObjects.Arc;

  /** Tea table hotspot in room-local normalized coords (0–1). */
  private teaN = { x: 0.52, y: 0.55 };
  private teaWorld = { x: 0, y: 0 };

  private nearTea = false;
  private matchaStep: MatchaStep = "idle";
  private whiskProgress = 0;
  private holding = false;

  private readonly speed = 160;
  private readonly interactR = 70;
  private readonly whiskSeconds = 2.2;

  /** Walkable polygon in normalized room coords (tatami platform). */
  private walkPolyN: { x: number; y: number }[] = [
    { x: 0.18, y: 0.42 },
    { x: 0.55, y: 0.28 },
    { x: 0.88, y: 0.48 },
    { x: 0.72, y: 0.78 },
    { x: 0.38, y: 0.88 },
    { x: 0.12, y: 0.62 },
  ];

  constructor() {
    super("RoomScene");
  }

  preload(): void {
    this.load.image("tea-room", "assets/iso/tea-room.jpg");
    for (let i = 0; i <= 5; i++) {
      this.load.image(`puff${i}`, `assets/kenney/smoke/whitePuff0${i}.png`);
    }
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(0x1a1410);

    // Soft vignette background
    const bg = this.add.graphics().setDepth(0);
    bg.fillGradientStyle(0x2a221c, 0x2a221c, 0x0e0b09, 0x0e0b09, 1);
    bg.fillRect(0, 0, width, height);

    this.room = this.add.image(width / 2, height / 2 - 8, "tea-room");
    this.fitRoom();
    this.room.setDepth(1);

    this.teaWorld = this.normToWorld(this.teaN.x, this.teaN.y);

    // Subtle tea pulse ring
    this.teaMarker = this.add
      .circle(this.teaWorld.x, this.teaWorld.y, 36, 0xc8e6a0, 0.0)
      .setDepth(5)
      .setStrokeStyle(2, 0xa8d070, 0.0);

    this.spawnPlayer();
    this.createHud();
    this.setupInput();

    this.add
      .text(width / 2, 18, "一小角 · 茶席", {
        fontFamily: "Georgia, 'Songti TC', 'Noto Serif TC', serif",
        fontSize: "22px",
        color: "#f3e9d8",
      })
      .setOrigin(0.5)
      .setDepth(100)
      .setAlpha(0.92);

    this.add
      .text(width / 2, height - 14, "等距風格 · 溫暖室內  ·  WASD 走動 · E 互動", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "11px",
        color: "#d8cbb8",
      })
      .setOrigin(0.5)
      .setDepth(100)
      .setAlpha(0.55);
  }

  update(_t: number, dtMs: number): void {
    const dt = dtMs / 1000;
    this.updateMovement(dt);
    this.updateDepth();
    this.updateProximity();
    this.updateMatcha(dt);
    this.updatePrompt();
    this.updateTeaFx();
  }

  // --- Layout --------------------------------------------------------------

  private fitRoom(): void {
    const { width, height } = this.scale;
    const margin = 24;
    const maxW = width - margin * 2;
    const maxH = height - 72;
    const scale = Math.min(maxW / this.room.width, maxH / this.room.height);
    this.room.setScale(scale);
  }

  private roomBounds(): { left: number; top: number; w: number; h: number } {
    const w = this.room.displayWidth;
    const h = this.room.displayHeight;
    return {
      left: this.room.x - w / 2,
      top: this.room.y - h / 2,
      w,
      h,
    };
  }

  private normToWorld(nx: number, ny: number): { x: number; y: number } {
    const b = this.roomBounds();
    return { x: b.left + nx * b.w, y: b.top + ny * b.h };
  }

  private worldToNorm(x: number, y: number): { x: number; y: number } {
    const b = this.roomBounds();
    return { x: (x - b.left) / b.w, y: (y - b.top) / b.h };
  }

  // --- Player --------------------------------------------------------------

  private spawnPlayer(): void {
    // Start near entrance path (bottom-left of tatami)
    const start = this.normToWorld(0.32, 0.72);
    this.player = this.add.container(start.x, start.y).setDepth(20);

    this.shadow = this.add.ellipse(0, 14, 28, 12, 0x000000, 0.25);
    this.playerBody = this.add.circle(0, 0, 13, 0xe8a090);
    const face = this.add.circle(0, -2, 10, 0xf8e6d8);
    const eyeL = this.add.circle(-3.5, -3, 1.6, 0x3a3028);
    const eyeR = this.add.circle(3.5, -3, 1.6, 0x3a3028);
    const blushL = this.add.circle(-5, 1, 2.2, 0xe89a90, 0.4);
    const blushR = this.add.circle(5, 1, 2.2, 0xe89a90, 0.4);
    const hair = this.add.ellipse(0, -11, 18, 9, 0x4a3830);

    this.player.add([
      this.shadow,
      hair,
      this.playerBody,
      face,
      blushL,
      blushR,
      eyeL,
      eyeR,
    ]);

    this.tweens.add({
      targets: this.playerBody,
      scaleY: 1.05,
      yoyo: true,
      repeat: -1,
      duration: 900,
      ease: "Sine.easeInOut",
    });
  }

  private updateMovement(dt: number): void {
    // Isometric feel: screen-space move, with W/S biased along depth
    let dx = 0;
    let dy = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      dx -= 1;
      dy += 0.35; // left = down-left on iso
    }
    if (this.cursors.right.isDown || this.wasd.D.isDown) {
      dx += 1;
      dy -= 0.35;
    }
    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      dx -= 0.35;
      dy -= 1;
    }
    if (this.cursors.down.isDown || this.wasd.S.isDown) {
      dx += 0.35;
      dy += 1;
    }

    if (dx === 0 && dy === 0) return;

    const len = Math.hypot(dx, dy);
    dx = (dx / len) * this.speed * dt;
    dy = (dy / len) * this.speed * dt;

    const nx = this.player.x + dx;
    const ny = this.player.y + dy;
    if (this.canStand(nx, ny)) {
      this.player.x = nx;
      this.player.y = ny;
    } else if (this.canStand(nx, this.player.y)) {
      this.player.x = nx;
    } else if (this.canStand(this.player.x, ny)) {
      this.player.y = ny;
    }
  }

  private canStand(x: number, y: number): boolean {
    const n = this.worldToNorm(x, y);
    return pointInPoly(n, this.walkPolyN);
  }

  private updateDepth(): void {
    // Fake isometric depth: lower on screen = in front
    this.player.setDepth(10 + this.player.y * 0.1);
  }

  // --- Interaction ---------------------------------------------------------

  private updateProximity(): void {
    const d = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.teaWorld.x,
      this.teaWorld.y,
    );
    this.nearTea = d < this.interactR;
  }

  private createHud(): void {
    const { width, height } = this.scale;
    this.promptText = this.add
      .text(width / 2, height - 52, "", {
        fontFamily: "system-ui, 'PingFang TC', sans-serif",
        fontSize: "15px",
        color: "#2a241c",
        backgroundColor: "#f7f0e4ee",
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5)
      .setDepth(200)
      .setAlpha(0);

    this.holdBarBg = this.add
      .rectangle(width / 2, height - 78, 168, 8, 0xd8cfc0, 1)
      .setDepth(200)
      .setVisible(false);
    this.holdBarFill = this.add
      .rectangle(width / 2 - 82, height - 78, 0, 6, 0x7a9b5c, 1)
      .setOrigin(0, 0.5)
      .setDepth(201)
      .setVisible(false);
  }

  private setupInput(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys("W,A,S,D") as typeof this.wasd;
    this.keyE = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    this.keyE.on("down", () => {
      if (!this.nearTea) return;
      if (this.matchaStep === "whisk") {
        this.holding = true;
        return;
      }
      this.advanceMatchaTap();
    });
    this.keyE.on("up", () => {
      this.holding = false;
    });
  }

  private advanceMatchaTap(): void {
    switch (this.matchaStep) {
      case "idle":
        this.matchaStep = "prepare";
        break;
      case "prepare":
        this.matchaStep = "whisk";
        this.whiskProgress = 0;
        break;
      case "serve":
        this.matchaStep = "done";
        this.burstSteam();
        break;
      case "done":
        this.matchaStep = "idle";
        this.whiskProgress = 0;
        break;
      default:
        break;
    }
  }

  private updateMatcha(dt: number): void {
    if (this.matchaStep === "whisk" && this.holding && this.nearTea) {
      this.whiskProgress = Math.min(1, this.whiskProgress + dt / this.whiskSeconds);
      if (this.whiskProgress >= 1) {
        this.holding = false;
        this.matchaStep = "serve";
      }
    }
  }

  private updatePrompt(): void {
    let msg = "";
    if (this.nearTea) {
      switch (this.matchaStep) {
        case "idle":
          msg = "按 E 開始泡抹茶";
          break;
        case "prepare":
          msg = "按 E 準備茶具";
          break;
        case "whisk":
          msg = `按住 E 刷茶  ${Math.floor(this.whiskProgress * 100)}%`;
          break;
        case "serve":
          msg = "按 E 盛茶";
          break;
        case "done":
          msg = "抹茶好了 · 慢慢喝（E 可再泡）";
          break;
      }
    }
    this.promptText.setAlpha(msg ? 1 : 0);
    if (msg) this.promptText.setText(msg);

    const show = this.nearTea && this.matchaStep === "whisk";
    this.holdBarBg.setVisible(show);
    this.holdBarFill.setVisible(show);
    if (show) this.holdBarFill.width = 164 * this.whiskProgress;
  }

  private updateTeaFx(): void {
    if (this.nearTea) {
      this.teaMarker.setFillStyle(0xc8e6a0, 0.08 + Math.sin(this.time.now / 400) * 0.04);
      this.teaMarker.setStrokeStyle(2, 0xa8d070, 0.45);
    } else {
      this.teaMarker.setFillStyle(0xc8e6a0, 0);
      this.teaMarker.setStrokeStyle(2, 0xa8d070, 0);
    }

    if (this.matchaStep === "done" && Math.random() < 0.015) {
      this.spawnPuff(this.teaWorld.x, this.teaWorld.y - 20, 0.12);
    }
  }

  private burstSteam(): void {
    for (let i = 0; i < 6; i++) {
      this.spawnPuff(
        this.teaWorld.x + Phaser.Math.Between(-16, 16),
        this.teaWorld.y - 18,
        0.14,
        i * 60,
      );
    }
  }

  private spawnPuff(x: number, y: number, scale: number, delay = 0): void {
    const s = this.add
      .image(x, y, `puff${Phaser.Math.Between(0, 5)}`)
      .setScale(scale)
      .setAlpha(0.45)
      .setDepth(50)
      .setTint(0xf5fff2);
    this.tweens.add({
      targets: s,
      y: y - 50,
      alpha: 0,
      scale: scale * 2.2,
      duration: 1400,
      delay,
      onComplete: () => s.destroy(),
    });
  }
}

function pointInPoly(
  p: { x: number; y: number },
  poly: { x: number; y: number }[],
): boolean {
  // Ray casting
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect =
      yi > p.y !== yj > p.y &&
      p.x < ((xj - xi) * (p.y - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
