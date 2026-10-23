/**
 * Remote patcher configuration for the legacy audio-inflation pipeline.
 * The public gist is authoritative; the built-in copy is the fallback.
 */

export interface PatchConfig {
  encoder: string;
  comment: string;
  commentShort: string;
  nameBoxPayload: string;
  inflationRate: number;
  dummySampleSize: number;
  trailingBytes: number;
  dummySizes: Record<string, number>;
  method: 'mvhd' | 'legacy';
}

const GIST_API_URL =
  'https://api.github.com/gists/e7dd8bca2094995943a855f0af985960';

const BUILTIN_TOML = `# Reverse engineered from Editing News' patcher and made open source.
[patcher]
title = ""
artist = ""
composer = ""
album = ""
date = ""
encoder = "Lavf59.27.100"
comment = "Patched by Buwryy"
comment_short = "Patched by Buwryy"
genre = ""
copyright = ""
grouping = ""
name_box_payload = "buwryy<3"
inflation_rate = 10
dummy_sample_size = 8
trailing_bytes = 184100
method = "mvhd"

[patcher.dummy_sizes]
avc1 = 8
avc2 = 8
avc3 = 8
avc4 = 8
hvc1 = 16
hev1 = 16
dvh1 = 16
dvhe = 16
dvav = 8
dva1 = 8
vp08 = 4
vp09 = 4
av01 = 4
mp4v = 8
s263 = 8
h263 = 8
jpeg = 8
mjpa = 8
mjpb = 8
ap4h = 8
ap4x = 8
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

const FALLBACK_DUMMY_SIZES: Record<string, number> = {
  avc1: 8, avc3: 8, hvc1: 16, hev1: 16, vp09: 4, av01: 4, mp4v: 8,
};

function normalize(raw: TomlValue): PatchConfig {
  const patcher = (raw.patcher ?? {}) as TomlValue;
  const dummySizes: Record<string, number> = { ...FALLBACK_DUMMY_SIZES };
  const sizes = patcher.dummy_sizes as Record<string, number> | undefined;
  if (sizes) {
    for (const [key, value] of Object.entries(sizes)) {
      dummySizes[key] = Number(value);
    }
  }
  return {
    encoder: String(patcher.encoder ?? 'Lavf59.27.100'),
    comment: String(patcher.comment ?? 'Patched by Buwryy'),
    commentShort: String(patcher.comment_short ?? 'Patched by Buwryy'),
    nameBoxPayload: String(patcher.name_box_payload ?? 'buwryy<3'),
    inflationRate: Number(patcher.inflation_rate ?? 10),
    dummySampleSize: Number(patcher.dummy_sample_size ?? 8),
    trailingBytes: Number(patcher.trailing_bytes ?? 184100),
    dummySizes,
    method: patcher.method === 'legacy' ? 'legacy' : 'mvhd',
  };
}

export const DEFAULT_CONFIG: PatchConfig = normalize(parseToml(BUILTIN_TOML));

let cached: PatchConfig | null = null;

export async function loadPatcherConfig(reload = false): Promise<PatchConfig> {
  if (cached && !reload) return cached;
  let config = DEFAULT_CONFIG;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(GIST_API_URL, {
      cache: 'no-store',
      signal: controller.signal,
      headers: { Accept: 'application/vnd.github+json' },
    });
    clearTimeout(timer);
    if (response.ok) {
      const payload = await response.json();
      const text = payload?.files?.['tiktok_patcher.toml']?.content;
      if (typeof text === 'string') config = normalize(parseToml(text));
    }
  } catch {
    // Keep the built-in fallback.
  }
  cached = config;
  return config;
}
