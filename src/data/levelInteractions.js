// Item coordinates in level data are floor anchors, except for stars.
export function expandLevelItems(items) {
  return items.flatMap((item) => {
    if (item.type !== "star_arc") {
      return [{ ...item, y: item.y - (item.type === "star" ? 0 : 44) }];
    }
    return Array.from({ length: item.count }, (_, index) => {
      const angle = Math.PI + Math.PI * index / Math.max(1, item.count - 1);
      return {
        id: `${item.id}-${index}`,
        type: "star",
        x: item.x + Math.cos(angle) * item.radius,
        y: item.y + Math.sin(angle) * item.radius
      };
    });
  });
}

export function getItemTrigger(item) {
  const top = item.activationTop ?? item.y - 24;
  const bottom = item.y + 24;
  return { x: item.x, y: (top + bottom) / 2, width: 48, height: bottom - top };
}

export function getCheckpointTrigger(checkpoint) {
  const top = checkpoint.activationTop ?? checkpoint.y - 104;
  const bottom = checkpoint.y + 8;
  return { x: checkpoint.x, y: (top + bottom) / 2, width: 64, height: bottom - top };
}
