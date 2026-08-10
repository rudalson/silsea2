import { CORE_RULES, SCORE_VALUES, getMagpieStealAmount, getRespawnScoreLoss } from "../data/gameplay.js";

export class ScoreManager {
  constructor({ onComboChanged = null } = {}) {
    this.score = 0;
    this.displayScore = 0;
    this.combo = 0;
    this.comboRemaining = 0;
    this.onComboChanged = onComboChanged;
  }

  add(amount, { combo = false, multiplier = 1 } = {}) {
    if (combo) {
      this.combo = this.comboRemaining > 0 ? this.combo + 1 : 1;
      this.comboRemaining = CORE_RULES.comboWindowMs;
      this.emitCombo();
    }
    const comboMultiplier = combo ? 1 + Math.min(1, Math.floor(this.combo / 4) * 0.25) : 1;
    const awarded = Math.max(0, Math.round(amount * comboMultiplier * multiplier));
    this.score += awarded;
    return awarded;
  }

  collect(type, multiplier = 1) {
    return this.add(SCORE_VALUES[type] ?? 0, { combo: true, multiplier });
  }

  defeat(type, multiplier = 1) {
    return this.add(SCORE_VALUES[type] ?? 0, { combo: true, multiplier });
  }

  steal() {
    const amount = getMagpieStealAmount(this.score);
    this.score = Math.max(0, this.score - amount);
    this.resetCombo();
    return amount;
  }

  recover(amount) {
    return this.add(amount);
  }

  loseOnRespawn(overrideAmount) {
    const amount = overrideAmount === undefined
      ? getRespawnScoreLoss(this.score)
      : Math.max(0, Math.floor(Number(overrideAmount) || 0));
    this.score = Math.max(0, this.score - amount);
    this.resetCombo();
    return amount;
  }

  update(delta) {
    const hadCombo = this.combo > 0;
    this.comboRemaining = Math.max(0, this.comboRemaining - delta);
    if (this.comboRemaining === 0 && hadCombo) {
      this.combo = 0;
      this.emitCombo();
    }
    const distance = this.score - this.displayScore;
    if (Math.abs(distance) < 0.5) this.displayScore = this.score;
    else this.displayScore += distance * Math.min(1, delta / 180);
    return Math.round(this.displayScore);
  }

  resetCombo() {
    const hadCombo = this.combo > 0;
    this.combo = 0;
    this.comboRemaining = 0;
    if (hadCombo) this.emitCombo();
  }

  emitCombo() {
    this.onComboChanged?.({ combo: this.combo, remaining: this.comboRemaining });
  }
}
