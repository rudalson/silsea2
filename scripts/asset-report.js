import { readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import sharp from "sharp";
import { PALETTE } from "../data/palette.js";

const VISUAL_TYPES = new Set(["spritesheet", "image", "atlas"]);
const ROLE_ORDER = ["danger", "collect", "friendly"];
const ROLE_LABELS = {
  danger: "위험",
  collect: "수집·진행",
  friendly: "친화"
};
const CATEGORY_LABELS = {
  danger: "적",
  collect: "아이템·진행",
  friendly: "플레이어",
  environment: "환경"
};

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const percentile = (values, ratio) => values[Math.floor((values.length - 1) * ratio)] ?? 0;

const channelToLinear = (value) => {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
};

const getRole = (asset) => {
  if (asset.url.includes("/characters/")) return "friendly";
  if (asset.url.includes("/enemies/")) return "danger";
  if (asset.url.includes("/items/")) return "collect";
  return "environment";
};

const getRepresentativeBuffer = async (asset, absolutePath) => {
  let pipeline = sharp(absolutePath, { failOn: "error" });
  if (asset.type === "spritesheet") {
    pipeline = pipeline.extract({
      left: 0,
      top: 0,
      width: asset.frameWidth,
      height: asset.frameHeight
    });
  }
  return pipeline.png().toBuffer();
};

const inspectLuminance = async (buffer) => {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const luminance = [];
  for (let offset = 0; offset < data.length; offset += 4) {
    if (data[offset + 3] < 16) continue;
    const red = channelToLinear(data[offset]);
    const green = channelToLinear(data[offset + 1]);
    const blue = channelToLinear(data[offset + 2]);
    luminance.push((0.2126 * red) + (0.7152 * green) + (0.0722 * blue));
  }
  luminance.sort((a, b) => a - b);
  const p10 = percentile(luminance, 0.1);
  const p50 = percentile(luminance, 0.5);
  const p90 = percentile(luminance, 0.9);
  return {
    p10,
    p50,
    p90,
    contrast: (p90 + 0.05) / (p10 + 0.05),
    coverage: luminance.length / (info.width * info.height),
    width: info.width,
    height: info.height
  };
};

const makePreview = async (buffer, grayscale = false) => {
  let pipeline = sharp(buffer)
    .resize({
      width: 240,
      height: 136,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.nearest
    });
  if (grayscale) pipeline = pipeline.grayscale();
  const preview = await pipeline.png({ compressionLevel: 9, palette: true }).toBuffer();
  return `data:image/png;base64,${preview.toString("base64")}`;
};

const makeSilhouette = async (buffer, size) => {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let offset = 0; offset < data.length; offset += 4) {
    if (data[offset + 3] < 16) {
      data[offset + 3] = 0;
      continue;
    }
    data[offset] = 24;
    data[offset + 1] = 61;
    data[offset + 2] = 48;
    data[offset + 3] = 255;
  }
  const silhouette = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 }
  })
    .resize({
      width: size,
      height: size,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.nearest
    })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
  return `data:image/png;base64,${silhouette.toString("base64")}`;
};

const buildRoleColumn = (role, assets) => `
  <section class="role-column role-${role}">
    <header>
      <p>${ROLE_LABELS[role]}</p>
      <strong>${assets.length}개 상태</strong>
    </header>
    <div class="silhouette-list">
      ${assets.map((asset) => `
        <article class="silhouette-card">
          <div class="silhouette-sizes">
            <div class="silhouette-box size-96"><img src="${asset.silhouette96}" alt="${escapeHtml(asset.key)} 96px 실루엣"></div>
            <div class="silhouette-box size-24"><img src="${asset.silhouette24}" alt="${escapeHtml(asset.key)} 24px 실루엣"></div>
          </div>
          <code>${escapeHtml(asset.key)}</code>
        </article>
      `).join("")}
    </div>
  </section>
`;

const buildAssetCard = (asset) => `
  <article class="asset-card" data-role="${asset.role}" data-contrast="${asset.metrics.contrast.toFixed(2)}">
    <header>
      <div>
        <span class="category category-${asset.role}">${CATEGORY_LABELS[asset.role]}</span>
        <h3>${escapeHtml(asset.key)}</h3>
      </div>
      <span class="type">${escapeHtml(asset.type)}</span>
    </header>
    <div class="preview-pair">
      <figure>
        <div class="checker"><img src="${asset.colorPreview}" alt="${escapeHtml(asset.key)} 컬러 썸네일"></div>
        <figcaption>컬러</figcaption>
      </figure>
      <figure>
        <div class="checker"><img src="${asset.grayscalePreview}" alt="${escapeHtml(asset.key)} 흑백 썸네일"></div>
        <figcaption>흑백</figcaption>
      </figure>
    </div>
    <dl>
      <div><dt>대표 영역</dt><dd>${asset.metrics.width}×${asset.metrics.height}</dd></div>
      <div><dt>불투명 면적</dt><dd>${(asset.metrics.coverage * 100).toFixed(1)}%</dd></div>
      <div><dt>명도 P10 / P50 / P90</dt><dd>${asset.metrics.p10.toFixed(3)} / ${asset.metrics.p50.toFixed(3)} / ${asset.metrics.p90.toFixed(3)}</dd></div>
      <div><dt>내부 대비비</dt><dd>${asset.metrics.contrast.toFixed(2)}:1</dd></div>
    </dl>
    <p class="asset-path">${escapeHtml(asset.url)}</p>
  </article>
`;

const buildHtml = ({ assets, roleAssets }) => {
  const roleCount = roleAssets.length;
  const spriteCount = assets.filter((asset) => asset.type === "spritesheet").length;
  const imageCount = assets.filter((asset) => asset.type === "image").length;
  const atlasCount = assets.filter((asset) => asset.type === "atlas").length;
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Silsea Phase 3 Asset Report</title>
  <style>
    :root {
      color-scheme: light;
      --paper: ${PALETTE.base[0]};
      --ink: ${PALETTE.outline};
      --muted: ${PALETTE.shadow[0]};
      --line: ${PALETTE.base[1]};
      --danger: ${PALETTE.danger[0]};
      --collect: ${PALETTE.collect[0]};
      --friendly: ${PALETTE.bgNear[0]};
      --deep: ${PALETTE.bgNear[1]};
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--paper); color: var(--ink); font-family: "Pretendard", "Noto Sans KR", system-ui, sans-serif; }
    main { width: min(1500px, calc(100% - 32px)); margin: 0 auto; padding: 48px 0 80px; }
    h1, h2, h3, p { margin-top: 0; }
    .eyebrow { color: var(--deep); font-size: 12px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
    h1 { margin-bottom: 12px; font-size: clamp(32px, 5vw, 64px); line-height: .98; letter-spacing: -.05em; }
    .intro { max-width: 800px; color: #5f6570; line-height: 1.7; }
    .summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 28px 0 44px; }
    .summary article { padding: 18px; border: 1px solid var(--line); border-radius: 18px; background: rgba(255,255,255,.72); }
    .summary strong { display: block; margin-bottom: 4px; color: var(--deep); font-size: 28px; }
    .summary span { color: #6d7078; font-size: 13px; }
    .section-heading { display: flex; align-items: end; justify-content: space-between; gap: 24px; margin: 48px 0 18px; }
    .section-heading h2 { margin-bottom: 6px; font-size: 28px; }
    .section-heading p { margin-bottom: 0; color: #6d7078; font-size: 14px; }
    .review-note { max-width: 560px; padding: 14px 16px; border-left: 4px solid var(--deep); background: rgba(255,255,255,.68); color: #565b64; font-size: 13px; line-height: 1.6; }
    .role-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
    .role-column { overflow: hidden; border: 1px solid var(--line); border-radius: 20px; background: rgba(255,255,255,.72); }
    .role-column > header { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; color: white; }
    .role-column > header p { margin: 0; font-weight: 800; }
    .role-column > header strong { font-size: 12px; opacity: .9; }
    .role-danger > header { background: var(--danger); }
    .role-collect > header { background: #9d8120; }
    .role-friendly > header { background: #318667; }
    .silhouette-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(136px, 1fr)); gap: 1px; background: var(--line); }
    .silhouette-card { min-height: 148px; padding: 12px; background: #fff; }
    .silhouette-sizes { display: flex; align-items: end; justify-content: center; gap: 8px; min-height: 102px; }
    .silhouette-box { display: grid; place-items: center; border: 1px solid #e1e5e3; background: white; }
    .size-96 { width: 98px; height: 98px; }
    .size-24 { width: 26px; height: 26px; }
    .silhouette-box img { display: block; image-rendering: pixelated; }
    .silhouette-card code { display: block; overflow: hidden; margin-top: 8px; color: #535963; font-size: 10px; text-align: center; text-overflow: ellipsis; white-space: nowrap; }
    .asset-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 14px; }
    .asset-card { padding: 16px; border: 1px solid var(--line); border-radius: 20px; background: rgba(255,255,255,.8); box-shadow: 0 12px 32px rgba(66,71,78,.06); }
    .asset-card > header { display: flex; align-items: start; justify-content: space-between; gap: 12px; }
    .asset-card h3 { margin: 7px 0 14px; font-size: 17px; }
    .category, .type { display: inline-block; padding: 3px 8px; border-radius: 999px; font-size: 10px; font-weight: 800; }
    .category { background: #e9eeec; color: var(--deep); }
    .category-danger { background: #f8dfe1; color: #9c2630; }
    .category-collect { background: #fbf2bd; color: #775f0a; }
    .category-friendly { background: #d9f2e9; color: #22694f; }
    .type { border: 1px solid var(--line); color: #686e77; }
    .preview-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    figure { margin: 0; }
    .checker { display: grid; min-height: 118px; place-items: center; overflow: hidden; border: 1px solid #d7ddda; border-radius: 12px; background-color: #fff; background-image: linear-gradient(45deg,#edf0ef 25%,transparent 25%),linear-gradient(-45deg,#edf0ef 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#edf0ef 75%),linear-gradient(-45deg,transparent 75%,#edf0ef 75%); background-position: 0 0,0 6px,6px -6px,-6px 0; background-size: 12px 12px; }
    .checker img { display: block; width: 100%; height: auto; image-rendering: pixelated; }
    figcaption { margin-top: 5px; color: #777d85; font-size: 10px; text-align: center; }
    dl { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 14px 0 0; }
    dl div { padding: 8px 10px; border-radius: 10px; background: #f5f6f6; }
    dt { color: #7a7f87; font-size: 9px; }
    dd { margin: 3px 0 0; font-size: 11px; font-weight: 700; }
    .asset-path { overflow: hidden; margin: 12px 0 0; color: #7a7f87; font: 10px/1.4 ui-monospace, monospace; text-overflow: ellipsis; white-space: nowrap; }
    footer { margin-top: 52px; padding-top: 18px; border-top: 1px solid var(--line); color: #777d85; font-size: 12px; }
    @media (max-width: 980px) { .role-grid { grid-template-columns: 1fr; } .summary { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 520px) { main { width: min(100% - 20px, 1500px); padding-top: 28px; } .summary { grid-template-columns: 1fr; } .asset-grid { grid-template-columns: 1fr; } .section-heading { align-items: start; flex-direction: column; } }
  </style>
</head>
<body>
<main>
  <p class="eyebrow">Phase 3 · Asset QA</p>
  <h1>Thumbnail &amp;<br>Silhouette Report</h1>
  <p class="intro">manifest에 잠긴 모든 시각 에셋의 컬러·흑백 대표 이미지를 한 화면에서 비교하고, 캐릭터·적·아이템은 같은 단색과 같은 크기로 정규화해 역할 실루엣을 검수한다. 스프라이트 시트는 첫 프레임을 대표 프레임으로 사용한다.</p>
  <section class="summary" aria-label="에셋 요약">
    <article><strong>${assets.length}</strong><span>manifest 시각 에셋</span></article>
    <article><strong>${spriteCount}</strong><span>스프라이트 시트</span></article>
    <article><strong>${imageCount} + ${atlasCount}</strong><span>이미지 + 아틀라스</span></article>
    <article><strong>${roleCount}</strong><span>역할별 실루엣 상태</span></article>
  </section>

  <div class="section-heading">
    <div><h2>역할 실루엣 판별표</h2><p>원본 크기 96×96과 25% 축소 24×24를 같은 단색으로 비교한다.</p></div>
    <aside class="review-note"><strong>육안 승인 기준</strong><br>색을 제거한 상태에서도 위험·수집·친화 열의 형태 언어가 서로 바뀌어 보이지 않아야 한다. 수치형 임계값은 프로젝트 문서에 정의되지 않았으므로 자동 합격을 선언하지 않는다.</aside>
  </div>
  <div class="role-grid">
    ${ROLE_ORDER.map((role) => buildRoleColumn(role, roleAssets.filter((asset) => asset.role === role))).join("")}
  </div>

  <div class="section-heading">
    <div><h2>전체 컬러·흑백 썸네일</h2><p>가시 픽셀의 상대 명도 분포와 P90/P10 내부 대비비를 검토용 지표로 함께 표시한다.</p></div>
  </div>
  <section class="asset-grid">
    ${assets.map(buildAssetCard).join("")}
  </section>
  <footer>생성 소스: assets/manifest.json · 생성기: scripts/asset-report.js · 숫자는 판정선이 아니라 회귀 비교용 지표다.</footer>
</main>
</body>
</html>`;
};

export async function generateAssetReport({ root, outputPath = join(root, "references", "asset-report.html") }) {
  const manifest = JSON.parse(await readFile(join(root, "assets", "manifest.json"), "utf8"));
  const visualAssets = manifest.assets.filter((asset) => VISUAL_TYPES.has(asset.type));
  const reportAssets = [];

  for (const asset of visualAssets) {
    const absolutePath = join(root, asset.url.slice(1));
    const representative = await getRepresentativeBuffer(asset, absolutePath);
    const role = getRole(asset);
    const reportAsset = {
      ...asset,
      role,
      metrics: await inspectLuminance(representative),
      colorPreview: await makePreview(representative),
      grayscalePreview: await makePreview(representative, true)
    };
    if (role !== "environment") {
      reportAsset.silhouette96 = await makeSilhouette(representative, 96);
      reportAsset.silhouette24 = await makeSilhouette(representative, 24);
    }
    reportAssets.push(reportAsset);
  }

  const roleAssets = reportAssets.filter((asset) => asset.role !== "environment");
  const html = buildHtml({ assets: reportAssets, roleAssets }).replace(/[ \t]+$/gm, "");
  await writeFile(outputPath, html, "utf8");
  return {
    assetCount: reportAssets.length,
    roleCount: roleAssets.length,
    outputPath: relative(root, outputPath).replaceAll("\\", "/")
  };
}
