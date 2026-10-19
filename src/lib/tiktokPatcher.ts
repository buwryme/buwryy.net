/**
 * Client-side MP4 patcher.
 *
 * Ported from the open-source tiktok-lossless-upload reference implementation.
 * The container rewrite is byte-compatible with the reference: the only
 * intentional difference is the watermark text in the video track.
 */

export interface PatcherConfig {
  watermark: string;
  sampleMultiplierNumerator: number;
  sampleMultiplierDenominator: number;
  stripUdta: boolean;
  faststart: boolean;
  freeBox: boolean;
  defaultDummySize: number;
  defaultDummyPayload: string;
  dummySizes: Record<string, number>;
  dummyPayloads: Record<string, string>;
}

const GIST_RAW_URL =
  'https://gist.githubusercontent.com/buwryme/e7dd8bca2094995943a855f0af985960/raw/tiktok_patcher.toml';

export const BUILTIN_TOML = `# Reverse engineered from Editing News' patcher and made open source.
[patcher]
watermark = "Patched by https://github.com/buwryme/tiktok-lossless-upload"
sample_multiplier_numerator = 20
sample_multiplier_denominator = 3
strip_udta = true
faststart = true
free_box = true
default_dummy_size = 8
default_dummy_payload = "0000000400000000"

[patcher.dummy_sizes]
avc1 = 8
avc2 = 8
avc3 = 8
avc4 = 8
hvc1 = 8
hev1 = 8
dvh1 = 8
dvhe = 8
dvav = 8
dva1 = 8
vp08 = 8
vp09 = 8
av01 = 8
mp4v = 8
s263 = 8
h263 = 8
jpeg = 8
mjpa = 8
mjpb = 8
ap4h = 8
ap4x = 8

[patcher.dummy_payloads]
avc1 = "0000000400000000"
avc2 = "0000000400000000"
avc3 = "0000000400000000"
avc4 = "0000000400000000"
hvc1 = "0000000400000000"
hev1 = "0000000400000000"
dvh1 = "0000000400000000"
dvhe = "0000000400000000"
dvav = "0000000400000000"
dva1 = "0000000400000000"
vp08 = "0000000000000000"
vp09 = "0000000000000000"
av01 = "0000000000000000"
mp4v = "0000000400000000"
s263 = "0000000400000000"
h263 = "0000000400000000"
jpeg = "0000000400000000"
mjpa = "0000000400000000"
mjpb = "0000000400000000"
ap4h = "0000000400000000"
ap4x = "0000000400000000"
`;

interface TomlValue {
  [key: string]: TomlValue | string | number | boolean;
}

function parseToml(text: string): TomlValue {
  const data: TomlValue = {};
  let section: TomlValue = data;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('[') && line.endsWith(']')) {
      const parts = line.slice(1, -1).trim().split('.').map((part) => part.trim());
      let current: TomlValue = data;
      for (const part of parts) {
        if (!part) continue;
        if (typeof current[part] !== 'object' || current[part] === null) {
          current[part] = {};
        }
        current = current[part] as TomlValue;
      }
      section = current;
      continue;
    }
    const equals = line.indexOf('=');
    if (equals === -1) continue;
    const key = line.slice(0, equals).trim();
    const rawValue = line.slice(equals + 1).trim();
    if (rawValue.startsWith('"')) {
      section[key] = JSON.parse(rawValue);
    } else if (rawValue === 'true' || rawValue === 'false') {
      section[key] = rawValue === 'true';
    } else {
      const number = Number(rawValue);
      if (!Number.isNaN(number)) section[key] = number;
    }
  }
  return data;
}

function normalizeConfig(raw: TomlValue): PatcherConfig {
  const patcher = (raw.patcher ?? {}) as TomlValue;
  return {
    watermark: String(patcher.watermark ?? 'Patched by https://github.com/buwryme/tiktok-lossless-upload'),
    sampleMultiplierNumerator: Number(patcher.sample_multiplier_numerator ?? 20),
    sampleMultiplierDenominator: Number(patcher.sample_multiplier_denominator ?? 3),
    stripUdta: Boolean(patcher.strip_udta ?? true),
    faststart: Boolean(patcher.faststart ?? true),
    freeBox: Boolean(patcher.free_box ?? true),
    defaultDummySize: Number(patcher.default_dummy_size ?? 8),
    defaultDummyPayload: String(patcher.default_dummy_payload ?? '0000000400000000'),
    dummySizes: { ...((patcher.dummy_sizes ?? {}) as Record<string, number>) },
    dummyPayloads: { ...((patcher.dummy_payloads ?? {}) as Record<string, string>) },
  };
}

export function builtinPatcherConfig(): PatcherConfig {
  return normalizeConfig(parseToml(BUILTIN_TOML));
}

let cachedConfig: PatcherConfig | null = null;

export async function loadPatcherConfig(reload = false): Promise<PatcherConfig> {
  if (cachedConfig && !reload) return cachedConfig;
  let config = builtinPatcherConfig();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(GIST_RAW_URL, { cache: 'no-store', signal: controller.signal });
    clearTimeout(timer);
    if (response.ok) {
      const remote = normalizeConfig(parseToml(await response.text()));
      config = {
        ...config,
        ...remote,
        dummySizes: { ...config.dummySizes, ...remote.dummySizes },
        dummyPayloads: { ...config.dummyPayloads, ...remote.dummyPayloads },
      };
    }
  } catch {
    // Keep the built-in copy when the gist is unavailable.
  }
  cachedConfig = config;
  return config;
}

export interface Mp4Box {
  offset: number;
  size: number;
  type: string;
  header: number;
  end: number;
  payloadStart: number;
}

const U32_MAX = 0xffffffff;

function readU32(data: Uint8Array, offset: number): number {
  return (
    ((data[offset] << 24) |
      (data[offset + 1] << 16) |
      (data[offset + 2] << 8) |
      data[offset + 3]) >>>
    0
  );
}

function readU64(data: Uint8Array, offset: number): number {
  return readU32(data, offset) * 0x100000000 + readU32(data, offset + 4);
}

function writeU32(data: Uint8Array, offset: number, value: number): void {
  data[offset] = (value >>> 24) & 0xff;
  data[offset + 1] = (value >>> 16) & 0xff;
  data[offset + 2] = (value >>> 8) & 0xff;
  data[offset + 3] = value & 0xff;
}

function writeU64(data: Uint8Array, offset: number, value: number): void {
  const big = BigInt(value);
  writeU32(data, offset, Number((big >> 32n) & 0xffffffffn));
  writeU32(data, offset + 4, Number(big & 0xffffffffn));
}

function parseBoxes(data: Uint8Array, start = 0, end = data.length): Mp4Box[] {
  const boxes: Mp4Box[] = [];
  let pos = start;
  while (pos + 8 <= end) {
    let size = readU32(data, pos);
    let header = 8;
    if (size === 1) {
      if (pos + 16 > end) break;
      size = readU64(data, pos + 8);
      header = 16;
    } else if (size === 0) {
      size = end - pos;
    }
    if (size < 8 || pos + size > end) break;
    boxes.push({
      offset: pos,
      size,
      type: String.fromCharCode(data[pos + 4], data[pos + 5], data[pos + 6], data[pos + 7]),
      header,
      end: pos + size,
      payloadStart: pos + header,
    });
    pos += size;
  }
  return boxes;
}

function concat(arrays: Uint8Array[]): Uint8Array {
  const length = arrays.reduce((total, array) => total + array.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  for (const array of arrays) {
    result.set(array, offset);
    offset += array.length;
  }
  return result;
}

function buildBox(type: string, payload: Uint8Array): Uint8Array {
  const box = new Uint8Array(8 + payload.length);
  writeU32(box, 0, box.length);
  for (let i = 0; i < 4; i += 1) box[4 + i] = type.charCodeAt(i);
  box.set(payload, 8);
  return box;
}

function buildFullBox(type: string, version: number, flags: number, payload: Uint8Array): Uint8Array {
  const header = new Uint8Array(4);
  writeU32(header, 0, ((version << 24) | (flags & 0x00ffffff)) >>> 0);
  return buildBox(type, concat([header, payload]));
}

function bytesOf(data: Uint8Array, box: Mp4Box): Uint8Array {
  return data.subarray(box.offset, box.end);
}

function handlerType(data: Uint8Array, trak: Mp4Box): string {
  for (const mdia of parseBoxes(data, trak.payloadStart, trak.end)) {
    if (mdia.type !== 'mdia') continue;
    for (const hdlr of parseBoxes(data, mdia.payloadStart, mdia.end)) {
      if (hdlr.type === 'hdlr') {
        return String.fromCharCode(
          data[hdlr.payloadStart + 8],
          data[hdlr.payloadStart + 9],
          data[hdlr.payloadStart + 10],
          data[hdlr.payloadStart + 11],
        );
      }
    }
  }
  return '';
}

function detectVideoCodec(data: Uint8Array, moov: Mp4Box): string {
  for (const trak of parseBoxes(data, moov.payloadStart, moov.end)) {
    if (trak.type !== 'trak' || handlerType(data, trak) !== 'vide') continue;
    for (const mdia of parseBoxes(data, trak.payloadStart, trak.end)) {
      if (mdia.type !== 'mdia') continue;
      for (const minf of parseBoxes(data, mdia.payloadStart, mdia.end)) {
        if (minf.type !== 'minf') continue;
        for (const stbl of parseBoxes(data, minf.payloadStart, minf.end)) {
          if (stbl.type !== 'stbl') continue;
          for (const stsd of parseBoxes(data, stbl.payloadStart, stbl.end)) {
            if (stsd.type !== 'stsd' || stsd.size < 24) continue;
            return String.fromCharCode(
              data[stsd.payloadStart + 12],
              data[stsd.payloadStart + 13],
              data[stsd.payloadStart + 14],
              data[stsd.payloadStart + 15],
            );
          }
        }
      }
    }
  }
  return 'avc1';
}

function mdhdTimescale(data: Uint8Array, mdhd: Mp4Box): number {
  return data[mdhd.payloadStart] === 1
    ? readU32(data, mdhd.payloadStart + 20)
    : readU32(data, mdhd.payloadStart + 12);
}

function mdhdDuration(data: Uint8Array, mdhd: Mp4Box): number {
  return data[mdhd.payloadStart] === 1
    ? readU64(data, mdhd.payloadStart + 24)
    : readU32(data, mdhd.payloadStart + 16);
}

function patchMdhd(data: Uint8Array, mdhd: Mp4Box, duration: number): Uint8Array {
  const payload = new Uint8Array(data.subarray(mdhd.payloadStart, mdhd.end));
  if (payload[0] === 1) {
    writeU64(payload, 24, duration);
  } else {
    writeU32(payload, 16, duration);
  }
  return buildBox('mdhd', payload);
}

interface SttsEntry {
  count: number;
  delta: number;
}

function sttsEntries(data: Uint8Array, stts: Mp4Box): SttsEntry[] {
  const count = readU32(data, stts.payloadStart + 4);
  const entries: SttsEntry[] = [];
  for (let i = 0; i < count; i += 1) {
    const offset = stts.payloadStart + 8 + i * 8;
    entries.push({
      count: readU32(data, offset),
      delta: readU32(data, offset + 4),
    });
  }
  return entries;
}

function stscEntries(data: Uint8Array, stsc: Mp4Box): [number, number, number][] {
  const count = readU32(data, stsc.payloadStart + 4);
  const entries: [number, number, number][] = [];
  for (let i = 0; i < count; i += 1) {
    const offset = stsc.payloadStart + 8 + i * 12;
    entries.push([
      readU32(data, offset),
      readU32(data, offset + 4),
      readU32(data, offset + 8),
    ]);
  }
  return entries;
}

function stszSizes(data: Uint8Array, stsz: Mp4Box): number[] {
  const uniform = readU32(data, stsz.payloadStart + 4);
  const count = readU32(data, stsz.payloadStart + 8);
  const sizes: number[] = [];
  if (uniform) {
    for (let i = 0; i < count; i += 1) sizes.push(uniform);
  } else {
    for (let i = 0; i < count; i += 1) {
      sizes.push(readU32(data, stsz.payloadStart + 12 + i * 4));
    }
  }
  return sizes;
}

function stcoEntries(data: Uint8Array, stco: Mp4Box): number[] {
  const count = readU32(data, stco.payloadStart + 4);
  const entries: number[] = [];
  for (let i = 0; i < count; i += 1) {
    entries.push(
      stco.type === 'co64'
        ? readU64(data, stco.payloadStart + 8 + i * 8)
        : readU32(data, stco.payloadStart + 8 + i * 4),
    );
  }
  return entries;
}

function buildStts(realCount: number, delta: number): Uint8Array {
  const payload = new Uint8Array(24);
  writeU32(payload, 4, 2);
  writeU32(payload, 8, Math.max(0, realCount - 1));
  writeU32(payload, 12, delta);
  writeU32(payload, 16, 1);
  writeU32(payload, 20, 1);
  return buildBox('stts', payload);
}

function buildStsc(entries: [number, number, number][], firstChunk: number): Uint8Array {
  const payload = new Uint8Array(8 + (entries.length + 1) * 12);
  writeU32(payload, 4, entries.length + 1);
  let offset = 8;
  for (const [first, count, description] of entries) {
    writeU32(payload, offset, first);
    writeU32(payload, offset + 4, count);
    writeU32(payload, offset + 8, description);
    offset += 12;
  }
  writeU32(payload, offset, firstChunk);
  writeU32(payload, offset + 4, 1);
  writeU32(payload, offset + 8, 1);
  return buildBox('stsc', payload);
}

function buildStsz(sizes: number[]): Uint8Array {
  const payload = new Uint8Array(12 + sizes.length * 4);
  writeU32(payload, 8, sizes.length);
  for (let i = 0; i < sizes.length; i += 1) {
    writeU32(payload, 12 + i * 4, sizes[i]);
  }
  return buildBox('stsz', payload);
}

function buildStco(values: number[], is64: boolean): Uint8Array {
  const payload = new Uint8Array(8 + values.length * (is64 ? 8 : 4));
  writeU32(payload, 4, values.length);
  values.forEach((value, index) => {
    if (is64) writeU64(payload, 8 + index * 8, value);
    else writeU32(payload, 8 + index * 4, value);
  });
  return buildBox(is64 ? 'co64' : 'stco', payload);
}

function shiftStco(data: Uint8Array, stco: Mp4Box, delta: number): Uint8Array {
  const values = stcoEntries(data, stco).map((value) => value + delta);
  return buildStco(values, stco.type === 'co64');
}

function buildWatermark(text: string): Uint8Array {
  const encoded = new TextEncoder().encode(text);
  const dataPayload = new Uint8Array(8 + encoded.length + 1);
  writeU32(dataPayload, 0, 1);
  dataPayload.set(encoded, 8);
  const data = buildBox('data', dataPayload);
  const ilst = buildBox('ilst', buildBox('\xa9too', data));
  const hdlrPayload = new Uint8Array(4 + 4 + 12 + 1);
  hdlrPayload.set([0x6d, 0x64, 0x69, 0x72], 4);
  const hdlr = buildFullBox('hdlr', 0, 0, hdlrPayload);
  const meta = buildFullBox('meta', 0, 0, concat([hdlr, ilst]));
  return buildBox('udta', meta);
}

function ftypBrand(codec: string): string {
  switch (codec) {
    case 'hvc1':
    case 'hev1':
    case 'dvh1':
    case 'dvhe':
      return 'hvc1';
    case 'vp08':
      return 'vp08';
    case 'vp09':
      return 'vp09';
    case 'av01':
      return 'av01';
    case 'mp4v':
      return 'mp4v';
    default:
      return 'avc1';
  }
}

function buildFtyp(codec: string): Uint8Array {
  const payload = new Uint8Array(24);
  payload.set([0x69, 0x73, 0x6f, 0x6d], 0); // isom
  writeU32(payload, 4, 0x200);
  payload.set([0x69, 0x73, 0x6f, 0x6d], 8); // isom
  payload.set([0x69, 0x73, 0x6f, 0x32], 12); // iso2
  payload.set(new TextEncoder().encode(ftypBrand(codec)), 16);
  payload.set([0x6d, 0x70, 0x34, 0x31], 20); // mp41
  return buildBox('ftyp', payload);
}

function buildMdat(payload: Uint8Array): Uint8Array {
  const size = 8 + payload.length;
  if (size <= U32_MAX) return buildBox('mdat', payload);
  const box = new Uint8Array(16 + payload.length);
  writeU32(box, 0, 1);
  for (let i = 0; i < 4; i += 1) box[4 + i] = 'mdat'.charCodeAt(i);
  writeU64(box, 8, 16 + payload.length);
  box.set(payload, 16);
  return box;
}

function patchBtrtInStsd(stsd: Uint8Array, bitrate: number): Uint8Array {
  const output = new Uint8Array(stsd);
  let search = 0;
  while (true) {
    const index = output.indexOf(0x62, search); // 'b'
    if (index === -1) break;
    if (
      output[index + 1] === 0x74 && // t
      output[index + 2] === 0x72 && // r
      output[index + 3] === 0x74 && // t
      index >= 4 &&
      readU32(output, index - 4) === 20
    ) {
      const start = index - 4;
      writeU32(output, start + 12, bitrate);
      writeU32(output, start + 16, bitrate);
    }
    search = index + 4;
  }
  return output;
}

function readDescriptorLength(data: Uint8Array, offset: number): [number, number] {
  let value = 0;
  let cursor = offset;
  while (cursor < data.length) {
    const byte = data[cursor];
    cursor += 1;
    value = (value << 7) | (byte & 0x7f);
    if ((byte & 0x80) === 0) break;
  }
  return [value, cursor];
}

function patchAudioStsd(stsd: Uint8Array, bitrate: number): Uint8Array {
  const output = new Uint8Array(stsd);

  let search = 0;
  while (true) {
    const index = output.indexOf(0x65, search); // 'e'
    if (index === -1) break;
    if (
      output[index + 1] === 0x73 &&
      output[index + 2] === 0x64 &&
      output[index + 3] === 0x73 &&
      index >= 4
    ) {
      const start = index - 4;
      const size = readU32(output, start);
      if (size >= 30) {
        let cursor = start + 12;
        if (cursor < start + size && output[cursor] === 0x03) {
          cursor += 1;
          [, cursor] = readDescriptorLength(output, cursor);
          cursor += 3; // ES_ID (2) + flags (1)
          if (cursor < start + size && output[cursor] === 0x04) {
            cursor += 1;
            [, cursor] = readDescriptorLength(output, cursor);
            const maxOffset = cursor + 5;
            const avgOffset = maxOffset + 4;
            if (avgOffset + 4 <= start + size) {
              writeU32(output, maxOffset, bitrate);
              writeU32(output, avgOffset, bitrate);
            }
          }
        }
      }
    }
    search = index + 4;
  }

  search = 0;
  while (true) {
    const index = output.indexOf(0x62, search); // 'b'
    if (index === -1) break;
    if (
      output[index + 1] === 0x74 &&
      output[index + 2] === 0x72 &&
      output[index + 3] === 0x74 &&
      index >= 4 &&
      readU32(output, index - 4) === 20
    ) {
      const start = index - 4;
      writeU32(output, start + 12, bitrate);
      writeU32(output, start + 16, bitrate);
    }
    search = index + 4;
  }
  return output;
}

function patchTkhdDuration(data: Uint8Array, tkhd: Mp4Box, duration: number): Uint8Array {
  const payload = new Uint8Array(data.subarray(tkhd.payloadStart, tkhd.end));
  if (payload[0] === 1) writeU64(payload, 28, duration);
  else writeU32(payload, 20, duration);
  return buildBox('tkhd', payload);
}

function buildSttsEntries(entries: SttsEntry[]): Uint8Array {
  const payload = new Uint8Array(8 + entries.length * 8);
  writeU32(payload, 4, entries.length);
  entries.forEach((entry, index) => {
    const offset = 8 + index * 8;
    writeU32(payload, offset, entry.count);
    writeU32(payload, offset + 4, entry.delta);
  });
  return buildBox('stts', payload);
}

interface AudioStats {
  targetDuration: number;
  tkhdDuration: number;
  stts: SttsEntry[];
  bitrate: number;
}

function mvhdTimescale(data: Uint8Array, moov: Mp4Box): number {
  for (const box of parseBoxes(data, moov.payloadStart, moov.end)) {
    if (box.type !== 'mvhd') continue;
    return data[box.payloadStart] === 1
      ? readU32(data, box.payloadStart + 20)
      : readU32(data, box.payloadStart + 12);
  }
  return 0;
}

function readAudioStats(
  data: Uint8Array,
  trak: Mp4Box,
  movieTimescale: number,
): AudioStats | null {
  if (!movieTimescale) return null;
  let segmentDuration = 0;
  let mediaTime = 0;
  let timescale = 0;
  let stts: SttsEntry[] = [];
  let sizes: number[] = [];

  for (const box of parseBoxes(data, trak.payloadStart, trak.end)) {
    if (box.type === 'edts') {
      for (const child of parseBoxes(data, box.payloadStart, box.end)) {
        if (child.type !== 'elst') continue;
        const payload = child.payloadStart;
        const version = data[payload];
        const count = readU32(data, payload + 4);
        if (count > 0) {
          if (version === 1) {
            segmentDuration = readU64(data, payload + 8);
            mediaTime = readU64(data, payload + 16);
          } else {
            segmentDuration = readU32(data, payload + 8);
            mediaTime = readU32(data, payload + 12);
          }
        }
      }
    } else if (box.type === 'mdia') {
      for (const child of parseBoxes(data, box.payloadStart, box.end)) {
        if (child.type === 'mdhd') {
          timescale = mdhdTimescale(data, child);
        } else if (child.type === 'minf') {
          for (const minf of parseBoxes(data, child.payloadStart, child.end)) {
            if (minf.type !== 'stbl') continue;
            for (const stbl of parseBoxes(data, minf.payloadStart, minf.end)) {
              if (stbl.type === 'stts') stts = sttsEntries(data, stbl);
              else if (stbl.type === 'stsz') sizes = stszSizes(data, stbl);
            }
          }
        }
      }
    }
  }

  if (!timescale || stts.length === 0 || sizes.length === 0) return null;
  const targetDuration =
    Math.floor((segmentDuration * timescale) / movieTimescale) + mediaTime;
  if (targetDuration <= 0) return null;

  const entries = stts.map((entry) => ({ ...entry }));
  const prefix = entries
    .slice(0, -1)
    .reduce((sum, entry) => sum + entry.count * entry.delta, 0);
  const newDelta = targetDuration - prefix;
  if (newDelta <= 0) return null;
  entries[entries.length - 1] = {
    count: entries[entries.length - 1].count,
    delta: newDelta,
  };

  const seconds = targetDuration / timescale;
  const bitrate = seconds
    ? Math.floor((sizes.reduce((sum, size) => sum + size, 0) * 8) / seconds)
    : 0;
  return {
    targetDuration,
    tkhdDuration: segmentDuration,
    stts: entries,
    bitrate,
  };
}

interface PatchStats {
  realCount: number;
  sampleDelta: number;
  totalDuration: number;
  stsc: [number, number, number][];
  oldChunks: number;
  sizes: number[];
  fakeCount: number;
  bitrate: number;
  watermark: string;
  stripUdta: boolean;
  audio: AudioStats | null;
}

function rebuildStbl(
  data: Uint8Array,
  stbl: Mp4Box,
  delta: number,
  safeOffset: number,
  kind: string,
  stats: PatchStats,
): Uint8Array {
  const output: Uint8Array[] = [];
  const video = kind === 'vide';
  const audio = kind === 'soun' && stats.audio;
  for (const box of parseBoxes(data, stbl.payloadStart, stbl.end)) {
    if (box.type === 'stco' || box.type === 'co64') {
      if (video) {
        const values = stcoEntries(data, box).map((value) => value + delta);
        for (let i = 0; i < stats.fakeCount; i += 1) values.push(safeOffset);
        output.push(buildStco(values, box.type === 'co64'));
      } else {
        output.push(shiftStco(data, box, delta));
      }
    } else if (video && box.type === 'stts') {
      output.push(buildStts(stats.realCount, stats.sampleDelta));
    } else if (audio && box.type === 'stts') {
      output.push(buildSttsEntries(stats.audio!.stts));
    } else if (video && box.type === 'stsc') {
      output.push(buildStsc(stats.stsc, stats.oldChunks + 1));
    } else if (video && box.type === 'stsz') {
      output.push(buildStsz(stats.sizes));
    } else if (video && box.type === 'stsd') {
      output.push(buildBox('stsd', patchBtrtInStsd(data.subarray(box.payloadStart, box.end), stats.bitrate)));
    } else if (audio && box.type === 'stsd') {
      output.push(buildBox('stsd', patchAudioStsd(data.subarray(box.payloadStart, box.end), stats.audio!.bitrate)));
    } else {
      output.push(bytesOf(data, box));
    }
  }
  return buildBox('stbl', concat(output));
}

function rebuildMinf(
  data: Uint8Array,
  minf: Mp4Box,
  delta: number,
  safeOffset: number,
  kind: string,
  stats: PatchStats,
): Uint8Array {
  const output: Uint8Array[] = [];
  for (const box of parseBoxes(data, minf.payloadStart, minf.end)) {
    if (box.type === 'stbl') {
      output.push(rebuildStbl(data, box, delta, safeOffset, kind, stats));
    } else {
      output.push(bytesOf(data, box));
    }
  }
  return buildBox('minf', concat(output));
}

function rebuildMdia(
  data: Uint8Array,
  mdia: Mp4Box,
  delta: number,
  safeOffset: number,
  kind: string,
  stats: PatchStats,
): Uint8Array {
  const output: Uint8Array[] = [];
  for (const box of parseBoxes(data, mdia.payloadStart, mdia.end)) {
    if (box.type === 'mdhd' && kind === 'vide') {
      output.push(patchMdhd(data, box, stats.totalDuration));
    } else if (box.type === 'mdhd' && kind === 'soun' && stats.audio) {
      output.push(patchMdhd(data, box, stats.audio.targetDuration));
    } else if (box.type === 'minf') {
      output.push(rebuildMinf(data, box, delta, safeOffset, kind, stats));
    } else {
      output.push(bytesOf(data, box));
    }
  }
  return buildBox('mdia', concat(output));
}

function rebuildTrak(
  data: Uint8Array,
  trak: Mp4Box,
  delta: number,
  safeOffset: number,
  kind: string,
  stats: PatchStats,
): Uint8Array {
  const output: Uint8Array[] = [];
  for (const box of parseBoxes(data, trak.payloadStart, trak.end)) {
    if (box.type === 'udta' && stats.stripUdta) continue;
    if (box.type === 'tkhd' && kind === 'soun' && stats.audio) {
      output.push(patchTkhdDuration(data, box, stats.audio.tkhdDuration));
    } else if (box.type === 'mdia') {
      output.push(rebuildMdia(data, box, delta, safeOffset, kind, stats));
    } else {
      output.push(bytesOf(data, box));
    }
  }
  if (kind === 'vide') output.push(buildWatermark(stats.watermark));
  return buildBox('trak', concat(output));
}

function rebuildMoov(
  data: Uint8Array,
  moov: Mp4Box,
  delta: number,
  safeOffset: number,
  stats: PatchStats,
): Uint8Array {
  const output: Uint8Array[] = [];
  for (const box of parseBoxes(data, moov.payloadStart, moov.end)) {
    if (box.type === 'udta' && stats.stripUdta) continue;
    if (box.type === 'trak') {
      output.push(rebuildTrak(data, box, delta, safeOffset, handlerType(data, box), stats));
    } else {
      output.push(bytesOf(data, box));
    }
  }
  return buildBox('moov', concat(output));
}

function hexToBytes(hex: string, size: number): Uint8Array {
  const bytes: number[] = [];
  for (let i = 0; i + 1 < hex.length; i += 2) {
    const value = Number.parseInt(hex.slice(i, i + 2), 16);
    if (Number.isNaN(value)) break;
    bytes.push(value);
  }
  const output = new Uint8Array(size);
  output.set(bytes.slice(0, size), 0);
  return output;
}

export function patchBytes(input: Uint8Array, config: PatcherConfig): Uint8Array {
  const data = new Uint8Array(input);
  const top = parseBoxes(data, 0, data.length);
  const moov = top.find((box) => box.type === 'moov');
  const mdat = top.find((box) => box.type === 'mdat');
  if (!moov || !mdat) throw new Error('input is missing a moov or mdat box');

  const codec = detectVideoCodec(data, moov);
  const dummySize = Number(config.dummySizes[codec] ?? config.defaultDummySize);
  const dummyPayload = hexToBytes(
    config.dummyPayloads[codec] ?? config.defaultDummyPayload,
    dummySize,
  );

  const movieTimescale = mvhdTimescale(data, moov);
  let audio: AudioStats | null = null;
  for (const trak of parseBoxes(data, moov.payloadStart, moov.end)) {
    if (trak.type === 'trak' && handlerType(data, trak) === 'soun') {
      audio = readAudioStats(data, trak, movieTimescale);
    }
  }

  let realCount = 0;
  let sampleDelta = 0;
  let totalDuration = 0;
  let timescale = 0;
  let stsc: [number, number, number][] = [];
  let sizes: number[] = [];
  let oldChunks = 0;
  let found = false;

  for (const trak of parseBoxes(data, moov.payloadStart, moov.end)) {
    if (trak.type !== 'trak' || handlerType(data, trak) !== 'vide') continue;
    for (const mdia of parseBoxes(data, trak.payloadStart, trak.end)) {
      if (mdia.type !== 'mdia') continue;
      for (const child of parseBoxes(data, mdia.payloadStart, mdia.end)) {
        if (child.type === 'mdhd') {
          timescale = mdhdTimescale(data, child);
          totalDuration = mdhdDuration(data, child);
        }
        if (child.type !== 'minf') continue;
        for (const stbl of parseBoxes(data, child.payloadStart, child.end)) {
          if (stbl.type !== 'stbl') continue;
          for (const box of parseBoxes(data, stbl.payloadStart, stbl.end)) {
            if (box.type === 'stts') {
              const entries = sttsEntries(data, box);
              realCount = entries.reduce((sum, entry) => sum + entry.count, 0);
              sampleDelta = entries.length > 0 ? entries[0].delta : 0;
              totalDuration = entries.reduce((sum, entry) => sum + entry.count * entry.delta, 0);
            } else if (box.type === 'stsc') {
              stsc = stscEntries(data, box);
            } else if (box.type === 'stsz') {
              sizes = stszSizes(data, box);
            } else if (box.type === 'stco' || box.type === 'co64') {
              oldChunks = stcoEntries(data, box).length;
            }
          }
          found = true;
        }
      }
    }
  }

  if (!found || sizes.length === 0 || oldChunks === 0) {
    throw new Error('input has no usable video sample tables');
  }

  const newCount = Math.max(
    realCount,
    Math.round((realCount * config.sampleMultiplierNumerator) / config.sampleMultiplierDenominator),
  );
  const fakeCount = newCount - realCount;
  const seconds = timescale > 0 ? totalDuration / timescale : 0;
  const bitrate = seconds > 0 ? Math.floor((sizes.reduce((sum, size) => sum + size, 0) * 8) / seconds) : 0;

  const stats: PatchStats = {
    realCount,
    sampleDelta,
    totalDuration,
    stsc,
    oldChunks,
    sizes: [...sizes, ...Array.from({ length: fakeCount }, () => dummySize)],
    fakeCount,
    bitrate,
    watermark: config.watermark,
    stripUdta: config.stripUdta,
    audio,
  };

  const freeBox = config.freeBox ? buildBox('free', new Uint8Array(0)) : new Uint8Array(0);
  const ftyp = buildFtyp(codec);
  const probeMoov = rebuildMoov(data, moov, 0, 0, stats);
  const newMdatPayloadOffset = ftyp.length + freeBox.length + probeMoov.length + 8;
  const oldMdatPayloadOffset = mdat.payloadStart;
  const delta = newMdatPayloadOffset - oldMdatPayloadOffset;
  const finalSize = newMdatPayloadOffset + (mdat.size - mdat.header) + dummyPayload.length;
  const safeOffset = finalSize - dummyPayload.length;

  const newMoov = rebuildMoov(data, moov, delta, safeOffset, stats);
  if (newMoov.length !== probeMoov.length) {
    throw new Error('moov size changed between patch passes');
  }

  const mdatPayload = data.subarray(mdat.payloadStart, mdat.end);
  const newMdat = buildMdat(concat([mdatPayload, dummyPayload]));
  return concat([ftyp, freeBox, newMoov, newMdat]);
}
