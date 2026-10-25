import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EventEmitter } from "node:events";
import sharp from "sharp";
import level from "../src/data/levels/level-10.js";
import { getLevel, getNextLevel, LEVELS } from "../src/data/levels/index.js";
import { assertLevelShape } from "../src/data/schema/levelSchema.js";
import { assertCourseTerrainSafety } from "../src/data/courseMechanics.js";
import { advanceHolePatrol, canHitHoleKing, canRestoreBridge, HOLE_KING_PHASES, selectBossHoles } from "../src/data/holeMechanics.js";
import { getBossDefinition } from "../src/data/bossDefinitions.js";
import { getBossPhasePattern } from "../src/data/bossPatterns.js";
import { getEnemyAnimationSpec } from "../src/data/enemyAnimations.js";
import { createRuntimeLevel } from "../src/systems/DifficultyManager.js";
import { ProgressManager } from "../src/systems/ProgressManager.js";
import { CourseMechanicsManager } from "../src/systems/CourseMechanicsManager.js";
import { HoleKingBehavior } from "../src/systems/bosses/HoleKingBehavior.js";
import { EVENTS } from "../src/config/constants.js";
import { findLayoutIssues } from "./lib/level-layout.js";

assertLevelShape(level); assert.equal(getLevel(level.id),level); assert.equal(getNextLevel("level-09"),level);
assert.equal(getNextLevel(LEVELS.at(-1).id),null);
const definition=getBossDefinition("hole_king"),section=level.sections.at(-1);
assert.deepEqual(section.boss.phases,definition.phaseIds);
for(const phase of [1,2,3]) assert.equal(getBossPhasePattern("hole_king",phase),HOLE_KING_PHASES[phase]);
for(const state of ["dormant","intro","warning","attack","returning","hurt","recovery","defeated"])assert.equal(canHitHoleKing(state,true),false);
assert.equal(canHitHoleKing("vulnerable",true),true);assert.equal(canHitHoleKing("vulnerable",false),false);
const terrain=JSON.parse(readFileSync(new URL(level.assets.tilemap),"utf8")).layers[0].objects;
const original=JSON.stringify(level),easy=createRuntimeLevel(level,true);
assert.equal(easy.terrainMechanics.timedHoles[0].warningMs,2250);assert.equal(JSON.stringify(level),original);
for(const candidate of [level,easy]){assertLevelShape(candidate);assertCourseTerrainSafety(candidate,terrain);assert.deepEqual(findLayoutIssues(candidate,terrain),[]);}
const bridges=level.terrainMechanics.timedHoles.filter(({controller})=>controller);
assert.equal(bridges.length,2);assert.ok(bridges[1].x-bridges[0].x-bridges[0].width>=448);
assert.ok(terrain.some(t=>t.x<=section.boss.spawn.x-128-60&&t.x+t.width>=section.boss.spawn.x+128+60&&t.y===576));
assert.throws(()=>assertCourseTerrainSafety(level,[...terrain,{x:bridges[0].x,y:576,width:128,height:192}]),/개폐/);
const bad=structuredClone(level);bad.terrainMechanics.timedHoles[0].controller="hole_king";assert.throws(()=>assertLevelShape(bad),/보스 구간/);
const body={enable:true,left:10,right:30,top:560,bottom:600},slab={x:0,y:576,width:128,height:24};
assert.equal(canRestoreBridge(body,slab),false);assert.equal(canRestoreBridge({...body,top:601},slab),true);
assert.deepEqual(advanceHolePatrol(9,1,1000,100,0,10),{x:10,direction:-1});
assert.deepEqual(advanceHolePatrol(1,-1,1000,100,0,10),{x:0,direction:1});

const display=()=>{const object={active:true,visible:true,body:null,destroy(){this.active=false;}};
  for(const key of ["setOrigin","setDepth","setText","setColor","setStrokeStyle","setFillStyle","setAlpha","fillStyle","fillCircle","lineStyle","strokeCircle","lineBetween","strokeRect","clear"] )object[key]=()=>object;
  object.setPosition=(x,y)=>{object.x=x;object.y=y;return object;};object.setVisible=value=>{object.visible=value;return object;};return object;};
for(const easyMode of [false,true]){
  const scene={events:new EventEmitter(),registry:{get:()=>"reduced"},add:{rectangle:display,ellipse:display,text:display,graphics:display,star:display},
    physics:{add:{existing(o){o.body={enable:true};},collider(){return{destroy(){}};}}}};
  const player={x:15072,body:{enable:true,left:15050,right:15094,top:530,bottom:576,velocity:{y:0}}};
  const manager=new CourseMechanicsManager(scene,player,level,{});scene.courseMechanics=manager;
  for(const entry of manager.holes.filter(({config})=>config.controller)){manager.updateHole(entry,100000);assert.equal(entry.phase,"closed");}
  const controlled=manager.holes.filter(({config})=>config.controller);
  assert.equal(selectBossHoles(controlled,3,easyMode).length,easyMode?1:2);
  manager.setControlledHoles("hole_king",[controlled[0].config.id],"warning");assert.ok(controlled[0].platform.body.enable);
  manager.setControlledHoles("hole_king",[controlled[0].config.id],"open");assert.equal(controlled[0].platform.body.enable,false);assert.equal(controlled[0].opening.visible,true);
  Object.assign(player.body,{left:14790,right:14820,top:560,bottom:590});manager.setControlledHoles("hole_king",[],"closed");assert.equal(controlled[0].phase,"open");
  player.body.top=601;manager.updateHole(controlled[0],16);assert.equal(controlled[0].platform.body.enable,true);
  Object.assign(player.body,{left:15050,right:15094,top:530,bottom:576});
  const data={section,hp:1,maxHp:3,phase:3,usesArt:false};const boss={x:15680,y:576,active:true,getData:k=>data[k],setData(k,v){typeof k==="object"?Object.assign(data,k):data[k]=v;return this;},
    setVisible(){return this;},setActive(v){this.active=v;return this;},body:{top:471,enable:true,reset(x,y){boss.x=x;boss.y=y;}}};
  const behavior=new HoleKingBehavior({scene,player,levelLoader:{boss},healthManager:{},transformationManager:{transforming:false,scoreMultiplier:1},scoreManager:{defeat(){}},easyMode,telegraphMultiplier:1,vulnerabilityMultiplier:1});
  behavior.update(0,16);behavior.update(0,1000);assert.equal(behavior.state,"warning");assert.equal(behavior.targets.length,easyMode?1:2);
  behavior.update(0,1300);assert.equal(behavior.state,"attack");assert.equal(controlled.filter(e=>!e.platform.body.enable).length,easyMode?1:2);
  for(let i=0;i<29;i++){behavior.update(0,100);assert.ok(boss.x>=15552&&boss.x<=15808);}
  behavior.update(0,100);assert.equal(behavior.state,"returning");assert.ok(controlled.every(e=>e.platform.body.enable));
  behavior.update(0,700);assert.equal(behavior.state,"vulnerable");assert.equal(boss.x,15680);
  scene.events.emit(EVENTS.PLAYER_RESPAWNED);assert.equal(data.hp,1);assert.equal(data.phase,3);assert.equal(behavior.state,"dormant");
  behavior.onBossDefeated();assert.ok(controlled.every(e=>e.platform.body.enable));behavior.destroy();manager.destroy();assert.equal(scene.events.listenerCount(EVENTS.PLAYER_RESPAWNED),0);
}
const progress=new ProgressManager(null);progress.data={};assert.equal(progress.isUnlocked(level,LEVELS),false);progress.complete("level-09",100,[]);assert.equal(progress.isUnlocked(level,LEVELS),true);
for(const role of definition.animationRoles){const spec=getEnemyAnimationSpec("hole_king",role);const{data,info}=await sharp(`assets/enemies/hole_king/${spec.textureKey}.png`).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.width,128);let empty=0,bottom=0;for(let i=3;i<data.length;i+=4){if(data[i]<16)empty++;else bottom=Math.max(bottom,Math.floor(i/4/128));}assert.ok(empty>8000&&bottom>=110&&bottom<=112,role);}
console.log("구멍 코스 검사 통과: 10번 해금·고정/임시 구멍·실제 충돌 복구·몸 관통 방지·3단계 좌우 이동·쉬움 동시 위험 1개·안전 바닥·부활/종료 정리·RGBA");
