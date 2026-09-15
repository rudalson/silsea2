import sharp from 'sharp';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
const root=fileURLToPath(new URL('..',import.meta.url));
const bosses=[['potato_king','감자 대왕','shoot'],['random_king','랜덤 대왕','draw'],['invisible_king','투명 대왕','reveal'],['hula_king','훌라후프 대왕','spin'],['water_king','물 대왕','attack']];
const layers=[];
for(const [col,[key,name,attack]] of bosses.entries()) {
  layers.push({input:Buffer.from(`<svg width="220" height="50"><text x="110" y="32" text-anchor="middle" font-family="Malgun Gothic" font-size="22" font-weight="bold" fill="#694569">${name}</text></svg>`),left:col*220,top:15});
  for(const [row,[sequence,index]] of [['idle',0],[attack,3],['defeated',7]].entries()) {
    const input=await sharp(join(root,`assets/enemies/${key}/${sequence}/${key}_${sequence}_${String(index).padStart(2,'0')}.png`)).resize(192,192).png().toBuffer();
    layers.push({input,left:col*220+14,top:65+row*190});
  }
}
await sharp({create:{width:1100,height:645,channels:4,background:'#fff5eb'}}).composite(layers).png().toFile(join(root,'references/bosses-refined-overview.png'));
