import Phaser from "phaser";
import { RoomScene } from "./game/RoomScene";
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
  roundPixels: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [RoomScene],
});
