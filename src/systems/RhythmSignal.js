import { CSS_COLORS, COLORS } from "../config/constants.js";
import { GAME_FONT_FAMILY } from "../config/font.js";

export const rhythmInputMoving = (input, tolerance) => Math.abs(input?.moveX ?? 0) > tolerance
  || Boolean(input?.jumpDown || input?.jumpPressed);

export class RhythmSignal {
  constructor(scene, x, y) {
    this.scene = scene;
    this.label = scene.add.text(x, y, "", { fontFamily: GAME_FONT_FAMILY, fontSize: "25px", align: "center",
      color: CSS_COLORS.white, backgroundColor: CSS_COLORS.panel, padding: { x: 18, y: 12 } }).setOrigin(0.5).setDepth(12);
    this.displayed = "";
  }
  show(state, config) {
    const remaining = Math.ceil(Math.max(0, config.stopMs - state.elapsedMs) / 1000);
    const text = { waiting: "♪ 안전한 건반에 착지해요", warning: "♪ 곧 정지 신호!\n이동·점프 키를 놓아요",
      stop: `■ 멈춰요  ${remaining}\n5초 동안 키에서 손을 떼요`, retry: "↻ 다시 준비해요\n다음 신호를 기다려요",
      success: "▶ 성공! 이제 이동해요" }[state.phase];
    if (text === this.displayed) return;
    this.displayed = text; this.label.setText(text).setColor(state.phase === "stop" ? CSS_COLORS.collect : CSS_COLORS.white);
    this.scene.updateAccessibleStatus?.(text.replaceAll("\n", ". "));
  }
  cue(phase) {
    const key = { warning: "sfx_rhythm_warning", stop: "sfx_rhythm_stop", success: "sfx_rhythm_go" }[phase];
    if (key) this.scene.audioManager?.playSfx(key, { randomizeRate: false });
  }
  hide() { this.label.setVisible(false); }
  reset() { this.displayed = ""; this.label.setVisible(true); }
  destroy() { this.label.destroy(); }
}

export function drawPianoKeys(graphics, { x, y, width }) {
  graphics.fillStyle(COLORS.white).fillRect(x, y, width, 20);
  graphics.lineStyle(2, COLORS.outline);
  for (let offset = 0; offset < width; offset += 48) {
    graphics.lineBetween(x + offset, y, x + offset, y + 20);
    if (offset + 30 < width && ![2, 6].includes(Math.floor(offset / 48) % 7)) graphics.fillStyle(COLORS.outline).fillRect(x + offset + 30, y, Math.min(15, width - offset - 30), 12);
  }
}
