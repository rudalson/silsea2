import { EVENTS } from "../config/constants.js";

export const OBJECTIVE_HANDLERS = Object.freeze({
  defeat_boss: (ctx, objective) => ctx.defeatedBosses.includes(objective.target),
  reach_gate: (ctx) => ctx.gateEntered,
  collect_stars: (ctx, objective) => ctx.starCount >= objective.count,
  clear_time: (ctx, objective) => ctx.elapsed <= objective.seconds,
  no_damage: (ctx) => ctx.damageTaken === 0
});

export const OBJECTIVE_TYPES = Object.freeze(Object.keys(OBJECTIVE_HANDLERS));

export class ObjectiveManager {
  constructor(scene, objectives) {
    this.scene = scene;
    this.objectives = objectives;
    this.context = {
      defeatedBosses: [],
      gateEntered: false,
      starCount: 0,
      elapsed: 0,
      damageTaken: 0
    };
    this.status = new Map();
    this.evaluate();
  }

  update(elapsedSeconds) {
    this.context.elapsed = elapsedSeconds;
  }

  markBossDefeated(key) {
    if (!this.context.defeatedBosses.includes(key)) this.context.defeatedBosses.push(key);
    this.evaluate();
  }

  markGateEntered() {
    this.context.gateEntered = true;
    this.evaluate();
  }

  addStars(count = 1) {
    this.context.starCount += count;
    this.evaluate();
  }

  recordDamage() {
    this.context.damageTaken += 1;
    this.evaluate();
  }

  evaluate() {
    const all = [...this.objectives.required, ...(this.objectives.optional ?? [])];
    for (const objective of all) {
      const handler = OBJECTIVE_HANDLERS[objective.type];
      this.status.set(objective, Boolean(handler?.(this.context, objective)));
    }
    this.scene?.events.emit(EVENTS.OBJECTIVES_UPDATED, this.getSnapshot());
    return this.areRequiredComplete();
  }

  areRequiredComplete() {
    return this.objectives.required.every((objective) => this.status.get(objective));
  }

  getSnapshot() {
    const format = (objective, required) => ({
      ...objective,
      required,
      complete: Boolean(this.status.get(objective))
    });
    return [
      ...this.objectives.required.map((objective) => format(objective, true)),
      ...(this.objectives.optional ?? []).map((objective) => format(objective, false))
    ];
  }
}

