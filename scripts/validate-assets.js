import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { PALETTE } from "../data/palette.js";
import {
  getCharacterAnimationSpec,
  getCharacterAnimationVariants,
  getCharacterAssetKeys,
  getCharacterSequenceNames
} from "../src/data/characterAnimations.js";
import {
  getEnemyAnimationSpec,
  getEnemyAssetKeys,
  getEnemySequenceNames
} from "../src/data/enemyAnimations.js";
import { generateAssetReport } from "./asset-report.js";
import { colorDistance, hexToRgb, paletteRgb } from "./image-utils.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const QUALITY_THRESHOLDS = Object.freeze({
  alpha: 16,
  baseline: 16,
  baselineTolerancePx: 2,
  characterHeight: 96,
  characterHeightToleranceRatio: 0.05,
  paletteDistance: 8,
  outsidePaletteRatio: 0.05
});
const UNICORN_WELD_ALPHA_THRESHOLD = 40;

const validateUnicornWelds = async ({ basePath, variantPath, frameWidth, frameHeight, frames, textureKey }) => {
  const [base, variant] = await Promise.all([
    sharp(basePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(variantPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  ]);
  if (base.info.width !== variant.info.width || base.info.height !== variant.info.height) {
    errors.push(`${textureKey}: 기본형과 유니콘 시트 크기가 다름`);
    return;
  }

  const alphaAt = (image, frame, x, y) => {
    if (x < 0 || y < 0 || x >= frameWidth || y >= frameHeight) return 0;
    const sheetX = frame * frameWidth + x;
    return image.data[(y * image.info.width + sheetX) * 4 + 3];
  };

  for (let frame = 0; frame < frames; frame += 1) {
    let addedPixels = 0;
    let contactPixels = 0;
    for (let y = 0; y < frameHeight; y += 1) {
      for (let x = 0; x < frameWidth; x += 1) {
        const isAdded = alphaAt(variant, frame, x, y) > UNICORN_WELD_ALPHA_THRESHOLD
          && alphaAt(base, frame, x, y) <= UNICORN_WELD_ALPHA_THRESHOLD;
        if (!isAdded) continue;
        addedPixels += 1;
        let touchesBody = false;
        for (let offsetY = -1; offsetY <= 1 && !touchesBody; offsetY += 1) {
          for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
            if (offsetX === 0 && offsetY === 0) continue;
            if (alphaAt(base, frame, x + offsetX, y + offsetY) > UNICORN_WELD_ALPHA_THRESHOLD) {
              touchesBody = true;
              break;
            }
          }
        }
        if (touchesBody) contactPixels += 1;
      }
    }
    if (addedPixels === 0) errors.push(`${textureKey}#${frame}: 추가된 뿔 픽셀이 없음`);
    if (contactPixels === 0) errors.push(`${textureKey}#${frame}: 뿔 실루엣이 몸체와 분리됨`);
  }
};
const sequenceAssets = (character, sequence, count) => Array.from({ length: count }, (_, index) => {
  const frame = `${character}_${sequence}_${String(index).padStart(2, "0")}.png`;
  return { name: frame, path: join(root, "assets", "characters", character, sequence, frame), kind: "character" };
});
const enemySequenceAssets = (enemy, sequence, count) => Array.from({ length: count }, (_, index) => {
  const frame = `${enemy}_${sequence}_${String(index).padStart(2, "0")}.png`;
  return { name: frame, path: join(root, "assets", "enemies", enemy, sequence, frame), kind: enemy };
});
const characterAssets = [
  { name: "silsea_anchor.png", path: join(root, "assets", "_anchor", "silsea_anchor.png"), kind: "character" },
  { name: "potato89_anchor.png", path: join(root, "assets", "_anchor", "potato89_anchor.png"), kind: "character" },
  ...sequenceAssets("silsea", "run", 8),
  ...sequenceAssets("potato89", "roll", 8),
  ...sequenceAssets("silsea", "idle", 4),
  ...sequenceAssets("potato89", "idle", 4),
  ...sequenceAssets("silsea", "jump_up", 2),
  ...sequenceAssets("silsea", "fall", 2),
  ...sequenceAssets("potato89", "jump_up", 2),
  ...sequenceAssets("potato89", "fall", 2),
  ...sequenceAssets("silsea", "land", 2),
  ...sequenceAssets("silsea", "hurt", 2),
  ...sequenceAssets("potato89", "land", 2),
  ...sequenceAssets("potato89", "hurt", 2),
  ...sequenceAssets("silsea", "transform_unicorn", 6),
  ...sequenceAssets("potato89", "stomp", 4),
  ...sequenceAssets("potato89", "transform_unicorn", 6),
  ...sequenceAssets("potato89", "transform_pegasus", 6),
  ...sequenceAssets("potato89", "transform_alicorn", 8),
  ...sequenceAssets("potato89", "fly", 6),
  ...sequenceAssets("potato89", "victory", 6),
  ...sequenceAssets("silsea", "transform_pegasus", 6),
  ...sequenceAssets("silsea", "transform_alicorn", 8),
  ...sequenceAssets("silsea", "fly", 6),
  ...sequenceAssets("silsea", "victory", 6)
];
const enemyAssets = [
  { name: "raw_potato_anchor.png", path: join(root, "assets", "_anchor", "raw_potato_anchor.png"), kind: "raw_potato" },
  ...enemySequenceAssets("raw_potato", "idle", 2),
  ...enemySequenceAssets("raw_potato", "roll", 6),
  ...enemySequenceAssets("raw_potato", "defeated", 4),
  { name: "spike_pumpkin_anchor.png", path: join(root, "assets", "_anchor", "spike_pumpkin_anchor.png"), kind: "spike_pumpkin" },
  ...enemySequenceAssets("spike_pumpkin", "idle", 2),
  ...enemySequenceAssets("spike_pumpkin", "warning", 2),
  ...enemySequenceAssets("spike_pumpkin", "break", 6),
  { name: "dark_cloud_anchor.png", path: join(root, "assets", "_anchor", "dark_cloud_anchor.png"), kind: "dark_cloud" },
  ...enemySequenceAssets("dark_cloud", "idle", 4),
  ...enemySequenceAssets("dark_cloud", "charge", 4),
  ...enemySequenceAssets("dark_cloud", "attack", 3),
  ...enemySequenceAssets("dark_cloud", "defeated", 4),
  { name: "magpie_anchor.png", path: join(root, "assets", "_anchor", "magpie_anchor.png"), kind: "magpie" },
  ...enemySequenceAssets("magpie", "fly", 6),
  ...enemySequenceAssets("magpie", "warning", 3),
  ...enemySequenceAssets("magpie", "dive", 4),
  ...enemySequenceAssets("magpie", "stunned", 4),
  ...enemySequenceAssets("magpie", "defeated", 4),
  { name: "potato_king_anchor.png", path: join(root, "assets", "_anchor", "potato_king_anchor.png"), kind: "potato_king" },
  ...enemySequenceAssets("potato_king", "idle", 4),
  ...enemySequenceAssets("potato_king", "jump", 4),
  ...enemySequenceAssets("potato_king", "fall", 2),
  ...enemySequenceAssets("potato_king", "land", 4),
  ...enemySequenceAssets("potato_king", "shoot", 4),
  ...enemySequenceAssets("potato_king", "hurt", 3),
  ...enemySequenceAssets("potato_king", "defeated", 8)
];
const itemAsset = (key, width, height) => [
  { name: `${key}_anchor.png`, path: join(root, "assets", "_anchor", `${key}_anchor.png`), key, kind: "item", width, height },
  { name: `${key}.png`, path: join(root, "assets", "items", `${key}.png`), key, kind: "item", width, height }
];
const itemAssets = [
  ...itemAsset("item_star", 96, 93),
  ...itemAsset("item_percent_small", 70, 72),
  ...itemAsset("item_percent_large", 94, 96),
  ...itemAsset("item_horn", 75, 96),
  ...itemAsset("item_wings", 96, 55),
  ...itemAsset("item_alicorn", 96, 51),
  ...itemAsset("checkpoint_flag", 91, 96),
  ...itemAsset("rainbow_gate", 112, 104)
];
// 수집물은 수집 팔레트만 쓰되, 밝은 배경에서도 실루엣이 무너지지 않도록
// 공용 짙은 외곽선과 흰 반짝임을 허용한다.
const itemRgb = [...PALETTE.collect, PALETTE.outline, PALETTE.highlight[0]].map(hexToRgb);
const ITEM_PALETTE_EDGE_TOLERANCE = 3;
const potatoFaceRgb = PALETTE.base.slice(1, 3).map(hexToRgb);
const assets = [...characterAssets, ...enemyAssets, ...itemAssets];
const errors = [];
const requiredTileFrames = [
  "grass_top",
  "grass_top_left",
  "grass_top_right",
  "dirt",
  "dirt_variant",
  "dirt_left",
  "dirt_right",
  "grass_inner_left",
  "grass_inner_right",
  "cliff_left",
  "cliff_right",
  "platform_left",
  "platform_mid",
  "platform_right",
  "slope_up",
  "slope_down"
];
const backgroundAssets = [
  { name: "bg_normal_far", luma: [82, 94] },
  { name: "bg_normal_mid", luma: [62, 78] },
  { name: "bg_normal_near", luma: [50, 68], minimumY: 540 },
  { name: "bg_pit_far", luma: [82, 94] },
  { name: "bg_pit_mid", luma: [60, 80] },
  { name: "bg_pit_near", luma: [48, 68], minimumY: 540 },
  { name: "bg_boss_far", luma: [70, 86] },
  { name: "bg_boss_mid", luma: [52, 70] },
  { name: "bg_boss_near", luma: [42, 62], minimumY: 576 },
  { name: "bg_starlight_far", luma: [14, 22] },
  { name: "bg_starlight_mid", luma: [22, 34] },
  { name: "bg_starlight_near", luma: [25, 38], minimumY: 500 },
  { name: "bg_mist_far", luma: [88, 94] },
  { name: "bg_mist_mid", luma: [68, 78] },
  { name: "bg_mist_near", luma: [48, 60], minimumY: 500 }
];
const starlightDecorationAssets = [
  { name: "decor_star_tree", width: 640, height: 640 },
  { name: "decor_moon_branch", width: 384, height: 256 },
  { name: "decor_firefly", width: 192, height: 160 },
  { name: "decor_star_flower", width: 256, height: 192 }
];
const mistEffectAssets = [
  { name: "fx_mist_bank", width: 384, height: 128 },
  { name: "fx_mist_clear", width: 256, height: 256 },
  { name: "fx_mist_beacon", width: 96, height: 192 },
  { name: "fx_mist_breeze", width: 192, height: 96 }
];
const requiredAudioKeys = [
  "sfx_jump", "sfx_land", "sfx_fall_start", "sfx_footstep", "sfx_star",
  "sfx_percent_small", "sfx_percent_large", "sfx_combo", "sfx_transform_unicorn",
  "sfx_transform_pegasus", "sfx_transform_alicorn", "sfx_alicorn_warning", "sfx_fly_loop",
  "sfx_flight_low", "sfx_glide", "sfx_player_hurt", "sfx_hp_zero", "sfx_respawn",
  "sfx_enemy_defeat", "sfx_magpie_warning", "sfx_cloud_charge", "sfx_lightning",
  "sfx_boss_appear", "sfx_boss_warning", "sfx_boss_land", "sfx_boss_hit",
  "sfx_boss_defeat", "sfx_checkpoint", "sfx_gate_spawn", "sfx_clear", "sfx_ui_move",
  "sfx_ui_select", "sfx_pause", "bgm_field", "bgm_starlight", "bgm_mist", "bgm_boss", "bgm_clear", "bgm_alicorn_layer"
];
let validatedAudioCount = 0;
let validatedCharacterSheetCount = 0;
let validatedEnemySheetCount = 0;
const qualityMeasurements = {
  baseline: [],
  characterHeight: [],
  outsidePalette: []
};

for (const asset of assets) {
  const { name, path } = asset;
  try {
    await access(path);
  } catch {
    errors.push(`${name}: 파일 없음`);
    continue;
  }
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width !== 128 || info.height !== 128 || info.channels !== 4) errors.push(`${name}: 128x128 RGBA가 아님`);
  const cornerAlpha = [3, (info.width - 1) * 4 + 3, (info.width * (info.height - 1)) * 4 + 3, (info.width * info.height - 1) * 4 + 3];
  if (cornerAlpha.some((index) => data[index] > 8)) errors.push(`${name}: 모서리가 투명하지 않음`);
  let opaque = 0;
  let outside = 0;
  let outsideCollect = 0;
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] < QUALITY_THRESHOLDS.alpha) continue;
    opaque += 1;
    const pixel = index / 4;
    const x = pixel % info.width;
    const y = Math.floor(pixel / info.width);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    const rgb = [data[index], data[index + 1], data[index + 2]];
    if (Math.min(...paletteRgb.map((entry) => colorDistance(rgb, entry.rgb))) > QUALITY_THRESHOLDS.paletteDistance) outside += 1;
    if (asset.kind === "item" && Math.min(...itemRgb.map((entry) => colorDistance(rgb, entry))) > ITEM_PALETTE_EDGE_TOLERANCE) {
      outsideCollect += 1;
    }
  }
  if (!opaque) errors.push(`${name}: 불투명 픽셀이 없음`);
  const outsidePaletteRatio = opaque ? outside / opaque : 0;
  if (opaque) qualityMeasurements.outsidePalette.push({ name, value: outsidePaletteRatio });
  if (outsidePaletteRatio > QUALITY_THRESHOLDS.outsidePaletteRatio) errors.push(`${name}: 팔레트 외 픽셀 5% 초과`);
  if (asset.kind === "item" && outsideCollect > 0) errors.push(`${name}: collect 팔레트 밖 픽셀 ${outsideCollect}개`);
  if (opaque) {
    const subjectWidth = maxX - minX + 1;
    const subjectHeight = maxY - minY + 1;
    const baseline = info.height - (maxY + 1);
    if (name.startsWith("potato89_roll_")) {
      let faceXTotal = 0;
      let facePixels = 0;
      for (let index = 0; index < data.length; index += 4) {
        if (data[index + 3] < QUALITY_THRESHOLDS.alpha) continue;
        const rgb = [data[index], data[index + 1], data[index + 2]];
        if (Math.min(...potatoFaceRgb.map((color) => colorDistance(rgb, color))) > 0) continue;
        faceXTotal += (index / 4) % info.width;
        facePixels += 1;
      }
      const faceCenterX = facePixels ? faceXTotal / facePixels : 0;
      const subjectCenterX = (minX + maxX) / 2;
      if (facePixels < 80 || faceCenterX <= subjectCenterX + 8) {
        errors.push(`${name}: 구운 감자 roll 프레임이 오른쪽을 보지 않음 (얼굴 x=${faceCenterX.toFixed(1)}, 몸 중심 x=${subjectCenterX.toFixed(1)})`);
      }
    }
    if (asset.kind === "character") qualityMeasurements.characterHeight.push({ name, value: subjectHeight });
    if (asset.kind === "character" && Math.abs(subjectHeight - QUALITY_THRESHOLDS.characterHeight) / QUALITY_THRESHOLDS.characterHeight > QUALITY_THRESHOLDS.characterHeightToleranceRatio) {
      errors.push(`${name}: 캐릭터 높이 ${subjectHeight}px (96px ±5% 아님)`);
    }
    if (asset.kind === "raw_potato" && (subjectWidth < 96 || subjectWidth > 112 || subjectHeight < 65 || subjectHeight > 101)) {
      errors.push(`${name}: 생감자 실루엣 ${subjectWidth}x${subjectHeight}px (너비 96~112px, 높이 65~101px 아님)`);
    }
    if (asset.kind === "spike_pumpkin" && (subjectWidth < 96 || subjectWidth > 112 || subjectHeight < 35 || subjectHeight > 80)) {
      errors.push(`${name}: 가시 호박 실루엣 ${subjectWidth}x${subjectHeight}px (너비 96~112px, 높이 35~80px 아님)`);
    }
    if (asset.kind === "dark_cloud" && (subjectWidth < 72 || subjectWidth > 112 || subjectHeight < 25 || subjectHeight > 96)) {
      errors.push(`${name}: 먹구름 실루엣 ${subjectWidth}x${subjectHeight}px (너비 72~112px, 높이 25~96px 아님)`);
    }
    if (name.startsWith("dark_cloud_idle_") && subjectWidth < 108) {
      errors.push(`${name}: idle 폭 ${subjectWidth}px (108px 미만)`);
    }
    if (name === "dark_cloud_charge_03.png" && subjectWidth > 82) {
      errors.push(`${name}: 최대 charge 폭 ${subjectWidth}px (82px 초과)`);
    }
    if (name === "dark_cloud_attack_01.png" && subjectHeight < 80) {
      errors.push(`${name}: 핵심 attack 높이 ${subjectHeight}px (80px 미만)`);
    }
    if (name === "dark_cloud_defeated_03.png" && subjectWidth > 76) {
      errors.push(`${name}: 최종 defeated 폭 ${subjectWidth}px (76px 초과)`);
    }
    if (asset.kind === "magpie" && (subjectWidth < 31 || subjectWidth > 112 || subjectHeight < 31 || subjectHeight > 96)) {
      errors.push(`${name}: 까치 실루엣 ${subjectWidth}x${subjectHeight}px (너비 31~112px, 높이 31~96px 아님)`);
    }
    if (name.startsWith("magpie_fly_") && subjectWidth < 108) {
      errors.push(`${name}: fly 폭 ${subjectWidth}px (108px 미만)`);
    }
    if (name === "magpie_dive_02.png" && (subjectWidth > 40 || subjectHeight < 90)) {
      errors.push(`${name}: 수직 dive 실루엣 ${subjectWidth}x${subjectHeight}px (너비 40px 초과 또는 높이 90px 미만)`);
    }
    if (name.startsWith("magpie_stunned_") && subjectHeight < 90) {
      errors.push(`${name}: stunned 높이 ${subjectHeight}px (90px 미만)`);
    }
    if ((name === "magpie_defeated_02.png" || name === "magpie_defeated_03.png") && subjectHeight > 40) {
      errors.push(`${name}: 최종 defeated 높이 ${subjectHeight}px (40px 초과)`);
    }
    if (asset.kind === "potato_king" && (subjectWidth < 77 || subjectWidth > 112 || subjectHeight < 39 || subjectHeight > 96)) {
      errors.push(`${name}: 감자왕 실루엣 ${subjectWidth}x${subjectHeight}px (너비 77~112px, 높이 39~96px 아님)`);
    }
    if (name === "potato_king_jump_00.png" && (subjectWidth < 108 || subjectHeight > 80)) {
      errors.push(`${name}: jump 준비 실루엣 ${subjectWidth}x${subjectHeight}px (너비 108px 미만 또는 높이 80px 초과)`);
    }
    if (name === "potato_king_land_00.png" && (subjectWidth < 108 || subjectHeight > 60)) {
      errors.push(`${name}: land 압축 실루엣 ${subjectWidth}x${subjectHeight}px (너비 108px 미만 또는 높이 60px 초과)`);
    }
    if (name === "potato_king_shoot_01.png" && subjectHeight > 72) {
      errors.push(`${name}: 최대 shoot crouch 높이 ${subjectHeight}px (72px 초과)`);
    }
    if (name === "potato_king_defeated_04.png" && subjectHeight > 45) {
      errors.push(`${name}: defeated 충돌 높이 ${subjectHeight}px (45px 초과)`);
    }
    if (name === "potato_king_defeated_07.png" && (subjectWidth > 94 || subjectHeight > 50)) {
      errors.push(`${name}: 최종 defeated 실루엣 ${subjectWidth}x${subjectHeight}px (너비 94px 초과 또는 높이 50px 초과)`);
    }
    if (asset.kind === "item" && (subjectWidth !== asset.width || subjectHeight !== asset.height)) {
      errors.push(`${name}: 오브젝트 실루엣 ${subjectWidth}x${subjectHeight}px (승인 규격 ${asset.width}x${asset.height}px 아님)`);
    }
    if (asset.key === "rainbow_gate") {
      const aperturePoints = [[64, 64], [64, 96], [64, 116]];
      if (aperturePoints.some(([x, y]) => data[(y * info.width + x) * 4 + 3] > 8)) {
        errors.push(`${name}: 관문 중앙 통과 공간이 투명하지 않음`);
      }
    }
    if (asset.kind !== "item") qualityMeasurements.baseline.push({ name, value: baseline });
    if (asset.kind !== "item" && Math.abs(baseline - QUALITY_THRESHOLDS.baseline) > QUALITY_THRESHOLDS.baselineTolerancePx) {
      errors.push(`${name}: 발 기준선 ${baseline}px (16px ±2 아님)`);
    }
    if (minX < 8 || info.width - maxX - 1 < 8) errors.push(`${name}: 좌우 여백 8px 미만`);
  }
}

try {
  const manifest = JSON.parse(await readFile(join(root, "assets", "manifest.json"), "utf8"));
  const manifestEntries = new Map(manifest.assets.map((entry) => [entry.key, entry]));
  for (const characterId of ["silsea", "potato89"]) {
    const expectedKeys = new Set(getCharacterAssetKeys(characterId));
    const validatedKeys = new Set();
    for (const sequence of getCharacterSequenceNames(characterId)) {
      for (const variant of getCharacterAnimationVariants()) {
        const spec = getCharacterAnimationSpec(characterId, sequence, variant);
        if (!spec || validatedKeys.has(spec.textureKey)) continue;
        validatedKeys.add(spec.textureKey);
        const entry = manifestEntries.get(spec.textureKey);
        if (!entry || entry.type !== "spritesheet") {
          errors.push(`${spec.textureKey}: manifest spritesheet 등록 없음`);
          continue;
        }
        expectedKeys.delete(entry.key);
        if (entry.frames !== spec.durations.length) {
          errors.push(`${entry.key}: manifest ${entry.frames}프레임과 duration ${spec.durations.length}개 불일치`);
        }
        try {
          const sheetPath = join(root, entry.url.slice(1));
          const metadata = await sharp(sheetPath).metadata();
          if (metadata.width !== entry.frameWidth * entry.frames || metadata.height !== entry.frameHeight) {
            errors.push(`${entry.key}: 시트 ${metadata.width}x${metadata.height}, 예상 ${entry.frameWidth * entry.frames}x${entry.frameHeight}`);
          }
          if (variant === "unicorn") {
            const baseSpec = getCharacterAnimationSpec(characterId, sequence, "base");
            const baseEntry = manifestEntries.get(baseSpec?.textureKey);
            if (baseEntry && baseEntry.key !== entry.key) {
              await validateUnicornWelds({
                basePath: join(root, baseEntry.url.slice(1)),
                variantPath: sheetPath,
                frameWidth: entry.frameWidth,
                frameHeight: entry.frameHeight,
                frames: entry.frames,
                textureKey: entry.key
              });
            }
          }
          validatedCharacterSheetCount += 1;
        } catch (error) {
          errors.push(`${entry.key}: 캐릭터 시트를 읽을 수 없음 (${error.message})`);
        }
      }
    }
    if (expectedKeys.size) errors.push(`${characterId}: 검증하지 못한 캐릭터 키 ${[...expectedKeys].join(", ")}`);
  }
} catch (error) {
  errors.push(`manifest.json: 캐릭터 시트 검증 불가 (${error.message})`);
}

try {
  const manifest = JSON.parse(await readFile(join(root, "assets", "manifest.json"), "utf8"));
  const manifestEntries = new Map(manifest.assets.map((entry) => [entry.key, entry]));
  for (const enemyType of ["raw_potato", "spike_pumpkin", "dark_cloud", "magpie", "potato_king"]) {
    const expectedKeys = new Set(getEnemyAssetKeys(enemyType));
    for (const sequence of getEnemySequenceNames(enemyType)) {
      const spec = getEnemyAnimationSpec(enemyType, sequence);
      const entry = manifestEntries.get(spec.textureKey);
      if (!entry || entry.type !== "spritesheet") {
        errors.push(`${spec.textureKey}: manifest spritesheet 등록 없음`);
        continue;
      }
      expectedKeys.delete(entry.key);
      if (entry.frames !== spec.durations.length) {
        errors.push(`${entry.key}: manifest ${entry.frames}프레임과 duration ${spec.durations.length}개 불일치`);
      }
      try {
        const metadata = await sharp(join(root, entry.url.slice(1))).metadata();
        if (metadata.width !== entry.frameWidth * entry.frames || metadata.height !== entry.frameHeight) {
          errors.push(`${entry.key}: 시트 ${metadata.width}x${metadata.height}, 예상 ${entry.frameWidth * entry.frames}x${entry.frameHeight}`);
        }
        validatedEnemySheetCount += 1;
      } catch (error) {
        errors.push(`${entry.key}: 적 시트를 읽을 수 없음 (${error.message})`);
      }
    }
    if (expectedKeys.size) errors.push(`${enemyType}: 검증하지 못한 적 키 ${[...expectedKeys].join(", ")}`);
  }
} catch (error) {
  errors.push(`manifest.json: 적 시트 검증 불가 (${error.message})`);
}

const tilesetKeys = ["grass_tileset", "starlight_tileset", "mist_tileset"];
for (const tilesetKey of tilesetKeys) {
try {
  const tilesetPath = join(root, "assets", "tiles", `${tilesetKey}.png`);
  const atlasPath = join(root, "assets", "tiles", `${tilesetKey}.json`);
  const atlas = JSON.parse(await readFile(atlasPath, "utf8"));
  const { data, info } = await sharp(tilesetPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width !== 272 || info.height !== 272 || info.channels !== 4) {
    errors.push(`${tilesetKey}.png: 272x272 RGBA 아틀라스가 아님`);
  }
  if (atlas.meta?.tileSize !== 64 || atlas.meta?.extrude !== 2) {
    errors.push(`${tilesetKey}.json: tileSize 64 또는 extrude 2 메타데이터가 아님`);
  }

  let outsidePalette = 0;
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] === 0) continue;
    const rgb = [data[index], data[index + 1], data[index + 2]];
    if (Math.min(...paletteRgb.map((entry) => colorDistance(rgb, entry.rgb))) > 0) outsidePalette += 1;
  }
  if (outsidePalette > 0) errors.push(`${tilesetKey}.png: 팔레트 밖 픽셀 ${outsidePalette}개`);

  const pixelEquals = (leftX, leftY, rightX, rightY) => {
    const left = (leftY * info.width + leftX) * 4;
    const right = (rightY * info.width + rightX) * 4;
    return data[left] === data[right]
      && data[left + 1] === data[right + 1]
      && data[left + 2] === data[right + 2]
      && data[left + 3] === data[right + 3];
  };

  for (const frameName of requiredTileFrames) {
    const frame = atlas.frames?.[frameName]?.frame;
    if (!frame) {
      errors.push(`${tilesetKey}.json: ${frameName} 프레임 없음`);
      continue;
    }
    if (frame.w !== 64 || frame.h !== 64) errors.push(`${tilesetKey}.json: ${frameName}이 64x64가 아님`);
    let extrusionMismatch = 0;
    for (let offset = 0; offset < 64; offset += 1) {
      for (let padding = 1; padding <= 2; padding += 1) {
        if (!pixelEquals(frame.x - padding, frame.y + offset, frame.x, frame.y + offset)) extrusionMismatch += 1;
        if (!pixelEquals(frame.x + 63 + padding, frame.y + offset, frame.x + 63, frame.y + offset)) extrusionMismatch += 1;
        if (!pixelEquals(frame.x + offset, frame.y - padding, frame.x + offset, frame.y)) extrusionMismatch += 1;
        if (!pixelEquals(frame.x + offset, frame.y + 63 + padding, frame.x + offset, frame.y + 63)) extrusionMismatch += 1;
      }
    }
    for (let xPadding = 1; xPadding <= 2; xPadding += 1) {
      for (let yPadding = 1; yPadding <= 2; yPadding += 1) {
        if (!pixelEquals(frame.x - xPadding, frame.y - yPadding, frame.x, frame.y)) extrusionMismatch += 1;
        if (!pixelEquals(frame.x + 63 + xPadding, frame.y - yPadding, frame.x + 63, frame.y)) extrusionMismatch += 1;
        if (!pixelEquals(frame.x - xPadding, frame.y + 63 + yPadding, frame.x, frame.y + 63)) extrusionMismatch += 1;
        if (!pixelEquals(frame.x + 63 + xPadding, frame.y + 63 + yPadding, frame.x + 63, frame.y + 63)) extrusionMismatch += 1;
      }
    }
    if (extrusionMismatch > 0) errors.push(`${tilesetKey}.png: ${frameName} 2px extrude 불일치 ${extrusionMismatch}개`);
  }
} catch (error) {
  errors.push(`${tilesetKey}: 파일 또는 atlas JSON을 읽을 수 없음 (${error.message})`);
}
}

for (const asset of backgroundAssets) {
  const path = join(root, "assets", "backgrounds", `${asset.name}.png`);
  try {
    await access(path);
    const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    if (info.width !== 2048 || info.height !== 720 || info.channels !== 4) {
      errors.push(`${asset.name}.png: 2048x720 RGBA가 아님`);
      continue;
    }

    let visible = 0;
    let outsidePalette = 0;
    let lumaTotal = 0;
    let firstVisibleY = info.height;
    let seamDelta = 0;
    for (let y = 0; y < info.height; y += 1) {
      const left = y * info.width * 4;
      const right = (y * info.width + info.width - 1) * 4;
      for (let channel = 0; channel < 4; channel += 1) {
        seamDelta = Math.max(seamDelta, Math.abs(data[left + channel] - data[right + channel]));
      }
    }
    for (let index = 0; index < data.length; index += 4) {
      if (data[index + 3] < 16) continue;
      visible += 1;
      firstVisibleY = Math.min(firstVisibleY, Math.floor(index / 4 / info.width));
      const rgb = [data[index], data[index + 1], data[index + 2]];
      if (Math.min(...paletteRgb.map((entry) => colorDistance(rgb, entry.rgb))) > 0) outsidePalette += 1;
      lumaTotal += (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
    }

    if (!visible) errors.push(`${asset.name}.png: 불투명 픽셀이 없음`);
    if (outsidePalette > 0) errors.push(`${asset.name}.png: 팔레트 밖 픽셀 ${outsidePalette}개`);
    if (seamDelta !== 0) errors.push(`${asset.name}.png: 좌우 seam 최대 차이 ${seamDelta}`);
    if (visible) {
      const meanLuma = (lumaTotal / visible) * 100;
      if (meanLuma < asset.luma[0] || meanLuma > asset.luma[1]) {
        errors.push(`${asset.name}.png: 평균 명도 ${meanLuma.toFixed(1)}% (${asset.luma[0]}~${asset.luma[1]}% 아님)`);
      }
    }
    if (asset.minimumY && firstVisibleY < asset.minimumY - 4) {
      errors.push(`${asset.name}.png: 첫 가시 픽셀 y=${firstVisibleY} (최소 ${asset.minimumY - 4})`);
    }
  } catch (error) {
    errors.push(`${asset.name}.png: 파일을 읽을 수 없음 (${error.message})`);
  }
}

for (const asset of starlightDecorationAssets) {
  const path = join(root, "assets", "decorations", `${asset.name}.png`);
  try {
    const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    if (info.width !== asset.width || info.height !== asset.height || info.channels !== 4) {
      errors.push(`${asset.name}.png: ${asset.width}x${asset.height} RGBA가 아님`);
      continue;
    }
    let visible = 0;
    let outsidePalette = 0;
    for (let index = 0; index < data.length; index += 4) {
      if (data[index + 3] < 16) continue;
      visible += 1;
      const rgb = [data[index], data[index + 1], data[index + 2]];
      if (Math.min(...paletteRgb.map((entry) => colorDistance(rgb, entry.rgb))) > 0) outsidePalette += 1;
    }
    const cornerAlpha = [
      data[3],
      data[(info.width - 1) * 4 + 3],
      data[((info.height - 1) * info.width) * 4 + 3],
      data[(info.width * info.height - 1) * 4 + 3]
    ];
    if (!visible) errors.push(`${asset.name}.png: 불투명 픽셀이 없음`);
    if (outsidePalette > 0) errors.push(`${asset.name}.png: 팔레트 밖 픽셀 ${outsidePalette}개`);
    if (cornerAlpha.some((alpha) => alpha > 8)) errors.push(`${asset.name}.png: 모서리 투명 여백 없음`);
  } catch (error) {
    errors.push(`${asset.name}.png: 장식 파일을 읽을 수 없음 (${error.message})`);
  }
}

for (const asset of mistEffectAssets) {
  const path = join(root, "assets", "effects", `${asset.name}.png`);
  try {
    const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    if (info.width !== asset.width || info.height !== asset.height || info.channels !== 4) {
      errors.push(`${asset.name}.png: ${asset.width}x${asset.height} RGBA가 아님`);
      continue;
    }
    let visible = 0;
    let outsidePalette = 0;
    for (let index = 0; index < data.length; index += 4) {
      if (data[index + 3] < 16) continue;
      visible += 1;
      const rgb = [data[index], data[index + 1], data[index + 2]];
      if (Math.min(...paletteRgb.map((entry) => colorDistance(rgb, entry.rgb))) > 0) outsidePalette += 1;
    }
    const cornerAlpha = [
      data[3],
      data[(info.width - 1) * 4 + 3],
      data[((info.height - 1) * info.width) * 4 + 3],
      data[(info.width * info.height - 1) * 4 + 3]
    ];
    if (!visible) errors.push(`${asset.name}.png: 불투명 픽셀이 없음`);
    if (outsidePalette > 0) errors.push(`${asset.name}.png: 팔레트 밖 픽셀 ${outsidePalette}개`);
    if (cornerAlpha.some((alpha) => alpha > 8)) errors.push(`${asset.name}.png: 모서리 투명 여백 없음`);
  } catch (error) {
    errors.push(`${asset.name}.png: 안개 효과 파일을 읽을 수 없음 (${error.message})`);
  }
}

try {
  const manifest = JSON.parse(await readFile(join(root, "assets", "manifest.json"), "utf8"));
  const manifestAudio = new Map(
    manifest.assets.filter((entry) => entry.type === "audio").map((entry) => [entry.key, entry])
  );
  for (const key of requiredAudioKeys) {
    const entry = manifestAudio.get(key);
    if (!entry) {
      errors.push(`manifest.json: 필수 오디오 ${key} 없음`);
      continue;
    }
    if (!entry.url?.startsWith("/assets/audio/") || entry.url.includes("://")) {
      errors.push(`${key}: 저장소 내부 오디오 URL이 아님`);
      continue;
    }
    try {
      const buffer = await readFile(join(root, entry.url.slice(1)));
      if (buffer.length < 45 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") {
        errors.push(`${key}: 유효한 WAV 파일이 아님`);
        continue;
      }
      const channels = buffer.readUInt16LE(22);
      const rate = buffer.readUInt32LE(24);
      const bits = buffer.readUInt16LE(34);
      const dataBytes = buffer.readUInt32LE(40);
      const duration = dataBytes / (rate * channels * (bits / 8));
      if (channels !== 1 || rate !== 22050 || bits !== 16) {
        errors.push(`${key}: 22050Hz mono 16-bit PCM이 아님`);
      }
      if (key.startsWith("bgm_") && duration < 3) errors.push(`${key}: BGM 길이 ${duration.toFixed(2)}초 (3초 미만)`);
      if (key.startsWith("sfx_") && duration < 0.05) errors.push(`${key}: SFX 길이 ${duration.toFixed(2)}초 (50ms 미만)`);
      validatedAudioCount += 1;
    } catch (error) {
      errors.push(`${key}: 오디오 파일을 읽을 수 없음 (${error.message})`);
    }
  }
} catch (error) {
  errors.push(`manifest.json: 오디오 검증 불가 (${error.message})`);
}

if (errors.length) {
  console.error(`캐릭터/적/아이템/타일/배경 에셋 검증 실패 (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
const assetReport = await generateAssetReport({ root });
const measurementRange = (measurements) => ({
  minimum: Math.min(...measurements.map(({ value }) => value)),
  maximum: Math.max(...measurements.map(({ value }) => value))
});
const baselineRange = measurementRange(qualityMeasurements.baseline);
const heightRange = measurementRange(qualityMeasurements.characterHeight);
const maximumOutsidePalette = qualityMeasurements.outsidePalette.reduce(
  (maximum, measurement) => measurement.value > maximum.value ? measurement : maximum,
  qualityMeasurements.outsidePalette[0]
);
console.log(`캐릭터 ${characterAssets.length}프레임·시트 ${validatedCharacterSheetCount}개·적 ${enemyAssets.length}프레임·시트 ${validatedEnemySheetCount}개·아이템/진행 오브젝트 ${itemAssets.length}개·타일셋 ${tilesetKeys.length}개·배경 ${backgroundAssets.length}개·별빛 장식 ${starlightDecorationAssets.length}개·안개 효과 ${mistEffectAssets.length}개·오디오 ${validatedAudioCount}개 검증 통과: 규격, 실루엣, 방향, duration 매핑, 투명 여백, 팔레트, 2px extrude, 명도, seam, 로컬 WAV 잠금`);
console.log(`형태/팔레트 임계값 통과: 기준선 ${qualityMeasurements.baseline.length}개 ${baselineRange.minimum}~${baselineRange.maximum}px (16±2px) · 캐릭터 높이 ${qualityMeasurements.characterHeight.length}개 ${heightRange.minimum}~${heightRange.maximum}px (96px±5%) · 팔레트 ${qualityMeasurements.outsidePalette.length}개 최대 ${(maximumOutsidePalette.value * 100).toFixed(2)}% (${maximumOutsidePalette.name}, 허용 5% 이하)`);
console.log(`HTML 에셋 보고서 생성: ${assetReport.outputPath} (시각 에셋 ${assetReport.assetCount}개·역할 실루엣 ${assetReport.roleCount}개)`);
