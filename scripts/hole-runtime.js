import { game } from "../src/main.js";
import { EVENTS } from "../src/config/constants.js";
import { getLevel, LEVELS } from "../src/data/levels/index.js";
import { progressManager } from "../src/systems/ProgressManager.js";
const output=document.querySelector("#results"),button=document.querySelector("#run");
const neutral={moveX:0,moveY:0,jumpDown:false,jumpPressed:false,jumpReleased:false,specialDown:false};
const frame=()=>new Promise(resolve=>game.events.once("step",resolve));
const frames=async n=>{for(let i=0;i<n;i++)await frame();};
const until=async(check,label,ms=18000)=>{const start=performance.now();while(performance.now()-start<ms){if(check())return;await frame();}throw Error(`Timeout: ${label}`);};
const log=text=>output.textContent+=text+"\n";
const assert=(value,text)=>{if(!value)throw Error(text);log(`PASS ${text}`);};
async function run(scene){
  button.disabled=true;output.textContent="구멍 코스 실제 입력·충돌 완주 검사\n";
  const saved={data:progressManager.data,memory:progressManager.memory,storage:progressManager.storage},storageBefore=localStorage.getItem("silsea:progress:v1"),temporary=new Map();
  progressManager.data=structuredClone(saved.data);progressManager.memory=structuredClone(saved.memory);progressManager.storage={getItem:k=>temporary.get(k)??null,setItem:(k,v)=>temporary.set(k,v)};
  const sample=scene.inputManager.sample,controller={...neutral},sections=new Set(),attacks=new Map();let falls=0;
  const onFall=()=>falls++;const monitor=()=>{sections.add(scene.currentSectionId);const b=scene.bossController?.behavior;if(b?.state==="attack"){
    const phase=scene.levelLoader.boss.getData("phase"),record=attacks.get(phase)??{min:Infinity,max:-Infinity,count:0};record.min=Math.min(record.min,b.boss.x);record.max=Math.max(record.max,b.boss.x);record.count=Math.max(record.count,b.holes.filter(h=>h.phase==="open").length);attacks.set(phase,record);
  }};
  scene.events.on(EVENTS.PLAYER_FELL,onFall);scene.events.on("postupdate",monitor);
  const place=(x,y=574)=>{Object.assign(controller,neutral);scene.player.body.reset(x,y);scene.player.setVelocity(0,0);scene.player.controlLockedUntil=0;scene.player.bufferedJumpUntil=-Infinity;};
  const grounded=()=>scene.player.body.velocity.y>=0&&(scene.player.body.blocked.down||scene.player.body.touching.down);
  try{
    scene.inputManager.sample=()=>controller;progressManager.data["level-09"]={cleared:false,bestScore:0,achieved:[]};
    assert(!progressManager.isUnlocked(getLevel("level-10"),LEVELS),"9번 클리어 전 10번 잠금");progressManager.complete("level-09",100,[]);assert(progressManager.isUnlocked(getLevel("level-10"),LEVELS),"9→10 해금");
    assert(scene.bossController.behavior.state==="dormant"&&!scene.levelLoader.gate,"보스 대기·처치 전 게이트 없음");
    const first=scene.courseMechanics.holes[0];place(first.config.x+first.config.width/2);
    await until(()=>first.phase==="warning","첫 다리 예고");assert(first.platform.body.enable&&first.platform.visible&&!first.opening.visible,"예고 중 다리 충돌·표시 일치");
    const elapsed=first.elapsedMs;scene.scene.pause();await new Promise(r=>setTimeout(r,300));assert(first.elapsedMs===elapsed&&first.platform.body.enable,"예고 중 일시정지 시간 보존");scene.scene.resume();
    await until(()=>first.phase==="open","첫 다리 열림");assert(!first.platform.body.enable&&!first.platform.visible&&first.opening.visible,"열림 표시와 실제 충돌 해제 일치");
    await until(()=>falls>0,"실제 열린 구멍 추락");await until(()=>!scene.checkpointManager.respawning&&scene.player.body.enable,"구멍 추락 후 복귀");
    assert(scene.courseMechanics.holes.every(h=>h.phase==="closed"&&h.platform.body.enable),"부활 시 모든 임시 다리 복구");place(128);falls=0;
    let previousJump=false;const started=scene.time.now;
    scene.inputManager.sample=()=>{
      const p=scene.player,flying=["pegasus","alicorn"].includes(scene.transformationManager.form),ground=grounded();
      const gap=scene.level.hazards.some(h=>h.type==="pit"&&h.xStart-p.body.right<40&&h.xEnd+48>p.x&&h.xEnd>p.body.left);
      const enemy=scene.levelLoader.enemies.some(e=>e.active&&e.body.enable&&e.x>p.x&&e.x-p.x<145&&Math.abs(e.y-p.y)<60);
      const wants=flying?p.y>400:ground?(gap||enemy):previousJump&&p.body.velocity.y<0,jump=ground&&previousJump?false:wants;
      const input={...neutral,moveX:1,moveY:flying&&p.y<320?1:0,jumpDown:jump,jumpPressed:jump&&!previousJump,jumpReleased:!jump&&previousJump};previousJump=jump;
      button.textContent=`완주 진행 ${Math.round(p.x)} / 14400`;return input;
    };
    await until(()=>scene.player.x>=14512,"필드 실제 완주",100000);scene.inputManager.sample=()=>controller;place(14512);scene.transformationManager.cancelPresentation();scene.transformationManager.setForm("base",false);
    assert(falls===0&&sections.size>=5&&scene.checkpointManager.current.id==="cp_hole_boss","다섯 필드 구간·고정/임시 구멍 무추락·회복 지점 통과");log(`ROUTE ${((scene.time.now-started)/1000).toFixed(1)}초 · 별 ${scene.objectiveManager.context.starCount}`);
    const old=scene.bossController.behavior;assert(await scene.levelHotReload.reload(),"레벨 데이터 재로드");assert(!old.visual.active&&scene.courseMechanics.holes.every(h=>h.platform.body.enable),"이전 표시·충돌 정리와 다리 초기화");
    const boss=scene.levelLoader.boss,b=scene.bossController.behavior;place(15072);await until(()=>b.state==="warning","대왕 구멍 예고");
    scene.healthManager.grantInvulnerability(1500);place(boss.x,boss.body.top+12);scene.player.setVelocityY(240);await frames(4);assert(boss.getData("hp")===3,"약점 외 머리 밟기 거부");place(15072);
    await until(()=>b.state==="attack","대왕 다리 개방");const target=b.targets[0];place(target.config.x+target.config.width/2);const fallBefore=falls;
    await until(()=>falls>fallBefore,"대왕 열린 구멍 실제 추락");await until(()=>!scene.checkpointManager.respawning&&scene.player.body.enable,"대왕 구간 부활");
    assert(boss.getData("hp")===3&&boss.getData("phase")===1&&b.state==="dormant"&&b.holes.every(h=>h.platform.body.enable),"복귀 시 미타격 HP·단계 유지와 위치·구멍 정리");
    place(15072);
    for(let phase=1;phase<=3;phase++){
      await until(()=>b.state==="vulnerable",`대왕 ${phase}단계 약점`);assert(b.holes.every(h=>h.platform.body.enable)&&boss.x===b.homeX,"약점 전에 실제 다리 복구·대왕 중앙 정지");
      const hp=boss.getData("hp");controller.moveX=1;await until(()=>scene.player.x>=boss.x-224,"기본 점프 접근",4000);await until(grounded,"머리 점프 접지",1000);
      controller.jumpDown=controller.jumpPressed=true;await frames(1);controller.jumpPressed=false;await until(()=>boss.getData("hp")<hp,"기본 점프 머리 타격",2200);Object.assign(controller,neutral);await frames(3);
      assert(boss.getData("hp")===hp-1,`실제 점프 HP ${hp} → ${hp-1}, 중복 피해 없음`);if(phase<3)place(15072);
    }
    const third=attacks.get(3);assert(third&&third.max-third.min>80&&third.count===(scene.registry.get("easyMode")?1:2),"3단계 좌우 이동·난이도별 동시 구멍 수");
    assert(b.defeated&&scene.courseMechanics.finished&&scene.courseMechanics.holes.every(h=>h.platform.body.enable),"처치 후 모든 다리 충돌 복구·개폐 종료");
    assert(!scene.objectiveManager.areRequiredComplete(),"실제 게이트 진입 필요");await until(()=>scene.levelLoader.gate?.lifecycle?.phase==="active","게이트 활성");place(scene.level.exit.x);await until(()=>game.scene.isActive("ClearScene"),"게이트 진입 후 클리어");
    assert(progressManager.get("level-10").cleared&&temporary.get("silsea:progress:v1")?.includes("level-10"),"10번 클리어 임시 저장");assert(localStorage.getItem("silsea:progress:v1")===storageBefore,"사용자 기존 진행 기록 보존");
    button.textContent="검증 완료";log("COMPLETE — 구멍·추락·복귀·완주·좌우 이동·세 단계·바닥 복구·게이트·저장 확인");
  }catch(error){button.textContent="검증 실패";log(`FAIL ${error.stack??error}`);log(`STATE ${JSON.stringify({x:scene.player.x,y:scene.player.y,hp:scene.levelLoader.boss?.getData("hp"),boss:scene.bossController?.behavior?.state,holes:scene.courseMechanics?.getSnapshot().holes,falls,attacks:[...attacks]})}`);scene.scene.resume();}
  finally{scene.events.off(EVENTS.PLAYER_FELL,onFall);scene.events.off("postupdate",monitor);scene.inputManager.sample=sample;Object.assign(progressManager,saved);}
}
const ready=setInterval(()=>{const scene=game?.scene?.getScene("GameScene");if(!scene?.player?.active)return;clearInterval(ready);if(scene.level.id!=="level-10"||!scene.levelHotReload){output.textContent="?visualReview=level-10&debug=1&mute=1로 열어 주세요.";return;}button.disabled=false;button.textContent="구멍 코스 검증 실행";output.textContent="실제 구멍·필드·대왕·바닥 복구·임시 저장 검사";button.addEventListener("click",()=>run(scene),{once:true});},100);
