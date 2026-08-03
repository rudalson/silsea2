export class ScoreManager {
  constructor() {
    this.score = 0;
    this.displayScore = 0;
  }

  add(amount) {
    this.score = Math.max(0, this.score + amount);
  }

  update(delta) {
    const distance = this.score - this.displayScore;
    if (Math.abs(distance) < 0.5) this.displayScore = this.score;
    else this.displayScore += distance * Math.min(1, delta / 180);
    return Math.round(this.displayScore);
  }
}

