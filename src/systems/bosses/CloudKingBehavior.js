import { COLORS, EVENTS } from "../../config/constants.js";
import { advanceRainDrop, canHitCloudKing, chooseRainColumns, CLOUD_KING_PHASES, getCloudWindVelocity, rainDropHits } from "../../data/cloudMechanics.js";
import { EnemyAnimationManager } from "../EnemyAnimationManager.js";

export class CloudKingBehavior {
  constructor(context) {
    Object.assign(this,context);this.boss=this.levelLoader.boss;this.section=this.boss.getData("section");this.homeX=this.boss.x;this.homeY=this.boss.y;
    this.state="dormant";this.elapsedMs=0;this.actionIndex=0;this.drops=[];this.columns=[];this.defeated=false;
    this.visual=this.scene.add.graphics().setDepth(7);this.weakness=this.scene.add.star(this.homeX,this.boss.body.top-24,5,9,21,COLORS.collect).setStrokeStyle(3,COLORS.outline).setDepth(8).setVisible(false);
    this.fallback=this.boss.getData("usesArt")?null:this.createFallback();this.sleep();
    this.onRespawn=()=>{if(!this.defeated){this.boss.setData({hp:this.boss.getData("maxHp"),phase:1});this.sleep();}};this.scene.events.on(EVENTS.PLAYER_RESPAWNED,this.onRespawn);
  }
  createFallback(){
    const g=this.scene.add.graphics().setDepth(4);g.fillStyle(COLORS.white).fillEllipse(0,-74,126,70).fillCircle(-36,-92,30).fillCircle(3,-106,34).fillCircle(36,-92,28);
    g.lineStyle(3,COLORS.collectBlue).strokeEllipse(0,-74,126,70);g.fillStyle(COLORS.outline).fillCircle(-20,-86,5).fillCircle(20,-86,5);
    g.lineStyle(5,COLORS.collectBlue).lineBetween(-50,-70,-78,-44).lineBetween(50,-70,78,-44).lineBetween(-22,-38,-22,0).lineBetween(22,-38,22,0);
    return g.setPosition(this.homeX,this.homeY).setVisible(false);
  }
  get pattern(){return CLOUD_KING_PHASES[this.boss.getData("phase")];}
  get action(){return this.pattern.actions[this.actionIndex];}
  getMovementVelocityX(){
    if(this.state!=="attack"||this.action!=="wind"||!this.player.body?.enable||this.transformationManager.transforming)return 0;
    return getCloudWindVelocity(this.direction,this.pattern.windSpeed*(this.easyMode?0.65:1),this.player.x,this.section);
  }
  moveTo(y){this.boss.body.reset(this.homeX,y);this.fallback?.setPosition(this.homeX,y);this.boss.getData("label")?.setPosition(this.homeX,y-182);}
  enter(state,durationMs,animation){this.state=state;this.elapsedMs=0;this.durationMs=durationMs;this.boss.setData({bossState:state,vulnerable:state==="vulnerable"});this.weakness.setVisible(state==="vulnerable");if(animation&&this.boss.getData("usesArt"))EnemyAnimationManager.play(this.boss,animation,false);}
  beginWarning(){
    this.direction=this.player.x<this.homeX?-1:1;this.columns=this.action==="rain"?chooseRainColumns(this.player.x,this.section,this.pattern.rainOffsets,this.easyMode):[];
    this.enter("warning",this.pattern.warningMs*this.telegraphMultiplier,"warning");this.scene.audioManager?.playSfx("sfx_boss_warning",{randomizeRate:false});
    this.scene.updateAccessibleStatus?.(this.action==="wind"?"구름 대왕: 화살표 방향으로 돌풍이 불어요. 반대 방향으로 걸을 수 있어요.":"구름 대왕: 표시한 곳에 빗방울이 떨어져요. 표시 사이로 피하거나 앞쪽 빗방울을 날개로 막아요.");
  }
  clearAttack(){this.drops=[];this.columns=[];this.visual.clear();}
  updateDrops(delta){
    this.drops=this.drops.map(drop=>advanceRainDrop(drop,delta)).filter(drop=>{
      if(rainDropHits(drop,this.player.body)){
        if(this.transformationManager.canGuardProjectile(drop.x,drop.y))this.transformationManager.registerGuardImpact(drop.x,drop.y);
        else this.healthManager.takeDamage(drop.x,{type:"cloud_rain"});return false;
      }
      return drop.y<=this.homeY+24&&drop.elapsedMs<2000;
    });
  }
  draw(){
    const g=this.visual.clear();
    if((this.state==="warning"||this.state==="attack")&&this.action==="wind"){
      g.lineStyle(4,this.state==="warning"?COLORS.dangerAlt:COLORS.collectBlue);
      for(let x=this.section.xStart+160;x<this.section.xEnd-64;x+=224){const end=x+this.direction*60,y=this.homeY-72;g.lineBetween(x,y,end,y).lineBetween(end,y,end-this.direction*16,y-10).lineBetween(end,y,end-this.direction*16,y+10);}
    }
    if(this.state==="warning"&&this.action==="rain")for(const x of this.columns){g.lineStyle(3,COLORS.dangerAlt).strokeRect(x-24,112,48,this.homeY-112);g.fillStyle(COLORS.dangerAlt,0.16).fillRect(x-24,112,48,this.homeY-112);}
    for(const drop of this.drops){g.fillStyle(COLORS.collectBlue).fillEllipse(drop.x,drop.y,24,32);g.lineStyle(2,COLORS.outline).strokeEllipse(drop.x,drop.y,24,32);}
  }
  update(_now,delta){
    if(this.defeated||!this.boss?.active||!this.player.body?.enable||this.transformationManager.transforming)return;
    if(this.player.x<this.section.xStart||this.player.x>this.section.xEnd){if(this.state!=="dormant")this.sleep();return;}
    if(this.state==="dormant"){this.boss.body.enable=true;this.boss.setVisible(!this.fallback);this.fallback?.setVisible(true);this.enter("intro",1000,"idle");return;}
    this.elapsedMs+=delta;this.updateDrops(delta);
    if(this.state==="attack")this.moveTo(this.homeY-20-Math.sin(this.elapsedMs/300)*12);
    if(this.state==="returning")this.moveTo(Math.min(this.homeY,this.boss.y+64*delta/1000));
    if(this.elapsedMs>=this.durationMs)switch(this.state){
      case "intro":case "hurt":case "recovery":this.actionIndex=0;this.beginWarning();break;
      case "warning":
        if(this.action==="rain")this.drops=this.columns.map(x=>({x,y:112,previousY:112,speed:this.pattern.rainSpeed*(this.easyMode?0.8:1),elapsedMs:0}));
        this.enter("attack",this.action==="wind"?this.pattern.windMs:1700,"attack");break;
      case "attack":this.clearAttack();this.actionIndex++;if(this.actionIndex<this.pattern.actions.length)this.enter("between",600,"idle");else this.enter("returning",700,"idle");break;
      case "between":this.beginWarning();break;
      case "returning":this.moveTo(this.homeY);this.enter("vulnerable",this.pattern.vulnerabilityMs*this.vulnerabilityMultiplier,"vulnerable");this.scene.updateAccessibleStatus?.("바람과 비가 그쳤어요. 낮아진 대왕의 빛나는 머리를 기본 점프로 밟으세요.");break;
      case "vulnerable":this.enter("recovery",800,"idle");break;
    }
    this.weakness.setPosition(this.boss.x,this.boss.body.top-24);this.draw();
  }
  onPlayerContact({fallingOntoHead,attemptHit,damagePlayer}){const didHit=canHitCloudKing(this.state,fallingOntoHead)&&attemptHit();if(!didHit)damagePlayer();return{didHit:Boolean(didHit)};}
  onBossHit({hp}){this.scoreManager.defeat("boss_hit",this.transformationManager.scoreMultiplier);this.clearAttack();if(hp>0)this.enter("hurt",900,"hurt");}
  onBossDefeated(){this.defeated=true;this.clearAttack();this.moveTo(this.homeY);this.enter("defeated",0,"defeated");this.boss.setActive(false);this.fallback?.setAlpha(0.55);}
  sleep(){this.clearAttack();this.moveTo(this.homeY);this.actionIndex=0;this.enter("dormant",0);this.boss.body.enable=false;this.boss.setVisible(false);this.fallback?.setVisible(false);}
  getPoolSnapshot(){return{};}
  destroy(){this.scene.events.off(EVENTS.PLAYER_RESPAWNED,this.onRespawn);this.clearAttack();this.visual.destroy();this.weakness.destroy();this.fallback?.destroy();}
}
