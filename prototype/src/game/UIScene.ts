import Phaser from "phaser";
import type { ChoiceDef } from "./story";

export type DialoguePayload = {
  speaker?: string;
  text: string;
  choices?: ChoiceDef[];
};

/**
 * HTML dialogue card — crisp type, rounded corners, side-by-side choices.
 */
export class UIScene extends Phaser.Scene {
  private overlay!: HTMLDivElement;
  private speakerEl!: HTMLSpanElement;
  private bodyEl!: HTMLParagraphElement;
  private choicesEl!: HTMLDivElement;

  constructor() {
    super("UIScene");
  }

  create(): void {
    this.mountOverlay();

    this.game.events.on("ui:dialogue", this.onDialogue, this);
    this.game.events.on("ui:hide", this.hidePanel, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off("ui:dialogue", this.onDialogue, this);
      this.game.events.off("ui:hide", this.hidePanel, this);
      this.overlay.remove();
    });
  }

  private mountOverlay(): void {
    const parent = this.game.canvas.parentElement;
    if (!parent) throw new Error("canvas parent missing");

    parent.style.position = "relative";

    this.overlay = document.createElement("div");
    this.overlay.className = "dlg-root";
    this.overlay.innerHTML = `
      <div class="dlg-card" role="dialog" aria-live="polite">
        <span class="dlg-speaker"></span>
        <p class="dlg-body"></p>
        <div class="dlg-choices"></div>
      </div>
    `;
    parent.appendChild(this.overlay);

    this.speakerEl = this.overlay.querySelector(".dlg-speaker")!;
    this.bodyEl = this.overlay.querySelector(".dlg-body")!;
    this.choicesEl = this.overlay.querySelector(".dlg-choices")!;
    this.overlay.hidden = true;
  }

  private onDialogue = (payload: DialoguePayload) => {
    this.speakerEl.textContent = payload.speaker ?? "小伴";
    this.bodyEl.textContent = payload.text;
    this.choicesEl.replaceChildren();

    const choices = payload.choices ?? [];
    // One choice → still full-width row for a calm "continue" feel.
    this.choicesEl.dataset.count = String(choices.length);

    for (const c of choices) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = c.primary ? "dlg-choice dlg-choice--primary" : "dlg-choice";
      btn.textContent = c.label;
      btn.addEventListener("click", () => {
        this.game.events.emit("ui:choice", c.id);
      });
      this.choicesEl.appendChild(btn);
    }

    this.overlay.hidden = false;
    // Retrigger enter animation
    this.overlay.classList.remove("dlg-enter");
    void this.overlay.offsetWidth;
    this.overlay.classList.add("dlg-enter");
  };

  private hidePanel = () => {
    this.overlay.classList.remove("dlg-enter");
    this.overlay.hidden = true;
    this.choicesEl.replaceChildren();
  };
}
