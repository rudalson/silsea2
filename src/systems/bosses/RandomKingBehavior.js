import Phaser from "phaser";
import { COLORS, CSS_COLORS, EVENTS } from "../../config/constants.js";
import { GAME_FONT_FAMILY } from "../../config/font.js";
import {
  RANDOM_ATTACK_TYPES,
  RANDOM_RESULT_RULES,
  canHitRandomKing,
  chooseRandomArenaAnchor,
  chooseRandomCourse,
  chooseRandomResult,
  createRandomAttackDeck,
  getBossPhasePattern
} from "../../data/bossPatterns.js";
import { ObjectPool } from "../ObjectPool.js";

const PROJECTILE_TEXTURE_KEY = "graybox-random-projectile";
const RESULT_LABELS = Object.freeze({
  replay_section: "코스",
  score_plus: "+100",
  score_minus: "-100",
  start_battle: "전투"
});
const ATTACK_LABELS = Object.freeze({
  ground_projectile: "낮은 탄",
  high_projectile: "높은 탄",
  teleport_throw: "이동 투척",
  sky_tongue: "하늘 메롱"
});

export class RandomKingBehavior {
  constructor(context) {
    Object.assign(this, context);
    this.boss = this.levelLoader.boss;
    if (!this.boss) return;

    this.section = this.boss.getData("section");
    this.config = this.section.boss;
    this.floorY = this.config.floorY ?? this.boss.y;
    this.state = "dormant";
    this.stateUntil = Number.POSITIVE_INFINITY;
    this.previousResult = null;
    this.previousCourseId = null;
    this.previousAttackId = null;
    this.previousAnchorId = null;
    this.nonBattleCount = 0;
    this.currentResult = null;
    this.currentCourse = null;
    this.currentAttack = null;
    this.attackDeck = [];
    this.awaitingReplayReturn = false;
    this.wasInArena = false;
    this.battleStarted = false;
    this.defeated = false;
    this.reviewState = null;
    this.interactions = [];
    this.created = [];
    this.usesArt = Boolean(this.boss.getData("usesArt"));

    this.ensureProjectileTexture();
    this.projectilePool = this.createProjectilePool();
    this.createGrayboxVisuals();
    this.applyVisualReviewState(this.scene.registry.get("visualReviewRandomState"));
  }

  ensureProjectileTexture() {
    if (this.scene.textures.exists(PROJECTILE_TEXTURE_KEY)) return;
    const graphics = this.scene.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(COLORS.outline, 1).fillCircle(28, 28, 27);
    graphics.fillStyle(COLORS.collectBlue, 1).fillCircle(28, 28, 20);
    graphics.lineStyle(4, COLORS.white, 0.9).strokeCircle(23, 22, 10);
    graphics.generateTexture(PROJECTILE_TEXTURE_KEY, 56, 56);
    graphics.destroy();
  }

  createProjectilePool() {
    return new ObjectPool({
      maxSize: 8,
      create: () => {
        const projectile = this.scene.physics.add.image(0, 0, PROJECTILE_TEXTURE_KEY)
          .setDepth(8)
          .setVisible(false);
        projectile.body.setAllowGravity(false);
        projectile.body.enable = false;
        this.interactions.push(this.scene.physics.add.overlap(this.player, projectile, () => {
          if (!projectile.poolActive) return;
          this.healthManager.takeDamage(projectile.x, { type: `random_king_${projectile.attackId}` });
          this.projectilePool.release(projectile);
        }));
        return projectile;
      },
      activate: (projectile, data) => {
        projectile.attackId = data.attackId;
        projectile.expiresAt = data.expiresAt;
        projectile
          .setPosition(data.x, data.y)
          .setVisible(true)
          .setActive(true)
          .setScale(data.attackId === "high_projectile" ? 0.82 : 1)
          .setTint(data.attackId === "ground_projectile" ? COLORS.collectPink : COLORS.collectBlue);
        projectile.body.enable = true;
        projectile.body.reset(data.x, data.y);
        projectile.body.setSize(42, 42, true);
        projectile.body.setVelocity(data.velocityX, data.velocityY ?? 0);
      },
      deactivate: (projectile) => {
        projectile.setVisible(false).setActive(false).clearTint().setRotation(0);
        projectile.body.enable = false;
        projectile.body.stop();
      },
      destroy: (projectile) => projectile.destroy()
    });
  }

  createGrayboxVisuals() {
    this.question = this.track(this.scene.add.text(this.boss.x, this.boss.y - 78, "?", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "72px",
      fontStyle: "900",
      color: CSS_COLORS.white,
      stroke: CSS_COLORS.panel,
      strokeThickness: 8
    }).setOrigin(0.5).setDepth(10));

    this.resultLabel = this.track(this.scene.add.text(this.boss.x, this.boss.y - 284, "", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "24px",
      fontStyle: "800",
      color: CSS_COLORS.white,
      backgroundColor: CSS_COLORS.panel,
      padding: { x: 14, y: 8 }
    }).setOrigin(0.5).setDepth(12).setVisible(false));

    this.resultCards = Object.entries(RESULT_LABELS).map(([id, label]) => {
      const background = this.scene.add.rectangle(0, 0, 130, 72, COLORS.near, 0.92)
        .setStrokeStyle(4, COLORS.white, 0.72);
      const text = this.scene.add.text(0, 0, label, {
        fontFamily: GAME_FONT_FAMILY,
        fontSize: "20px",
        fontStyle: "800",
        color: CSS_COLORS.white
      }).setOrigin(0.5);
      const container = this.track(this.scene.add.container(0, 0, [background, text]).setDepth(11).setVisible(false));
      return { id, container, background, text };
    });

    this.groundWarning = this.track(this.scene.add.rectangle(
      this.boss.x,
      this.floorY - 26,
      300,
      34,
      COLORS.collectPink,
      0.28
    ).setStrokeStyle(4, COLORS.danger).setDepth(6).setVisible(false));
    this.highWarning = this.track(this.scene.add.rectangle(
      this.boss.x,
      this.floorY - 126,
      300,
      34,
      COLORS.collectBlue,
      0.28
    ).setStrokeStyle(4, COLORS.danger).setDepth(6).setVisible(false));
    this.tongueWarning = this.track(this.scene.add.rectangle(
      this.boss.x,
      340,
      178,
      472,
      COLORS.danger,
      0.2
    ).setStrokeStyle(6, COLORS.collectPink).setDepth(6).setVisible(false));
    this.teleportMarkers = (this.config.arenaAnchors ?? []).map((anchor) => ({
      anchor,
      visual: this.track(this.scene.add.circle(anchor.x, anchor.y - 12, 42, COLORS.collectBlue, 0.15)
        .setStrokeStyle(5, COLORS.collectBlue, 0.85)
        .setDepth(5)
        .setVisible(false))
    }));
    this.weakness = this.track(this.scene.add.star(this.boss.x, this.boss.y - 156, 5, 11, 25, COLORS.collect)
      .setStrokeStyle(4, COLORS.outline)
      .setDepth(11)
      .setVisible(false));
  }

  track(object) {
    this.created.push(object);
    return object;
  }

  update(now) {
    if (!this.boss?.active || this.defeated) return;
    this.updateVisuals(now);
    this.projectilePool.forEachActive((projectile) => {
      projectile.setRotation(projectile.rotation + 0.1);
      if (now >= projectile.expiresAt || !this.isInsideWorld(projectile, 120)) {
        this.projectilePool.release(projectile);
      }
    });
    if (this.reviewState) return;

    const inArena = this.player.x >= this.section.xStart && this.player.x < this.section.xEnd;
    if (this.awaitingReplayReturn) {
      if (inArena) this.finishReplayReturn(now);
      this.wasInArena = inArena;
      return;
    }
    if (!inArena) {
      this.wasInArena = false;
      this.projectilePool.releaseAll();
      return;
    }
    if (!this.wasInArena) this.beginRandomIntro(now);
    this.wasInArena = true;

    if (this.state === "random_intro" && now >= this.stateUntil) this.beginResultDraw(now);
    else if (this.state === "result_draw" && now >= this.stateUntil) this.revealResult(now);
    else if (this.state === "result_telegraph" && now >= this.stateUntil) this.executeResult(now);
    else if (this.state === "result_recover" && now >= this.stateUntil) this.beginResultDraw(now);
    else if (this.state === "battle_intro" && now >= this.stateUntil) this.beginAttackDraw(now);
    else if (this.state === "attack_draw" && now >= this.stateUntil) this.beginAttackTelegraph(now);
    else if (this.state === "telegraph" && now >= this.stateUntil) this.executeAttack(now);
    else if (this.state === "execute" && now >= this.stateUntil) this.openWeakness(now);
    else if (this.state === "vulnerable" && now >= this.stateUntil) this.beginRecovery(now);
    else if (this.state === "hit" && now >= this.stateUntil) this.beginRecovery(now);
    else if (this.state === "recover" && now >= this.stateUntil) this.beginAttackDraw(now);
  }

  beginRandomIntro(now) {
    this.state = "random_intro";
    this.stateUntil = now + 900;
    this.battleStarted = false;
    this.currentResult = null;
    this.currentAttack = null;
    this.setBodyEnabled(true);
    this.boss.setPosition(this.config.spawn.x, this.floorY).setData({
      vulnerable: false,
      bossState: this.state,
      randomNonBattleCount: this.nonBattleCount
    });
    this.scene.updateAccessibleStatus?.("랜덤대왕이 결과 카드를 섞습니다. 같은 결과는 연속으로 나오지 않습니다.");
  }

  beginResultDraw(now) {
    this.currentResult = chooseRandomResult(
      this.random.next(),
      this.previousResult,
      this.nonBattleCount,
      this.config.maxNonBattle ?? RANDOM_RESULT_RULES.maxNonBattle,
      this.config.resultDeck
    );
    this.previousResult = this.currentResult;
    this.state = "result_draw";
    this.stateUntil = now + 700;
    this.boss.setData({
      vulnerable: false,
      bossState: this.state,
      resultId: this.currentResult,
      randomNonBattleCount: this.nonBattleCount,
      randomSeedState: this.random.state
    });
  }

  revealResult(now) {
    this.state = "result_telegraph";
    this.stateUntil = now + 1050;
    this.boss.setData("bossState", this.state);
    this.scene.audioManager?.playSfx("sfx_boss_warning", { randomizeRate: false });
    this.scene.updateAccessibleStatus?.(`랜덤 결과: ${RESULT_LABELS[this.currentResult]}.`);
  }

  executeResult(now) {
    const result = this.currentResult;
    if (result === "start_battle") {
      this.emitResult({ result });
      this.beginBattle(now);
      return;
    }

    this.nonBattleCount += 1;
    if (result === "score_plus" || result === "score_minus") {
      const amount = this.config.scoreDelta ?? RANDOM_RESULT_RULES.scoreDelta;
      const delta = this.scoreManager.adjust(result === "score_plus" ? amount : -amount);
      this.emitResult({ result, delta });
      this.state = "result_recover";
      this.stateUntil = now + 900;
      this.boss.setData({ bossState: this.state, randomNonBattleCount: this.nonBattleCount });
      this.scene.updateAccessibleStatus?.(
        result === "score_plus"
          ? `랜덤 보너스로 진행도 ${Math.abs(delta)}%를 얻었습니다.`
          : `랜덤 페널티로 진행도 ${Math.abs(delta)}%가 줄었습니다. 0 아래로는 내려가지 않습니다.`
      );
      return;
    }

    this.currentCourse = chooseRandomCourse(
      this.config.replayCourses ?? [],
      this.random.next(),
      this.previousCourseId
    );
    this.previousCourseId = this.currentCourse.id;
    this.emitResult({ result, courseId: this.currentCourse.id, courseName: this.currentCourse.name });
    this.startReplay(this.currentCourse);
  }

  emitResult(details) {
    this.scene.events.emit(EVENTS.RANDOM_BOSS_RESULT, {
      boss: "random_king",
      seedState: this.random.state,
      nonBattleCount: this.nonBattleCount,
      ...details
    });
  }

  startReplay(course) {
    this.awaitingReplayReturn = true;
    this.state = "await_replay_return";
    this.stateUntil = Number.POSITIVE_INFINITY;
    this.hideWarnings();
    this.hideResultCards();
    this.scene.beginForcedReplay?.({ courseId: course.id, courseName: course.name, seedState: this.random.state });
    this.scene.transformationManager?.cancelPresentation();
    const safetyMs = this.easyMode
      ? this.config.easyReentrySafetyMs ?? RANDOM_RESULT_RULES.easyReentrySafetyMs
      : this.config.reentrySafetyMs ?? RANDOM_RESULT_RULES.reentrySafetyMs;
    this.healthManager.grantInvulnerability(safetyMs);
    this.player.setPosition(course.x, course.y - 2).setVelocity(0, 0);
    this.player.body?.reset?.(course.x, course.y - 2);
    this.player.setVelocity(0, 0);
    this.scene.cameras.main.setBounds(0, 0, this.scene.level.world.width, this.scene.level.world.height);
    this.scene.cameras.main.centerOn(course.x, course.y - 180);
    this.wasInArena = false;
    this.scene.updateAccessibleStatus?.(`${course.name} 재도전입니다. 획득물과 완료 상태는 그대로 유지됩니다.`);
  }

  finishReplayReturn(now) {
    const course = this.currentCourse;
    this.awaitingReplayReturn = false;
    this.scene.finishForcedReplay?.({ courseId: course?.id, courseName: course?.name });
    const safetyMs = this.easyMode
      ? this.config.easyReentrySafetyMs ?? RANDOM_RESULT_RULES.easyReentrySafetyMs
      : this.config.reentrySafetyMs ?? RANDOM_RESULT_RULES.reentrySafetyMs;
    this.healthManager.grantInvulnerability(safetyMs);
    this.beginRandomIntro(now);
    this.scene.updateAccessibleStatus?.("랜덤대왕 대기실로 돌아왔습니다. 다음 결과를 확인하세요.");
  }

  beginBattle(now) {
    this.battleStarted = true;
    this.state = "battle_intro";
    this.stateUntil = now + 750;
    this.attackDeck.length = 0;
    this.hideResultCards();
    this.boss.setData({ vulnerable: false, bossState: this.state });
    this.scene.updateAccessibleStatus?.("랜덤대왕과 직접 전투를 시작합니다. 공격마다 예고 모양을 확인하세요.");
  }

  beginAttackDraw(now) {
    const pattern = getBossPhasePattern("random_king", this.boss.getData("phase"));
    if (!this.attackDeck.length) {
      this.attackDeck = createRandomAttackDeck(() => this.random.next(), this.previousAttackId);
    }
    this.currentAttack = this.attackDeck.shift();
    this.previousAttackId = this.currentAttack;
    this.state = "attack_draw";
    this.stateUntil = now + pattern.attackDrawMs;
    this.boss.setData({
      vulnerable: false,
      bossState: this.state,
      attackId: this.currentAttack,
      attackDeckRemaining: [...this.attackDeck],
      randomSeedState: this.random.state
    });
    this.scene.events.emit(EVENTS.RANDOM_BOSS_ATTACK, {
      phase: this.boss.getData("phase"),
      attackId: this.currentAttack,
      seedState: this.random.state
    });
  }

  beginAttackTelegraph(now) {
    const pattern = getBossPhasePattern("random_king", this.boss.getData("phase"));
    this.state = "telegraph";
    this.stateUntil = now + Math.max(800, Math.round(pattern.telegraphMs * (this.telegraphMultiplier ?? 1)));
    this.attackTargetX = this.player.x;
    if (this.currentAttack === "teleport_throw" || this.currentAttack === "sky_tongue") {
      const anchor = chooseRandomArenaAnchor(
        this.config.arenaAnchors ?? [],
        this.random.next(),
        this.previousAnchorId,
        this.player.x
      );
      this.previousAnchorId = anchor.id;
      this.currentAnchor = anchor;
      if (this.currentAttack === "teleport_throw") this.boss.setPosition(anchor.x, anchor.y);
      else this.boss.setPosition(this.attackTargetX, 236);
    }
    this.boss.setData({ vulnerable: false, bossState: this.state, anchorId: this.currentAnchor?.id ?? null });
    this.scene.audioManager?.playSfx("sfx_boss_warning", { randomizeRate: false });
    this.scene.updateAccessibleStatus?.(`${ATTACK_LABELS[this.currentAttack]} 예고입니다.`);
  }

  executeAttack(now) {
    const pattern = getBossPhasePattern("random_king", this.boss.getData("phase"));
    this.state = "execute";
    this.stateUntil = now + pattern.executeMs;
    this.boss.setData({ vulnerable: false, bossState: this.state });
    const toward = this.player.x < this.boss.x ? -1 : 1;
    if (this.currentAttack === "ground_projectile") {
      this.spawnProjectile({
        attackId: this.currentAttack,
        x: this.boss.x + toward * 82,
        y: this.floorY - 34,
        velocityX: toward * pattern.projectileSpeed
      });
    } else if (this.currentAttack === "high_projectile") {
      this.spawnProjectile({
        attackId: this.currentAttack,
        x: this.boss.x + toward * 82,
        y: this.floorY - 128,
        velocityX: toward * pattern.projectileSpeed * 1.06
      });
    } else if (this.currentAttack === "teleport_throw") {
      const originY = this.boss.y - 82;
      const angle = Phaser.Math.Angle.Between(this.boss.x, originY, this.player.x, this.player.y - 38);
      this.spawnProjectile({
        attackId: this.currentAttack,
        x: this.boss.x,
        y: originY,
        velocityX: Math.cos(angle) * pattern.projectileSpeed * 1.08,
        velocityY: Math.sin(angle) * pattern.projectileSpeed * 1.08
      });
    } else if (this.currentAttack === "sky_tongue") {
      if (Math.abs(this.player.x - this.attackTargetX) <= 92) {
        this.healthManager.takeDamage(this.attackTargetX, { type: "random_king_tongue" });
      }
    }
    this.scene.audioManager?.playSfx("sfx_boss_land", { randomizeRate: false });
    this.scene.cameraEffects?.shake("bossLandLight");
  }

  spawnProjectile(data) {
    this.projectilePool.acquire({ ...data, expiresAt: this.scene.time.now + 3600 });
  }

  openWeakness(now) {
    const pattern = getBossPhasePattern("random_king", this.boss.getData("phase"));
    this.projectilePool.releaseAll();
    this.hideWarnings();
    if (this.currentAttack === "sky_tongue") {
      const anchor = chooseRandomArenaAnchor(
        this.config.arenaAnchors ?? [],
        this.random.next(),
        this.previousAnchorId,
        this.player.x
      );
      this.previousAnchorId = anchor.id;
      this.boss.setPosition(anchor.x, anchor.y);
    } else {
      this.boss.setY(this.floorY);
    }
    this.setBodyEnabled(true);
    this.state = "vulnerable";
    this.stateUntil = now + (this.easyMode
      ? pattern.easyVulnerabilityMs
      : Math.round(pattern.vulnerabilityMs * (this.vulnerabilityMultiplier ?? 1)));
    this.boss.setData({ vulnerable: true, bossState: this.state });
    this.scene.updateAccessibleStatus?.("공격이 끝나 약점이 열렸습니다. 머리 위를 밟으세요.");
  }

  beginRecovery(now) {
    const pattern = getBossPhasePattern("random_king", this.boss.getData("phase"));
    this.state = "recover";
    this.stateUntil = now + pattern.recoveryMs;
    this.boss.setData({ vulnerable: false, bossState: this.state });
    this.hideWarnings();
  }

  onPlayerContact({ fallingOntoHead, attemptHit, damagePlayer }) {
    if (this.reviewState) return { didHit: false };
    if (canHitRandomKing(this.state, fallingOntoHead)) {
      const didHit = attemptHit();
      if (!didHit) damagePlayer();
      return { didHit };
    }
    if (!this.battleStarted || ["attack_draw", "telegraph", "recover", "hit"].includes(this.state)) {
      const direction = Math.sign(this.player.x - this.boss.x) || 1;
      this.player.setVelocity(direction * 180, -360);
      return { didHit: false };
    }
    damagePlayer();
    return { didHit: false };
  }

  onBossHit({ hp }) {
    this.scoreManager.defeat("boss_hit", this.transformationManager.scoreMultiplier);
    this.projectilePool.releaseAll();
    this.hideWarnings();
    this.attackDeck.length = 0;
    this.state = "hit";
    this.stateUntil = this.scene.time.now + 430;
    this.boss.setData({ vulnerable: false, bossState: this.state });
    if (hp <= 0) this.stateUntil = Number.POSITIVE_INFINITY;
  }

  onBossDefeated() {
    this.defeated = true;
    this.state = "defeated";
    this.boss.setData({ vulnerable: false, bossState: this.state });
    this.projectilePool.releaseAll();
    this.hideWarnings();
    this.hideResultCards();
    this.question.setText("!");
    this.boss.setScale(1.2, 0.5).setAlpha(0.72);
    this.defeatTimer = this.scene.time.delayedCall(650, () => {
      this.defeatTimer = null;
      this.boss?.setActive(false).setVisible(false);
      this.question?.setVisible(false);
    });
  }

  updateVisuals(now) {
    const pulse = 1 + Math.sin(now / 90) * 0.06;
    this.question
      .setPosition(this.boss.x, this.boss.y - 78)
      .setRotation(Math.sin(now / 240) * 0.08)
      .setScale(["random_intro", "result_draw", "attack_draw"].includes(this.state) ? pulse : 1);
    this.boss.getData("label")?.setPosition(this.boss.x, this.boss.y - 176);
    this.weakness
      .setVisible(this.state === "vulnerable")
      .setPosition(this.boss.x, this.boss.y - 156)
      .setRotation(this.weakness.rotation + 0.04);

    const showCards = ["result_draw", "result_telegraph"].includes(this.state)
      || this.reviewState?.startsWith("result_");
    this.resultCards.forEach((card, index) => {
      const selected = this.currentResult === card.id && this.state !== "result_draw";
      card.container
        .setVisible(showCards)
        .setPosition(this.boss.x - 240 + index * 160, this.boss.y - 224)
        .setScale(selected ? pulse : 1);
      card.background.setFillStyle(selected ? COLORS.collectPink : COLORS.near, selected ? 1 : 0.92)
        .setStrokeStyle(selected ? 6 : 4, selected ? COLORS.collect : COLORS.white, 0.86);
    });
    this.resultLabel
      .setVisible(showCards || ["attack_draw", "telegraph", "execute", "vulnerable"].includes(this.state))
      .setPosition(this.boss.x, Math.max(54, this.boss.y - 292))
      .setText(showCards
        ? this.state === "result_draw" ? "결과를 섞는 중…" : `결과 · ${RESULT_LABELS[this.currentResult]}`
        : this.state === "vulnerable" ? "약점 개방"
          : `공격 · ${ATTACK_LABELS[this.currentAttack] ?? "선택 중"}`);

    const telegraphing = ["telegraph", "execute"].includes(this.state) || this.reviewState?.startsWith("attack_");
    this.groundWarning.setVisible(telegraphing && this.currentAttack === "ground_projectile")
      .setPosition((this.boss.x + this.player.x) / 2, this.floorY - 26)
      .setScale(pulse, 1);
    this.highWarning.setVisible(telegraphing && this.currentAttack === "high_projectile")
      .setPosition((this.boss.x + this.player.x) / 2, this.floorY - 126)
      .setScale(pulse, 1);
    this.tongueWarning.setVisible(telegraphing && this.currentAttack === "sky_tongue")
      .setPosition(this.attackTargetX ?? this.player.x, 340)
      .setAlpha(this.state === "execute" ? 0.62 : 0.2 + Math.sin(now / 65) * 0.1);
    this.teleportMarkers.forEach(({ anchor, visual }) => {
      const show = telegraphing && this.currentAttack === "teleport_throw";
      visual.setVisible(show).setScale(anchor.id === this.currentAnchor?.id ? pulse * 1.25 : 1);
    });
  }

  hideWarnings() {
    this.groundWarning.setVisible(false);
    this.highWarning.setVisible(false);
    this.tongueWarning.setVisible(false);
    this.teleportMarkers.forEach(({ visual }) => visual.setVisible(false));
    this.weakness.setVisible(false);
  }

  hideResultCards() {
    this.resultCards.forEach(({ container }) => container.setVisible(false));
    this.resultLabel.setVisible(false);
  }

  setBodyEnabled(enabled) {
    if (!this.boss?.body) return;
    this.boss.body.enable = Boolean(enabled);
    if (enabled) this.boss.body.updateFromGameObject?.();
  }

  applyVisualReviewState(requestedState) {
    const resultStates = {
      replay: "replay_section",
      plus: "score_plus",
      minus: "score_minus",
      battle: "start_battle"
    };
    const attackStates = {
      ground: "ground_projectile",
      high: "high_projectile",
      teleport: "teleport_throw",
      tongue: "sky_tongue"
    };
    if (!requestedState) return;
    this.reviewState = requestedState;
    this.stateUntil = Number.POSITIVE_INFINITY;
    if (requestedState === "intro") this.state = "random_intro";
    else if (resultStates[requestedState]) {
      this.currentResult = resultStates[requestedState];
      this.state = "result_telegraph";
      this.reviewState = `result_${requestedState}`;
    } else if (attackStates[requestedState]) {
      this.currentAttack = attackStates[requestedState];
      this.attackTargetX = this.boss.x - 280;
      this.currentAnchor = this.config.arenaAnchors?.[1] ?? null;
      if (requestedState === "tongue") this.boss.setPosition(this.attackTargetX, 236);
      else if (requestedState === "teleport" && this.currentAnchor) this.boss.setPosition(this.currentAnchor.x, this.currentAnchor.y);
      this.state = "telegraph";
      this.reviewState = `attack_${requestedState}`;
    } else if (requestedState === "vulnerable") {
      this.state = "vulnerable";
      this.boss.setData("vulnerable", true);
    } else if (requestedState === "hurt") this.state = "hit";
    else if (requestedState === "defeated") {
      this.state = "defeated";
      this.boss.setScale(1.2, 0.5).setAlpha(0.72);
    } else return;
    this.boss.setData({ bossState: this.state, visualReviewState: requestedState });
  }

  isInsideWorld(object, margin = 0) {
    return object.x >= -margin
      && object.x <= this.scene.level.world.width + margin
      && object.y >= -margin
      && object.y <= this.scene.level.world.height + margin;
  }

  getPoolSnapshot() {
    return { randomProjectile: this.projectilePool?.getSnapshot() ?? null };
  }

  destroy() {
    this.defeatTimer?.remove(false);
    this.projectilePool?.destroy();
    for (const interaction of this.interactions) interaction?.destroy();
    this.interactions.length = 0;
    for (const object of this.created) object?.destroy?.();
    this.created.length = 0;
  }
}
