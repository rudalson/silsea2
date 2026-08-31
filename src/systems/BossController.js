import { EVENTS } from "../config/constants.js";
import { requireBossDefinition } from "../data/bossDefinitions.js";
import { createBossBehavior } from "./bosses/index.js";
import { SeededRandom } from "./SeededRandom.js";

export class BossController {
  constructor(
    scene,
    player,
    levelLoader,
    healthManager,
    transformationManager,
    scoreManager,
    seed = 8901,
    difficulty = {}
  ) {
    this.scene = scene;
    this.player = player;
    this.levelLoader = levelLoader;
    this.healthManager = healthManager;
    this.boss = levelLoader.boss;
    if (!this.boss) return;

    this.definition = requireBossDefinition(this.boss.getData("key"));
    this.behavior = createBossBehavior(this.definition.behavior, {
      scene,
      player,
      levelLoader,
      healthManager,
      transformationManager,
      scoreManager,
      random: new SeededRandom(seed),
      telegraphMultiplier: difficulty.boss?.telegraphMultiplier ?? 1,
      vulnerabilityMultiplier: difficulty.boss?.vulnerabilityMultiplier ?? 1,
      volleyIntervalMultiplier: difficulty.boss?.volleyIntervalMultiplier ?? 1
    });
    this.onBossHit = (payload) => {
      if (payload.key === this.definition.key) this.behavior?.onBossHit?.(payload);
    };
    this.onBossDefeated = (payload) => {
      if (payload.key === this.definition.key) this.behavior?.onBossDefeated?.(payload);
    };
    this.scene.events.on(EVENTS.BOSS_HIT, this.onBossHit);
    this.scene.events.on(EVENTS.BOSS_DEFEATED, this.onBossDefeated);
  }

  update(now, delta) {
    this.behavior?.update?.(now, delta);
  }

  handlePlayerContact() {
    if (!this.boss?.active || !this.behavior) return { didHit: false };
    const fallingOntoHead = this.player.body.velocity.y > 120
      && this.player.body.bottom <= this.boss.body.top + 54;
    return this.behavior.onPlayerContact({
      fallingOntoHead,
      attemptHit: () => this.levelLoader.hitBoss(this.player),
      damagePlayer: () => this.healthManager.takeDamage(this.boss.x)
    });
  }

  getPoolSnapshot() {
    return this.behavior?.getPoolSnapshot?.() ?? {};
  }

  destroy() {
    if (!this.boss) return;
    this.scene.events.off(EVENTS.BOSS_HIT, this.onBossHit);
    this.scene.events.off(EVENTS.BOSS_DEFEATED, this.onBossDefeated);
    this.behavior?.destroy?.();
    this.behavior = null;
  }
}
