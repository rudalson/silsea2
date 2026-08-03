export class SeededRandom {
  constructor(seed = 1) {
    this.state = (Number(seed) >>> 0) || 1;
  }

  next() {
    let value = this.state;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.state = value >>> 0;
    return this.state / 4294967296;
  }

  pick(values) {
    if (!values.length) return undefined;
    return values[Math.floor(this.next() * values.length)];
  }
}
