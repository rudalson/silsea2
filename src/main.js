import Phaser from "phaser";
import "./styles.css";
import { gameConfig } from "./config/gameConfig.js";
import { PALETTE } from "./data/palette.js";

const root = document.documentElement;
root.style.setProperty("--color-deep", PALETTE.environmentNear[1]);
root.style.setProperty("--color-ground", PALETTE.environmentNear[2]);
root.style.setProperty("--color-mid", PALETTE.environmentMid[0]);
root.style.setProperty("--color-soft", PALETTE.environmentFar[0]);
root.style.setProperty("--color-white", PALETTE.highlight[0]);
root.style.setProperty("--color-collect", PALETTE.collect[0]);
root.style.setProperty("--color-outline", PALETTE.environmentNeutral[0]);

const game = new Phaser.Game(gameConfig);
const container = document.querySelector("#game-container");

container?.addEventListener("pointerdown", () => container.focus());
window.addEventListener("beforeunload", () => game.destroy(true));

export default game;
