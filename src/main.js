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

const container = document.querySelector("#game-container");
let game = null;

const startGame = () => {
  game = new Phaser.Game(gameConfig);
  container?.addEventListener("pointerdown", () => container.focus());
  window.addEventListener("beforeunload", () => game?.destroy(true));
  return game;
};

// Phaser의 Canvas 텍스트는 최초 렌더링 시점의 글꼴을 사용하므로,
// 로컬 한글 폰트가 준비된 다음에 게임을 시작한다.
if (document.fonts?.load) {
  document.fonts.load('16px "Silsea Jua"').finally(startGame);
} else {
  startGame();
}

export { game };
