import Phaser from "phaser";
import { COLORS, CSS_COLORS, GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from "../config/constants.js";
import { GAME_FONT_FAMILY } from "../config/font.js";
import { getCharacter } from "../data/characters.js";
import { getLevel, getNextLevel } from "../data/levels/index.js";
import { getObjectiveCelebrations } from "../data/objectivePresentation.js";
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
    this.reducedEffects = this.registry.get("screenEffectStrength") === "reduced";
    this.celebrations = getObjectiveCelebrations(level, this.result.achieved, 3);
    this.allCelebrations = getObjectiveCelebrations(level, this.result.achieved, Number.MAX_SAFE_INTEGER);
    this.cameras.main.setBackgroundColor(COLORS.near);
    this.inputManager = new InputManager(this);
    this.audioManager = new AudioManager(this);
    this.audioManager.playBgm(level.assets.bgm.clear, { loop: false });

    const celebrationDotCount = this.reducedEffects ? 12 : 34;
    for (let index = 0; index < celebrationDotCount; index += 1) {
      const colors = [COLORS.collect, COLORS.collectBlue, COLORS.collectPink];
      const dot = this.add.circle(
        Phaser.Math.Between(40, GAME_WIDTH - 40),
        Phaser.Math.Between(20, GAME_HEIGHT - 20),
        Phaser.Math.Between(3, 9),
        colors[index % colors.length],
        0.8
      );
      if (!this.reducedEffects) {
        this.tweens.add({ targets: dot, y: dot.y + Phaser.Math.Between(24, 80), duration: 900 + index * 24, yoyo: true, repeat: -1 });
      }
    }

    this.add.text(GAME_WIDTH / 2, 58, "STAGE CLEAR!", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "50px",
      fontStyle: "900",
      color: CSS_COLORS.collect,
      stroke: CSS_COLORS.outline,
      strokeThickness: 8
    }).setOrigin(0.5);

    CharacterAnimationManager.register(this, character);
    const victory = CharacterAnimationManager.getSpec(character, "victory");
    const hasArt = Boolean(victory && this.textures.exists(victory.textureKey));
    const texture = hasArt ? victory.textureKey : AssetManager.ensurePlayerTexture(this, character);
    const portrait = this.add.sprite(GAME_WIDTH / 2, 178, texture).setScale(1.45).setOrigin(0.5);
    if (hasArt) CharacterAnimationManager.play(portrait, character, "victory");
    this.add.text(GAME_WIDTH / 2, 292, `${character.name} · ${level.name}`, {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "27px",
      fontStyle: "800",
      color: CSS_COLORS.white
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 330, `기록  ${this.result.elapsed.toFixed(1)}초    ·    점수  ${this.result.score}%`, {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "20px",
      color: CSS_COLORS.soft
    }).setOrigin(0.5);

    this.createObjectiveCelebration(376, 445);
    this.updateAccessibleStatus(this.getAccessibleResultSummary(level, character));

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
          fontFamily: GAME_FONT_FAMILY,
          fontSize: "16px",
          fontStyle: "700",
          color: CSS_COLORS.white,
          lineSpacing: 6
        }
      ).setOrigin(0.5);
      this.exportButton = this.add.text(GAME_WIDTH / 2, 565, "E / 클릭 · 플레이테스트 JSON 저장", {
        fontFamily: GAME_FONT_FAMILY,
        fontSize: "17px",
        fontStyle: "800",
        color: CSS_COLORS.near,
        backgroundColor: CSS_COLORS.collectSoft,
        padding: { x: 16, y: 8 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      this.exportButton.on("pointerdown", () => this.exportPlaytest());
    }

    const actionY = playtestBundle ? 645 : 596;
    const nextLabelY = playtestBundle ? 605 : 548;
    this.add.text(GAME_WIDTH / 2, nextLabelY, next ? `다음 스테이지: ${next.name}` : "모든 스테이지를 완료했습니다!", {
      fontFamily: GAME_FONT_FAMILY,
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
      actionY + 55,
      next ? "Space / Z · 다음 스테이지   ·   Esc · 스테이지 선택" : "Space / Z / Esc · 스테이지 선택",
      {
        fontFamily: GAME_FONT_FAMILY,
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

  createObjectiveCelebration(headingY, cardY) {
    const { cards, totalAchieved, overflow } = this.celebrations;
    const heading = totalAchieved > 0
      ? `선택 목표 ${totalAchieved}개 달성${overflow ? ` · 대표 ${cards.length}개` : ""}`
      : "선택 목표는 다음 도전에서!";
    this.add.text(GAME_WIDTH / 2, headingY, heading, {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "20px",
      fontStyle: "800",
      color: totalAchieved > 0 ? CSS_COLORS.collect : CSS_COLORS.soft
    }).setOrigin(0.5);

    if (cards.length === 0) {
      this.add.rectangle(GAME_WIDTH / 2, cardY, 580, 82, COLORS.near, 0.9)
        .setStrokeStyle(2, COLORS.collectBlue, 0.7);
      this.add.text(GAME_WIDTH / 2, cardY, "별 · 비밀 · 시간 · 무피해 목표에 도전해 보세요", {
        fontFamily: GAME_FONT_FAMILY,
        fontSize: "17px",
        fontStyle: "700",
        color: CSS_COLORS.white
      }).setOrigin(0.5);
      return;
    }

    const gap = 304;
    cards.forEach((card, index) => {
      const x = GAME_WIDTH / 2 + (index - (cards.length - 1) / 2) * gap;
      this.createObjectiveCard(card, index, cards.length, x, cardY);
    });
  }

  createObjectiveCard(card, index, total, x, y) {
    const accents = [COLORS.collect, COLORS.collectBlue, COLORS.collectPink];
    const accent = accents[index % accents.length];
    const panel = this.add.rectangle(0, 0, 282, 104, COLORS.near, 0.96)
      .setStrokeStyle(3, accent, 1);
    const icon = this.add.circle(-108, -17, 24, accent, 1)
      .setStrokeStyle(2, COLORS.white, 0.9);
    const glyph = this.add.text(-108, -18, card.glyph, {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: card.glyph.length > 2 ? "13px" : "25px",
      fontStyle: "900",
      color: CSS_COLORS.near
    }).setOrigin(0.5);
    const title = this.add.text(-72, -36, card.title, {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "21px",
      fontStyle: "900",
      color: CSS_COLORS.white
    }).setOrigin(0, 0.5);
    const detail = this.add.text(-72, -4, card.detail, {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "15px",
      color: CSS_COLORS.soft
    }).setOrigin(0, 0.5);
    const status = this.add.text(-72, 28, `✓ 목표 달성  ${index + 1}/${total}`, {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "14px",
      fontStyle: "800",
      color: CSS_COLORS.collect
    }).setOrigin(0, 0.5);
    const container = this.add.container(x, this.reducedEffects ? y : y + 24, [panel, icon, glyph, title, detail, status])
      .setAlpha(0)
      .setScale(this.reducedEffects ? 1 : 0.92);
    const delay = index * (this.reducedEffects ? 180 : 260);
    this.tweens.add({
      targets: container,
      alpha: 1,
      y,
      scaleX: 1,
      scaleY: 1,
      delay,
      duration: this.reducedEffects ? 100 : 300,
      ease: this.reducedEffects ? "Linear" : "Back.Out",
      onStart: () => this.audioManager.playSfx("sfx_ui_select", {
        randomizeRate: false,
        rate: 1 + index * 0.06,
        volume: 0.55
      })
    });
  }

  getAccessibleResultSummary(level, character) {
    const cards = this.allCelebrations.cards;
    const objectiveSummary = cards.length > 0
      ? `선택 목표 ${cards.length}개 달성. ${cards.map(({ title, detail }) => `${title}, ${detail}`).join(". ")}.`
      : "달성한 선택 목표는 없습니다.";
    return `${level.name} 클리어. ${character.name}. 기록 ${this.result.elapsed.toFixed(1)}초. 점수 ${this.result.score}. ${objectiveSummary}`;
  }

  updateAccessibleStatus(message) {
    const status = document.querySelector("#game-status");
    if (status) status.textContent = message;
  }

  update() {
    const input = this.inputManager.sample();
    if (this.result.playtestBundle && input.exportPressed) this.exportPlaytest();
    if (input.confirmPressed) this.startNextLevel();
    if (input.pausePressed) this.goToStageSelect();
  }

  createActionButton(x, y, label, primary, onPress) {
    const button = this.add.text(x, y, label, {
      fontFamily: GAME_FONT_FAMILY,
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
