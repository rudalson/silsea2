import { COLORS, EVENTS } from "../../config/constants.js";
import { advanceHolePatrol, canHitHoleKing, HOLE_KING_PHASES, selectBossHoles } from "../../data/holeMechanics.js";
import { EnemyAnimationManager } from "../EnemyAnimationManager.js";
import { playBossStateSfx } from "./bossAudio.js";

export class HoleKingBehavior {
  constructor(context) {
    Object.assign(this, context); this.boss = this.levelLoader.boss; this.section = this.boss.getData("section");
    this.homeX = this.boss.x; this.homeY = this.boss.y; this.direction = -1;
    this.state = "dormant"; this.elapsedMs = 0; this.defeated = false; this.targets = [];
    this.visual = this.scene.add.graphics().setDepth(7);
    this.weakness = this.scene.add.star(this.homeX, this.boss.body.top - 24, 5, 9, 21, COLORS.collect).setStrokeStyle(3, COLORS.outline).setDepth(8).setVisible(false);
    this.fallback = this.boss.getData("usesArt") ? null : this.createFallback();
    this.sleep(); this.onRespawn = () => { if (!this.defeated) this.sleep(); };
    this.scene.events.on(EVENTS.PLAYER_RESPAWNED, this.onRespawn);
  }
  createFallback() {
    const face = this.scene.add.graphics().setDepth(4);
    face.fillStyle(COLORS.collectPink).fillCircle(0, -66, 56); face.lineStyle(3, COLORS.outline).strokeCircle(0, -66, 56);
    for (const [x,y] of [[-30,-84],[22,-90],[-18,-44],[30,-48],[0,-102]]) face.fillStyle(COLORS.outline).fillCircle(x,y,8);
    face.fillStyle(COLORS.white).fillCircle(-10,-74,6).fillCircle(10,-74,6);
    face.lineStyle(5,COLORS.outline).lineBetween(-22,-15,-22,0).lineBetween(22,-15,22,0);
    return face.setPosition(this.homeX,this.homeY).setVisible(false);
  }
  get holes() { return (this.scene.courseMechanics?.holes ?? []).filter(({ config }) => config.controller === "hole_king"); }
  get pattern() { return HOLE_KING_PHASES[this.boss.getData("phase")]; }
  setHoles(phase, targets = this.targets) { this.scene.courseMechanics?.setControlledHoles("hole_king", targets.map(({config})=>config.id), phase); }
  enter(state,durationMs,animation) {
    playBossStateSfx(this.scene, "hole_king", state);
    this.state=state; this.elapsedMs=0; this.durationMs=durationMs; this.boss.setData({bossState:state,vulnerable:state==="vulnerable"});
    this.weakness.setVisible(state==="vulnerable"); if(animation && this.boss.getData("usesArt")) EnemyAnimationManager.play(this.boss,animation,false);
  }
  moveTo(x) { this.boss.body.reset(x,this.homeY); this.fallback?.setPosition(x,this.homeY); this.boss.getData("label")?.setPosition(x,this.homeY-182); }
  beginWarning() {
    this.targets=selectBossHoles(this.holes,this.boss.getData("phase"),this.easyMode); this.setHoles("warning");
    this.enter("warning",this.pattern.warningMs*this.telegraphMultiplier,"warning");
    this.scene.audioManager?.playSfx("sfx_boss_warning",{randomizeRate:false});
    this.scene.updateAccessibleStatus?.("구멍 대왕: 노란 표시의 다리가 곧 열려요. 표시 없는 고정 바닥에서 기다려요.");
  }
  restoreFloor() { this.targets=[]; this.setHoles("closed",[]); this.visual.clear(); }
  update(_now,delta) {
    if(this.defeated || !this.boss?.active || !this.player.body?.enable || this.transformationManager.transforming) return;
    if(this.player.x<this.section.xStart || this.player.x>this.section.xEnd) { if(this.state!=="dormant")this.sleep(); return; }
    if(this.state==="dormant") { this.boss.body.enable=true; this.boss.setVisible(!this.fallback); this.fallback?.setVisible(true); this.enter("intro",1000,"idle"); return; }
    this.elapsedMs+=delta;
    if(this.state==="attack") {
      const next=advanceHolePatrol(this.boss.x,this.direction,delta,this.pattern.moveSpeed*(this.easyMode?0.8:1),this.homeX-128,this.homeX+128);
      this.direction=next.direction; this.moveTo(next.x);
    }
    if(this.state==="returning") {
      const distance=this.homeX-this.boss.x, step=240*delta/1000;
      this.moveTo(this.boss.x+Math.sign(distance)*Math.min(Math.abs(distance),step));
    }
    if(this.elapsedMs>=this.durationMs) switch(this.state) {
      case "intro": case "hurt": case "recovery": this.beginWarning(); break;
      case "warning": this.setHoles("open"); this.enter("attack",this.pattern.openMs,"attack"); break;
      case "attack": this.restoreFloor(); this.enter("returning",700,"idle"); break;
      case "returning": this.moveTo(this.homeX); this.enter("vulnerable",this.pattern.vulnerabilityMs*this.vulnerabilityMultiplier,"vulnerable");
        this.scene.updateAccessibleStatus?.("다리가 복구됐어요. 멈춘 대왕의 빛나는 머리를 밟으세요."); break;
      case "vulnerable": this.enter("recovery",800,"idle"); break;
    }
    this.weakness.setPosition(this.boss.x,this.boss.body.top-24);
    this.visual.clear();
    if(this.state==="warning") for(const {config} of this.targets) {
      this.visual.lineStyle(4,COLORS.dangerAlt).strokeRect(config.x,config.y-8,config.width,32);
      this.visual.lineBetween(config.x+config.width/2,config.y-60,config.x+config.width/2,config.y-32);
    }
  }
  onPlayerContact({fallingOntoHead,attemptHit,damagePlayer}) {
    const didHit=canHitHoleKing(this.state,fallingOntoHead)&&attemptHit(); if(!didHit)damagePlayer(); return {didHit:Boolean(didHit)};
  }
  onBossHit({hp}) { this.scoreManager.defeat("boss_hit",this.transformationManager.scoreMultiplier); this.restoreFloor(); if(hp>0)this.enter("hurt",900,"hurt"); }
  onBossDefeated() { this.defeated=true; this.restoreFloor(); this.enter("defeated",0,"defeated"); this.boss.setActive(false); this.fallback?.setAlpha(0.55); }
  sleep() { this.restoreFloor(); this.moveTo(this.homeX); this.enter("dormant",0); this.direction=-1; this.boss.setVisible(false); this.boss.body.enable=false; this.fallback?.setVisible(false); }
  getPoolSnapshot(){ return {}; }
  destroy(){ this.scene.events.off(EVENTS.PLAYER_RESPAWNED,this.onRespawn); this.restoreFloor(); this.visual.destroy(); this.weakness.destroy(); this.fallback?.destroy(); }
}
