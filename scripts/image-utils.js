import { PALETTE } from "../data/palette.js";

export const hexToRgb = (hex) => {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

export const paletteHexes = Object.values(PALETTE)
  .flatMap((value) => Array.isArray(value) ? value : typeof value === "string" && value.startsWith("#") ? [value] : [])
  .filter((value, index, values) => values.indexOf(value) === index);

export const paletteRgb = paletteHexes.map((hex) => ({ hex, rgb: hexToRgb(hex) }));

export const colorDistance = (left, right) => {
  const red = left[0] - right[0];
  const green = left[1] - right[1];
  const blue = left[2] - right[2];
  return Math.sqrt(red * red * 0.3 + green * green * 0.59 + blue * blue * 0.11);
};

export const nearestPaletteColor = (rgb) => paletteRgb.reduce(
  (best, candidate) => {
    const distance = colorDistance(rgb, candidate.rgb);
    return distance < best.distance ? { ...candidate, distance } : best;
  },
  { hex: paletteRgb[0].hex, rgb: paletteRgb[0].rgb, distance: Infinity }
);
