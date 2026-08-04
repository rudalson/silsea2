import manifest from "../../assets/manifest.json";
import { COLORS } from "../config/constants.js";

const entries = new Map(manifest.assets.map((asset) => [asset.key, asset]));

const toCss = (value) => `#${value.toString(16).padStart(6, "0")}`;

export class AssetManager {
  static queueLevelAssets(scene, level) {
    scene.load.json(level.assets.tilemapKey, level.assets.tilemap);

    for (const key of new Set(AssetManager.collectManifestKeys(level.assets))) {
      const entry = entries.get(key);
      const url = entry?.url ?? entry?.file;
      if (!url || entry.type === "placeholder") continue;
      if (entry.type === "image") scene.load.image(key, url);
      if (entry.type === "audio") scene.load.audio(key, url);
      if (entry.type === "atlas") scene.load.atlas(key, url, entry.atlasUrl);
      if (entry.type === "spritesheet") {
        scene.load.spritesheet(key, url, {
          frameWidth: entry.frameWidth,
          frameHeight: entry.frameHeight,
          endFrame: entry.frames - 1
        });
      }
    }
  }

  static collectManifestKeys(value, parentKey = "") {
    if (typeof value === "string") {
      if (["tilemap", "tilemapKey"].includes(parentKey)) return [];
      return entries.has(value) ? [value] : [];
    }
    if (Array.isArray(value)) return value.flatMap((item) => AssetManager.collectManifestKeys(item, parentKey));
    if (!value || typeof value !== "object") return [];
    return Object.entries(value).flatMap(([key, child]) => AssetManager.collectManifestKeys(child, key));
  }

  static hasManifestKey(key) {
    return entries.has(key);
  }

  static ensurePlaceholder(scene, key, options = {}) {
    if (scene.textures.exists(key)) return key;
    const width = options.width ?? 128;
    const height = options.height ?? 128;
    const color = options.color ?? COLORS.dangerAlt;
    const texture = scene.textures.createCanvas(key, width, height);
    const context = texture.getContext();
    context.clearRect(0, 0, width, height);
    context.fillStyle = toCss(color);
    context.strokeStyle = toCss(COLORS.outline);
    context.lineWidth = 6;
    context.beginPath();
    context.roundRect(4, 4, width - 8, height - 8, 18);
    context.fill();
    context.stroke();
    context.fillStyle = toCss(COLORS.white);
    context.font = "700 13px system-ui";
    context.textAlign = "center";
    context.textBaseline = "middle";
    AssetManager.wrapLabel(context, key, width / 2, height / 2, width - 18, 16);
    texture.refresh();
    return key;
  }

  static ensurePlayerTexture(scene, character) {
    const key = `graybox-player-${character.id}`;
    if (scene.textures.exists(key)) return key;
    const texture = scene.textures.createCanvas(key, 96, 112);
    const context = texture.getContext();
    const bodyColor = toCss(character.color);
    const accentColor = toCss(character.accent);
    const outline = toCss(COLORS.outline);

    context.clearRect(0, 0, 96, 112);
    context.lineJoin = "round";
    context.lineCap = "round";
    context.strokeStyle = outline;
    context.lineWidth = 4;

    if (character.shape === "round") {
      context.fillStyle = bodyColor;
      context.beginPath();
      context.ellipse(43, 66, 29, 24, 0, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.beginPath();
      context.ellipse(70, 48, 20, 21, 0, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      AssetManager.drawLeg(context, 27, 82, 10, 24, bodyColor, outline);
      AssetManager.drawLeg(context, 53, 82, 10, 24, bodyColor, outline);
      context.fillStyle = accentColor;
      context.beginPath();
      context.arc(69, 45, 8, Math.PI * 0.95, Math.PI * 1.9);
      context.lineTo(62, 57);
      context.fill();
    } else {
      context.fillStyle = bodyColor;
      context.beginPath();
      context.ellipse(40, 64, 31, 18, -0.05, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.beginPath();
      context.ellipse(72, 48, 16, 18, 0, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      AssetManager.drawLeg(context, 24, 76, 8, 30, bodyColor, outline);
      AssetManager.drawLeg(context, 51, 76, 8, 30, bodyColor, outline);
      context.fillStyle = accentColor;
      context.beginPath();
      context.moveTo(62, 30);
      context.quadraticCurveTo(45, 37, 46, 58);
      context.quadraticCurveTo(57, 48, 67, 48);
      context.fill();
      context.stroke();
      context.beginPath();
      context.moveTo(12, 55);
      context.quadraticCurveTo(0, 62, 10, 79);
      context.quadraticCurveTo(20, 70, 21, 60);
      context.fill();
      context.stroke();
    }

    context.fillStyle = outline;
    context.beginPath();
    context.arc(77, 45, 3.5, 0, Math.PI * 2);
    context.fill();
    texture.refresh();
    return key;
  }

  static drawLeg(context, x, y, width, height, fill, outline) {
    context.fillStyle = fill;
    context.strokeStyle = outline;
    context.beginPath();
    context.roundRect(x, y, width, height, 4);
    context.fill();
    context.stroke();
  }

  static wrapLabel(context, text, x, y, maxWidth, lineHeight) {
    const words = text.split(/[-_]/);
    const lines = [];
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (context.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    const offset = ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((value, index) => context.fillText(value, x, y - offset + index * lineHeight));
  }
}
