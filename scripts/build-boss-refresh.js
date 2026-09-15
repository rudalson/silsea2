import { mkdir, writeFile as writeOnce, copyFile } from "node:fs/promises";
import { setTimeout } from "node:timers/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = join(root, "assets/_source/boss-refresh");
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
const canvas = () => sharp({ create: { width: 128, height: 128, channels: 4, background: transparent } });
const writeFile = async (path, data) => {
  for (let attempt=0;;attempt++) {
    try { return await writeOnce(path,data); }
    catch (error) {
      if(attempt>=3 || !['UNKNOWN','EBUSY','EPERM'].includes(error.code)) throw error;
      await setTimeout(200*(attempt+1));
    }
  }
};
async function readAtlas(filename) {
  const { data, info } = await sharp(join(source, filename)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const excess = data[i + 1] - Math.max(data[i], data[i + 2]);
    if (excess <= 30) continue; // Preserve turquoise hair, whose green and blue are close.
    data[i + 3] = Math.round(255 * Math.max(0, 1 - (excess - 30) / 150));
    data[i + 1] = Math.min(data[i + 1], Math.max(data[i], data[i + 2]));
  }
  // Extract connected silhouettes rather than cutting at nominal grid lines:
  // a hoof or tail can slightly cross a cell boundary in the generated atlas.
  const visited = new Uint8Array(info.width * info.height);
  const components = [];
  for (let start = 0; start < visited.length; start++) {
    if (visited[start] || data[start * 4 + 3] < 16) continue;
    const queue = [start];
    visited[start] = 1;
    let minX = info.width, minY = info.height, maxX = 0, maxY = 0;
    for (let q = 0; q < queue.length; q++) {
      const p = queue[q], x = p % info.width, y = Math.floor(p / info.width);
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= info.width || ny >= info.height) continue;
        const n = ny * info.width + nx;
        if (visited[n] || data[n * 4 + 3] < 16) continue;
        visited[n] = 1;
        queue.push(n);
      }
    }
    if (queue.length < 90) {
      // Discard the atlas's stray marks; impact effects belong to the game.
      for (const p of queue) data[p * 4 + 3] = 0;
    } else components.push({ minX, minY, maxX, maxY, pixels: queue.length, indices: queue });
  }
  return { info, components, data };
}


// Mask by component membership before cropping, so an adjacent tail cannot
// leak into the rectangular crop of a jumping pony or outstretched wing.
async function cropComponent(atlas, component, scale) {
  const { minX, minY, maxX, maxY, indices } = component;
  const width = maxX - minX + 1, height = maxY - minY + 1;
  const raw = Buffer.alloc(width * height * 4);
  for (const p of indices) {
    const x = p % atlas.info.width - minX;
    const y = Math.floor(p / atlas.info.width) - minY;
    atlas.data.copy(raw, (y * width + x) * 4, p * 4, p * 4 + 4);
  }
  return sharp(raw, { raw: { width, height, channels: 4 } })
    .resize(Math.round(width * scale), Math.round(height * scale)).png().toBuffer();
}

const specs = {
  potato_king: { rows: [0,160,320,478,633,785,937,1100,1254], sequences: { idle:4, jump:4, fall:2, land:4, shoot:4, hurt:3, defeated:8 } },
  hula_king: { rows: [0,164,317,478,629,777,924,1080,1254], sequences: { idle:4, spin:8, warning:4, throw:6, vulnerable:4, hurt:3, defeated:8 } },
  invisible_king: { rows: [0,185,347,513,677,841,1008,1130,1254], sequences: { idle:4, reveal:6, hide:6, attack:6, hurt:3, defeated:8 } },
  water_king: { rows: [0,163,318,474,630,780,933,1091,1254], sequences: { idle:4, submerge:6, emerge:6, attack:6, dizzy:4, hurt:3, defeated:8 } },
  random_king: { rows: [0,155,302,451,600,746,895,1045,1254], sequences: { idle:4, draw:6, teleport:6, attack:6, taunt:6, vulnerable:4, hurt:3, defeated:8 } }
};
const metadata = {};
const palettes = {};
const selected = process.argv.slice(2);
for (const [key, spec] of Object.entries(specs)) {
  if (selected.length && !selected.includes(key)) continue;
  const atlas = await readAtlas(`${key}.png`);
  // Learn one non-dithered palette for the entire boss, rather than forcing
  // pastel gradients through unrelated terrain colors or re-quantizing poses.
  const indexed = await sharp(atlas.data,{raw:atlas.info}).png({palette:true,colours:128,dither:0}).toBuffer();
  const colors = await sharp(indexed).ensureAlpha().raw().toBuffer();
  const colorMap = new Map();
  for(let p=0;p<colors.length;p+=4) if(colors[p+3]>128) colorMap.set(`${colors[p]},${colors[p+1]},${colors[p+2]}`,[colors[p],colors[p+1],colors[p+2]]);
  const palette = [...colorMap.values()];
  palettes[key] = palette;
  const paletteCache = new Map();
  const cells = Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => []));
  // The hula throw drawings touch at one glove/hoop edge in the atlas.
  // Separate that authored boundary before assigning connected silhouettes.
  if (key === 'hula_king') {
    atlas.components = atlas.components.flatMap(component => {
      if (component.minY < 478 || component.maxY > 629 || component.maxX-component.minX < 220) return [component];
      return [component.indices.filter(p=>p%atlas.info.width<321),component.indices.filter(p=>p%atlas.info.width>=321)]
        .filter(indices=>indices.length).map(indices=>({indices,
          minX:Math.min(...indices.map(p=>p%atlas.info.width)),maxX:Math.max(...indices.map(p=>p%atlas.info.width)),
          minY:Math.min(...indices.map(p=>Math.floor(p/atlas.info.width))),maxY:Math.max(...indices.map(p=>Math.floor(p/atlas.info.width)))
        }));
    });
  }
  for (const component of atlas.components) {
    const x = (component.minX + component.maxX) / 2;
    const y = (component.minY + component.maxY) / 2;
    const row = spec.rows.findIndex((start, i) => y >= start && y < spec.rows[i + 1]);
    const col = Math.floor(x / (atlas.info.width / 8));
    if (row < 0 || col > 7) throw new Error(`${key}: 원화 격자 범위 초과`);
    cells[row][col].push(component);
  }
  // Group the question mark's separate dot and hands with its body, retaining
  // membership masks so adjacent poses never leak into a rectangular crop.
  const combined = cells.map(row => row.map(parts => parts.length ? {
    minX: Math.min(...parts.map(p=>p.minX)), maxX: Math.max(...parts.map(p=>p.maxX)),
    minY: Math.min(...parts.map(p=>p.minY)), maxY: Math.max(...parts.map(p=>p.maxY)),
    indices: parts.flatMap(p=>p.indices)
  } : null));
  const idle = combined[0][0];
  const scale = 84 / (idle.maxY - idle.minY + 1);
  const output = join(root, 'assets/enemies', key);
  const framesBySequence = {};
  for (const [row, [sequence, count]] of Object.entries(spec.sequences).entries()) {
    const frames = [];
    for (let col=0; col<count; col++) {
      const component = combined[row][col];
      if (!component) throw new Error(`${key}/${sequence}/${col}: 원화 누락`);
      const width = Math.round((component.maxX-component.minX+1)*scale);
      const height = Math.round((component.maxY-component.minY+1)*scale);
      const margin = key === 'hula_king' ? 4 : 8;
      if (width > 128-margin*2 || height > 108) throw new Error(`${key}/${sequence}/${col}: ${width}x${height} 원화 배치 확인 필요`);
      const cutout = await cropComponent(atlas, component, scale);
      const left = Math.max(margin, Math.min(128-margin-width, Math.round(64+(component.minX-(col+.5)*atlas.info.width/8)*scale)));
      frames.push(await canvas().composite([{ input:cutout, left, top:112-height }]).png().toBuffer());
    }
    framesBySequence[sequence] = frames;
  }
  // Stable idle silhouette; the generated closed eyes are the only moving part.
  const eye = key === 'random_king' ? {left:34,top:48,width:33,height:20}
    : key === 'invisible_king' ? {left:39,top:60,width:48,height:23}
    : key === 'water_king' ? {left:37,top:70,width:51,height:23}
    : {left:32,top:56,width:54,height:28};
  const open = framesBySequence.idle[0];
  const eyelid = await sharp(framesBySequence.idle[2]).extract(eye).png().toBuffer();
  const closed = await sharp(open).composite([{input:eyelid,left:eye.left,top:eye.top}]).png().toBuffer();
  framesBySequence.idle = [open,open,closed,open];
  const measurements = [];
  for (const [sequence, frames] of Object.entries(framesBySequence)) {
    await mkdir(join(output,sequence),{recursive:true});
    for (let index=0; index<frames.length; index++) {
      const raw = await sharp(frames[index]).ensureAlpha().raw().toBuffer();
      const opacity = sequence === 'hide' || sequence === 'submerge' ? [1,.9,.75,.6,.4,.22][index]
        : sequence === 'reveal' ? [.3,.45,.65,.8,.95,1][index] : 1;
      for(let p=0;p<raw.length;p+=4) {
        if(raw[p+3]<16) {raw[p+3]=0;continue;}
        const cacheKey=`${raw[p]},${raw[p+1]},${raw[p+2]}`;
        if(!paletteCache.has(cacheKey)) {
          let best=palette[0], distance=Infinity;
          for(const rgb of palette) {
            const d=(rgb[0]-raw[p])**2+(rgb[1]-raw[p+1])**2+(rgb[2]-raw[p+2])**2;
            if(d<distance) {distance=d;best=rgb;}
          }
          paletteCache.set(cacheKey,best);
        }
        const rgb=paletteCache.get(cacheKey);
        raw[p]=rgb[0];raw[p+1]=rgb[1];raw[p+2]=rgb[2];raw[p+3]=Math.round(raw[p+3]*opacity);
      }
      frames[index]=await sharp(raw,{raw:{width:128,height:128,channels:4}}).png().toBuffer();
      await writeFile(join(output,sequence,`${key}_${sequence}_${String(index).padStart(2,'0')}.png`),frames[index]);
      const bounds=combined[Object.keys(spec.sequences).indexOf(sequence)][index];
      measurements.push({sequence,index,sourceBounds:[bounds.minX,bounds.minY,bounds.maxX,bounds.maxY],scale});
    }
    const sheet=await sharp({create:{width:128*frames.length,height:128,channels:4,background:transparent}})
      .composite(frames.map((input,i)=>({input,left:i*128,top:0}))).png().toBuffer();
    await writeFile(join(output,`${key}_${sequence}.png`),sheet);
  }
  if(key==='potato_king') await copyFile(join(output,'idle',`${key}_idle_00.png`),join(root,'assets/_anchor/potato_king_anchor.png'));
  if(key==='invisible_king') {
    // Reuse the new silhouette for the memory hint, at the same displayed size.
    const packed=Buffer.alloc(768*192*4);
    const pixels=await sharp(framesBySequence.idle[0]).ensureAlpha().raw().toBuffer();
    for(const [frame,opacity] of [.7,.5,.3,.12].entries()) {
      for(let y=0;y<171;y++) for(let x=0;x<171;x++) {
        // Sample straight RGBA so low-alpha edges retain their palette color.
        const from=(Math.floor(y*128/171)*128+Math.floor(x*128/171))*4;
        const to=((y+3)*768+frame*192+x+10)*4;
        pixels.copy(packed,to,from,from+3);
        packed[to+3]=Math.round(pixels[from+3]*opacity);
      }
    }
    const strip=await sharp(packed,{raw:{width:768,height:192,channels:4}}).png().toBuffer();
    await writeFile(join(root,'assets/effects/fx_invisible_afterimage.png'),strip);
  }
  metadata[key]={sequences:spec.sequences,idleEyeRegion:eye,scale,idleHeight:84,measurements};
  await sharp({create:{width:1024,height:Object.keys(spec.sequences).length*144,channels:4,background:'#f8f0e6'}})
    .composite(Object.keys(spec.sequences).map((sequence,row)=>({input:join(output,`${key}_${sequence}.png`),left:0,top:row*144})))
    .png().toFile(join(root,`references/${key}-refined.png`));
  console.log(`${key}: ${Object.values(spec.sequences).reduce((a,b)=>a+b,0)} frames, fixed scale ${scale.toFixed(4)}`);
}
if (!selected.length) {
  await writeFile(join(source,'frames.json'),JSON.stringify(metadata,null,2)+'\n');
  await writeFile(join(source,'palette.json'),JSON.stringify(palettes,null,2)+'\n');
}
