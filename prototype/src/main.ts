import Phaser from "phaser";
import { BootScene } from "./game/BootScene";
import { RoomScene } from "./game/RoomScene";
import { UIScene } from "./game/UIScene";
import "./style.css";

const parent = document.querySelector<HTMLDivElement>("#app");
if (!parent) {
  throw new Error("#app missing");
}

parent.innerHTML = "";

new Phaser.Game({
  type: Phaser.AUTO,
  parent,
  width: 1100,
  height: 720,
  backgroundColor: "#1a1410",
  pixelArt: false,
  antialias: true,
  roundPixels: true,
  // No physics — point-and-click room, not free-roam.
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, RoomScene, UIScene],
});
