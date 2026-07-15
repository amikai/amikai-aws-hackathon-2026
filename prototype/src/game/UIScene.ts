import Phaser from "phaser";
import type { ChoiceDef, FactBlock } from "./story";

export type DialoguePayload = {
  speaker?: string;
  beat?: number;
  beatTotal?: number;
  text: string;
  fact?: FactBlock;
  choices?: ChoiceDef[];
  /** Optional free-text field (e.g. diary feeling). */
  allowInput?: {
    placeholder: string;
  };
};

export type ChoicePayload = {
  id: string;
  text?: string;
};

/**
 * HTML dialogue card — crisp type, optional fact block, side-by-side choices.
 */
export class UIScene extends Phaser.Scene {
  private overlay!: HTMLDivElement;
  private beatEl!: HTMLSpanElement;
  private speakerEl!: HTMLSpanElement;
  private bodyEl!: HTMLParagraphElement;
  private factEl!: HTMLDivElement;
  private inputWrap!: HTMLDivElement;
  private inputEl: HTMLTextAreaElement | null = null;
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
        <span class="dlg-beat" hidden></span>
        <span class="dlg-speaker"></span>
        <p class="dlg-body"></p>
        <div class="dlg-fact" hidden></div>
        <div class="dlg-input-wrap" hidden></div>
        <div class="dlg-choices"></div>
      </div>
    `;
    parent.appendChild(this.overlay);

    this.beatEl = this.overlay.querySelector(".dlg-beat")!;
    this.speakerEl = this.overlay.querySelector(".dlg-speaker")!;
    this.bodyEl = this.overlay.querySelector(".dlg-body")!;
    this.factEl = this.overlay.querySelector(".dlg-fact")!;
    this.inputWrap = this.overlay.querySelector(".dlg-input-wrap")!;
    this.choicesEl = this.overlay.querySelector(".dlg-choices")!;
    this.overlay.hidden = true;
  }

  private onDialogue = (payload: DialoguePayload) => {
    this.speakerEl.textContent = payload.speaker ?? "小伴";
    this.bodyEl.textContent = payload.text;

    if (payload.beat != null && payload.beatTotal != null) {
      this.beatEl.hidden = false;
      this.beatEl.textContent = `${payload.beat} / ${payload.beatTotal}`;
    } else {
      this.beatEl.hidden = true;
      this.beatEl.textContent = "";
    }

    if (payload.fact) {
      this.factEl.hidden = false;
      this.factEl.innerHTML = `
        <div class="dlg-fact-title">${escapeHtml(payload.fact.title)}</div>
        <ul class="dlg-fact-list">
          ${payload.fact.lines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}
        </ul>
      `;
    } else {
      this.factEl.hidden = true;
      this.factEl.innerHTML = "";
    }

    this.clearInput();
    if (payload.allowInput) {
      const ta = document.createElement("textarea");
      ta.className = "dlg-input";
      ta.rows = 2;
      ta.maxLength = 200;
      ta.placeholder = payload.allowInput.placeholder;
      ta.setAttribute("aria-label", payload.allowInput.placeholder);
      this.inputEl = ta;
      this.inputWrap.replaceChildren(ta);
      this.inputWrap.hidden = false;
    }

    this.choicesEl.replaceChildren();
    const choices = payload.choices ?? [];
    this.choicesEl.dataset.count = String(choices.length);
    this.choicesEl.classList.toggle("dlg-choices--wrap", choices.length >= 3);

    for (const c of choices) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = c.primary ? "dlg-choice dlg-choice--primary" : "dlg-choice";
      btn.textContent = c.label;
      btn.addEventListener("click", () => {
        const payload: ChoicePayload = { id: c.id };
        const raw = this.inputEl?.value.trim();
        if (raw) payload.text = raw;
        this.game.events.emit("ui:choice", payload);
      });
      this.choicesEl.appendChild(btn);
    }

    this.overlay.hidden = false;
    this.overlay.classList.remove("dlg-enter");
    void this.overlay.offsetWidth;
    this.overlay.classList.add("dlg-enter");

    if (this.inputEl) {
      // Defer so the enter animation doesn't steal focus awkwardly.
      this.time.delayedCall(50, () => this.inputEl?.focus());
    }
  };

  private clearInput(): void {
    this.inputEl = null;
    this.inputWrap.replaceChildren();
    this.inputWrap.hidden = true;
  }

  private hidePanel = () => {
    this.overlay.classList.remove("dlg-enter");
    this.overlay.hidden = true;
    this.choicesEl.replaceChildren();
    this.factEl.hidden = true;
    this.factEl.innerHTML = "";
    this.clearInput();
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
