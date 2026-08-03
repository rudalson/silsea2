import { mkdir, readdir, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { PALETTE } from "../data/palette.js";
import { nearestPaletteColor, paletteHexes } from "./image-utils.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const referenceRoot = join(root, "references", "images");
const reportPath = join(root, "references", "palette-report.html");
const supported = new Set([".png", ".jpg", ".jpeg", ".webp"]);

const walk = async (directory) => {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (supported.has(extname(entry.name).toLowerCase())) files.push(path);
  }
  return files;
};

const bucketHex = (red, green, blue) => {
  const quantize = (value) => Math.round(value / 17) * 17;
  return `#${[quantize(red), quantize(green), quantize(blue)].map((value) => value.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
};

const files = await walk(referenceRoot);
const rows = [];
const totalCounts = new Map();

for (const file of files) {
  const { data, info } = await sharp(file)
    .resize({ width: 160, height: 160, fit: "inside", withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const counts = new Map();
  for (let index = 0; index < data.length; index += info.channels) {
    const hex = bucketHex(data[index], data[index + 1], data[index + 2]);
    counts.set(hex, (counts.get(hex) ?? 0) + 1);
    totalCounts.set(hex, (totalCounts.get(hex) ?? 0) + 1);
  }
  const dominant = [...counts.entries()].sort((left, right) => right[1] - left[1]).slice(0, 8);
  rows.push({ file: relative(referenceRoot, file), dominant });
}

const extracted = [...totalCounts.entries()].sort((left, right) => right[1] - left[1]).slice(0, 16);
const swatches = (colors) => colors.map(([hex, count]) => {
  const nearest = nearestPaletteColor([
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16)
  ]);
  return `<span class="swatch" style="--c:${hex}" title="${hex} · ${count} pixels · nearest ${nearest.hex}">${hex}</span>`;
}).join("");

const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><title>Palette extraction report</title>
<style>body{font-family:system-ui;margin:32px;background:#f7f3ea;color:#25282d}h1,h2{margin-bottom:8px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}.card{background:white;border:1px solid #d8d3c8;border-radius:14px;padding:16px}.swatch{display:inline-flex;width:104px;height:48px;margin:4px;border-radius:8px;background:var(--c);align-items:end;justify-content:center;padding:4px;color:white;text-shadow:0 1px 3px #000;font-size:12px;box-sizing:border-box}.locked{display:flex;flex-wrap:wrap}</style>
</head><body><h1>참조 이미지 팔레트 추출 보고서</h1>
<p>소스 ${files.length}개 · 4-bit RGB 버킷 집계. 최종 프로젝트 팔레트는 Phase 0에서 승인된 <code>data/palette.js</code>를 잠금 상태로 유지한다.</p>
<h2>승인된 공용 팔레트</h2><div class="locked">${paletteHexes.map((hex) => `<span class="swatch" style="--c:${hex}">${hex}</span>`).join("")}</div>
<h2>전체 지배색</h2><div class="locked">${swatches(extracted)}</div>
<h2>이미지별 지배색</h2><div class="grid">${rows.map((row) => `<section class="card"><strong>${row.file}</strong><div>${swatches(row.dominant)}</div></section>`).join("")}</div>
<h2>팔레트 소스</h2><pre>${JSON.stringify(PALETTE, null, 2)}</pre></body></html>`;

await mkdir(dirname(reportPath), { recursive: true });
await writeFile(reportPath, html, "utf8");
console.log(`팔레트 보고서 생성: ${basename(reportPath)} · 참조 ${files.length}개`);
