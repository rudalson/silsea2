import { game } from "../src/main.js";
import { EVENTS } from "../src/config/constants.js";
import { getLevel,getNextLevel,LEVELS } from "../src/data/levels/index.js";
import { progressManager } from "../src/systems/ProgressManager.js";
const output=document.querySelector("#results"),button=document.querySelector("#run");
const neutral={moveX:0,moveY:0,jumpDown:false,jumpPressed:false,jumpReleased:false,specialDown:false};
const frame=()=>new Promise(r=>game.events.once("step",r)),frames=async n=>{for(let i=0;i<n;i++)await frame();};
const until=async(check,label,ms=18000)=>{const start=performance.now();while(performance.now()-start<ms){if(check())return;await frame();}throw Error(`Timeout: ${label}`);};
const log=text=>output.textContent+=text+"\n",assert=(value,text)=>{if(!value)throw Error(text);log(`PASS ${text}`);};
async function run(scene){
  button.disabled=true;output.textContent="구름 코스 실제 입력·충돌 완주 검사\n";
  const saved={data:progressManager.data,memory:progressManager.memory,storage:progressManager.storage},storageBefore=localStorage.getItem("silsea:progress:v1"),temporary=new Map();
  progressManager.data=structuredClone(saved.data);progressManager.memory=structuredClone(saved.memory);progressManager.storage={getItem:k=>temporary.get(k)??null,setItem:(k,v)=>temporary.set(k,v)};
  const sample=scene.inputManager.sample,controller={...neutral},sections=new Set(),attacks=new Set();let falls=0,guards=0,autoDodge=false,dodgeColumns=null,dodgeTarget=0,inspectGuard=false,guardTrace=null;
  const onFall=()=>falls++,onGuard=()=>guards++;
  const monitor=()=>{sections.add(scene.currentSectionId);const b=scene.bossController?.behavior;if(b?.state==="attack")attacks.add(`${scene.levelLoader.boss.getData("phase")}:${b.action}`);
    if(inspectGuard&&b?.drops[0]?.y>450){const d=b.drops[0],p=scene.player;guardTrace={drop:{x:d.x,y:d.y},player:{x:p.x,y:p.y,left:p.body.left,right:p.body.right,top:p.body.top,bottom:p.body.bottom},phase:scene.transformationManager.guardPhase,form:scene.transformationManager.form,canGuard:scene.transformationManager.canGuardProjectile(d.x,d.y),input:scene.lastInput.specialDown};}
    if(autoDodge){if(b?.state==="warning"&&b.action==="rain"){
      if(dodgeColumns!==b.columns){dodgeColumns=b.columns;dodgeTarget=Math.min(b.section.xEnd-140,b.columns[Math.floor(b.columns.length/2)]+96);}
      controller.moveX=Math.abs(scene.player.x-dodgeTarget)<8?0:Math.sign(dodgeTarget-scene.player.x);
    }else controller.moveX=0;}
  };
  scene.events.on(EVENTS.PLAYER_FELL,onFall);scene.events.on(EVENTS.PROJECTILE_GUARDED,onGuard);scene.events.on("postupdate",monitor);
  const place=(x,y=574)=>{Object.assign(controller,neutral);scene.player.body.reset(x,y);scene.player.setVelocity(0,0);scene.player.controlLockedUntil=0;scene.player.bufferedJumpUntil=-Infinity;};
  const grounded=()=>scene.player.body.velocity.y>=0&&(scene.player.body.blocked.down||scene.player.body.touching.down);
  const drive=()=>{let previousJump=false;return()=>{const p=scene.player,ground=grounded(),flying=["pegasus","alicorn"].includes(scene.transformationManager.form);
    const gap=scene.level.hazards.some(h=>h.type==="pit"&&h.xStart-p.body.right<40&&h.xEnd+48>p.x&&h.xEnd>p.body.left);
    const enemy=scene.levelLoader.enemies.some(e=>e.active&&e.body.enable&&e.x>p.x&&e.x-p.x<145&&Math.abs(e.y-p.y)<60);
    const wants=flying?p.y>400:ground?(gap||enemy):previousJump&&p.body.velocity.y<0,jump=ground&&previousJump?false:wants;
    const input={...neutral,moveX:1,moveY:flying&&p.y<320?1:0,jumpDown:jump,jumpPressed:jump&&!previousJump,jumpReleased:!jump&&previousJump};previousJump=jump;button.textContent=`완주 진행 ${Math.round(p.x)} / 16500`;return input;
  };};
  try{
    scene.inputManager.sample=()=>controller;progressManager.data["level-10"]={cleared:false,bestScore:0,achieved:[]};assert(!progressManager.isUnlocked(getLevel("level-11"),LEVELS),"10번 전 마지막 코스 잠금");progressManager.complete("level-10",100,[]);assert(progressManager.isUnlocked(getLevel("level-11"),LEVELS)&&getNextLevel("level-11")===null,"10→11 해금·11번 이후 다음 레벨 없음");
    assert(scene.bossController.behavior.state==="dormant"&&!scene.levelLoader.gate,"구름 성 진입 전 대왕 대기·게이트 없음");
    if(new URLSearchParams(location.search).get("bossOnly")!=="1"){
    scene.transformationManager.setForm("pegasus",false);scene.transformationManager.flightMs=0;place(7000);await until(()=>scene.transformationManager.flightMs>=500,"지상 비행 회복",3000);assert(grounded(),"착지 중 빈 비행 게이지 회복");
    scene.transformationManager.setForm("base",false);scene.transformationManager.flightMs=0;place(8000);scene.inputManager.sample=drive();const beforeAssist=falls;
    await until(()=>scene.player.x>=8912,"변신 없이 상승기류·보조 발판 통과",14000);scene.inputManager.sample=()=>controller;assert(falls===beforeAssist,"비행 게이지 0·기본형으로 640px 기류 구간 무추락 통과");
    scene.healthManager.handleFall();await until(()=>!scene.checkpointManager.respawning&&scene.player.body.enable,"필드 실패 복귀");assert(scene.bossController.behavior.getMovementVelocityX()===0,"필드 부활 시 잔류 돌풍 없음");place(128);falls=0;
    const started=scene.time.now;scene.inputManager.sample=drive();await until(()=>scene.player.x>=16560,"실제 전체 필드 완주",100000);scene.inputManager.sample=()=>controller;place(16560);scene.transformationManager.cancelPresentation();scene.transformationManager.setForm("base",false);
    assert(falls===0&&sections.size>=5&&scene.checkpointManager.current.id==="cp_cloud_boss","다섯 필드 구간·회복 지점·낭떠러지 무추락 완주");log(`ROUTE ${((scene.time.now-started)/1000).toFixed(1)}초 · 별 ${scene.objectiveManager.context.starCount}`);
    const old=scene.bossController.behavior;assert(await scene.levelHotReload.reload(),"레벨 데이터 재로드");assert(!old.visual.active&&scene.bossController.behavior.drops.length===0,"재로드 시 이전 공격·표시 정리");
    }else{place(16560);await frames(10);log("MODE 보스 전용 검사 — 필드 검사는 생략");}
    const boss=scene.levelLoader.boss,b=scene.bossController.behavior;place(17024);await until(()=>b.state==="warning","돌풍 예고");scene.healthManager.grantInvulnerability(1500);place(boss.x,boss.body.top+12);scene.player.setVelocityY(240);await frames(4);assert(boss.getData("hp")===3,"약점 외 머리 밟기 거부");place(17024);
    await until(()=>b.state==="attack"&&b.action==="wind","실제 돌풍 시작");const windX=scene.player.x,elapsed=b.elapsedMs;scene.scene.pause();await new Promise(r=>setTimeout(r,300));assert(b.elapsedMs===elapsed&&scene.player.x===windX,"돌풍 중 일시정지 보존");scene.scene.resume();const at=scene.time.now;await until(()=>scene.time.now-at>=700,"돌풍 밀림");assert(scene.player.x<windX-Math.abs(b.getMovementVelocityX())*0.15&&Math.abs(scene.player.body.velocity.x)>30,"중립 입력에도 실제 돌풍 이동");
    controller.moveX=1;const againstX=scene.player.x,againstAt=scene.time.now;await until(()=>scene.time.now-againstAt>=400,"돌풍 반대 입력");assert(scene.player.x>againstX+15,"돌풍 중 반대 방향 조작 가능");Object.assign(controller,neutral);
    scene.healthManager.handleFall();await until(()=>!scene.checkpointManager.respawning&&scene.player.body.enable,"돌풍 중 실패 복귀");assert(boss.getData("hp")===3&&boss.getData("phase")===1&&b.state==="dormant"&&b.getMovementVelocityX()===0&&b.drops.length===0,"복귀 시 미타격 HP·단계 유지와 돌풍·비 정리");place(17024);
    const stomp=async()=>{autoDodge=true;await until(()=>b.state==="vulnerable","공격 뒤 낮은 약점",22000);autoDodge=false;Object.assign(controller,neutral);assert(b.drops.length===0&&b.getMovementVelocityX()===0&&boss.y===576,"약점 전에 돌풍·비 정리·기본 점프 높이로 하강");const hp=boss.getData("hp");controller.moveX=1;await until(()=>scene.player.x>=boss.x-224,"기본 점프 접근",4000);await until(grounded,"접지",1200);controller.jumpDown=controller.jumpPressed=true;await frames(1);controller.jumpPressed=false;await until(()=>boss.getData("hp")<hp,"기본 점프 머리 타격",2200);Object.assign(controller,neutral);await frames(3);assert(boss.getData("hp")===hp-1,`실제 점프 HP ${hp} → ${hp-1}, 중복 감소 없음`);};
    await stomp();place(17024);await until(()=>b.state==="warning"&&b.action==="rain","빗방울 예고");const column=b.columns[0];scene.transformationManager.setForm("pegasus",false);scene.transformationManager.restoreFlight();place(column-24);scene.player.setFlipX(false);controller.specialDown=true;inspectGuard=true;
    await until(()=>b.drops.some(d=>d.y>=420),"날개 방어 준비");const guardHp=scene.healthManager.hp;await until(()=>guards>0,"빗방울 실제 날개 방어",3000);assert(scene.healthManager.hp===guardHp,"빗방울 방어 시 HP 보존");Object.assign(controller,neutral);scene.transformationManager.setForm("base",false);place(column+96);
    await stomp();place(17024);await stomp();assert(attacks.has("3:wind")&&attacks.has("3:rain")&&b.defeated&&b.drops.length===0&&b.getMovementVelocityX()===0,"3단계 돌풍→비 순차 조합·처치 후 정리");
    assert(!scene.objectiveManager.areRequiredComplete(),"처치 후 실제 게이트 진입 필요");await until(()=>scene.levelLoader.gate?.lifecycle?.phase==="active","게이트 활성");place(scene.level.exit.x);await until(()=>game.scene.isActive("ClearScene"),"최종 게이트 클리어");
    assert(progressManager.get("level-11").cleared&&temporary.get("silsea:progress:v1")?.includes("level-11"),"마지막 11번 클리어 임시 저장");assert(localStorage.getItem("silsea:progress:v1")===storageBefore,"사용자 기존 기록 보존");button.textContent="검증 완료";log("COMPLETE — 기류·빈 게이지·회복·필드·돌풍·비·세 단계·최종 게이트·저장 확인");
  }catch(error){autoDodge=false;button.textContent="검증 실패";log(`FAIL ${error.stack??error}`);log(`STATE ${JSON.stringify({x:scene.player.x,y:scene.player.y,hp:scene.levelLoader.boss?.getData("hp"),boss:scene.bossController?.behavior?.state,action:scene.bossController?.behavior?.action,drops:scene.bossController?.behavior?.drops,wind:scene.bossController?.getMovementVelocityX(),velocity:scene.player.body?.velocity,falls,guards,guardTrace,guard:scene.transformationManager.getSnapshot(scene.time.now),attacks:[...attacks]})}`);scene.scene.resume();}
  finally{scene.events.off(EVENTS.PLAYER_FELL,onFall);scene.events.off(EVENTS.PROJECTILE_GUARDED,onGuard);scene.events.off("postupdate",monitor);scene.inputManager.sample=sample;Object.assign(progressManager,saved);}
}
const ready=setInterval(()=>{const scene=game?.scene?.getScene("GameScene");if(!scene?.player?.active)return;clearInterval(ready);if(scene.level.id!=="level-11"||!scene.levelHotReload){output.textContent="?visualReview=level-11&debug=1&mute=1로 열어 주세요.";return;}button.disabled=false;button.textContent="구름 코스 검증 실행";output.textContent="실제 기류·회복·필드·돌풍·비·최종 게이트·저장 검사";button.addEventListener("click",()=>run(scene),{once:true});},100);
