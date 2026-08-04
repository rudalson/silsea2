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

    this.add.rectangle(190, 58, 356, 94, COLORS.near, 0.9).setStrokeStyle(3, COLORS.mid).setScrollFactor(0);
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
    this.formText = this.add.text(178, 25, "기본형", {
      fontFamily: "system-ui",
      fontSize: "15px",
      fontStyle: "700",
      color: CSS_COLORS.collectBlue
    }).setScrollFactor(0);
    this.flightTrack = this.add.rectangle(210, 76, 200, 10, COLORS.mid, 0.8).setOrigin(0, 0.5).setScrollFactor(0);
    this.flightBar = this.add.rectangle(210, 76, 200, 10, COLORS.collectBlue, 1).setOrigin(0, 0.5).setScrollFactor(0);

    this.add.rectangle(GAME_WIDTH / 2, 44, 310, 64, COLORS.near, 0.88).setStrokeStyle(3, COLORS.mid).setScrollFactor(0);
    this.scoreText = this.add.text(GAME_WIDTH / 2, 31, "PERCENT 0%", {
      fontFamily: "system-ui",
      fontSize: "20px",
      fontStyle: "900",
      color: CSS_COLORS.collect
    }).setOrigin(0.5).setScrollFactor(0).setFixedSize(300, 28).setAlign("center");
    this.objectiveText = this.add.text(GAME_WIDTH / 2, 56, "목표 0/0", {
      fontFamily: "system-ui",
      fontSize: "13px",
      color: CSS_COLORS.soft
    }).setOrigin(0.5).setScrollFactor(0);
    this.comboText = this.add.text(GAME_WIDTH / 2 + 185, 31, "", {
      fontFamily: "system-ui",
      fontSize: "17px",
      fontStyle: "900",
      color: CSS_COLORS.collectPink
    }).setOrigin(0, 0.5).setScrollFactor(0);

    this.fpsText = this.add.text(GAME_WIDTH - 24, 26, "FPS —\nEsc 일시정지", {
      align: "right",
      fontFamily: "system-ui",
      fontSize: "14px",
      color: CSS_COLORS.white,
      backgroundColor: CSS_COLORS.panelSoft,
      padding: { x: 10, y: 7 }
    }).setOrigin(1, 0).setScrollFactor(0).setVisible(this.registry.get("debugEnabled"));

    this.shakeButton = this.add.text(GAME_WIDTH - 24, 88, "", {
      align: "right",
      fontFamily: "system-ui",
      fontSize: "14px",
      fontStyle: "700",
      color: CSS_COLORS.collectBlue,
      backgroundColor: CSS_COLORS.panelSoft,
      padding: { x: 10, y: 7 }
    }).setOrigin(1, 0).setScrollFactor(0).setInteractive({ useHandCursor: true });
    this.shakeButton.on("pointerdown", () => this.toggleScreenShake());
    this.renderShakeSetting();

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
    this.pauseOverlay.add(this.add.text(640, 395, "Esc / 게임패드 Start로 계속\nV 화면 흔들림 켜기/끄기", {
      align: "center",
      fontFamily: "system-ui",
      fontSize: "20px",
      color: CSS_COLORS.soft
    }).setOrigin(0.5));

    this.onCheckpoint = (checkpoint) => this.showToast(`${checkpoint.id} 체크포인트!`);
    this.onBossHit = ({ hp, maxHp }) => {
      this.bossText.setText(`감자 대왕  ${"●".repeat(hp)}${"○".repeat(maxHp - hp)}`).setVisible(true);
    };
    this.onBossDefeated = () => this.showToast("보스 격파! 게이트가 열렸어요");
    this.onFormChanged = ({ form }) => this.showToast(`${this.formName(form)} 변신!`);
    this.onFormWarning = () => this.showToast("알리콘 종료까지 3초!");
    this.onItemCollected = ({ type }) => {
      if (type === "percent_large") this.showToast("대형 퍼센트 +100!");
    };
    this.gameScene.events.on(EVENTS.CHECKPOINT, this.onCheckpoint);
    this.gameScene.events.on(EVENTS.BOSS_HIT, this.onBossHit);
    this.gameScene.events.on(EVENTS.BOSS_DEFEATED, this.onBossDefeated);
    this.gameScene.events.on(EVENTS.FORM_CHANGED, this.onFormChanged);
    this.gameScene.events.on(EVENTS.FORM_WARNING, this.onFormWarning);
    this.gameScene.events.on(EVENTS.ITEM_COLLECTED, this.onItemCollected);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());
  }

  update() {
    const input = this.inputManager.sample();
    if (input.pausePressed) this.togglePause();
    if (input.shakeTogglePressed) this.toggleScreenShake();
    if (!this.gameScene?.player) return;

    this.characterText.setText(this.gameScene.character.name);
    const hp = this.gameScene.healthManager?.hp ?? 0;
    const maxHp = this.gameScene.healthManager?.maxHp ?? 0;
    this.hpText.setText(`HP ${"♥ ".repeat(hp)}${"♡ ".repeat(Math.max(0, maxHp - hp))}`.trim());
    this.scoreText.setText(`PERCENT ${Math.round(this.gameScene.scoreManager?.displayScore ?? 0)}%`);
    const combo = this.gameScene.scoreManager?.combo ?? 0;
    this.comboText.setText(combo >= 2 ? `${combo} COMBO` : "");
    const form = this.gameScene.transformationManager?.getSnapshot(this.gameScene.time.now);
    this.formText.setText(this.formName(form?.form));
    const ratio = form ? form.flightMs / form.flightMaxMs : 1;
    this.flightBar.setScale(Math.max(0.001, ratio), 1);
    this.flightTrack.setVisible(form?.form === "pegasus");
    this.flightBar.setVisible(form?.form === "pegasus");
    const objectives = this.gameScene.objectiveManager?.getSnapshot() ?? [];
    const required = objectives.filter((objective) => objective.required);
    this.objectiveText.setText(`목표 ${required.filter((objective) => objective.complete).length}/${required.length}`);
    if (this.registry.get("debugEnabled")) {
      this.fpsText.setText(`FPS ${Math.round(this.game.loop.actualFps)}\nEsc 일시정지 · \` 디버그`);
    }

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

  toggleScreenShake() {
    const enabled = this.gameScene.cameraEffects?.toggle() ?? false;
    this.gameScene.audioManager?.playSfx("sfx_ui_select", { randomizeRate: false });
    this.renderShakeSetting();
    this.showToast(`화면 흔들림 ${enabled ? "켜짐" : "꺼짐"}`);
    this.gameScene.updateAccessibleStatus(`화면 흔들림을 ${enabled ? "켰습니다" : "껐습니다"}.`);
  }

  renderShakeSetting() {
    const enabled = this.gameScene.cameraEffects?.enabled ?? false;
    this.shakeButton
      .setText(`화면 흔들림 ${enabled ? "ON" : "OFF"} · V`)
      .setColor(enabled ? CSS_COLORS.collectBlue : CSS_COLORS.soft);
  }

  showToast(message) {
    this.toast.setText(message).setAlpha(1).setY(164);
    this.tweens.killTweensOf(this.toast);
    this.tweens.add({ targets: this.toast, alpha: 0, y: 144, delay: 750, duration: 350 });
  }

  formName(form) {
    return ({ base: "기본형", unicorn: "유니콘", pegasus: "페가수스", alicorn: "알리콘" })[form] ?? "기본형";
  }

  shutdown() {
    this.inputManager?.destroy();
    this.shakeButton?.removeAllListeners();
    this.gameScene?.events.off(EVENTS.CHECKPOINT, this.onCheckpoint);
    this.gameScene?.events.off(EVENTS.BOSS_HIT, this.onBossHit);
    this.gameScene?.events.off(EVENTS.BOSS_DEFEATED, this.onBossDefeated);
    this.gameScene?.events.off(EVENTS.FORM_CHANGED, this.onFormChanged);
    this.gameScene?.events.off(EVENTS.FORM_WARNING, this.onFormWarning);
    this.gameScene?.events.off(EVENTS.ITEM_COLLECTED, this.onItemCollected);
  }
}
