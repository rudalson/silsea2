export const CHARACTER_SELECT_COLUMNS = 3;
export const getCharacterSelectColumns = (count) => count > 6 ? 4 : CHARACTER_SELECT_COLUMNS;

export const getCharacterCardLayout = (count, {
  gameWidth = 1280,
  firstRowY = 283,
  rowGap = 224,
  columnGap = 266,
  columns = getCharacterSelectColumns(count)
} = {}) => Array.from({ length: count }, (_, index) => {
  const row = Math.floor(index / columns);
  const rowStart = row * columns;
  const rowCount = Math.min(columns, count - rowStart);
  const column = index - rowStart;
  return Object.freeze({
    index,
    row,
    column,
    x: gameWidth / 2 + (column - (rowCount - 1) / 2) * columnGap,
    y: firstRowY + row * rowGap
  });
});

const wrap = (value, length) => ((value % length) + length) % length;

export const moveCharacterSelection = (
  current,
  moveX,
  moveY,
  count,
  columns = getCharacterSelectColumns(count)
) => {
  if (count <= 0) return 0;
  const index = wrap(current, count);
  if (Math.abs(moveX) >= Math.abs(moveY) && Math.abs(moveX) > 0) {
    return wrap(index + Math.sign(moveX), count);
  }
  if (Math.abs(moveY) === 0) return index;
  const rows = Math.ceil(count / columns);
  const row = Math.floor(index / columns);
  const column = index % columns;
  const targetRow = wrap(row + Math.sign(moveY), rows);
  const targetRowStart = targetRow * columns;
  const targetRowCount = Math.min(columns, count - targetRowStart);
  return targetRowStart + Math.min(column, targetRowCount - 1);
};

export const getCharacterSelectionAnnouncement = (character, index, count) =>
  `캐릭터 선택: ${character.name}, ${character.englishName}. ${character.description}. ${index + 1}/${count}`;
