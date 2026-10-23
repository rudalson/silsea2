export const readOggVorbis = buffer => {
  let offset = 0, lastGranule = 0n, rate = 0, channels = 0;
  while (offset + 27 <= buffer.length) {
    if (buffer.toString("ascii", offset, offset + 4) !== "OggS") throw new Error("OggS 페이지가 아님");
    const tableEnd = offset + 27 + buffer[offset + 26];
    if (tableEnd > buffer.length) throw new Error("잘린 OGG 세그먼트 표");
    let payloadBytes = 0;
    for (let i = offset + 27; i < tableEnd; i++) payloadBytes += buffer[i];
    const pageEnd = tableEnd + payloadBytes;
    if (pageEnd > buffer.length) throw new Error("잘린 OGG 페이지");
    if (!rate) {
      if (buffer[tableEnd] !== 1 || buffer.toString("ascii", tableEnd + 1, tableEnd + 7) !== "vorbis") throw new Error("Vorbis 식별 헤더가 없음");
      channels = buffer[tableEnd + 11]; rate = buffer.readUInt32LE(tableEnd + 12);
    }
    const granule = buffer.readBigUInt64LE(offset + 6);
    if (granule !== 0xffffffffffffffffn) lastGranule = granule;
    offset = pageEnd;
  }
  if (offset !== buffer.length || !rate || !lastGranule) throw new Error("OGG 길이 또는 페이지가 올바르지 않음");
  return { channels, rate, duration: Number(lastGranule) / rate };
};
