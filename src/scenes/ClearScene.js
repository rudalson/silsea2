import Phaser from "phaser";
import { COLORS, CSS_COLORS, GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from "../config/constants.js";
import { getCharacter } from "../data/characters.js";
import { getLevel, getNextLevel } from "../data/levels/index.js";
import { AssetManager } from "../systems/AssetManager.js";
import { AudioManager } from "../systems/AudioManager.js";
import { CharacterAnimationManager } from "../systems/CharacterAnimationManager.js";
import { InputManager } from "../systems/InputManager.js";
import { downloadPlaytestBundle } from "../systems/PlaytestManager.js";

export class ClearScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.CLEAR);
  }

  init(data) {
    this.result = data;
  }

  create() {
    const level = getLevel(this.result.levelId);
    const next = getNextLevel(level.id);
    this.nextLevel = next;
    this.starting = false;
    const character = getCharacter(this.result.characterId);
    const playtestBundle = this.result.playtestBundle ?? null;
    this.cameras.main.setBackgroundColor(COLORS.near);
    this.inputManager = new InputManager(this);
    this.audioManager = new AudioManager(this);
    this.audioManager.playBgm(level.assets.bgm.clear, { loop: false });

    for (let index = 0; index < 34; index += 1) {
      const colors = [COLORS.collect, COLORS.collectBlue, COLORS.collectPink];
      const dot = this.add.circle(
        Phaser.Math.Between(40, GAME_WIDTH - 40),
        Phaser.Math.Between(20, GAME_HEIGHT - 20),
        Phaser.Math.Between(3, 9),
        colors[index % colors.length],
        0.8
      );
      this.tweens.add({ targets: dot, y: dot.y + Phaser.Math.Between(24, 80), duration: 900 + index * 24, yoyo: true, repeat: -1 });
    }

    this.add.text(GAME_WIDTH / 2, 104, "STAGE CLEAR!", {
      fontFamily: "system-ui",
      fontSize: "58px",
      fontStyle: "900",
      color: CSS_COLORS.collect,
      stroke: CSS_COLORS.outline,
      strokeThickness: 8
    }).setOrigin(0.5);

    CharacterAnimationManager.register(this, character);
    const victory = CharacterAnimationManager.getSpec(character, "victory");
    const hasArt = Boolean(victory && this.textures.exists(victory.textureKey));
    const texture = hasArt ? victory.textureKey : AssetManager.ensurePlayerTexture(this, character);
    const portrait = this.add.sprite(GAME_WIDTH / 2, 290, texture).setScale(1.9).setOrigin(0.5);
    if (hasArt) CharacterAnimationManager.play(portrait, character, "victory");
    this.add.text(GAME_WIDTH / 2, 410, `${character.name} · ${level.name}`, {
      fontFamily: "system-ui",
      fontSize: "27px",
      fontStyle: "800",
      color: CSS_COLORS.white
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 472, `기록  ${this.result.elapsed.toFixed(1)}초    ·    점수  ${this.result.score}%`, {
      fontFamily: "system-ui",
      fontSize: "20px",
      color: CSS_COLORS.soft
    }).setOrigin(0.5);
    if (playtestBundle) {
      const session = playtestBundle.currentSession;
      const analysis = playtestBundle.analysis;
      const remaining = analysis.remainingTesters > 0
        ? `조정 판단까지 서로 다른 테스트 ID ${analysis.remainingTesters}명 더 필요`
        : "3명 기록 확보 · 두 명 이상 겹친 구간을 JSON에서 확인";
      this.add.text(
        GAME_WIDTH / 2,
        520,
        `PLAYTEST ${session.testerId} · 피격 ${session.metrics.hits} · 추락 ${session.metrics.falls} · 정체 ${session.metrics.stalls}\n${remaining}`,
        {
          align: "center",
          fontFamily: "system-ui",
          fontSize: "16px",
          fontStyle: "700",
          color: CSS_COLORS.white,
          lineSpacing: 6
        }
      ).setOrigin(0.5);
      this.exportButton = this.add.text(GAME_WIDTH / 2, 580, "E / 클릭 · 플레이테스트 JSON 저장", {
        fontFamily: "system-ui",
        fontSize: "17px",
        fontStyle: "800",
        color: CSS_COLORS.near,
        backgroundColor: CSS_COLORS.collectSoft,
        padding: { x: 16, y: 8 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      this.exportButton.on("pointerdown", () => this.exportPlaytest());
    }

    const actionY = playtestBundle ? 618 : 558;
    this.add.text(GAME_WIDTH / 2, actionY - 50, next ? `다음 스테이지: ${next.name}` : "모든 스테이지를 완료했습니다!", {
      fontFamily: "system-ui",
      fontSize: "18px",
      color: CSS_COLORS.collectBlue
    }).setOrigin(0.5);

    if (next) {
      this.createActionButton(GAME_WIDTH / 2 - 190, actionY, "다음 스테이지 시작", true, () => this.startNextLevel());
      this.createActionButton(GAME_WIDTH / 2 + 190, actionY, "스테이지 선택", false, () => this.goToStageSelect());
    } else {
      this.createActionButton(GAME_WIDTH / 2, actionY, "스테이지 선택", true, () => this.goToStageSelect());
    }
    this.add.text(
      GAME_WIDTH / 2,
      actionY + 58,
      next ? "Space / Z · 다음 스테이지   ·   Esc · 스테이지 선택" : "Space / Z / Esc · 스테이지 선택",
      {
        fontFamily: "system-ui",
        fontSize: "15px",
        fontStyle: "700",
        color: CSS_COLORS.white
      }
    ).setOrigin(0.5);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.inputManager.destroy();
      this.audioManager.destroy();
    });
  }

  update() {
    const input = this.inputManager.sample();
    if (this.result.playtestBundle && input.exportPressed) this.exportPlaytest();
    if (input.confirmPressed) this.startNextLevel();
    if (input.pausePressed) this.goToStageSelect();
  }

  createActionButton(x, y, label, primary, onPress) {
    const button = this.add.text(x, y, label, {
      fontFamily: "system-ui",
      fontSize: "19px",
      fontStyle: "800",
      color: primary ? CSS_COLORS.near : CSS_COLORS.white,
      backgroundColor: primary ? CSS_COLORS.collect : CSS_COLORS.panelSoft,
      padding: { x: 20, y: 11 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    button.on("pointerover", () => button.setScale(1.05));
    button.on("pointerout", () => button.setScale(1));
    button.on("pointerdown", onPress);
    return button;
  }

  startNextLevel() {
    if (this.starting) return;
    if (!this.nextLevel) {
      this.goToStageSelect();
      return;
    }
    this.starting = true;
    this.audioManager.playSfx("sfx_ui_select", { randomizeRate: false });
    this.registry.set("levelId", this.nextLevel.id);
    this.scene.start(SCENE_KEYS.PRELOAD, { levelId: this.nextLevel.id });
  }

  goToStageSelect() {
    if (this.starting) return;
    this.starting = true;
    this.audioManager.playSfx("sfx_ui_select", { randomizeRate: false });
    this.scene.start(SCENE_KEYS.STAGE_SELECT);
  }

  exportPlaytest() {
    if (!downloadPlaytestBundle(this.result.playtestBundle)) return;
    this.audioManager.playSfx("sfx_ui_select", { randomizeRate: false });
    this.exportButton?.setText("저장 완료 · JSON 파일 확인");
  }
}
