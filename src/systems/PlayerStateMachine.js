export class PlayerStateMachine {
  constructor(initial = "grounded") {
    this.state = initial;
    this.previous = null;
  }

  set(next) {
    if (next === this.state) return false;
    this.previous = this.state;
    this.state = next;
    return true;
  }

  updateFromBody(body) {
    if (body.blocked.down || body.touching.down) return this.set("grounded");
    if (body.velocity.y < 0) return this.set("rising");
    return this.set("falling");
  }
}

