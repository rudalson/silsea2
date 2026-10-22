export const CLOUD_KING_PHASES = Object.freeze({
  1: Object.freeze({ id: "single_gust", actions: ["wind"], warningMs: 1300, windMs: 1600, windSpeed: 130, rainOffsets: [0], rainSpeed: 420, vulnerabilityMs: 3600 }),
  2: Object.freeze({ id: "warned_raindrop", actions: ["rain"], warningMs: 1300, windMs: 1600, windSpeed: 140, rainOffsets: [0], rainSpeed: 440, vulnerabilityMs: 3700 }),
  3: Object.freeze({ id: "gust_then_rain", actions: ["wind", "rain"], warningMs: 1200, windMs: 1800, windSpeed: 155, rainOffsets: [-192, 0, 192], rainSpeed: 460, vulnerabilityMs: 3800 })
});
export const canHitCloudKing = (state, fallingOntoHead) => state === "vulnerable" && fallingOntoHead;
export function getCloudWindVelocity(direction, speed, playerX, section) {
  if(playerX <= section.xStart + 96 || playerX >= section.xEnd - 96) return 0;
  return Math.sign(direction) * Math.max(0,Math.min(160,speed));
}
export function chooseRainColumns(playerX,section,offsets,easyMode=false) {
  const clamp=x=>Math.max(section.xStart+128,Math.min(section.xEnd-128,x));
  const center=clamp(playerX),chosen=easyMode?[0]:offsets;
  return [...new Set(chosen.map(offset=>clamp(center+offset)))].sort((a,b)=>a-b);
}
export const advanceRainDrop=(drop,deltaMs)=>({...drop,previousY:drop.y,y:drop.y+drop.speed*Math.max(0,deltaMs)/1000,elapsedMs:drop.elapsedMs+Math.max(0,deltaMs)});
export const rainDropHits=(drop,body)=>Boolean(body?.enable&&body.right>=drop.x-12&&body.left<=drop.x+12
  &&body.bottom>=Math.min(drop.previousY,drop.y)-16&&body.top<=Math.max(drop.previousY,drop.y)+16);
