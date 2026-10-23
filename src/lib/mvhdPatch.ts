/**
 * MVHD container patch.
 *
 * Only two container changes are made:
 *   - mvhd is upgraded to version 1 and its duration is set to UINT64_MAX
 *   - a ©cmt comment is added to udta/meta/ilst
 *
 * The mdat and all sample tables stay untouched; chunk offsets are shifted by
 * the moov size delta. Verified byte-for-byte against the reference output.
 */

const COMMENT = 'Patched by https://github.com/buwryme/tiktok-lossless-upload';

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
  return u32(data, offset) * 0x100000000 + u32(data, offset + 4);
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
  const high = Math.floor(value / 0x100000000);
  output.set(p32(high), 0);
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

function boxWithType(typeBytes: Uint8Array, payload: Uint8Array): Uint8Array {
  return concat([p32(8 + payload.length), typeBytes, payload]);
}

function box(type: string, payload: Uint8Array): Uint8Array {
  return boxWithType(new TextEncoder().encode(type), payload);
}

function fullBox(type: string, version: number, flags: number, payload: Uint8Array): Uint8Array {
  return box(type, concat([p32(((version << 24) | (flags & 0xffffff)) >>> 0), payload]));
}

interface Box {
  offset: number;
  size: number;
  type: string;
  header: number;
  end: number;
  payloadStart: number;
}

function boxes(data: Uint8Array, start = 0, end = data.length): Box[] {
  const output: Box[] = [];
  let pos = start;
  while (pos + 8 <= end) {
    let size = u32(data, pos);
    let header = 8;
    if (size === 1) {
      size = u64(data, pos + 8);
      header = 16;
    } else if (size === 0) {
      size = end - pos;
    }
    if (size < 8 || pos + size > end) break;
    output.push({
      offset: pos,
      size,
      type: String.fromCharCode(data[pos + 4], data[pos + 5], data[pos + 6], data[pos + 7]),
      header,
      end: pos + size,
      payloadStart: pos + header,
    });
    pos += size;
  }
  return output;
}

function upgradeMvhd(mvhd: Uint8Array): Uint8Array {
  const body = mvhd.subarray(8);
  const version = body[0];
  if (version === 1) {
    const updated = new Uint8Array(body);
    updated.fill(0xff, 24, 32);
    return box('mvhd', updated);
  }
  if (version !== 0 || body.length < 100) return mvhd;

  const updated = new Uint8Array(112);
  updated.set(p32(1 << 24), 0);
  updated.set(p64(u32(body, 4)), 4);
  updated.set(p64(u32(body, 8)), 12);
  updated.set(body.subarray(12, 16), 20);
  updated.fill(0xff, 24, 32);
  updated.set(body.subarray(20, 24), 32);
  updated.set(body.subarray(24, 26), 36);
  updated.set(body.subarray(26, 36), 38);
  updated.set(body.subarray(36, 72), 48);
  updated.set(body.subarray(72, 96), 84);
  updated.set(body.subarray(96, 100), 108);
  return box('mvhd', updated);
}

function commentEntry(): Uint8Array {
  const value = new TextEncoder().encode(COMMENT);
  const data = box('data', concat([p32(1), p32(0), value]));
  return boxWithType(new Uint8Array([0xa9, 0x63, 0x6d, 0x74]), data);
}

function patchUdta(udta: Uint8Array): Uint8Array {
  const output: Uint8Array[] = [];
  let hasMeta = false;
  for (const child of boxes(udta, 8, udta.length)) {
    const raw = udta.subarray(child.offset, child.end);
    if (child.type !== 'meta') {
      output.push(raw);
      continue;
    }
    hasMeta = true;
    const metaPayload = udta.subarray(child.payloadStart, child.end);
    const newMeta: Uint8Array[] = [];
    let hasIlst = false;
    for (const metaChild of boxes(metaPayload, 4, metaPayload.length)) {
      if (metaChild.type !== 'ilst') {
        newMeta.push(metaPayload.subarray(metaChild.offset, metaChild.end));
        continue;
      }
      hasIlst = true;
      const ilstPayload = metaPayload.subarray(metaChild.payloadStart, metaChild.end);
      const entries: Uint8Array[] = [];
      let hasComment = false;
      for (const entry of boxes(ilstPayload, 0, ilstPayload.length)) {
        if (entry.type === '\xa9cmt') {
          entries.push(commentEntry());
          hasComment = true;
        } else {
          entries.push(ilstPayload.subarray(entry.offset, entry.end));
        }
      }
      if (!hasComment) entries.push(commentEntry());
      newMeta.push(box('ilst', concat(entries)));
    }
    if (!hasIlst) newMeta.push(box('ilst', commentEntry()));
    output.push(fullBox('meta', 0, 0, concat(newMeta)));
  }
  if (!hasMeta) {
    const hdlr = fullBox(
      'hdlr', 0, 0,
      concat([p32(0), new TextEncoder().encode('mdir'), new Uint8Array(13)]),
    );
    output.push(fullBox('meta', 0, 0, concat([hdlr, box('ilst', commentEntry())])));
  }
  return box('udta', concat(output));
}

function shiftOffsets(data: Uint8Array, start: number, end: number, delta: number): void {
  for (const item of boxes(data, start, end)) {
    if (item.type === 'stco' || item.type === 'co64') {
      const count = u32(data, item.offset + 12);
      const is64 = item.type === 'co64';
      for (let index = 0; index < count; index += 1) {
        const offset = item.offset + 16 + index * (is64 ? 8 : 4);
        const value = is64 ? u64(data, offset) : u32(data, offset);
        const updated = value + delta;
        if (is64) {
          data.set(p64(updated), offset);
        } else {
          data.set(p32(updated >>> 0), offset);
        }
      }
    } else if (['moov', 'trak', 'mdia', 'minf', 'stbl'].includes(item.type)) {
      shiftOffsets(data, item.payloadStart, item.end, delta);
    }
  }
}

function rebuild(data: Uint8Array, delta = 0): Uint8Array {
  const output: Uint8Array[] = [];
  for (const item of boxes(data, 0, data.length)) {
    const raw = data.subarray(item.offset, item.end);
    if (item.type !== 'moov') {
      output.push(raw);
      continue;
    }
    const moovChildren: Uint8Array[] = [];
    for (const child of boxes(raw, 8, raw.length)) {
      const childRaw = raw.subarray(child.offset, child.end);
      if (child.type === 'mvhd') {
        moovChildren.push(upgradeMvhd(childRaw));
      } else if (child.type === 'udta') {
        moovChildren.push(patchUdta(childRaw));
      } else {
        moovChildren.push(childRaw);
      }
    }
    let moov = box('moov', concat(moovChildren));
    if (delta) {
      moov = new Uint8Array(moov);
      shiftOffsets(moov, 8, moov.length, delta);
    }
    output.push(moov);
  }
  return concat(output);
}

export function patchMvhd(data: Uint8Array): Uint8Array {
  const top = boxes(data, 0, data.length);
  const oldMoov = top.find((item) => item.type === 'moov');
  const oldMdat = top.find((item) => item.type === 'mdat');
  if (!oldMoov || !oldMdat) throw new Error('input is missing a moov or mdat box');

  const probe = rebuild(data, 0);
  const newMoov = boxes(probe, 0, probe.length).find((item) => item.type === 'moov');
  if (!newMoov) throw new Error('failed to rebuild moov');

  let delta = newMoov.size - oldMoov.size;
  if (oldMoov.offset > oldMdat.offset) delta = 0;
  return rebuild(data, delta);
}
