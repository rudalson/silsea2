import { game } from "../src/main.js";
import { BOSS_SFX_KEYS } from "../src/data/bossAudio.js";
import "./boss-motion-runtime.js";

const labels = ["메롱 혀 공격", "메롱 약점", "테이프 투척", "테이프 부착", "테이프 약점", "음표 발사", "음악 약점", "구멍 개방", "구멍 약점", "구름 돌풍", "구름 비", "구름 약점"];
for (const [index, key] of BOSS_SFX_KEYS.entries()) {
  const label = document.createElement("label"), player = document.createElement("audio");
  label.textContent = labels[index]; player.controls = true; player.preload = "metadata"; player.volume = 0.35;
  player.src = `../assets/audio/sfx/${key}.wav`; player.setAttribute("aria-label", labels[index]);
  player.addEventListener("play", () => { game.sound.mute = true; for (const other of document.querySelectorAll("audio")) if (other !== player) other.pause(); });
  label.append(player); document.querySelector("#sounds").append(label);
}
document.querySelector("#run").addEventListener("click", () => { for (const player of document.querySelectorAll("audio")) player.pause(); });
