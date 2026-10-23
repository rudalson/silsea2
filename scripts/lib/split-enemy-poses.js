import sharp from "sharp";

// Some authored wings/arms cross a nominal grid boundary without touching the
// next character. Alpha components separate them without cutting those limbs.
export async function splitEnemyPoses(path, count = 8, columns = 4) {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const labels = new Int32Array(info.width * info.height), queue = new Int32Array(labels.length), parts = [];
  let id = 0;
  for (let pixel = 0; pixel < labels.length; pixel++) {
    if (labels[pixel] || data[pixel * 4 + 3] < 4) continue;
    id++; let head = 0, tail = 1, left = info.width, top = info.height, right = -1, bottom = -1;
    queue[0] = pixel; labels[pixel] = id;
    while (head < tail) {
      const p = queue[head++], x = p % info.width, y = Math.floor(p / info.width);
      left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
      for (const n of [x > 0 ? p - 1 : -1, x + 1 < info.width ? p + 1 : -1,
        y > 0 ? p - info.width : -1, y + 1 < info.height ? p + info.width : -1]) {
        if (n >= 0 && !labels[n] && data[n * 4 + 3] >= 4) { labels[n] = id; queue[tail++] = n; }
      }
    }
    if (tail > info.width * info.height / 180) parts.push({ id, area: tail, left, top, width: right - left + 1, height: bottom - top + 1 });
  }
  if (parts.length !== count) throw new Error(`${path}: expected ${count} isolated character bodies, got ${parts.length}`);
  parts.sort((a, b) => (a.top + a.height / 2) - (b.top + b.height / 2));
  const poses = [];
  for (let row = 0; row < count / columns; row++) poses.push(...parts.slice(row * columns, (row + 1) * columns).sort((a, b) => a.left - b.left));
  const arts = [];
  for (const pose of poses) {
    if (pose.left <= 0 || pose.top <= 0 || pose.left + pose.width >= info.width || pose.top + pose.height >= info.height) {
      throw new Error(`${path}: pose touches the outer image edge`);
    }
    const pixels = Buffer.alloc(pose.width * pose.height * 4);
    for (let y = 0; y < pose.height; y++) for (let x = 0; x < pose.width; x++) {
      const from = (info.width * (pose.top + y) + pose.left + x), to = (y * pose.width + x) * 4;
      if (labels[from] !== pose.id) continue;
      for (let channel = 0; channel < 4; channel++) pixels[to + channel] = data[from * 4 + channel];
    }
    arts.push(await sharp(pixels, { raw: { width: pose.width, height: pose.height, channels: 4 } }).png().toBuffer());
  }
  return { poses: poses.map(({ left, top, width, height }) => ({ left, top, width, height })), arts };
}
