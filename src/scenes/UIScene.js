import Phaser from "phaser";
import { COLORS, CSS_COLORS, EVENTS, GAME_WIDTH, SCENE_KEYS } from "../config/constants.js";
import { InputManager } from "../systems/InputManager.js";

export class UIScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.UI);
  }

  init(data) {
    this.gameSceneKey = data.gameSceneKey;
  }

  create() {
    this.gameScene = this.scene.get(this.gameSceneKey);
    this.inputManager = new InputManager(this);

    this.add.rectangle(170, 48, 316, 72, COLORS.near, 0.9).setStrokeStyle(3, COLORS.mid).setScrollFactor(0);
    this.characterText = this.add.text(28, 24, "", {
      fontFamily: "system-ui",
      fontSize: "18px",
      fontStyle: "800",
      color: CSS_COLORS.white
    }).setScrollFactor(0);
    this.hpText = this.add.text(28, 50, "HP ♥ ♥ ♥", {
      fontFamily: "system-ui",
      fontSize: "16px",
      color: CSS_COLORS.collect
    }).setScrollFactor(0);

    this.add.rectangle(GAME_WIDTH / 2, 44, 310, 64, COLORS.near, 0.88).setStrokeStyle(3, COLORS.mid).setScrollFactor(0);
    this.scoreText = this.add.text(GAME_WIDTH / 2, 31, "PERCENT 0%", {
      fontFamily: "system-ui",
      fontSize: "20px",
      fontStyle: "900",
      color: CSS_COLORS.collect
    }).setOrigin(0.5).setScrollFactor(0);
    this.objectiveText = this.add.text(GAME_WIDTH / 2, 56, "목표 0/0", {
      fontFamily: "system-ui",
      fontSize: "13px",
      color: CSS_COLORS.soft
    }).setOrigin(0.5).setScrollFactor(0);

    this.fpsText = this.add.text(GAME_WIDTH - 24, 26, "FPS —\nEsc 일시정지", {
      align: "right",
      fontFamily: "system-ui",
      fontSize: "14px",
      color: CSS_COLORS.white,
      backgroundColor: CSS_COLORS.panelSoft,
      padding: { x: 10, y: 7 }
    }).setOrigin(1, 0).setScrollFactor(0);

    this.bossText = this.add.text(GAME_WIDTH / 2, 112, "", {
      fontFamily: "system-ui",
      fontSize: "19px",
      fontStyle: "800",
      color: CSS_COLORS.white,
      backgroundColor: CSS_COLORS.dangerSoft,
      padding: { x: 20, y: 8 }
    }).setOrigin(0.5).setScrollFactor(0).setVisible(false);

    this.toast = this.add.text(GAME_WIDTH / 2, 164, "", {
      fontFamily: "system-ui",
      fontSize: "20px",
      fontStyle: "700",
      color: CSS_COLORS.near,
      backgroundColor: CSS_COLORS.collectSoft,
      padding: { x: 16, y: 8 }
    }).setOrigin(0.5).setScrollFactor(0).setAlpha(0);

    this.pauseOverlay = this.add.container(0, 0).setScrollFactor(0).setDepth(100).setVisible(false);
    this.pauseOverlay.add(this.add.rectangle(640, 360, 1280, 720, COLORS.near, 0.72));
    this.pauseOverlay.add(this.add.text(640, 318, "일시정지", {
      fontFamily: "system-ui",
      fontSize: "52px",
      fontStyle: "900",
      color: CSS_COLORS.white
    }).setOrigin(0.5));
    this.pauseOverlay.add(this.add.text(640, 395, "Esc / 게임패드 Start로 계속", {
      fontFamily: "system-ui",
      fontSize: "20px",
      color: CSS_COLORS.soft
    }).setOrigin(0.5));

    this.onCheckpoint = (checkpoint) => this.showToast(`${checkpoint.id} 체크포인트!`);
    this.onBossHit = ({ hp, maxHp }) => {
      this.bossText.setText(`감자 대왕  ${"●".repeat(hp)}${"○".repeat(maxHp - hp)}`).setVisible(true);
    };
    this.onBossDefeated = () => this.showToast("보스 격파! 게이트가 열렸어요");
    this.gameScene.events.on(EVENTS.CHECKPOINT, this.onCheckpoint);
    this.gameScene.events.on(EVENTS.BOSS_HIT, this.onBossHit);
    this.gameScene.events.on(EVENTS.BOSS_DEFEATED, this.onBossDefeated);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());
  }

  update() {
    const input = this.inputManager.sample();
    if (input.pausePressed) this.togglePause();
    if (!this.gameScene?.player) return;

    this.characterText.setText(this.gameScene.character.name);
    this.scoreText.setText(`PERCENT ${this.gameScene.scoreManager?.displayScore ?? 0}%`);
    const objectives = this.gameScene.objectiveManager?.getSnapshot() ?? [];
    const required = objectives.filter((objective) => objective.required);
    this.objectiveText.setText(`목표 ${required.filter((objective) => objective.complete).length}/${required.length}`);
    this.fpsText.setText(`FPS ${Math.round(this.game.loop.actualFps)}\nEsc 일시정지 · \` 디버그`);

    const section = this.gameScene.levelLoader?.getSectionAt(this.gameScene.player.x);
    if (section?.type === "boss" && this.gameScene.levelLoader.boss?.active) {
      const boss = this.gameScene.levelLoader.boss;
      const hp = boss.getData("hp");
      const maxHp = boss.getData("maxHp");
      this.bossText.setText(`감자 대왕  ${"●".repeat(hp)}${"○".repeat(maxHp - hp)}`).setVisible(true);
    } else if (!this.gameScene.levelLoader?.boss?.active) {
      this.bossText.setVisible(false);
    }
  }

  togglePause() {
    if (this.gameScene.scene.isPaused()) {
      this.gameScene.scene.resume();
      this.pauseOverlay.setVisible(false);
    } else {
      this.gameScene.scene.pause();
      this.pauseOverlay.setVisible(true);
    }
  }

  showToast(message) {
    this.toast.setText(message).setAlpha(1).setY(164);
    this.tweens.killTweensOf(this.toast);
    this.tweens.add({ targets: this.toast, alpha: 0, y: 144, delay: 750, duration: 350 });
  }

  shutdown() {
    this.inputManager?.destroy();
    this.gameScene?.events.off(EVENTS.CHECKPOINT, this.onCheckpoint);
    this.gameScene?.events.off(EVENTS.BOSS_HIT, this.onBossHit);
    this.gameScene?.events.off(EVENTS.BOSS_DEFEATED, this.onBossDefeated);
  }
}
