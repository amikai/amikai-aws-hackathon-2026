import Phaser from "phaser";

/**
 * Fixed-position companion — back-sit looking toward window + soft breathe.
 * Uses player-sit art; no physics, no walk.
 */
export class Companion extends Phaser.GameObjects.Image {
  private baseScale: number;
  private baseY: number;
  private breathTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, x: number, y: number, scale: number) {
    super(scene, x, y, "player-sit");
    scene.add.existing(this);

    // Anchor near seat so she rests on the zabuton, facing shoji/window.
    this.setOrigin(0.5, 0.9);
    this.baseScale = scale;
    this.baseY = y;
    this.setScale(scale);
    this.setDepth(40 + y * 0.05);

    this.startBreathe();
  }

  /**
   * Gentle sit-breathe: slight chest rise + tiny vertical settle.
   * Slow and soft — calm, not bounce.
   */
  private startBreathe(): void {
    this.breathTween?.stop();
    this.setPosition(this.x, this.baseY);
    this.setScale(this.baseScale);

    this.breathTween = this.scene.tweens.add({
      targets: this,
      scaleX: this.baseScale * 1.012,
      scaleY: this.baseScale * 0.988,
      y: this.baseY + 1.2,
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  destroy(fromScene?: boolean): void {
    this.breathTween?.stop();
    super.destroy(fromScene);
  }
}
