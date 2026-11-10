/**
 * silent-tail audio container patch.
 *
 * Reverse engineered from Editing News' patcher and made open source.
 * Extends the audio track with a silent AAC tail, duplicates the track,
 * leaves the video samples untouched, and appends a rebuilt movie box.
 */

const CONTAINERS = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'edts', 'dinf']);
const AAC_RATES = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350];
const SILENT_FRAME = new Uint8Array([33, 16, 4, 96, 140, 28]);

function u32(data: Uint8Array, offset: number): number {
  return (
    ((data[offset] << 24) |
      (data[offset + 1] << 16) |
      (data[offset + 2] << 8) |
      data[offset + 3]) >>>
    0
  );
}

function u64(data: Uint8Array, offset: number): number {
  const value = u32(data, offset) * 0x100000000 + u32(data, offset + 4);
  if (!Number.isSafeInteger(value)) throw new Error('unsupported 64-bit value');
  return value;
}

function p32(value: number): Uint8Array {
  return new Uint8Array([
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ]);
}

function p64(value: number): Uint8Array {
  const output = new Uint8Array(8);
  output.set(p32(Math.floor(value / 0x100000000)), 0);
  output.set(p32(value >>> 0), 4);
  return output;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function box(name: string, payload: Uint8Array): Uint8Array {
  const type = new TextEncoder().encode(name);
  return concat([p32(payload.length + 8), type, payload]);
}

interface Box {
  name: string;
  data: Uint8Array;
  raw: Uint8Array | null;
  children: Box[] | null;
}

interface Header {
  name: string;
  header: number;
  size: number;
  zero: boolean;
}

function readHeader(data: Uint8Array, available: number): Header {
  if (data.length < 8) throw new Error('truncated MP4 header');
  const declared = u32(data, 0);
  const header = declared === 1 ? 16 : 8;
  if (data.length < header) throw new Error('truncated extended MP4 header');
  const size = declared === 1 ? u64(data, 8) : declared || available;
  if (size < header || size > available) throw new Error('invalid MP4 box size');
  return {
    name: String.fromCharCode(data[4], data[5], data[6], data[7]),
    header,
    size,
    zero: declared === 0,
  };
}

function parseBoxes(data: Uint8Array, depth = 0): Box[] {
  if (depth >= 16) throw new Error('excessive MP4 nesting');
  const output: Box[] = [];
  let pos = 0;
  while (pos < data.length) {
    const header = readHeader(data.subarray(pos, pos + 16), data.length - pos);
    const raw = data.subarray(pos, pos + header.size);
    const payload = raw.subarray(header.header);
    output.push({
      name: header.name,
      data: payload,
      raw,
      children: CONTAINERS.has(header.name) ? parseBoxes(payload, depth + 1) : null,
    });
    pos += header.size;
  }
  return output;
}

function serializeBox(item: Box): Uint8Array {
  if (item.children) {
    return box(item.name, concat(item.children.map(serializeBox)));
  }
  if (item.raw) return item.raw;
  return box(item.name, item.data);
}

function child(item: Box, name: string): Box {
  const found = item.children?.find((entry) => entry.name === name);
  if (!found) throw new Error(`missing MP4 box: ${name}`);
  return found;
}

function findChild(item: Box, name: string): Box | null {
  return item.children?.find((entry) => entry.name === name) ?? null;
}

function setData(item: Box, data: Uint8Array): void {
  item.data = data;
  item.raw = null;
}

function readInt(data: Uint8Array, offset: number, width: number): number {
  return width === 8 ? u64(data, offset) : u32(data, offset);
}

function writeInt(item: Box, offset: number, width: number, value: number): void {
  if (value < 0 || (width === 4 && value >= 0xffffffff)) {
    throw new Error('unsupported MP4 timing or ID');
  }
  const data = new Uint8Array(item.data);
  data.set(width === 8 ? p64(value) : p32(value), offset);
  setData(item, data);
}

interface Descriptor {
  tag: number;
  start: number;
  end: number;
}

function descriptor(data: Uint8Array, start: number): Descriptor {
  if (start >= data.length) throw new Error('missing descriptor');
  const tag = data[start];
  let pos = start + 1;
  let length = 0;
  for (let index = 0; index < 4; index += 1) {
    if (pos >= data.length) throw new Error('truncated descriptor');
    const value = data[pos];
    pos += 1;
    length = length * 128 + (value & 0x7f);
    if (!(value & 0x80)) {
      if (pos + length > data.length) throw new Error('invalid descriptor length');
      return { tag, start: pos, end: pos + length };
    }
  }
  throw new Error('invalid descriptor');
}

function descriptorBytes(tag: number, payload: Uint8Array): Uint8Array {
  const length = payload.length;
  return concat([
    new Uint8Array([
      tag,
      0x80 | (length >>> 21),
      0x80 | ((length >>> 14) & 0x7f),
      0x80 | ((length >>> 7) & 0x7f),
      length & 0x7f,
    ]),
    payload,
  ]);
}

function patchAudioDescription(stsd: Box): { rate: number; patched: Uint8Array } {
  const data = stsd.data;
  if (data.length < 44 || u32(data, 0) !== 0 || u32(data, 4) !== 1) {
    throw new Error('expected one AAC sample description');
  }
  const sample = data.subarray(8);
  if (
    sample[4] !== 0x6d ||
    sample[5] !== 0x70 ||
    sample[6] !== 0x34 ||
    sample[7] !== 0x61 ||
    u32(sample, 0) !== sample.length ||
    sample[16] !== 0 ||
    sample[17] !== 0 ||
    sample[24] !== 0 ||
    sample[25] !== 2
  ) {
    throw new Error('use an unencrypted AAC-LC stereo MP4');
  }
  const entries = parseBoxes(sample.subarray(36));
  const esds = entries.find((entry) => entry.name === 'esds');
  if (!esds || entries.some((entry) => entry.name === 'sinf' || entry.name === 'wave')) {
    throw new Error('expected a direct AAC configuration');
  }
  const esdsData = esds.data;
  if (esdsData.length < 4 || u32(esdsData, 0) !== 0) {
    throw new Error('unsupported AAC descriptor version');
  }
  const decoder = descriptor(esdsData, 4);
  if (decoder.tag !== 3 || decoder.end - decoder.start < 3 || esdsData[decoder.start + 2] !== 0) {
    throw new Error('unsupported AAC descriptor flags');
  }

  let rateIndex = -1;
  const rebuilt: Uint8Array[] = [];
  let pos = decoder.start + 3;
  while (pos < decoder.end) {
    const item = descriptor(esdsData.subarray(0, decoder.end), pos);
    if (item.tag !== 4) {
      rebuilt.push(esdsData.subarray(pos, item.end));
    } else {
      if (item.end - item.start < 13 || esdsData[item.start] !== 64) {
        throw new Error('unsupported MPEG-4 audio descriptor');
      }
      const nested: Uint8Array[] = [];
      let nestedPos = item.start + 13;
      while (nestedPos < item.end) {
        const sub = descriptor(esdsData.subarray(0, item.end), nestedPos);
        if (sub.tag !== 5) {
          nested.push(esdsData.subarray(nestedPos, sub.end));
        } else {
          const config = esdsData.subarray(sub.start, sub.end);
          if (rateIndex >= 0 || config.length < 2 || config[0] >>> 3 !== 2 || (config[1] & 0x7f) !== 16) {
            throw new Error('use ordinary AAC-LC stereo with 1024-sample frames');
          }
          rateIndex = ((config[0] & 7) << 1) | (config[1] >>> 7);
          const bits = Array.from(config.subarray(2), (byte) =>
            byte.toString(2).padStart(8, '0'),
          ).join('');
          if (!AAC_RATES[rateIndex] || (bits.includes('1') && !/^01010110111001010*$/.test(bits))) {
            throw new Error('unsupported AAC sample rate or extension');
          }
          const table = rateIndex.toString(2).padStart(4, '0');
          const configBits =
            '00010' +
            table +
            '0000000000001' +
            table +
            '00000001000000000000000010000';
          const padded = configBits.padEnd(Math.ceil(configBits.length / 8) * 8, '0') + '00000000';
          const bytes = new Uint8Array(padded.length / 8);
          for (let index = 0; index < bytes.length; index += 1) {
            bytes[index] = parseInt(padded.slice(index * 8, index * 8 + 8), 2);
          }
          nested.push(descriptorBytes(5, bytes));
        }
        nestedPos = sub.end;
      }
      rebuilt.push(descriptorBytes(
        4,
        concat([esdsData.subarray(item.start, item.start + 13), ...nested]),
      ));
    }
    pos = item.end;
  }

  if (rateIndex < 0) throw new Error('missing AAC configuration');
  setData(esds, concat([
    esdsData.subarray(0, 4),
    descriptorBytes(3, concat([
      esdsData.subarray(decoder.start, decoder.start + 3),
      ...rebuilt,
    ])),
    esdsData.subarray(decoder.end),
  ]));
  const replacement = box(
    'mp4a',
    concat([sample.subarray(8, 36), ...entries.map(serializeBox)]),
  );
  return {
    rate: AAC_RATES[rateIndex],
    patched: concat([p32(0), p32(2), sample, replacement]),
  };
}

function tableCount(item: Box, stride: number): number {
  if (item.data.length < 8 || u32(item.data, 0) !== 0) {
    throw new Error(`invalid ${item.name} table`);
  }
  const count = u32(item.data, 4);
  if (item.data.length !== 8 + count * stride || count > 5_000_000) {
    throw new Error(`invalid ${item.name} count`);
  }
  return count;
}

interface HeaderFields {
  offset: number;
  width: number;
  duration: number;
  scale: number;
}

function headerFields(item: Box): HeaderFields {
  const version = item.data[0];
  if (version !== 0 && version !== 1) throw new Error('unsupported MP4 header version');
  const version1 = version === 1;
  const isTrack = item.name === 'tkhd';
  const offset = isTrack ? (version1 ? 28 : 20) : version1 ? 24 : 16;
  const width = version1 ? 8 : 4;
  return {
    offset,
    width,
    duration: readInt(item.data, offset, width),
    scale: isTrack ? 0 : u32(item.data, offset - 4),
  };
}

function extendEdit(
  item: Box,
  audioDuration: number,
  audioScale: number,
  movieScale: number,
  sampleRate: number,
  duration: number,
  tail: number,
): number {
  const edts = findChild(item, 'edts');
  if (!edts) {
    if (Math.abs(duration - Math.round((audioDuration * movieScale) / audioScale)) > 1) {
      throw new Error('inconsistent audio duration');
    }
    return tail;
  }
  const elst = child(edts, 'elst');
  const data = elst.data;
  if (data[0] !== 0 && data[0] !== 1) throw new Error('unsupported MP4 edit list');
  const width = data[0] === 1 ? 8 : 4;
  const count = u32(data, 4);
  const stride = 2 * width + 4;
  if ((count !== 1 && count !== 2) || data.length !== 8 + count * stride) {
    throw new Error('unsupported audio edits');
  }
  const offset = 8 + (count - 1) * stride;
  const segment = readInt(data, offset, width);
  const mediaTime = readInt(data, offset + width, width);
  if (u32(data, offset + 2 * width) !== 65536) throw new Error('unsupported audio edit rate');
  if (count === 2) {
    for (let index = 8 + width; index < 8 + 2 * width; index += 1) {
      if (data[index] !== 0xff) throw new Error('unsupported leading audio edit');
    }
    if (u32(data, 8 + 2 * width) !== 65536) throw new Error('unsupported leading audio edit');
  }
  if (
    Math.abs(duration - segment - (count === 2 ? readInt(data, 8, width) : 0)) > 1
  ) {
    throw new Error('inconsistent edit duration');
  }
  const difference = (audioDuration - mediaTime) * movieScale - segment * audioScale;
  if (Math.abs(difference) > Math.ceil((2048 * audioScale) / sampleRate) * movieScale) {
    throw new Error('audio edit does not reach the end');
  }
  const extra = tail + Math.max(0, Math.ceil(difference / audioScale));
  writeInt(elst, offset, width, segment + extra);
  return extra;
}

function cloneBox(item: Box): Box {
  return {
    name: item.name,
    data: item.data,
    raw: item.raw,
    children: item.children ? item.children.map(cloneBox) : null,
  };
}

export function patchSlSr(data: Uint8Array): Uint8Array {
  const tops: Array<{ name: string; at: number; size: number; width: number; zero: boolean }> = [];
  let pos = 0;
  while (pos < data.length) {
    const header = readHeader(data.subarray(pos, pos + 16), data.length - pos);
    if (
      tops.length >= 10000 ||
      ['moof', 'sidx', 'mfra', 'ssix'].includes(header.name)
    ) {
      throw new Error('fragmented or indexed MP4 is unsupported');
    }
    tops.push({ name: header.name, at: pos, size: header.size, width: header.header, zero: header.zero });
    pos += header.size;
  }

  const moovs = tops.filter((item) => item.name === 'moov');
  const mdats = tops.filter((item) => item.name === 'mdat');
  if (
    moovs.length !== 1 ||
    mdats.length === 0 ||
    moovs[0].width !== 8 ||
    moovs[0].size > 32 * 1024 * 1024
  ) {
    throw new Error('expected one conventional MP4 movie box');
  }
  const moov = moovs[0];
  const root = parseBoxes(data.subarray(moov.at, moov.at + moov.size))[0];
  const tracks = root.children!.filter((item) => item.name === 'trak');
  const audioTracks = tracks.filter(
    (track) => String.fromCharCode(...child(child(track, 'mdia'), 'hdlr').data.subarray(8, 12)) === 'soun',
  );
  if (audioTracks.length !== 1) throw new Error('use an MP4 with exactly one AAC-LC stereo track');
  const audio = audioTracks[0];
  const media = child(audio, 'mdia');
  const minf = child(media, 'minf');
  const dref = child(child(minf, 'dinf'), 'dref').data;
  const references = parseBoxes(dref.subarray(8));
  if (
    u32(dref, 0) !== 0 ||
    u32(dref, 4) !== references.length ||
    references.length === 0 ||
    references.some((reference) => reference.name !== 'url ' || u32(reference.data, 0) !== 1)
  ) {
    throw new Error('external audio references are unsupported');
  }

  const stbl = child(minf, 'stbl');
  const allowed = new Set([
    'stsd', 'stsz', 'stsc', 'stts', 'stco', 'co64', 'sbgp', 'sgpd', 'subs',
    'free', 'skip', 'ctts', 'stss', 'stps', 'sdtp', 'stdp',
  ]);
  if (stbl.children!.some((item) => !allowed.has(item.name))) {
    throw new Error('unsupported audio sample table');
  }
  const stsd = child(stbl, 'stsd');
  const { rate: sampleRate, patched: patchedStsd } = patchAudioDescription(stsd);

  const stsz = child(stbl, 'stsz');
  if (stsz.data.length < 12 || u32(stsz.data, 0) !== 0) {
    throw new Error('invalid audio sample sizes');
  }
  const uniform = u32(stsz.data, 4);
  const sampleCount = u32(stsz.data, 8);
  if (sampleCount === 0 || sampleCount > 5_000_000 || stsz.data.length !== 12 + (uniform ? 0 : 4 * sampleCount)) {
    throw new Error('invalid audio sample count');
  }
  const sampleSize = (index: number): number => uniform || u32(stsz.data, 12 + 4 * index);

  const stsc = child(stbl, 'stsc');
  const runs = tableCount(stsc, 12);
  const stco = findChild(stbl, 'stco');
  const co64 = findChild(stbl, 'co64');
  if (stco && co64) throw new Error('duplicate chunk offset tables');
  const offsets = stco ?? child(stbl, 'co64');
  const oldOffsetWidth = offsets.name === 'stco' ? 4 : 8;
  const chunks = tableCount(offsets, oldOffsetWidth);
  if (runs === 0 || chunks === 0) throw new Error('missing audio chunks');

  const firstChunk = (index: number): number => u32(stsc.data, 8 + 12 * index);
  if (firstChunk(0) !== 1) throw new Error('invalid first chunk run');
  for (let index = 0; index < runs; index += 1) {
    if (
      firstChunk(index) > chunks ||
      (index > 0 && firstChunk(index) <= firstChunk(index - 1)) ||
      u32(stsc.data, 12 + 12 * index) === 0 ||
      u32(stsc.data, 16 + 12 * index) !== 1
    ) {
      throw new Error('invalid audio chunk run');
    }
  }

  let run = 0;
  let sampled = 0;
  for (let index = 0; index < chunks; index += 1) {
    if (run + 1 < runs && firstChunk(run + 1) === index + 1) run += 1;
    const perChunk = u32(stsc.data, 12 + 12 * run);
    if (sampled + perChunk > sampleCount) throw new Error('audio chunk exceeds sample count');
    let chunkBytes = 0;
    for (let entry = 0; entry < perChunk; entry += 1) {
      const size = sampleSize(sampled);
      sampled += 1;
      if (size === 0) throw new Error('empty AAC sample');
      chunkBytes += size;
    }
    const offset = readInt(offsets.data, 8 + index * oldOffsetWidth, oldOffsetWidth);
    if (!mdats.some((mdat) => offset >= mdat.at + mdat.width && offset + chunkBytes <= mdat.at + mdat.size)) {
      throw new Error('audio chunk outside media data');
    }
  }
  if (sampled !== sampleCount) throw new Error('audio chunks omit samples');

  const stts = child(stbl, 'stts');
  const timingCount = tableCount(stts, 8);
  let audioDuration = 0;
  let timedSamples = 0;
  const timing: Array<[number, number]> = [];
  for (let index = 0; index < timingCount; index += 1) {
    const count = u32(stts.data, 8 + 8 * index);
    const delta = u32(stts.data, 12 + 8 * index);
    if (count === 0 || delta === 0) throw new Error('invalid audio timing');
    timing.push([count, delta]);
    timedSamples += count;
    audioDuration += count * delta;
  }
  if (timedSamples !== sampleCount) throw new Error('audio timing does not match samples');

  const mdhd = child(media, 'mdhd');
  const mvhd = child(root, 'mvhd');
  const tkhd = child(audio, 'tkhd');
  const audioHeader = headerFields(mdhd);
  const movieHeader = headerFields(mvhd);
  const trackHeader = headerFields(tkhd);
  if (
    !audioHeader.scale ||
    !movieHeader.scale ||
    audioHeader.duration <= 0 ||
    Math.abs(audioHeader.duration - audioDuration) > Math.ceil((2048 * audioHeader.scale) / sampleRate) ||
    !(tkhd.data[3] & 1) ||
    trackHeader.duration <= 0
  ) {
    throw new Error('unsupported audio duration or track flags');
  }

  const tailFrames = Math.max(10, Math.ceil((0.35 * sampleRate) / 1024));
  for (const item of stbl.children!) {
    const payload = item.data;
    if (item.name === 'sbgp') {
      const header = payload[0] === 1 ? 12 : 8;
      if ((payload[0] !== 0 && payload[0] !== 1) || payload.length < header + 4) {
        throw new Error('invalid audio sample group');
      }
      const groups = u32(payload, header);
      if (payload.length !== header + 4 + groups * 8) throw new Error('invalid audio group count');
      let covered = 0;
      for (let index = 0; index < groups; index += 1) {
        covered += u32(payload, header + 4 + index * 8);
      }
      if (covered > sampleCount) throw new Error('audio groups exceed sample count');
      const extra = sampleCount - covered + tailFrames;
      if (groups > 0 && u32(payload, payload.length - 4) === 0) {
        const at = payload.length - 8;
        writeInt(item, at, 4, u32(payload, at) + extra);
      } else {
        setData(item, concat([
          payload.subarray(0, header),
          p32(groups + 1),
          payload.subarray(header + 4),
          p32(extra),
          p32(0),
        ]));
      }
    } else if (item.name === 'ctts') {
      const count = tableCount(item, 8);
      let covered = 0;
      for (let index = 0; index < count; index += 1) {
        covered += u32(payload, 8 + index * 8);
        if (u32(payload, 12 + index * 8) !== 0) {
          throw new Error('nonzero audio composition offsets are unsupported');
        }
      }
      if (covered !== sampleCount) throw new Error('audio composition counts differ');
      setData(item, concat([
        p32(0),
        p32(count + 1),
        payload.subarray(8),
        p32(tailFrames),
        p32(0),
      ]));
    } else if (item.name === 'stss' || item.name === 'stps') {
      const count = tableCount(item, 4);
      let previous = 0;
      for (let index = 0; index < count; index += 1) {
        const value = u32(payload, 8 + index * 4);
        if (value <= previous || value > sampleCount) throw new Error('invalid audio sync sample');
        previous = value;
      }
      const extra: Uint8Array[] = [];
      for (let index = 0; index < tailFrames; index += 1) extra.push(p32(sampleCount + index + 1));
      setData(item, concat([
        p32(0),
        p32(count + tailFrames),
        payload.subarray(8),
        ...extra,
      ]));
    } else if (item.name === 'sdtp' || item.name === 'stdp') {
      const stride = item.name === 'sdtp' ? 1 : 2;
      if (payload.length !== 4 + stride * sampleCount) {
        throw new Error('invalid audio dependency or priority table');
      }
      setData(item, concat([payload, new Uint8Array(stride * tailFrames)]));
    }
  }

  const tailExtra = tailFrames - 8;
  const audioTail = Math.floor((tailFrames * 1024 * audioHeader.scale) / sampleRate);
  const movieTail = Math.round((audioTail * movieHeader.scale) / audioHeader.scale);
  if (movieTail <= 0) throw new Error('movie timescale cannot represent the silent tail');
  const editExtra = extendEdit(
    audio,
    audioDuration,
    audioHeader.scale,
    movieHeader.scale,
    sampleRate,
    trackHeader.duration,
    movieTail,
  );
  writeInt(tkhd, trackHeader.offset, trackHeader.width, trackHeader.duration + editExtra);
  writeInt(mdhd, audioHeader.offset, audioHeader.width, audioHeader.duration + audioTail);

  for (let index = 0; index < tailFrames; index += 1) {
    const delta =
      Math.floor(((index + 1) * 1024 * audioHeader.scale) / sampleRate) -
      Math.floor((index * 1024 * audioHeader.scale) / sampleRate);
    if (delta <= 0 || delta > 0xffffffff) throw new Error('audio timescale cannot represent AAC frames');
    if (timing[timing.length - 1][1] === delta) timing[timing.length - 1][0] += 1;
    else timing.push([1, delta]);
  }
  const newStts = new Uint8Array(8 + timing.length * 8);
  newStts.set(p32(timing.length), 4);
  timing.forEach(([count, delta], index) => {
    newStts.set(p32(count), 8 + index * 8);
    newStts.set(p32(delta), 12 + index * 8);
  });
  setData(stts, newStts);

  const newStsz = new Uint8Array(12 + 4 * (sampleCount + tailFrames));
  newStsz.set(p32(sampleCount + tailFrames), 8);
  for (let index = 0; index < sampleCount + tailFrames; index += 1) {
    newStsz.set(p32(index < sampleCount ? sampleSize(index) : SILENT_FRAME.length), 12 + index * 4);
  }
  setData(stsz, newStsz);

  const firstOffset = data.length + 8;
  const secondOffset = firstOffset + tailExtra * SILENT_FRAME.length;
  const offsetWidth = oldOffsetWidth === 8 || secondOffset > 0xffffffff ? 8 : 4;
  const newOffsets = new Uint8Array(8 + (chunks + 2) * offsetWidth);
  newOffsets.set(p32(chunks + 2), 4);
  for (let index = 0; index < chunks + 2; index += 1) {
    const value =
      index < chunks
        ? readInt(offsets.data, 8 + index * oldOffsetWidth, oldOffsetWidth)
        : index === chunks
          ? firstOffset
          : secondOffset;
    newOffsets.set(offsetWidth === 8 ? p64(value) : p32(value), 8 + index * offsetWidth);
  }
  offsets.name = offsetWidth === 8 ? 'co64' : 'stco';
  setData(offsets, newOffsets);

  const stscPayload = stsc.data.subarray(8);
  const rebuiltStsc = (description: number): Uint8Array =>
    concat([
      p32(0),
      p32(runs + 2),
      stscPayload,
      p32(chunks + 1),
      p32(tailExtra),
      p32(1),
      p32(chunks + 2),
      p32(8),
      p32(description),
    ]);
  setData(stsc, rebuiltStsc(1));
  const clone = cloneBox(audio);
  setData(stsc, rebuiltStsc(2));
  setData(stsd, patchedStsd);

  const trackId = (item: Box): number => {
    const trackHeaderBox = child(item, 'tkhd');
    return u32(trackHeaderBox.data, trackHeaderBox.data[0] === 1 ? 20 : 12);
  };
  const ids = tracks.map(trackId);
  if (ids.some((id) => id === 0) || new Set(ids).size !== ids.length) {
    throw new Error('invalid track IDs');
  }
  const nextId = Math.max(...ids) + 1;
  const cloneTkhd = child(clone, 'tkhd');
  writeInt(cloneTkhd, cloneTkhd.data[0] === 1 ? 20 : 12, 4, nextId);
  const nextOffset = mvhd.data[0] === 1 ? 108 : 96;
  const previousNext = u32(mvhd.data, nextOffset);
  writeInt(mvhd, nextOffset, 4, Math.max(nextId + 1, previousNext === 0xffffffff ? 0 : previousNext));
  if (
    movieHeader.duration > 0 &&
    !(movieHeader.width === 4 && movieHeader.duration === 0xffffffff)
  ) {
    let longest = movieHeader.duration;
    for (const track of tracks) {
      const fields = headerFields(child(track, 'tkhd'));
      if (fields.duration > 0 && !(fields.width === 4 && fields.duration === 0xffffffff)) {
        longest = Math.max(longest, fields.duration);
      }
    }
    writeInt(mvhd, movieHeader.offset, movieHeader.width, longest);
  }

  root.children!.splice(root.children!.indexOf(audio) + 1, 0, clone);
  const silent = new Uint8Array(tailFrames * SILENT_FRAME.length);
  for (let index = 0; index < tailFrames; index += 1) {
    silent.set(SILENT_FRAME, index * SILENT_FRAME.length);
  }

  const output: Uint8Array[] = [];
  for (const item of tops) {
    if (item === moov) {
      output.push(p32(item.size));
      output.push(new TextEncoder().encode('free'));
      output.push(data.subarray(item.at + 8, item.at + item.size));
    } else if (item.zero) {
      if (item.size > 0xffffffff) throw new Error('size-zero box exceeds the supported range');
      output.push(p32(item.size));
      output.push(data.subarray(item.at + 4, item.at + item.size));
    } else {
      output.push(data.subarray(item.at, item.at + item.size));
    }
  }
  output.push(box('mdat', silent));
  output.push(serializeBox(root));
  return concat(output);
}
