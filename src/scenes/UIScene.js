import Phaser from "phaser";
import { COLORS, CSS_COLORS, EVENTS, GAME_WIDTH, SCENE_KEYS } from "../config/constants.js";
import { GAME_FONT_FAMILY } from "../config/font.js";
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

    const hasUiArt = this.textures.exists("ui_hud_frame");
    if (hasUiArt) {
      this.add.image(208, 76, "ui_hud_frame").setScale(0.3).setScrollFactor(0);
    } else {
      this.add.rectangle(208, 76, 382, 132, COLORS.near, 0.92).setStrokeStyle(3, COLORS.mid).setScrollFactor(0);
    }
    this.characterText = this.add.text(42, 25, "", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "20px",
      fontStyle: "800",
      color: CSS_COLORS.white,
      stroke: CSS_COLORS.panel,
      strokeThickness: 4
    }).setScrollFactor(0);
    this.hpLabel = this.add.text(43, 57, "HP 3 / 3", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "13px",
      fontStyle: "800",
      color: CSS_COLORS.collectPink,
      stroke: CSS_COLORS.panel,
      strokeThickness: 2
    }).setScrollFactor(0);
    this.heartIcons = [];
    for (let index = 0; index < 3; index += 1) {
      const heart = hasUiArt
        ? this.add.image(94 + index * 35, 76, "ui_hud_heart").setScale(0.09)
        : this.add.text(89 + index * 30, 64, "♥", { fontSize: "24px", color: CSS_COLORS.collect });
      heart.setScrollFactor(0);
      this.heartIcons.push(heart);
    }
    this.formText = this.add.text(226, 55, "기본형", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "15px",
      fontStyle: "700",
      color: CSS_COLORS.collectBlue,
      stroke: CSS_COLORS.panel,
      strokeThickness: 3
    }).setScrollFactor(0);
    this.flightIcon = hasUiArt
      ? this.add.image(244, 75, "ui_hud_wings").setScale(0.075).setScrollFactor(0)
      : this.add.text(235, 64, "✦", { fontSize: "20px", color: CSS_COLORS.collectBlue }).setScrollFactor(0);
    this.flightTrack = this.add.rectangle(268, 76, 128, 12, COLORS.panel, 0.84).setOrigin(0, 0.5).setScrollFactor(0)
      .setStrokeStyle(2, COLORS.mid);
    this.flightBar = this.add.rectangle(270, 76, 124, 6, COLORS.collectBlue, 1).setOrigin(0, 0.5).setScrollFactor(0);

    this.add.rectangle(GAME_WIDTH / 2, 48, 360, 78, COLORS.near, 0.94).setStrokeStyle(3, COLORS.collect).setScrollFactor(0);
    this.createScoreBadge(GAME_WIDTH / 2 - 142, 48, "%");
    this.createScoreBadge(GAME_WIDTH / 2 + 142, 48, "★");
    this.scoreText = this.add.text(GAME_WIDTH / 2, 18, "진행도 0%", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "25px",
      fontStyle: "900",
      color: CSS_COLORS.collect,
      stroke: CSS_COLORS.panel,
      strokeThickness: 5
    }).setOrigin(0.5).setScrollFactor(0).setFixedSize(260, 32).setAlign("center");
    this.objectiveText = this.add.text(GAME_WIDTH / 2, 56, "별 목표 0/0", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "15px",
      fontStyle: "700",
      color: CSS_COLORS.white,
      stroke: CSS_COLORS.panel,
      strokeThickness: 3
    }).setOrigin(0.5).setScrollFactor(0);
    this.comboText = this.add.text(GAME_WIDTH / 2 + 185, 31, "", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "17px",
      fontStyle: "900",
      color: CSS_COLORS.collectPink,
      stroke: CSS_COLORS.white,
      strokeThickness: 3
    }).setOrigin(0, 0.5).setScrollFactor(0);

    this.fpsText = this.add.text(GAME_WIDTH - 24, 136, "FPS —\nEsc 일시정지", {
      align: "right",
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "14px",
      color: CSS_COLORS.white,
      backgroundColor: CSS_COLORS.panelSoft,
      padding: { x: 10, y: 7 }
    }).setOrigin(1, 0).setScrollFactor(0).setVisible(this.registry.get("debugEnabled"));

    this.pauseButton = this.add.text(GAME_WIDTH - 24, 26, "일시정지 · Esc", {
      align: "right",
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "15px",
      fontStyle: "700",
      color: CSS_COLORS.white,
      backgroundColor: CSS_COLORS.panelSoft,
      padding: { x: 10, y: 7 }
    }).setOrigin(1, 0).setScrollFactor(0).setInteractive({ useHandCursor: true });
    this.pauseButton.on("pointerdown", () => this.togglePause());

    this.shakeButton = this.add.text(GAME_WIDTH - 24, 88, "", {
      align: "right",
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "14px",
      fontStyle: "700",
      color: CSS_COLORS.collectBlue,
      backgroundColor: CSS_COLORS.panelSoft,
      padding: { x: 10, y: 7 }
    }).setOrigin(1, 0).setScrollFactor(0).setInteractive({ useHandCursor: true });
    this.shakeButton.on("pointerdown", () => this.toggleScreenShake());
    this.renderShakeSetting();

    this.bossText = this.add.text(GAME_WIDTH / 2, 112, "", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "19px",
      fontStyle: "800",
      color: CSS_COLORS.white,
      backgroundColor: CSS_COLORS.dangerSoft,
      padding: { x: 20, y: 8 }
    }).setOrigin(0.5).setScrollFactor(0).setVisible(false);

    this.toast = this.add.text(GAME_WIDTH / 2, 164, "", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "20px",
      fontStyle: "700",
      color: CSS_COLORS.near,
      backgroundColor: CSS_COLORS.collectSoft,
      padding: { x: 16, y: 8 }
    }).setOrigin(0.5).setScrollFactor(0).setAlpha(0);

    this.createPauseOverlay();

    this.onCheckpoint = () => this.showToast("안전 지점 저장!");
    this.onBossHit = ({ hp, maxHp }) => {
      this.bossText.setText(`감자 대왕  ${"●".repeat(hp)}${"○".repeat(maxHp - hp)}`).setVisible(true);
    };
    this.onBossDefeated = () => this.showToast("보스 격파! 무지개 언덕 클리어!");
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
    if (input.pausePressed) {
      this.togglePause();
      return;
    }
    if (input.muteTogglePressed) this.toggleMute();
    if (input.shakeTogglePressed) this.toggleScreenShake();
    if (this.gameScene?.scene.isPaused()) this.handlePauseInput(input);
    if (!this.gameScene?.player) return;

    this.characterText.setText(
      `${this.gameScene.character.name}${this.gameScene.difficulty?.enabled ? " · 쉬운 모드" : ""}`
    );
    const hp = this.gameScene.healthManager?.hp ?? 0;
    const maxHp = this.gameScene.healthManager?.maxHp ?? 0;
    this.renderHeartIcons(hp, maxHp);
    this.hpLabel
      .setText(`HP ${hp} / ${maxHp}`)
      .setColor(hp <= 1 ? CSS_COLORS.danger : CSS_COLORS.collectPink);
    this.scoreText.setText(`진행도 ${Math.round(this.gameScene.scoreManager?.displayScore ?? 0)}%`);
    const combo = this.gameScene.scoreManager?.combo ?? 0;
    this.comboText.setText(combo >= 2 ? `${combo} COMBO` : "");
    const form = this.gameScene.transformationManager?.getSnapshot(this.gameScene.time.now);
    this.formText.setText(this.formName(form?.form));
    const ratio = form ? form.flightMs / form.flightMaxMs : 1;
    this.flightBar.setScale(Math.max(0.001, ratio), 1);
    this.flightTrack.setVisible(form?.form === "pegasus");
    this.flightBar.setVisible(form?.form === "pegasus");
    this.flightIcon.setVisible(form?.form === "pegasus");
    const objectives = this.gameScene.objectiveManager?.getSnapshot() ?? [];
    const required = objectives.filter((objective) => objective.required);
    this.objectiveText.setText(`별 목표 ${required.filter((objective) => objective.complete).length}/${required.length}`);
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
      this.gameScene.audioManager?.playSfx("sfx_pause", { randomizeRate: false });
      this.gameScene.updateAccessibleStatus("게임을 계속합니다.");
    } else {
      this.gameScene.audioManager?.playSfx("sfx_pause", { randomizeRate: false });
      this.gameScene.scene.pause();
      this.pauseSelection = 0;
      this.renderPauseMenu();
      this.pauseOverlay.setVisible(true);
      this.gameScene.updateAccessibleStatus("게임이 일시정지되었습니다. 위아래로 메뉴를 고르고 좌우로 값을 조절하세요.");
    }
  }

  createPauseOverlay() {
    this.pauseSelection = 0;
    this.pauseMenuItems = [
      { key: "resume", label: "계속하기" },
      { key: "bgm", label: "BGM 볼륨", adjustable: true },
      { key: "sfx", label: "효과음 볼륨", adjustable: true },
      { key: "mute", label: "음소거" },
      { key: "easy", label: "쉬운 모드" }
    ];
    this.pauseRows = [];
    this.pauseArrows = [];
    this.pauseOverlay = this.add.container(0, 0).setScrollFactor(0).setDepth(100).setVisible(false);
    this.pauseOverlay.add(this.add.rectangle(640, 360, 1280, 720, COLORS.near, 0.78).setInteractive());
    this.pauseOverlay.add(
      this.add.rectangle(640, 360, 760, 650, COLORS.near, 0.96).setStrokeStyle(4, COLORS.mid)
    );
    this.pauseOverlay.add(this.add.text(640, 82, "일시정지", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "46px",
      fontStyle: "900",
      color: CSS_COLORS.white
    }).setOrigin(0.5));
    this.pauseOverlay.add(this.add.text(640, 130, "↑↓ 선택 · ←→ 조절 · Enter / A 결정", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "17px",
      color: CSS_COLORS.collectBlue
    }).setOrigin(0.5));

    this.pauseMenuItems.forEach((item, index) => {
      const y = 190 + index * 54;
      const row = this.add.text(640, y, "", {
        align: "center",
        fontFamily: GAME_FONT_FAMILY,
        fontSize: "21px",
        fontStyle: "700",
        color: CSS_COLORS.white,
        backgroundColor: CSS_COLORS.panelSoft,
        padding: { x: 14, y: 10 }
      }).setOrigin(0.5).setFixedSize(590, 46).setInteractive({ useHandCursor: true });
      row.on("pointerover", () => this.selectPauseOption(index));
      row.on("pointerdown", () => this.activatePauseOption(index));
      this.pauseRows.push(row);
      this.pauseOverlay.add(row);

      if (item.adjustable) {
        for (const [direction, x, glyph] of [[-1, 375, "◀"], [1, 905, "▶"]]) {
          const arrow = this.add.text(x, y, glyph, {
            fontFamily: GAME_FONT_FAMILY,
            fontSize: "24px",
            fontStyle: "900",
            color: CSS_COLORS.collect
          }).setOrigin(0.5).setInteractive({ useHandCursor: true });
          arrow.on("pointerover", () => this.selectPauseOption(index));
          arrow.on("pointerdown", (pointer, localX, localY, event) => {
            event?.stopPropagation?.();
            this.adjustPauseOption(index, direction);
          });
          this.pauseArrows.push(arrow);
          this.pauseOverlay.add(arrow);
        }
      }
    });

    this.pauseOverlay.add(this.add.text(
      640,
      512,
      "조작 안내\n이동  ← → / A D / 왼쪽 스틱\n점프·비행  Space / Z / 게임패드 A\n일시정지  Esc / Start   ·   음소거  M   ·   화면 흔들림  V",
      {
        align: "center",
        fontFamily: GAME_FONT_FAMILY,
        fontSize: "17px",
        lineSpacing: 5,
        color: CSS_COLORS.soft
      }
    ).setOrigin(0.5));
    this.pauseOverlay.add(this.add.text(640, 650, "쉬운 모드를 바꾸면 현재 스테이지를 처음부터 다시 시작합니다.", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "14px",
      color: CSS_COLORS.collectBlue
    }).setOrigin(0.5));
    this.renderPauseMenu();
  }

  handlePauseInput(input) {
    if (input.menuUpPressed) this.selectPauseOption(this.pauseSelection - 1);
    if (input.menuDownPressed) this.selectPauseOption(this.pauseSelection + 1);
    if (input.menuLeftPressed) this.adjustPauseOption(this.pauseSelection, -1);
    if (input.menuRightPressed) this.adjustPauseOption(this.pauseSelection, 1);
    if (input.confirmPressed) this.activatePauseOption(this.pauseSelection);
  }

  selectPauseOption(index) {
    const count = this.pauseMenuItems.length;
    this.pauseSelection = (index + count) % count;
    this.renderPauseMenu();
  }

  activatePauseOption(index) {
    const key = this.pauseMenuItems[index]?.key;
    if (key === "resume") this.togglePause();
    else if (key === "bgm" || key === "sfx") this.adjustPauseOption(index, 1);
    else if (key === "mute") this.toggleMute();
    else if (key === "easy") this.toggleEasyMode();
  }

  adjustPauseOption(index, direction) {
    const key = this.pauseMenuItems[index]?.key;
    if (key !== "bgm" && key !== "sfx") return;
    const audio = this.gameScene.audioManager;
    const snapshot = audio?.getSnapshot();
    if (!audio || !snapshot) return;
    const setting = key === "bgm" ? "bgmVolume" : "sfxVolume";
    const next = Phaser.Math.Clamp(Math.round((snapshot[setting] + direction * 0.1) * 100) / 100, 0, 1);
    if (key === "bgm") audio.setBgmVolume(next);
    else audio.setSfxVolume(next);
    audio.playSfx("sfx_ui_select", { randomizeRate: false });
    this.renderPauseMenu();
    this.gameScene.updateAccessibleStatus(`${key === "bgm" ? "배경 음악" : "효과음"} 볼륨 ${Math.round(next * 100)}퍼센트.`);
  }

  toggleMute() {
    const audio = this.gameScene.audioManager;
    if (!audio) return;
    const muted = !audio.getSnapshot().muted;
    if (muted) audio.playSfx("sfx_ui_select", { randomizeRate: false });
    audio.setMuted(muted);
    if (!muted) audio.playSfx("sfx_ui_select", { randomizeRate: false });
    this.renderPauseMenu();
    this.showToast(`음소거 ${muted ? "켜짐" : "꺼짐"}`);
    this.gameScene.updateAccessibleStatus(`음소거를 ${muted ? "켰습니다" : "껐습니다"}.`);
  }

  toggleEasyMode() {
    const enabled = !Boolean(this.registry.get("easyMode"));
    this.registry.set("easyMode", enabled);
    this.gameScene.audioManager?.playSfx("sfx_ui_select", { randomizeRate: false });
    this.gameScene.updateAccessibleStatus(
      `쉬운 모드를 ${enabled ? "켜고" : "끄고"} 현재 스테이지를 처음부터 다시 시작합니다.`
    );
    this.pauseOverlay.setVisible(false);
    this.gameScene.scene.resume();
    this.time.delayedCall(50, () => {
      const levelId = this.gameScene.levelId;
      this.scene.stop(this.gameSceneKey);
      this.time.delayedCall(50, () => this.scene.start(this.gameSceneKey, { levelId, easyMode: enabled }));
    });
  }

  renderPauseMenu() {
    if (!this.pauseRows?.length) return;
    const audio = this.gameScene.audioManager?.getSnapshot() ?? {
      muted: false,
      bgmVolume: 0,
      sfxVolume: 0
    };
    const values = {
      resume: "계속하기",
      bgm: `BGM 볼륨  ${Math.round(audio.bgmVolume * 100)}%`,
      sfx: `효과음 볼륨  ${Math.round(audio.sfxVolume * 100)}%`,
      mute: `음소거  ${audio.muted ? "ON" : "OFF"} · M`,
      easy: `쉬운 모드  ${this.registry.get("easyMode") ? "ON" : "OFF"}`
    };
    this.pauseRows.forEach((row, index) => {
      const selected = index === this.pauseSelection;
      row
        .setText(`${selected ? "●  " : ""}${values[this.pauseMenuItems[index].key]}`)
        .setColor(selected ? CSS_COLORS.near : CSS_COLORS.white)
        .setBackgroundColor(selected ? CSS_COLORS.collectSoft : CSS_COLORS.panelSoft);
    });
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

  renderHeartIcons(hp, maxHp) {
    this.heartIcons.forEach((heart, index) => {
      const visible = index < maxHp;
      heart.setVisible(visible);
      if (!visible) return;
      const filled = index < hp;
      if (heart.type === "Text") {
        heart.setText(filled ? "♥" : "♡").setColor(filled ? CSS_COLORS.collectPink : CSS_COLORS.soft);
      } else if (filled) {
        heart.setTint(COLORS.collectPink).setAlpha(1);
      } else {
        heart.setTint(COLORS.outline).setAlpha(0.5);
      }
    });
  }

  createScoreBadge(x, y, glyph) {
    const badge = this.add.circle(x, y, 17, COLORS.collect, 1)
      .setStrokeStyle(3, COLORS.outline)
      .setScrollFactor(0);
    const label = this.add.text(x, y - 1, glyph, {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: glyph === "%" ? "17px" : "21px",
      fontStyle: "900",
      color: CSS_COLORS.white,
      stroke: CSS_COLORS.panel,
      strokeThickness: 3
    }).setOrigin(0.5).setScrollFactor(0);
    return { badge, label };
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
    this.pauseButton?.removeAllListeners();
    this.shakeButton?.removeAllListeners();
    for (const row of this.pauseRows ?? []) row.removeAllListeners();
    for (const arrow of this.pauseArrows ?? []) arrow.removeAllListeners();
    this.gameScene?.events.off(EVENTS.CHECKPOINT, this.onCheckpoint);
    this.gameScene?.events.off(EVENTS.BOSS_HIT, this.onBossHit);
    this.gameScene?.events.off(EVENTS.BOSS_DEFEATED, this.onBossDefeated);
    this.gameScene?.events.off(EVENTS.FORM_CHANGED, this.onFormChanged);
    this.gameScene?.events.off(EVENTS.FORM_WARNING, this.onFormWarning);
    this.gameScene?.events.off(EVENTS.ITEM_COLLECTED, this.onItemCollected);
  }
}
