import Phaser from "phaser";
import { COLORS } from "../../config/constants.js";
import {
  chooseHulaSequence,
  canHitHulaKing,
  getBossPhasePattern,
  getHulaSpinDuration
} from "../../data/bossPatterns.js";
import { ObjectPool } from "../ObjectPool.js";

const HOOP_TEXTURE_KEY = "boss_projectile_hula_hoop";
const HOOP_WIDTH = 92;
const HOOP_HEIGHT = 42;

const resolveDirection = (direction, toward) => {
  if (direction === "left") return -1;
  if (direction === "right") return 1;
  if (direction === "away") return -toward;
  return toward;
};

export class HulaKingBehavior {
  constructor(context) {
    Object.assign(this, context);
    this.boss = this.levelLoader.boss;
    this.state = "intro";
    this.stateUntil = this.scene.time.now + 900;
    this.volleyTimers = [];
    this.interactions = [];
    this.lastSequenceId = null;
    this.currentSequence = null;
    this.defeated = false;
    if (!this.boss) return;

    this.baseY = this.boss.y;
    this.createHoopTexture();
    this.projectilePool = this.createProjectilePool();
    this.guardHoops = [0, 1, 2].map((index) => this.scene.add.ellipse(
      this.boss.x,
      this.baseY - 62 - index * 18,
      172 - index * 18,
      42,
      COLORS.collectBlue,
      0.08
    ).setStrokeStyle(5, index === 1 ? COLORS.collect : COLORS.collectBlue, 0.95)
      .setDepth(7 + index)
      .setVisible(false));
    this.warningShadow = this.scene.add.ellipse(this.boss.x, this.baseY - 4, 240, 30, COLORS.danger, 0.16)
      .setDepth(3)
      .setVisible(false);
    this.weakness = this.scene.add.star(this.boss.x, this.baseY - 154, 5, 10, 23, COLORS.collect)
      .setStrokeStyle(4, COLORS.outline)
      .setDepth(10)
      .setVisible(false);
  }

  createHoopTexture() {
    if (this.scene.textures.exists(HOOP_TEXTURE_KEY)) return;
    const graphics = this.scene.make.graphics({ x: 0, y: 0, add: false });
    graphics.lineStyle(10, COLORS.outline, 1).strokeEllipse(50, 30, 86, 34);
    graphics.lineStyle(5, COLORS.collectPink, 1).strokeEllipse(50, 30, 82, 30);
    graphics.lineStyle(2, COLORS.white, 0.9).strokeEllipse(50, 27, 72, 18);
    graphics.generateTexture(HOOP_TEXTURE_KEY, 100, 60);
    graphics.destroy();
  }

  createProjectilePool() {
    return new ObjectPool({
      maxSize: 10,
      create: () => {
        const hoop = this.scene.physics.add.image(0, 0, HOOP_TEXTURE_KEY).setDepth(7).setVisible(false);
        hoop.body.setAllowGravity(false);
        hoop.body.enable = false;
        this.interactions.push(this.scene.physics.add.overlap(this.player, hoop, () => {
          if (!hoop.poolActive || !this.isOnScreen(hoop, 80)) return;
          this.healthManager.takeDamage(hoop.x, { type: "hula_hoop" });
          this.projectilePool.release(hoop);
        }));
        return hoop;
      },
      activate: (hoop, data) => {
        hoop.expiresAt = data.expiresAt;
        hoop.travelDirection = Math.sign(data.velocityX) || 1;
        hoop
          .setPosition(data.x, data.y)
          .setDisplaySize(HOOP_WIDTH, HOOP_HEIGHT)
          .setVisible(true)
          .setActive(true)
          .setRotation(0);
        hoop.body.enable = true;
        hoop.body.reset(data.x, data.y);
        hoop.body.setSize(76, data.lane === "low" ? 18 : 26, true);
        hoop.body.setVelocity(data.velocityX, 0);
      },
      deactivate: (hoop) => {
        hoop.setVisible(false).setActive(false).setRotation(0);
        hoop.body.enable = false;
        hoop.body.stop();
      },
      destroy: (hoop) => hoop.destroy()
    });
  }

  update(now) {
    if (!this.boss?.active || this.defeated) return;
    this.updateVisuals(now);
    this.projectilePool.forEachActive((hoop) => {
      hoop.setRotation(hoop.rotation + 0.14 * hoop.travelDirection);
      if (now >= hoop.expiresAt || !this.isOnScreen(hoop, 110)) this.projectilePool.release(hoop);
    });

    const section = this.boss.getData("section");
    const inArena = this.player.x >= section.xStart && this.player.x < section.xEnd;
    if (!inArena || !this.isOnScreen(this.boss)) {
      this.projectilePool.releaseAll();
      return;
    }

    if (this.state === "intro" && now >= this.stateUntil) this.beginSpin(now);
    else if (this.state === "spin_guard" && now >= this.stateUntil) this.beginWarning(now);
    else if (this.state === "hoop_warning" && now >= this.stateUntil) this.executeVolley(now);
    else if (this.state === "hoop_volley" && now >= this.stateUntil) this.openWeakness(now);
    else if (this.state === "vulnerable_rest" && now >= this.stateUntil) this.closeWeakness(now);
    else if (this.state === "recover" && now >= this.stateUntil) this.beginSpin(now);
  }

  updateVisuals(now) {
    const guarded = ["spin_guard", "hoop_warning", "hoop_volley"].includes(this.state);
    this.guardHoops.forEach((hoop, index) => {
      const wobble = Math.sin(now / 110 + index * 1.7) * 8;
      hoop
        .setVisible(guarded)
        .setPosition(this.boss.x, this.boss.y - 62 - index * 18 + wobble)
        .setRotation(hoop.rotation + (index % 2 ? -0.055 : 0.055));
    });
    this.warningShadow.setPosition(this.boss.x, this.baseY - 4);
    if (this.state === "hoop_warning") {
      this.warningShadow.setScale(1 + Math.sin(now / 70) * 0.18).setAlpha(0.28 + Math.sin(now / 55) * 0.16);
    }
    this.weakness
      .setPosition(this.boss.x, this.boss.y - 154)
      .setRotation(this.weakness.rotation + 0.035);
  }

  beginSpin(now) {
    const pattern = getBossPhasePattern("hula_king", this.boss.getData("phase"));
    this.state = "spin_guard";
    this.stateUntil = now + getHulaSpinDuration(pattern, this.random.next());
    this.boss.setData({ vulnerable: false, bossState: this.state });
    this.boss.setTintFill(COLORS.collectBlue);
    this.weakness.setVisible(false);
    this.warningShadow.setVisible(false).setScale(1);
    this.scene.updateAccessibleStatus?.("훌라후프 대왕이 회전 방어 중입니다. 거리를 두세요.");
  }

  beginWarning(now) {
    const pattern = getBossPhasePattern("hula_king", this.boss.getData("phase"));
    this.currentSequence = chooseHulaSequence(pattern, this.random.next(), this.lastSequenceId);
    this.lastSequenceId = this.currentSequence.id;
    this.state = "hoop_warning";
    this.stateUntil = now + Math.max(900, Math.round(pattern.warningMs * this.telegraphMultiplier));
    this.boss.setData({ vulnerable: false, bossState: this.state, patternId: this.currentSequence.id });
    this.boss.setTintFill(COLORS.danger);
    this.warningShadow.setVisible(true);
    this.scene.audioManager?.playSfx("sfx_boss_warning", { randomizeRate: false });
    this.scene.updateAccessibleStatus?.("훌라후프 발사 예고입니다. 링의 높이를 보고 피하세요.");
  }

  executeVolley(now) {
    const pattern = getBossPhasePattern("hula_king", this.boss.getData("phase"));
    this.state = "hoop_volley";
    this.boss.setData("bossState", this.state);
    this.boss.setTintFill(COLORS.collectPink);
    this.warningShadow.setVisible(false).setScale(1);
    this.clearVolleyTimers();
    const intervalMultiplier = this.volleyIntervalMultiplier ?? 1;
    for (const volley of this.currentSequence.volleys) {
      this.scheduleVolley(pattern, volley, Math.round(volley.delayMs * intervalMultiplier));
    }
    const lastDelay = Math.max(0, ...this.currentSequence.volleys.map(({ delayMs }) => delayMs * intervalMultiplier));
    this.stateUntil = now + lastDelay + 1050;
    this.scene.cameraEffects?.shake("bossLandLight");
  }

  scheduleVolley(pattern, volley, delayMs) {
    if (delayMs <= 0) {
      this.spawnVolley(pattern, volley);
      return;
    }
    let timer = null;
    timer = this.scene.time.delayedCall(delayMs, () => {
      this.volleyTimers = this.volleyTimers.filter((entry) => entry !== timer);
      if (this.state === "hoop_volley" && this.boss?.active && !this.defeated) this.spawnVolley(pattern, volley);
    });
    this.volleyTimers.push(timer);
  }

  spawnVolley(pattern, volley) {
    const toward = this.player.x < this.boss.x ? -1 : 1;
    const launchTime = this.scene.time.now;
    for (const shot of volley.shots) {
      const direction = resolveDirection(shot.direction, toward);
      const lane = shot.lane ?? "jump";
      this.projectilePool.acquire({
        x: this.boss.x + direction * 92,
        y: lane === "low" ? this.baseY - 116 : this.baseY - 30,
        velocityX: direction * pattern.projectileSpeed * (shot.speedMultiplier ?? 1),
        lane,
        expiresAt: launchTime + 4500
      });
    }
  }

  openWeakness(now) {
    const pattern = getBossPhasePattern("hula_king", this.boss.getData("phase"));
    this.clearVolleyTimers();
    this.projectilePool.releaseAll();
    this.state = "vulnerable_rest";
    this.stateUntil = now + Math.round(pattern.vulnerabilityMs * (this.vulnerabilityMultiplier ?? 1));
    this.boss.clearTint().setData({ vulnerable: true, bossState: this.state });
    this.guardHoops.forEach((hoop) => hoop.setVisible(false));
    this.weakness.setVisible(true);
    this.scene.updateAccessibleStatus?.("회전이 멈췄습니다. 지금 머리 위를 밟으세요.");
  }

  closeWeakness(now) {
    const pattern = getBossPhasePattern("hula_king", this.boss.getData("phase"));
    this.boss.setData({ vulnerable: false, bossState: "recover" });
    this.weakness.setVisible(false);
    this.state = "recover";
    this.stateUntil = now + pattern.recoveryMs;
  }

  onPlayerContact({ fallingOntoHead, attemptHit, damagePlayer }) {
    const canHit = canHitHulaKing(this.state, fallingOntoHead);
    if (!canHit) {
      damagePlayer();
      return { didHit: false };
    }
    const didHit = attemptHit();
    if (!didHit) damagePlayer();
    return { didHit };
  }

  onBossHit({ hp }) {
    this.scoreManager.defeat("boss_hit", this.transformationManager.scoreMultiplier);
    this.clearVolleyTimers();
    this.projectilePool.releaseAll();
    this.boss?.setData({ vulnerable: false, bossState: "hit" });
    this.guardHoops.forEach((hoop) => hoop.setVisible(false));
    this.warningShadow.setVisible(false);
    this.weakness.setVisible(false);
    if (hp > 0) {
      this.state = "recover";
      this.stateUntil = this.scene.time.now + 700;
    }
  }

  onBossDefeated() {
    this.defeated = true;
    this.state = "defeated";
    this.boss?.setData({ vulnerable: false, bossState: this.state });
    this.clearVolleyTimers();
    this.projectilePool.releaseAll();
    this.guardHoops.forEach((hoop) => hoop.setVisible(false));
    this.warningShadow.setVisible(false);
    this.weakness.setVisible(false);
    this.scene.tweens.killTweensOf(this.boss);
    this.defeatTimer = this.scene.time.delayedCall(400, () => {
      this.defeatTimer = null;
      this.boss?.setActive(false);
    });
  }

  clearVolleyTimers() {
    for (const timer of this.volleyTimers) timer?.remove(false);
    this.volleyTimers.length = 0;
  }

  isOnScreen(object, margin = 0) {
    const source = this.scene.cameras.main.worldView;
    const view = new Phaser.Geom.Rectangle(source.x, source.y, source.width, source.height);
    Phaser.Geom.Rectangle.Inflate(view, margin, margin);
    return Phaser.Geom.Rectangle.Contains(view, object.x, object.y);
  }

  getPoolSnapshot() {
    return { hulaHoop: this.projectilePool?.getSnapshot() ?? null };
  }

  destroy() {
    this.clearVolleyTimers();
    this.defeatTimer?.remove(false);
    this.projectilePool?.destroy();
    for (const interaction of this.interactions) interaction?.destroy();
    this.interactions.length = 0;
    this.scene.tweens.killTweensOf(this.boss);
    this.guardHoops?.forEach((hoop) => hoop.destroy());
    this.warningShadow?.destroy();
    this.weakness?.destroy();
  }
}
