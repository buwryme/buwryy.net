/**
 * obx container patch.
 *
 * Reverse engineered from Editing News' patcher and made open source.
 * Replaces or appends a four-sample audio tail and rebuilds the movie box.
 */

import {
  AAC_RATES,
  type Box,
  box,
  boxWithType,
  child,
  concat,
  descriptor,
  findChild,
  p32,
  p64,
  parseBoxes,
  readHeader,
  readInt,
  serializeBox,
  setData,
  tableCount,
  u32,
} from './slsrPatch';

const COMMENT = 'Patched by https://github.com/buwryme/tiktok-lossless-upload';

function buildAacConfig(rateIndex: number): Uint8Array {
  const bits: string[] = [];
  const add = (value: number, width: number) => {
    bits.push(value.toString(2).padStart(width, '0'));
  };
  for (const [value, width] of [
    [5, 3], [0, 4], [1, 2], [rateIndex, 4], [0, 4], [0, 4], [0, 4],
    [2, 2], [0, 3], [0, 4], [0, 1], [0, 1], [0, 1], [2, 4], [5, 4],
  ]) {
    add(value, width);
  }
  let text = bits.join('');
  text = text.padEnd(Math.ceil(text.length / 8) * 8, '0') + '0'.repeat(8);
  for (const a of [2, 5]) {
    for (const [value, width] of [[3, 3], [a, 4], [0, 8], [0, 11], [0, 3]]) {
      text += value.toString(2).padStart(width, '0');
    }
  }
  text += (7).toString(2).padStart(3, '0');
  text = text.padEnd(Math.ceil(text.length / 8) * 8, '0');
  const bytes = new Uint8Array(text.length / 8);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = parseInt(text.slice(index * 8, index * 8 + 8), 2);
  }
  return bytes;
}

function readAacRate(stbl: Box): number {
  const data = child(stbl, 'stsd').data;
  if (data.length < 44 || u32(data, 0) !== 0 || u32(data, 4) !== 1) {
    throw new Error('expected one AAC description');
  }
  const sample = data.subarray(8);
  if (
    u32(sample, 0) !== sample.length ||
    String.fromCharCode(sample[4], sample[5], sample[6], sample[7]) !== 'mp4a' ||
    sample[16] !== 0 ||
    sample[17] !== 0
  ) {
    throw new Error('expected unencrypted version-0 AAC');
  }
  if (sample[24] !== 0 || ![1, 2].includes(sample[25])) {
    throw new Error('expected mono or stereo AAC');
  }
  const entries = parseBoxes(sample.subarray(36));
  if (entries.some((entry) => entry.name === 'wave' || entry.name === 'sinf')) {
    throw new Error('unsupported AAC sample entry');
  }
  const esdsEntries = entries.filter((entry) => entry.name === 'esds');
  if (esdsEntries.length !== 1 || u32(esdsEntries[0].data, 0) !== 0) {
    throw new Error('expected one ESDS');
  }
  const esds = esdsEntries[0].data;
  const decoder = descriptor(esds, 4);
  if (decoder.tag !== 3 || esds[decoder.start + 2] !== 0) {
    throw new Error('unsupported ES descriptor');
  }
  const configs: Uint8Array[] = [];
  let pos = decoder.start + 3;
  while (pos < decoder.end) {
    const item = descriptor(esds.subarray(0, decoder.end), pos);
    if (item.tag === 4) {
      if (item.end - item.start < 13 || esds[item.start] !== 64) {
        throw new Error('unsupported audio object');
      }
      let inner = item.start + 13;
      while (inner < item.end) {
        const sub = descriptor(esds.subarray(0, item.end), inner);
        if (sub.tag === 5) configs.push(esds.subarray(sub.start, sub.end));
        inner = sub.end;
      }
    }
    pos = item.end;
  }
  if (configs.length !== 1) throw new Error('expected one AAC config');
  const config = configs[0];
  if (config.length < 2) throw new Error('expected one AAC config');
  const rateIndex = ((config[0] & 7) << 1) | (config[1] >> 7);
  if (
    config[0] >> 3 !== 2 ||
    !AAC_RATES[rateIndex] ||
    ![1, 2].includes((config[1] >> 3) & 15) ||
    (config[1] & 7) !== 0
  ) {
    throw new Error('expected ordinary AAC-LC mono or stereo');
  }
  const bits = Array.from(config.subarray(2), (byte) =>
    byte.toString(2).padStart(8, '0'),
  ).join('');
  if (bits.includes('1') && !/^01010110111001010*$/.test(bits)) {
    throw new Error('unsupported AAC extension');
  }
  return rateIndex;
}

function readAudioSizes(stbl: Box): { box: Box; values: number[] } {
  const stsz = findChild(stbl, 'stsz');
  const stz2 = findChild(stbl, 'stz2');
  if (!stsz && !stz2) throw new Error('expected one audio size table');
  if (stsz && stz2) throw new Error('expected one audio size table');
  const item = (stsz ?? stz2)!;
  const data = item.data;
  if (data.length < 12 || data[0] !== 0) throw new Error('invalid audio sample sizes');
  const count = u32(data, 8);
  if (count <= 4 || count > 5_000_000) throw new Error('audio sample count is unsupported');
  let values: number[];
  if (item.name === 'stsz') {
    const uniform = u32(data, 4);
    if (data.length !== 12 + (uniform ? 0 : count * 4)) throw new Error('invalid stsz length');
    values = Array.from({ length: count }, (_, index) =>
      uniform || u32(data, 12 + index * 4),
    );
  } else {
    const width = data[7];
    if (![4, 8, 16].includes(width) || data.length !== 12 + Math.ceil((count * width) / 8)) {
      throw new Error('invalid stz2 length');
    }
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    values = Array.from({ length: count }, (_, index) =>
      width === 4
        ? (data[12 + (index >> 1)] >> (index % 2 ? 0 : 4)) & 15
        : width === 8
          ? data[12 + index]
          : view.getUint16(12 + index * 2),
    );
  }
  if (values.some((value) => value === 0)) throw new Error('zero-sized audio sample');
  return { box: item, values };
}

function readChunkRuns(
  stbl: Box,
  sizes: number[],
  mdats: Array<{ at: number; width: number; size: number }>,
): { offsets: Box; sc: Box; list: Array<{ offset: number; first: number; count: number; length: number }> } {
  const stco = findChild(stbl, 'stco');
  const co64 = findChild(stbl, 'co64');
  if (!stco && !co64) throw new Error('expected one chunk offset table');
  if (stco && co64) throw new Error('expected one chunk offset table');
  const offsets = (stco ?? co64)!;
  const width = offsets.name === 'stco' ? 4 : 8;
  const chunks = tableCount(offsets, width);
  const sc = child(stbl, 'stsc');
  const runs = Array.from({ length: tableCount(sc, 12) }, (_, index) => [
    u32(sc.data, 8 + index * 12),
    u32(sc.data, 12 + index * 12),
    u32(sc.data, 16 + index * 12),
  ]);
  if (
    !chunks ||
    !runs.length ||
    runs[0][0] !== 1 ||
    runs[runs.length - 1][0] > chunks ||
    !runs.every(([first, per, desc], index) =>
      per > 0 && desc === 1 && (index === 0 || first > runs[index - 1][0]),
    )
  ) {
    throw new Error('unsupported chunk runs');
  }
  let run = 0;
  let sampled = 0;
  const list: Array<{ offset: number; first: number; count: number; length: number }> = [];
  for (let index = 0; index < chunks; index += 1) {
    if (run + 1 < runs.length && runs[run + 1][0] <= index + 1) run += 1;
    const count = runs[run][1];
    const offset = readInt(offsets.data, 8 + index * width, width);
    if (sampled + count > sizes.length) throw new Error('chunk exceeds sample count');
    let length = 0;
    for (let sample = 0; sample < count; sample += 1) length += sizes[sampled + sample];
    if (!mdats.some((mdat) => offset >= mdat.at + mdat.width && offset + length <= mdat.at + mdat.size)) {
      throw new Error('chunk outside media');
    }
    list.push({ offset, first: sampled, count, length });
    sampled += count;
  }
  if (sampled !== sizes.length) throw new Error('missing audio chunks');
  return { offsets, sc, list };
}

function addComment(root: Box, comment: string): void {
  let udta = findChild(root, 'udta');
  if (!udta) {
    udta = { name: 'udta', data: new Uint8Array(), raw: null, children: null };
    root.children!.push(udta);
  }
  const existing = udta.data;
  const hdlr = box('hdlr', concat([
    p32(0),
    p32(0),
    new TextEncoder().encode('mdir'),
    new Uint8Array(13),
  ]));
  const commentBox = boxWithType(new Uint8Array([0xa9, 0x63, 0x6d, 0x74]), box('data', concat([
    p32(1),
    p32(0),
    new TextEncoder().encode(comment),
  ])));
  setData(udta, concat([
    existing,
    box('meta', concat([p32(0), hdlr, box('ilst', commentBox)])),
  ]));
}

export function patchObx(data: Uint8Array, comment = COMMENT): Uint8Array {
  const tops: Array<{ name: string; at: number; size: number; width: number; zero: boolean }> = [];
  let pos = 0;
  while (pos < data.length) {
    const header = readHeader(data.subarray(pos, pos + 16), data.length - pos);
    if (tops.length >= 10000 || ['moof', 'mfra', 'sidx', 'ssix'].includes(header.name)) {
      throw new Error('fragmented or indexed MP4 is unsupported');
    }
    tops.push({ name: header.name, at: pos, size: header.size, width: header.header, zero: header.zero });
    pos += header.size;
  }
  const moovs = tops.filter((item) => item.name === 'moov');
  const mdats = tops.filter((item) => item.name === 'mdat');
  if (moovs.length !== 1 || !mdats.length || moovs[0].size > 256 * 1024 * 1024) {
    throw new Error('expected a conventional MP4');
  }
  const moov = moovs[0];
  const root = parseBoxes(data.subarray(moov.at, moov.at + moov.size))[0];
  const forbidden = new Set([
    'mvex', 'pssh', 'senc', 'saio', 'saiz', 'iloc', 'encv', 'enca', 'tenc', 'sinf',
  ]);
  const check = (item: Box) => {
    if (forbidden.has(item.name)) throw new Error('encrypted or fragmented metadata is unsupported');
    item.children?.forEach(check);
  };
  check(root);
  const tracks = root.children!.filter((item) => item.name === 'trak');
  const handler = (track: Box): string =>
    String.fromCharCode(...child(child(track, 'mdia'), 'hdlr').data.subarray(8, 12));
  const audio = tracks.filter((track) => handler(track) === 'soun');
  if (!audio.length || !tracks.some((track) => handler(track) === 'vide')) {
    throw new Error('requires video and audio');
  }
  const ids = tracks.map((track) => {
    const th = child(track, 'tkhd').data;
    if (th[0] !== 0 && th[0] !== 1) throw new Error('invalid track header');
    return u32(th, th[0] === 1 ? 20 : 12);
  });
  if (ids.some((id) => id === 0) || new Set(ids).size !== ids.length) {
    throw new Error('invalid track IDs');
  }
  const audioTrack = audio[0];
  const minf = child(child(audioTrack, 'mdia'), 'minf');
  const dref = child(child(minf, 'dinf'), 'dref').data;
  const references = parseBoxes(dref.subarray(8));
  if (
    u32(dref, 0) !== 0 ||
    u32(dref, 4) !== references.length ||
    !references.length ||
    references.some((reference) => reference.name !== 'url ' || u32(reference.data, 0) !== 1)
  ) {
    throw new Error('external references are unsupported');
  }
  const stbl = child(minf, 'stbl');
  const sizeTable = readAudioSizes(stbl);
  const sizes = sizeTable.values;
  const runs = readChunkRuns(stbl, sizes, mdats);
  const tail = buildAacConfig(readAacRate(stbl));
  const last = sizes.length - 4;
  const existing: Array<{ offset: number; length: number }> = [];
  for (const chunk of runs.list) {
    let offset = chunk.offset;
    for (let index = chunk.first; index < chunk.first + chunk.count; index += 1) {
      if (index >= last) existing.push({ offset, length: sizes[index] });
      offset += sizes[index];
    }
  }
  if (existing.length !== 4) throw new Error('incomplete audio tail');
  let inPlace = existing.every((item) => item.length >= tail.length);
  if (inPlace) {
    for (const track of tracks) {
      if (track === audioTrack) continue;
      try {
        const otherStbl = child(child(child(track, 'mdia'), 'minf'), 'stbl');
        const other = readAudioSizes(otherStbl).values;
        const otherRuns = readChunkRuns(otherStbl, other, mdats).list;
        if (otherRuns.some((otherChunk) =>
          existing.some((item) =>
            item.offset < otherChunk.offset + otherChunk.length &&
            otherChunk.offset < item.offset + item.length,
          ),
        )) {
          inPlace = false;
        }
      } catch {
        inPlace = false;
      }
    }
  }

  const edits: Array<{ at: number; end: number; bytes: Uint8Array }> = [];
  let extraMdat: Uint8Array | null = null;
  if (inPlace) {
    for (const item of existing) {
      edits.push({
        at: item.offset,
        end: item.offset + item.length,
        bytes: concat([tail, new Uint8Array(item.length - tail.length)]),
      });
    }
  } else {
    const kept: Array<{ offset: number; count: number }> = [];
    for (const chunk of runs.list) {
      const count = Math.min(chunk.count, Math.max(0, last - chunk.first));
      if (count) kept.push({ offset: chunk.offset, count });
    }
    kept.push({ offset: data.length + 8, count: 4 });
    const wide = runs.offsets.name === 'co64' || kept.some((item) => item.offset > 0xffffffff);
    runs.offsets.name = wide ? 'co64' : 'stco';
    setData(runs.offsets, concat([
      p32(0),
      p32(kept.length),
      ...kept.map((item) => (wide ? p64(item.offset) : p32(item.offset))),
    ]));
    const groups: Array<[number, number, number]> = [];
    kept.forEach((item, index) => {
      if (!groups.length || groups[groups.length - 1][1] !== item.count) {
        groups.push([index + 1, item.count, 1]);
      }
    });
    setData(runs.sc, concat([
      p32(0),
      p32(groups.length),
      ...groups.flatMap((group) => group.map((value) => p32(value))),
    ]));
    sizeTable.box.name = 'stsz';
    const newSizes = new Uint8Array(12 + sizes.length * 4);
    newSizes.set(p32(sizes.length), 8);
    sizes.forEach((value, index) => {
      newSizes.set(p32(index < last ? value : tail.length), 12 + index * 4);
    });
    setData(sizeTable.box, newSizes);
    extraMdat = box('mdat', concat([tail, tail, tail, tail]));
  }

  addComment(root, comment);
  edits.push({ at: moov.at + 4, end: moov.at + 8, bytes: new TextEncoder().encode('free') });
  for (const item of tops) {
    if (item.zero) {
      if (item.size > 0xffffffff) throw new Error('size-zero box exceeds 4 GiB');
      edits.push({ at: item.at, end: item.at + 4, bytes: p32(item.size) });
    }
  }
  edits.sort((a, b) => a.at - b.at);
  const output: Uint8Array[] = [];
  let cursor = 0;
  for (const edit of edits) {
    if (edit.at < cursor) throw new Error('overlapping media edits');
    output.push(data.subarray(cursor, edit.at), edit.bytes);
    cursor = edit.end;
  }
  output.push(data.subarray(cursor));
  if (extraMdat) output.push(extraMdat);
  output.push(serializeBox(root));
  return concat(output);
}
