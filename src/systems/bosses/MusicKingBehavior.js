import { COLORS, EVENTS } from "../../config/constants.js";
import { advanceMusicNote, canHitMusicKing, createMusicRestState, isMusicRestSafe, musicNoteHits,
  MUSIC_KING_PHASES, MUSIC_REST_CONFIG, stepMusicRest } from "../../data/musicMechanics.js";
import { drawPianoKeys, rhythmInputMoving, RhythmSignal } from "../RhythmSignal.js";
import { EnemyAnimationManager } from "../EnemyAnimationManager.js";

export class MusicKingBehavior {
  constructor(context) {
    Object.assign(this, context); this.boss = this.levelLoader.boss; this.section = this.boss.getData("section");
    this.state = "dormant"; this.elapsedMs = 0; this.noteIndex = 0; this.notes = []; this.defeated = false;
    this.restConfig = { ...MUSIC_REST_CONFIG, warningMs: MUSIC_REST_CONFIG.warningMs * this.telegraphMultiplier,
      movementTolerance: this.easyMode ? 0.25 : 0.2 };
    this.visual = this.scene.add.graphics().setDepth(7);
    this.signal = new RhythmSignal(this.scene, (this.section.xStart + this.section.xEnd) / 2, this.boss.y - 250);
    this.signal.hide();
    this.weakness = this.scene.add.star(this.boss.x, this.boss.body.top - 24, 5, 9, 21, COLORS.collect)
      .setStrokeStyle(3, COLORS.outline).setDepth(8).setVisible(false);
    this.fallback = this.boss.getData("usesArt") ? null : this.createFallback();
    this.boss.setVisible(false); this.boss.body.enable = false; this.boss.getData("label")?.setVisible(false);
    this.onRespawn = () => { if (!this.defeated) { this.boss.setData({ hp: this.boss.getData("maxHp"), phase: 1 }); this.sleep(); } };
    this.scene.events.on(EVENTS.PLAYER_RESPAWNED, this.onRespawn);
  }
  createFallback() {
    const x = this.boss.x, y = this.boss.y, face = this.scene.add.graphics().setDepth(4).setVisible(false);
    face.fillStyle(COLORS.white).fillCircle(x, y - 66, 58);
    face.lineStyle(4, COLORS.outline).strokeCircle(x, y - 66, 58);
    for (const offset of [-32, 0, 32]) face.fillStyle(COLORS.collectBlue).fillRect(x + offset - 7, y - 108, 14, 24);
    face.lineStyle(3, COLORS.outline).strokeCircle(x - 19, y - 72, 13).strokeCircle(x + 19, y - 72, 13);
    face.lineBetween(x - 6, y - 72, x + 6, y - 72);
    face.fillStyle(COLORS.outline).fillCircle(x - 19, y - 72, 3).fillCircle(x + 19, y - 72, 3);
    face.lineStyle(6, COLORS.outline).lineBetween(x - 24, y - 12, x - 24, y).lineBetween(x + 24, y - 12, x + 24, y);
    return face;
  }
  get pattern() { return MUSIC_KING_PHASES[this.boss.getData("phase")]; }
  enter(state, durationMs, animation) {
    this.state = state; this.elapsedMs = 0; this.durationMs = durationMs;
    this.boss.setData({ bossState: state, vulnerable: state === "vulnerable" });
    this.weakness.setVisible(state === "vulnerable");
    if (animation && this.boss.getData("usesArt")) EnemyAnimationManager.play(this.boss, animation, false);
  }
  beginWarning() {
    const direction = this.player.x < this.boss.x ? -1 : 1, lane = this.pattern.lanes[this.noteIndex];
    this.pending = { x: this.boss.x + direction * 65, y: this.boss.y - lane, direction };
    this.boss.setFlipX(direction < 0); this.enter("warning", this.pattern.warningMs * this.telegraphMultiplier, "warning");
    this.scene.audioManager?.playSfx("sfx_boss_warning", { randomizeRate: false });
    this.scene.updateAccessibleStatus?.(lane < 60 ? "음악 대왕: 낮은 음표 예고. 점프하거나 날개로 막으세요." : "음악 대왕: 높은 음표 예고. 바닥에서 기다리세요.");
  }
  openWeakness() {
    this.clearNotes(); this.signal.hide(); this.enter("vulnerable", this.pattern.vulnerabilityMs * this.vulnerabilityMultiplier, "vulnerable");
    this.scene.updateAccessibleStatus?.("연주가 끝났어요! 빛나는 머리 약점을 밟으세요.");
  }
  updateRest(delta) {
    const previous = this.rest;
    const grounded = this.player.body.velocity.y >= 0 && (this.player.body.blocked.down || this.player.body.touching.down);
    this.rest = stepMusicRest(previous, { deltaMs: delta, inside: isMusicRestSafe(this.player.body, this.boss.x, this.section, this.boss.y),
      grounded, moving: rhythmInputMoving(this.scene.lastInput, this.restConfig.movementTolerance) }, this.restConfig);
    if (this.rest.phase !== previous.phase) {
      if (this.rest.phase === "stop") this.player.bufferedJumpUntil = Number.NEGATIVE_INFINITY;
      if (this.rest.phase === "retry") this.healthManager.takeEnvironmentDamage({ type: "music_rest" });
      this.signal.cue(this.rest.phase);
    }
    this.signal.show(this.rest, this.restConfig);
    if (this.rest.phase === "success") this.openWeakness();
  }
  updateNotes(delta) {
    this.notes = this.notes.map((note) => advanceMusicNote(note, delta)).filter((note) => {
      if (!note.active) return false;
      if (musicNoteHits(note, this.player.body)) {
        if (this.transformationManager.canGuardProjectile(note.x, note.y)) this.transformationManager.registerGuardImpact(note.x, note.y);
        else this.healthManager.takeDamage(note.x, { type: "music_note" });
        return false;
      }
      return note.x > this.section.xStart && note.x < this.section.xEnd;
    });
  }
  draw() {
    const visual = this.visual.clear();
    for (const note of this.notes) {
      // The oval note head is the damage area; the stem is decoration.
      visual.fillStyle(COLORS.collectPink).fillEllipse(note.x, note.y, 32, 24);
      visual.lineStyle(3, COLORS.outline).strokeEllipse(note.x, note.y, 32, 24);
      visual.lineStyle(5, COLORS.collectBlue).lineBetween(note.x + 12, note.y, note.x + 12, note.y - 28)
        .lineBetween(note.x + 12, note.y - 28, note.x + 25, note.y - 22);
    }
    if (this.state === "warning") {
      const { x, y, direction } = this.pending;
      const end = direction < 0 ? this.section.xStart : this.section.xEnd;
      visual.lineStyle(3, COLORS.dangerAlt).lineBetween(x, y, end, y);
      visual.lineBetween(end, y, end - direction * 22, y - 12).lineBetween(end, y, end - direction * 22, y + 12);
    }
    if (this.state === "rhythm") {
      for (const range of [{ x: this.section.xStart + 48, width: this.boss.x - 180 - this.section.xStart - 48 },
        { x: this.boss.x + 180, width: this.section.xEnd - 48 - this.boss.x - 180 }]) {
        drawPianoKeys(visual, { ...range, y: this.boss.y });
        visual.lineStyle(4, this.rest.phase === "stop" ? COLORS.collect : COLORS.collectBlue).strokeRect(range.x, this.boss.y - 4, range.width, 28);
      }
    }
  }
  update(_now, delta) {
    if (this.defeated || !this.boss?.active || !this.player.body?.enable || this.transformationManager.transforming) return;
    if (this.player.x < this.section.xStart || this.player.x > this.section.xEnd) { if (this.state !== "dormant") this.sleep(); return; }
    if (this.state === "dormant") {
      this.boss.setVisible(!this.fallback); this.boss.body.enable = true; this.fallback?.setVisible(true);
      this.enter("intro", 1000, "idle"); this.scene.updateAccessibleStatus?.("음악 대왕 무대! 음표를 피하고 정지 신호 뒤 5초 멈춰요."); return;
    }
    this.elapsedMs += delta;
    this.weakness.setPosition(this.boss.x, this.boss.body.top - 24);
    if (this.state === "rhythm") this.updateRest(delta);
    else {
      this.updateNotes(delta);
      if (this.elapsedMs >= this.durationMs) switch (this.state) {
        case "intro": case "hurt": case "recovery": this.noteIndex = 0; this.beginWarning(); break;
        case "warning": {
          const { x, y, direction } = this.pending;
          this.notes.push({ x, previousX: x, y, velocityX: direction * this.pattern.speed * (this.easyMode ? 0.8 : 1),
            elapsedMs: 0, lifetimeMs: this.pattern.travelMs, active: true }); this.pending = null;
          this.enter("attack", this.pattern.travelMs, "attack"); break;
        }
        case "attack":
          this.noteIndex++;
          if (this.noteIndex < this.pattern.lanes.length) this.enter("between", 450, "idle");
          else if (this.pattern.restRequired) {
            this.clearNotes(); this.rest = createMusicRestState(); this.signal.reset();
            this.enter("rhythm", 0, "idle"); this.signal.show(this.rest, this.restConfig);
          } else this.openWeakness();
          break;
        case "between": this.beginWarning(); break;
        case "vulnerable": this.enter("recovery", 800, "idle"); break;
      }
    }
    this.draw();
  }
  onPlayerContact({ fallingOntoHead, attemptHit, damagePlayer }) {
    if (this.state === "rhythm") return { didHit: false };
    const didHit = canHitMusicKing(this.state, fallingOntoHead) && attemptHit(); if (!didHit) damagePlayer();
    return { didHit: Boolean(didHit) };
  }
  onBossHit({ hp }) {
    this.scoreManager.defeat("boss_hit", this.transformationManager.scoreMultiplier); this.clearNotes();
    if (hp > 0) this.enter("hurt", 900, "hurt");
  }
  clearNotes() { this.notes = []; this.pending = null; this.visual.clear(); }
  onBossDefeated() { this.defeated = true; this.clearNotes(); this.signal.hide(); this.enter("defeated", 0, "defeated"); this.boss.setActive(false); this.fallback?.setAlpha(0.55); }
  sleep() { this.clearNotes(); this.signal.hide(); this.rest = null; this.enter("dormant", 0); this.boss.setVisible(false); this.boss.body.enable = false; this.fallback?.setVisible(false); }
  getPoolSnapshot() { return {}; }
  destroy() { this.scene.events.off(EVENTS.PLAYER_RESPAWNED, this.onRespawn); this.clearNotes(); this.signal.destroy(); this.visual.destroy(); this.weakness.destroy(); this.fallback?.destroy(); }
}
