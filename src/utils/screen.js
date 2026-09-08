export const isOnScreen = (scene, object, margin = 0) => {
  const view = scene.cameras.main.worldView;
  return object.x >= view.left - margin
    && object.x <= view.right + margin
    && object.y >= view.top - margin
    && object.y <= view.bottom + margin;
};
