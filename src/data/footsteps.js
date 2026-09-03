export const FOOTSTEP_SURFACES = Object.freeze([
  "grass",
  "dirt",
  "stone",
  "wood",
  "shallow_water"
]);

export const FOOTSTEP_SFX = Object.freeze({
  grass: "sfx_footstep_grass",
  dirt: "sfx_footstep_dirt",
  stone: "sfx_footstep_stone",
  wood: "sfx_footstep_wood",
  shallow_water: "sfx_footstep_shallow_water"
});

export const FOOTSTEP_CONTACT_FRAMES = Object.freeze([0, 4]);
export const FOOTSTEP_MIN_SPEED = 40;
export const FOOTSTEP_VOLUME = 0.34;

const SURFACE_SET = new Set(FOOTSTEP_SURFACES);

export const getTiledProperty = (target, name) => (
  target?.properties?.find((property) => property.name === name)?.value
);

export const getTerrainLayer = (tilemap) => tilemap?.layers?.find(
  (layer) => layer.type === "objectgroup" && layer.name === "terrain"
) ?? null;

export const getTerrainObjectSurface = (layer, object) => {
  const explicitSurface = getTiledProperty(object, "surface");
  const typeSurface = getTiledProperty(layer, `${object?.type}Surface`);
  const surface = explicitSurface ?? typeSurface;
  return SURFACE_SET.has(surface) ? surface : null;
};

export const resolveFootstepSurface = (tilemap, x, feetY, tolerance = 24) => {
  const layer = getTerrainLayer(tilemap);
  if (!layer || !Number.isFinite(x) || !Number.isFinite(feetY)) return null;

  const support = (layer.objects ?? [])
    .filter((object) => (
      object.visible !== false
      && x >= object.x - 2
      && x <= object.x + object.width + 2
      && Math.abs(object.y - feetY) <= tolerance
    ))
    .sort((left, right) => Math.abs(left.y - feetY) - Math.abs(right.y - feetY))[0];

  return support ? getTerrainObjectSurface(layer, support) : null;
};

export const isFootstepContact = ({
  sequence,
  frame,
  grounded,
  abilityMode,
  velocityX,
  locked = false
}) => (
  sequence === "move"
  && FOOTSTEP_CONTACT_FRAMES.includes(Number(frame))
  && grounded
  && abilityMode !== "swim"
  && Math.abs(Number(velocityX) || 0) >= FOOTSTEP_MIN_SPEED
  && !locked
);
