import assert from "node:assert/strict";
import { readFileSync,existsSync } from "node:fs";
import { LEVELS,getNextLevel } from "../src/data/levels/index.js";
import { assertLevelShape } from "../src/data/schema/levelSchema.js";
import { getBossDefinition } from "../src/data/bossDefinitions.js";
import { assertCourseTerrainSafety } from "../src/data/courseMechanics.js";
import { DEFAULT_TUNING,CHARACTER_LIST } from "../src/data/characters.js";
import { createRuntimeLevel } from "../src/systems/DifficultyManager.js";
import { ProgressManager } from "../src/systems/ProgressManager.js";
import { findLayoutIssues } from "./lib/level-layout.js";

assert.equal(LEVELS.length,11);assert.deepEqual(LEVELS.map(l=>l.order),Array.from({length:11},(_,i)=>i+1));
const expected=["merong_king","tape_king","music_king","hole_king","cloud_king"];
const manifest=JSON.parse(readFileSync("assets/manifest.json","utf8")),keys=new Set(manifest.assets.map(a=>a.key));
const expanded=LEVELS.slice(6);assert.deepEqual(expanded.map(l=>l.sections.at(-1).boss.key),expected);
const jumpHeight=DEFAULT_TUNING.jumpVelocity**2/(2*DEFAULT_TUNING.gravity);
for(const level of expanded){
  const terrain=JSON.parse(readFileSync(new URL(level.assets.tilemap),"utf8")).layers[0].objects;
  for(const easyMode of [false,true]){const candidate=createRuntimeLevel(level,easyMode);assertLevelShape(candidate);assertCourseTerrainSafety(candidate,terrain);assert.deepEqual(findLayoutIssues(candidate,terrain),[],`${level.id}/${easyMode}`);}
  assert.ok(keys.has(level.assets.preview));assert.ok(keys.has(level.assets.backgrounds.normal.far));
  const section=level.sections.at(-1),boss=section.boss,definition=getBossDefinition(boss.key);assert.equal(boss.hp,3);
  assert.ok(level.objectives.required.some(o=>o.type==="defeat_boss"&&o.target===boss.key));assert.ok(level.objectives.required.some(o=>o.type==="reach_gate"));
  assert.ok(level.checkpoints.some(cp=>cp.restoresHealth&&cp.x<section.xStart&&section.xStart-cp.x<=512));
  for(const render of [definition.render.art,definition.render.fallback]){
    const height=(render.origin.y*(render===definition.render.art?128:150)-render.body.offsetY)*render.scale;
    assert.ok(jumpHeight-height>=14,`${boss.key}: basic jump cannot reach head`);
  }
  const wingsX=level.items.find(i=>i.type==="wings").x;
  for(const pit of level.hazards.filter(h=>h.type==="pit"&&h.xStart<wingsX)){
    const bridge=level.terrainMechanics?.timedHoles?.some(h=>h.x===pit.xStart&&h.width===pit.xEnd-pit.xStart);
    assert.ok(bridge||pit.xEnd-pit.xStart<=224,`${level.id}: unassisted wide pit before wings`);
  }
}
for(const character of CHARACTER_LIST)assert.ok(character.physics.bodyWidth<=44&&character.physics.bodyHeight<=58);
const old=Object.fromEntries(LEVELS.slice(0,6).map((l,i)=>[l.id,{cleared:true,bestScore:1000+i,achieved:["collect_stars"]}]));
let stored=JSON.stringify(old);const storage={getItem:()=>stored,setItem:(_key,value)=>stored=value};
const progress=new ProgressManager(storage);
assert.equal(progress.isUnlocked(LEVELS[6],LEVELS),true);assert.equal(progress.isUnlocked(LEVELS[7],LEVELS),false);assert.equal(progress.isUnlocked(LEVELS[10],LEVELS),false);
for(const level of expanded){assert.equal(progress.isUnlocked(level,LEVELS),true);progress.complete(level.id,2000+level.order,["no_damage"]);const next=getNextLevel(level.id);if(next)assert.equal(progress.isUnlocked(next,LEVELS),true);}
for(const [id,record]of Object.entries(old))assert.deepEqual(progress.get(id),record);
assert.equal(getNextLevel("level-11"),null);const restored=new ProgressManager(storage);assert.equal(restored.get("level-11").cleared,true);
for(const folder of ["merong","tape","music","holes","cloud"]){assert.ok(existsSync(`assets/_source/${folder}/prompts.json`));}
console.log(`신규 확장 통합 검사 통과: 기존 6개 기록 보존·7→11 순차 해금/재로딩·5대왕 기본 점프(이미지/도형)·양 난이도 배치·${CHARACTER_LIST.length}인 최대 충돌 크기·11번 종료`);
