import Phaser from "phaser";
import { COLORS } from "../../config/constants.js";
import {
  canHitInvisibleKing,
  chooseInvisibleAnchor,
  getBossPhasePattern,
  isInvisibleAnchorReachable
} from "../../data/bossPatterns.js";
import { EnemyAnimationManager } from "../EnemyAnimationManager.js";

const LIGHT_TOP = 82;
const BOSS_CENTER_OFFSET_Y = 59;
const HIDE_TRANSITION_MS = 420;
const EFFECTS = Object.freeze({
  reveal: { texture: "fx_invisible_reveal", frames: 6, duration: 900, repeat: -1 },
  afterimage: { texture: "fx_invisible_afterimage", frames: 4, duration: 360, repeat: 0 },
  miss: { texture: "fx_invisible_miss", frames: 6, duration: 900, repeat: 0 }
});

export class InvisibleKingBehavior {
  constructor(context) {
    Object.assign(this, context);
    this.boss = this.levelLoader.boss;
    this.state = "hidden_relocate";
    this.stateUntil = Number.POSITIVE_INFINITY;
    this.currentAnchor = null;
    this.recentAnchorIds = [];
    this.missStartedAt = 0;
    this.hideAt = Number.POSITIVE_INFINITY;
    this.hideStarted = false;
    this.defeated = false;
    if (!this.boss) return;

    const section = this.boss.getData("section");
    const floorY = section.boss.floorY ?? this.boss.y;
    this.anchors = (section.boss.anchors ?? []).filter((anchor) => isInvisibleAnchorReachable(anchor, {
      xStart: section.xStart,
      xEnd: section.xEnd,
      floorY,
      maxRise: section.boss.maxAnchorRise ?? 160
    }));
    if (this.anchors.length < 3) throw new Error("투명 대왕은 도달 가능한 위치 앵커가 3개 이상 필요합니다.");

    this.usesArt = Boolean(this.boss.getData("usesArt"));
    this.boss.getData("label")?.setVisible(false);
    this.boss.setAlpha(0);
    this.anchorMarkers = this.anchors.map((anchor, index) => {
      const marker = this.scene.add.ellipse(anchor.x, anchor.y - BOSS_CENTER_OFFSET_Y, 148, 148, COLORS.collectBlue, 0.035)
        .setStrokeStyle(3, COLORS.white, 0.34).setDepth(3);
      const notch = this.scene.add.rectangle(anchor.x, anchor.y - 8, 22 + index * 5, 7, COLORS.collectBlue, 0.75)
        .setDepth(4);
      return { anchor, marker, notch };
    });

    this.lightBeam = this.scene.add.rectangle(0, 0, 128, 300, COLORS.collect, 0.2)
      .setStrokeStyle(4, COLORS.white, 0.7).setDepth(5).setVisible(false);
    this.lightTarget = this.scene.add.ellipse(0, 0, 174, 160, COLORS.collect, 0.16)
      .setStrokeStyle(6, COLORS.outline, 0.95).setDepth(6).setVisible(false);

    const body = this.scene.add.ellipse(0, -BOSS_CENTER_OFFSET_Y, 118, 118, COLORS.collectBlue, 0.94)
      .setStrokeStyle(6, COLORS.outline, 1);
    const crown = this.scene.add.triangle(0, -132, -32, 24, -14, -18, 0, 20, COLORS.collect)
      .setStrokeStyle(4, COLORS.outline, 1);
    const crownRight = this.scene.add.triangle(18, -130, -18, 20, 0, -20, 20, 22, COLORS.collect)
      .setStrokeStyle(4, COLORS.outline, 1);
    const eyeLeft = this.scene.add.circle(-22, -70, 8, COLORS.outline);
    const eyeRight = this.scene.add.circle(22, -70, 8, COLORS.outline);
    const mouth = this.scene.add.ellipse(0, -42, 36, 13, COLORS.white, 0.85).setStrokeStyle(3, COLORS.outline, 1);
    this.silhouette = this.scene.add.container(this.boss.x, this.boss.y, [body, crown, crownRight, eyeLeft, eyeRight, mouth])
      .setDepth(8).setVisible(false);

    const missRing = this.scene.add.ellipse(0, -BOSS_CENTER_OFFSET_Y, 390, 300, COLORS.danger, 0.08)
      .setStrokeStyle(9, COLORS.danger, 0.92);
    const horizontal = this.scene.add.rectangle(0, -BOSS_CENTER_OFFSET_Y, 330, 10, COLORS.white, 0.88);
    const vertical = this.scene.add.rectangle(0, -BOSS_CENTER_OFFSET_Y, 10, 250, COLORS.white, 0.88);
    this.missWarning = this.scene.add.container(this.boss.x, this.boss.y, [missRing, horizontal, vertical])
      .setDepth(7).setVisible(false);

    this.createArtEffects();
    this.beginRelocate(this.scene.time.now);
    this.applyVisualReviewState(this.scene.registry.get("visualReviewInvisibleState"));
  }

  createArtEffects() {
    if (!this.usesArt) return;
    const allTexturesExist = Object.values(EFFECTS).every(({ texture }) => this.scene.textures.exists(texture))
      && this.scene.textures.exists("fx_invisible_crown_impact");
    if (!allTexturesExist) {
      this.usesArt = false;
      return;
    }
    for (const [name, spec] of Object.entries(EFFECTS)) {
      const key = `fx:invisible:${name}`;
      if (!this.scene.anims.exists(key)) {
        this.scene.anims.create({
          key,
          frames: this.scene.anims.generateFrameNumbers(spec.texture, { start: 0, end: spec.frames - 1 }),
          duration: spec.duration,
          repeat: spec.repeat
        });
      }
    }
    this.revealEffectArt = this.scene.add.sprite(0, 0, EFFECTS.reveal.texture).setDepth(7).setVisible(false);
    this.afterimageArt = this.scene.add.sprite(0, 0, EFFECTS.afterimage.texture).setDepth(8).setVisible(false);
    this.missEffectArt = this.scene.add.sprite(0, 0, EFFECTS.miss.texture).setDepth(7).setVisible(false);
    this.crownImpactArt = this.scene.add.image(0, 0, "fx_invisible_crown_impact").setDepth(10).setVisible(false);
  }

  playAnimation(sequence, ignoreIfPlaying = true) {
    if (!this.usesArt) return null;
    return EnemyAnimationManager.play(this.boss, sequence, ignoreIfPlaying);
  }

  playEffect(sprite, name) {
    if (sprite) sprite.setVisible(true).play(`fx:invisible:${name}`, true);
  }

  hideArtEffects() {
    [this.revealEffectArt, this.afterimageArt, this.missEffectArt, this.crownImpactArt]
      .forEach((effect) => effect?.setVisible(false));
  }

  applyVisualReviewState(requestedState) {
    const states = new Set(["relocate", "warning", "revealed", "hide", "memory", "miss", "hit", "defeated"]);
    if (!states.has(requestedState)) return;
    this.stateUntil = Number.POSITIVE_INFINITY;
    this.hideArtEffects();
    this.lightBeam.setVisible(!this.usesArt && ["warning", "revealed", "defeated"].includes(requestedState));
    this.lightTarget.setVisible(!this.usesArt && ["warning", "revealed", "defeated"].includes(requestedState));
    this.silhouette.setVisible(!this.usesArt && ["revealed", "hide", "hit", "defeated"].includes(requestedState))
      .setAlpha(requestedState === "hide" ? 0.45 : 1);
    this.missWarning.setVisible(!this.usesArt && requestedState === "miss");
    this.boss.setAlpha(this.usesArt && ["revealed", "hide", "miss", "hit", "defeated"].includes(requestedState) ? 1 : 0);

    if (requestedState === "warning") this.playEffect(this.revealEffectArt, "reveal");
    if (requestedState === "revealed") {
      this.playAnimation("reveal", false);
      this.playEffect(this.revealEffectArt, "reveal");
    }
    if (requestedState === "hide") this.playAnimation("hide", false);
    if (requestedState === "memory") this.playEffect(this.afterimageArt, "afterimage");
    if (requestedState === "miss") {
      this.playAnimation("attack", false);
      this.playEffect(this.missEffectArt, "miss");
      this.missStartedAt = this.scene.time.now - this.getPattern().missAttackMs * 0.72;
    }
    if (requestedState === "hit") {
      this.playAnimation("hurt", false);
      this.crownImpactArt?.setVisible(true);
    }
    if (requestedState === "defeated") {
      this.playAnimation("defeated", false);
      this.crownImpactArt?.setVisible(true);
    }

    const resolvedState = {
      relocate: "hidden_relocate",
      warning: "light_warning",
      revealed: "revealed",
      hide: "revealed",
      memory: "hidden_memory_window",
      miss: "miss_attack",
      hit: "recover",
      defeated: "defeated"
    }[requestedState];
    this.state = resolvedState;
    this.setBodyEnabled(requestedState === "memory");
    this.boss.setData({ vulnerable: requestedState === "memory", bossState: resolvedState, visualReviewState: requestedState });
    this.updateVisuals(this.scene.time.now);
  }

  update(now) {
    if (!this.boss?.active || this.defeated) return;
    this.updateVisuals(now);
    const section = this.boss.getData("section");
    const inArena = this.player.x >= section.xStart && this.player.x < section.xEnd;
    if (!inArena || !this.isOnScreen(this.boss, 160)) return;

    if (this.state === "hidden_relocate" && now >= this.stateUntil) this.beginLightWarning(now);
    else if (this.state === "light_warning" && now >= this.stateUntil) this.beginReveal(now);
    else if (this.state === "revealed") {
      if (!this.hideStarted && now >= this.hideAt) this.beginHideTransition();
      if (now >= this.stateUntil) this.beginMemoryWindow(now);
    } else if (this.state === "hidden_memory_window" && now >= this.stateUntil) this.beginMissAttack(now);
    else if (this.state === "miss_attack" && now >= this.stateUntil) this.resolveMissAttack(now);
    else if (this.state === "recover" && now >= this.stateUntil) this.beginRelocate(now);
  }

  updateVisuals(now) {
    if (!this.currentAnchor) return;
    const centerY = this.boss.y - BOSS_CENTER_OFFSET_Y;
    this.silhouette.setPosition(this.boss.x, this.boss.y);
    this.missWarning.setPosition(this.boss.x, this.boss.y);
    this.revealEffectArt?.setPosition(this.boss.x, centerY).setDisplaySize(216, 288);
    this.afterimageArt?.setPosition(this.boss.x, centerY).setDisplaySize(216, 216);
    this.missEffectArt?.setPosition(this.boss.x, centerY).setDisplaySize(390, 293);
    this.crownImpactArt?.setPosition(this.boss.x, this.boss.y - 132).setDisplaySize(160, 112);

    const selected = ["light_warning", "revealed"].includes(this.state);
    for (const entry of this.anchorMarkers) {
      const active = selected && entry.anchor.id === this.currentAnchor.id;
      entry.marker.setAlpha(active ? 0.34 + Math.sin(now / 75) * 0.12 : 0.2);
      entry.marker.setScale(active ? 1 + Math.sin(now / 90) * 0.05 : 1);
      entry.notch.setAlpha(active ? 1 : 0.58);
    }

    if (selected && !this.usesArt) {
      const beamHeight = Math.max(120, centerY - LIGHT_TOP);
      this.lightBeam.setPosition(this.currentAnchor.x, LIGHT_TOP + beamHeight / 2)
        .setDisplaySize(128 + Math.sin(now / 90) * 12, beamHeight)
        .setAlpha(this.state === "revealed" ? 0.28 : 0.16 + Math.sin(now / 60) * 0.08);
      this.lightTarget.setPosition(this.currentAnchor.x, centerY).setScale(1 + Math.sin(now / 70) * 0.08);
    }

    if (this.state === "miss_attack" && !this.usesArt) {
      const progress = Phaser.Math.Clamp((now - this.missStartedAt) / this.getPattern().missAttackMs, 0, 1);
      this.missWarning.setScale(0.35 + progress * 0.65).setAlpha(0.45 + progress * 0.55);
    }
  }

  getPattern() {
    return getBossPhasePattern("invisible_king", this.boss.getData("phase"));
  }

  setBodyEnabled(enabled) {
    if (!this.boss.body) return;
    this.boss.body.enable = enabled;
    this.boss.body.stop();
    if (enabled) this.boss.body.reset(this.boss.x, this.boss.y);
  }

  beginRelocate(now) {
    const section = this.boss.getData("section");
    const previousId = this.currentAnchor?.id ?? null;
    this.currentAnchor = chooseInvisibleAnchor(this.anchors, this.random.next(), previousId, this.recentAnchorIds);
    this.recentAnchorIds = [this.currentAnchor.id, ...this.recentAnchorIds].slice(0, 2);
    this.boss.setPosition(this.currentAnchor.x, this.currentAnchor.y).setAlpha(0);
    this.setBodyEnabled(false);
    this.state = "hidden_relocate";
    this.stateUntil = now + this.getPattern().relocateMs;
    this.boss.setData({ vulnerable: false, bossState: this.state, anchorId: this.currentAnchor.id, arenaId: section.id });
    this.silhouette.setVisible(false).setAlpha(1);
    this.lightBeam.setVisible(false);
    this.lightTarget.setVisible(false);
    this.missWarning.setVisible(false).setScale(1).setAlpha(1);
    this.hideArtEffects();
  }

  beginLightWarning(now) {
    const pattern = this.getPattern();
    this.state = "light_warning";
    this.stateUntil = now + Math.max(900, Math.round(pattern.warningMs * (this.telegraphMultiplier ?? 1)));
    this.boss.setData({ vulnerable: false, bossState: this.state });
    if (this.usesArt) this.playEffect(this.revealEffectArt, "reveal");
    else {
      this.lightBeam.setVisible(true);
      this.lightTarget.setVisible(true);
    }
    this.scene.audioManager?.playSfx("sfx_invisible_warning", { randomizeRate: false });
    this.scene.updateAccessibleStatus?.("빛기둥 방향을 확인하세요. 곧 투명 대왕의 위치가 드러납니다.");
  }

  beginReveal(now) {
    const pattern = this.getPattern();
    this.state = "revealed";
    this.hideAt = now + pattern.revealMs;
    this.stateUntil = this.hideAt + HIDE_TRANSITION_MS;
    this.hideStarted = false;
    this.boss.setData({ vulnerable: false, bossState: this.state }).setAlpha(this.usesArt ? 1 : 0);
    if (this.usesArt) this.playAnimation("reveal", false);
    else this.silhouette.setVisible(true).setAlpha(1);
    this.scene.audioManager?.playSfx("sfx_invisible_reveal", { randomizeRate: false });
    this.scene.cameraEffects?.shake("bossLandLight");
    this.scene.updateAccessibleStatus?.("투명 대왕이 빛에 드러났습니다. 이 위치를 기억하세요.");
  }

  beginHideTransition() {
    this.hideStarted = true;
    this.revealEffectArt?.setVisible(false);
    if (this.usesArt) this.playAnimation("hide", false);
    else this.silhouette.setAlpha(0.45);
    this.scene.audioManager?.playSfx("sfx_invisible_hide", { randomizeRate: false });
  }

  beginMemoryWindow(now) {
    const pattern = this.getPattern();
    this.state = "hidden_memory_window";
    this.stateUntil = now + Math.round(pattern.memoryMs * (this.vulnerabilityMultiplier ?? 1));
    this.boss.setData({ vulnerable: true, bossState: this.state }).setAlpha(0);
    this.silhouette.setVisible(false);
    this.lightBeam.setVisible(false);
    this.lightTarget.setVisible(false);
    this.revealEffectArt?.setVisible(false);
    this.playEffect(this.afterimageArt, "afterimage");
    this.afterimageTimer?.remove(false);
    this.afterimageTimer = this.scene.time.delayedCall(EFFECTS.afterimage.duration, () => {
      this.afterimageTimer = null;
      this.afterimageArt?.setVisible(false);
    });
    this.setBodyEnabled(true);
    this.scene.updateAccessibleStatus?.("투명 대왕이 숨었습니다. 방금 본 같은 위치를 머리로 밟으세요.");
  }

  beginMissAttack(now) {
    const pattern = this.getPattern();
    this.state = "miss_attack";
    this.missStartedAt = now;
    this.stateUntil = now + Math.max(900, Math.round(pattern.missAttackMs * (this.telegraphMultiplier ?? 1)));
    this.boss.setData({ vulnerable: false, bossState: this.state }).setAlpha(this.usesArt ? 1 : 0);
    this.setBodyEnabled(false);
    if (this.usesArt) {
      this.playAnimation("attack", false);
      this.playEffect(this.missEffectArt, "miss");
    } else this.missWarning.setVisible(true).setScale(0.35).setAlpha(0.45);
    this.scene.audioManager?.playSfx("sfx_invisible_attack", { randomizeRate: false });
    this.scene.updateAccessibleStatus?.("기억 시간이 끝났습니다. 십자 빛 공격 범위에서 벗어나세요.");
  }

  resolveMissAttack(now) {
    const pattern = this.getPattern();
    const centerY = this.boss.y - BOSS_CENTER_OFFSET_Y;
    const dx = Math.abs(this.player.x - this.boss.x);
    const dy = Math.abs((this.player.y - 48) - centerY);
    if (dx <= pattern.attackRadiusX && dy <= pattern.attackRadiusY) {
      this.healthManager.takeDamage(this.boss.x, { type: "invisible_light_burst" });
    }
    this.scene.cameraEffects?.shake("bossLandHeavy");
    this.missWarning.setVisible(false);
    this.missEffectArt?.setVisible(false);
    if (this.usesArt) {
      this.boss.setAlpha(1);
      this.playAnimation("idle", false);
    } else this.silhouette.setVisible(true).setAlpha(0.62);
    this.beginRecover(now);
  }

  beginRecover(now, duration = null) {
    const pattern = this.getPattern();
    this.state = "recover";
    this.stateUntil = now + (duration ?? pattern.recoveryMs);
    this.boss.setData({ vulnerable: false, bossState: this.state });
    this.setBodyEnabled(false);
  }

  onPlayerContact({ fallingOntoHead, attemptHit }) {
    if (!canHitInvisibleKing(this.state, fallingOntoHead)) return { didHit: false };
    return { didHit: attemptHit() };
  }

  showCrownImpact() {
    if (!this.crownImpactArt) return;
    this.crownImpactArt.setVisible(true).setAlpha(1).setScale(0.75);
    this.scene.tweens.add({
      targets: this.crownImpactArt,
      scale: 1,
      alpha: 0.2,
      duration: 360,
      onComplete: () => this.crownImpactArt?.setVisible(false)
    });
  }

  onBossHit({ hp }) {
    this.scoreManager.defeat("boss_hit", this.transformationManager.scoreMultiplier);
    this.boss?.setData({ vulnerable: false, bossState: "hit" }).setAlpha(this.usesArt ? 1 : 0);
    this.setBodyEnabled(false);
    this.lightBeam.setVisible(false);
    this.lightTarget.setVisible(false);
    this.missWarning.setVisible(false);
    this.hideArtEffects();
    if (this.usesArt) {
      this.playAnimation("hurt", false);
      this.showCrownImpact();
    } else this.silhouette.setVisible(true).setAlpha(1);
    this.scene.audioManager?.playSfx("sfx_boss_hit", { randomizeRate: false });
    if (hp > 0) this.beginRecover(this.scene.time.now, 700);
  }

  onBossDefeated() {
    this.defeated = true;
    this.state = "defeated";
    this.boss?.setData({ vulnerable: false, bossState: this.state }).setAlpha(this.usesArt ? 1 : 0);
    this.setBodyEnabled(false);
    this.hideArtEffects();
    if (this.usesArt) {
      this.playAnimation("defeated", false);
      this.showCrownImpact();
    } else {
      this.lightBeam.setVisible(true).setAlpha(0.32);
      this.lightTarget.setVisible(true).setAlpha(0.7);
      this.silhouette.setVisible(true).setAlpha(1);
    }
    this.scene.audioManager?.playSfx("sfx_invisible_defeat", { randomizeRate: false });
    this.defeatTimer = this.scene.time.delayedCall(this.usesArt ? 1350 : 650, () => {
      this.defeatTimer = null;
      this.boss?.setActive(false);
      this.silhouette?.setVisible(false);
      this.lightBeam?.setVisible(false);
      this.lightTarget?.setVisible(false);
      this.hideArtEffects();
    });
  }

  isOnScreen(object, margin = 0) {
    const source = this.scene.cameras.main.worldView;
    const view = new Phaser.Geom.Rectangle(source.x, source.y, source.width, source.height);
    Phaser.Geom.Rectangle.Inflate(view, margin, margin);
    return Phaser.Geom.Rectangle.Contains(view, object.x, object.y);
  }

  getPoolSnapshot() {
    return {};
  }

  destroy() {
    this.defeatTimer?.remove(false);
    this.afterimageTimer?.remove(false);
    this.boss?.getData("label")?.setVisible(false);
    this.anchorMarkers?.forEach(({ marker, notch }) => {
      marker.destroy();
      notch.destroy();
    });
    if (this.crownImpactArt) this.scene.tweens.killTweensOf(this.crownImpactArt);
    this.lightBeam?.destroy();
    this.lightTarget?.destroy();
    this.silhouette?.destroy();
    this.missWarning?.destroy();
    this.revealEffectArt?.destroy();
    this.afterimageArt?.destroy();
    this.missEffectArt?.destroy();
    this.crownImpactArt?.destroy();
  }
}
