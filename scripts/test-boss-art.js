import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
import {getEnemyAnimationSpec, getEnemySequenceNames} from '../src/data/enemyAnimations.js';

const metadata=JSON.parse(await readFile(new URL('../assets/_source/boss-refresh/frames.json',import.meta.url),'utf8'));
const pathFor=(key,path)=>fileURLToPath(new URL(`../assets/enemies/${key}/${path}`,import.meta.url));
let total=0;
for(const [key,{sequences,idleEyeRegion:eye}] of Object.entries(metadata)) {
  assert.equal(Object.keys(sequences).length,getEnemySequenceNames(key).length);
  assert.ok(getEnemyAnimationSpec(key,'idle').durationMs>=3000);
  let idleBase;
  let eyeChanges=0;
  for(const [sequence,count] of Object.entries(sequences)) {
    const role=sequence==='shoot'?'attack':sequence;
    assert.equal(getEnemyAnimationSpec(key,role).durations.length,count);
    const sheetPath=pathFor(key,`${key}_${sequence}.png`);
    const dimensions=await sharp(sheetPath).metadata();
    assert.equal(dimensions.width,count*128);assert.equal(dimensions.height,128);
    for(let index=0;index<count;index++) {
      const raw=await sharp(pathFor(key,`${sequence}/${key}_${sequence}_${String(index).padStart(2,'0')}.png`)).ensureAlpha().raw().toBuffer();
      const packed=await sharp(sheetPath).extract({left:index*128,top:0,width:128,height:128}).ensureAlpha().raw().toBuffer();
      let minX=128,maxX=0,minY=128,maxY=0;
      if(sequence==='idle' && index===0) idleBase=raw;
      for(let p=0;p<raw.length;p+=4) {
        assert.equal(raw[p+3],packed[p+3],`${key}/${sequence}/${index}: alpha`);
        for(let c=0;c<3;c++) assert.ok(Math.abs(raw[p+c]-packed[p+c])*raw[p+3]/255<=1,`${key}/${sequence}/${index}: stale sheet`);
        if(raw[p+3]<16) continue;
        const x=p/4%128,y=Math.floor(p/4/128);
        minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
        if(sequence==='idle' && index>0 && !raw.subarray(p,p+4).equals(idleBase.subarray(p,p+4))) {
          assert.ok(x>=eye.left&&x<eye.left+eye.width&&y>=eye.top&&y<eye.top+eye.height,`${key}: idle body changed at ${x},${y}`);
          eyeChanges++;
        }
      }
      const margin=key==='hula_king'?4:8;
      assert.ok(minX>=margin&&maxX<128-margin&&minY>=4,`${key}/${sequence}/${index}: clipped sprite`);
      assert.ok(maxY>=110&&maxY<=112,`${key}/${sequence}/${index}: unstable baseline ${maxY}`);
      if(sequence==='idle') assert.ok(Math.abs(maxY-minY+1-84)<=1,`${key}: inconsistent boss size`);
      total++;
    }
  }
  assert.ok(eyeChanges>0,`${key}: blink missing`);
}
assert.equal(total,179);
console.log('보스 원화 회귀 검사 통과: 5종·179프레임, 동일 대기 크기·몸체 픽셀 안정성·눈 깜빡임·기준선·시트 일치');
