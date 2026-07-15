import Phaser from "phaser";

type Facing = "down" | "up" | "left" | "right";

/**
 * Player on the Player layer — Arcade body, feet-anchored sprite, y-depth.
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  private facing: Facing = "down";
  private moveTarget: Phaser.Math.Vector2 | null = null;
  private readonly arriveDist = 8;
  private readonly moveSpeed = 150;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "player-sheet", 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 0.9);
    this.setScale(0.7);
    this.setDepth(50);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(28, 20);
    body.setOffset((this.width - 28) / 2, this.height - 28);
    body.setCollideWorldBounds(false);
    body.setMaxVelocity(this.moveSpeed, this.moveSpeed);
  }

  /** Click-to-move target in world pixels. */
  setMoveTarget(x: number, y: number): void {
    this.moveTarget = new Phaser.Math.Vector2(x, y);
  }

  clearMoveTarget(): void {
    this.moveTarget = null;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    this.playIdle();
  }

  updatePlayer(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;

    if (!this.moveTarget) {
      if (body.velocity.lengthSq() > 1) {
        body.setVelocity(0, 0);
        this.playIdle();
      }
      this.setDepth(40 + this.y * 0.05);
      return;
    }

    const dist = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      this.moveTarget.x,
      this.moveTarget.y,
    );

    if (dist < this.arriveDist) {
      this.clearMoveTarget();
      this.setDepth(40 + this.y * 0.05);
      return;
    }

    this.scene.physics.moveTo(
      this,
      this.moveTarget.x,
      this.moveTarget.y,
      this.moveSpeed,
    );

    // Facing from velocity
    const vx = body.velocity.x;
    const vy = body.velocity.y;
    if (Math.abs(vx) > Math.abs(vy) * 0.85) {
      this.facing = vx < 0 ? "left" : "right";
    } else {
      this.facing = vy < 0 ? "up" : "down";
    }
    this.playWalk();
    this.setDepth(40 + this.y * 0.05);
  }

  private playWalk(): void {
    const anim =
      this.facing === "right" ? "walk-left" : `walk-${this.facing}`;
    this.setFlipX(this.facing === "right");
    if (this.anims.currentAnim?.key !== anim || !this.anims.isPlaying) {
      this.play(anim, true);
    }
  }

  private playIdle(): void {
    this.anims.stop();
    const frame: Record<Facing, number> = {
      down: 0,
      up: 4,
      left: 8,
      right: 8,
    };
    this.setFrame(frame[this.facing]);
    this.setFlipX(this.facing === "right");
  }
}
