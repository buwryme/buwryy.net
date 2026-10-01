import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';
import Footer from '../components/Footer';
import Modal from '../components/Modal';
import PrivacyModal from '../components/PrivacyModal';
import AcknowledgementsModal from '../components/AcknowledgementsModal';
import Toast from '../components/Toast';

interface PatchConfig {
  encoder: string;
  comment: string;
  commentShort: string;
  nameBoxPayload: string;
  inflationRate: number;
  dummySampleSize: number;
  trailingBytes: number;
}

const CODEC_DUMMY_SIZES: Record<string, number> = {
  avc1: 8, avc3: 8,
  hvc1: 16, hev1: 16,
  vp09: 4, av01: 4, mp4v: 8,
};

const DEFAULT_CONFIG: PatchConfig = {
  encoder: 'Lavf59.27.100',
  comment: 'Patched by Buwryme',
  commentShort: 'Patched by Buwryy',
  nameBoxPayload: 'buwryy<3',
  inflationRate: 10,
  dummySampleSize: 8,
  trailingBytes: 184100,
};

export default function TikTokPatcherPage() {
  const [ffmpeg, setFfmpeg] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [config, setConfig] = useState<PatchConfig>(() => {
    const saved = localStorage.getItem('buwryy-patcher-config');
    if (saved) {
      try {
        return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
      } catch {
        return DEFAULT_CONFIG;
      }
    }
    return DEFAULT_CONFIG;
  });
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('buwryy-theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [toast, setToast] = useState({ message: '', visible: false, closing: false, id: 'toast-1', updateKey: 0 });
  const [processedFile, setProcessedFile] = useState<{ data: Uint8Array; name: string } | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [privacyClosing, setPrivacyClosing] = useState(false);
  const [acknowledgementsOpen, setAcknowledgementsOpen] = useState(false);
  const [acknowledgementsClosing, setAcknowledgementsClosing] = useState(false);
  const [nextStepsOpen, setNextStepsOpen] = useState(false);
  const [nextStepsClosing, setNextStepsClosing] = useState(false);
  const toastTimeoutRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('buwryy-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    localStorage.setItem('buwryy-patcher-config', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('buwryy-theme')) {
        setIsDark(e.matches);
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const ffmpegLoadedRef = useRef(false);

  useEffect(() => {
    if (ffmpegLoadedRef.current) return;
    ffmpegLoadedRef.current = true;

    let isMounted = true;

    const loadFFmpeg = async () => {
      try {
        addLog('creating ffmpeg instance...');
        const ffmpegInstance = new FFmpeg();
        addLog('ffmpeg instance created');

        ffmpegInstance.on('log', ({ message }) => {
          if (isMounted) addLog(`[ffmpeg] ${message}`);
        });

        ffmpegInstance.on('progress', ({ progress: p }) => {
          if (isMounted) setProgress(Math.round(p * 100));
        });

        const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm';

        addLog('fetching core.js from CDN...');
        const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
        addLog('core.js fetched, fetching core.wasm...');

        const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');
        addLog('core.wasm fetched, calling ffmpeg.load()...');

        const loadPromise = ffmpegInstance.load({ coreURL, wasmURL });
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('FFmpeg load timeout after 30 seconds')), 30000);
        });

        try {
          await Promise.race([loadPromise, timeoutPromise]);
          addLog('ffmpeg.load() completed successfully');
        } catch (loadError: any) {
          addLog(`ERROR: ffmpeg.load() failed: ${loadError?.message || String(loadError)}`);
          throw loadError;
        }

        setFfmpeg(ffmpegInstance);
        setLoaded(true);
        addLog('ffmpeg ready to use');
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        addLog(`ERROR: ${errorMsg}`);
        console.error('FFmpeg load error:', error);
      }
    };

    loadFFmpeg();
    return () => { isMounted = false; };
  }, []);

  const addLog = (message: string) => {
    setLogs(prev => {
      const newLogs = [...prev.slice(-50), `[${new Date().toLocaleTimeString()}] ${message}`];
      setTimeout(() => {
        if (logsContainerRef.current) {
          logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
        }
      }, 0);
      return newLogs;
    });
  };

  const showToast = (message: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast(prev => ({ ...prev, visible: false, closing: false }));
    setTimeout(() => {
      setToast(prev => ({ ...prev, message, visible: true, closing: false, updateKey: prev.updateKey + 1 }));
      toastTimeoutRef.current = window.setTimeout(() => {
        setToast(prev => ({ ...prev, closing: true }));
        setTimeout(() => {
          setToast(prev => ({ ...prev, message: '', visible: false, closing: false }));
        }, 300);
      }, 3000);
    }, 50);
  };

  const toggleTheme = (theme: 'light' | 'dark') => {
    setIsDark(theme === 'dark');
    document.documentElement.setAttribute('data-theme', theme);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (fileExt !== 'mp4' && fileExt !== 'avi' && fileExt !== 'mov') {
      showToast('unsupported file format - please use mp4, avi, or mov');
      return;
    }
    setSelectedFile(file);
    setProcessedFile(null);
    setLogs([]);
    addLog(`selected: ${file.name}`);
    addLog(`file size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
    showToast('file selected - click patch to start processing');
  };

  const handlePatch = async () => {
    if (!selectedFile || !ffmpeg) return;
    setProcessing(true);
    setProgress(0);
    setLogs([]);
    setProcessedFile(null);

    try {
      addLog(`processing: ${selectedFile.name}`);
      const fileData = await fetchFile(selectedFile);
      addLog(`input file size: ${(fileData.length / 1024 / 1024).toFixed(2)} MB`);
      await ffmpeg.writeFile('input.mp4', fileData);

      const outputName = `output_${Date.now()}.mp4`;
      addLog('remuxing video (no re-encoding)...');

      const heartbeat = setInterval(() => addLog('remuxing in progress...'), 5000);
      try {
        const result = await ffmpeg.exec([
          '-i', 'input.mp4',
          '-c:v', 'copy', '-c:a', 'copy',
          '-movflags', '+faststart',
          '-metadata:s:v', 'handler_name=VideoHandler',
          '-metadata:s:a', 'handler_name=SoundHandler',
          outputName
        ]);
        clearInterval(heartbeat);
        if (result !== 0) throw new Error(`ffmpeg remux failed with code ${result}`);
        addLog('remuxing complete');
      } catch (error) {
        clearInterval(heartbeat);
        throw error;
      }

      addLog('reading output file...');
      const outputData = await ffmpeg.readFile(outputName);
      const outputArray = new Uint8Array(outputData as any);
      addLog(`output file size: ${(outputArray.length / 1024 / 1024).toFixed(2)} MB`);

      if (outputArray.length < 8) throw new Error('output file is too small to be a valid MP4');
      const firstBoxType = String.fromCharCode(outputArray[4], outputArray[5], outputArray[6], outputArray[7]);
      if (firstBoxType !== 'ftyp') throw new Error(`invalid MP4 structure: expected ftyp, got ${firstBoxType}`);

      addLog('patching mp4 structure...');
      const patched = patchMP4(outputArray, config, fileData);
      addLog(`patched file size: ${(patched.length / 1024 / 1024).toFixed(2)} MB`);

      if (patched.length === 0) throw new Error('patched file is empty');

      addLog('processing complete!');
      setProgress(100);

      const outputFileName = `${selectedFile.name.replace(/\.[^/.]+$/, '')}_tiktok.mp4`;
      setProcessedFile({ data: patched, name: outputFileName });

      await ffmpeg.deleteFile('input.mp4');
      await ffmpeg.deleteFile(outputName);
      setNextStepsOpen(true);
    } catch (error: any) {
      addLog(`ERROR: ${error?.message || String(error)}`);
      console.error('Processing error:', error);
      showToast('error processing video - check logs');
    } finally {
      setProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!processedFile) return;
    try {
      const arrayBuffer = processedFile.data.buffer.slice(
        processedFile.data.byteOffset,
        processedFile.data.byteOffset + processedFile.data.byteLength
      ) as ArrayBuffer;
      const blob = new Blob([arrayBuffer], { type: 'video/mp4' });

      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: processedFile.name,
            types: [{ description: 'MP4 Video', accept: { 'video/mp4': ['.mp4'] } }],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          addLog('file saved successfully');
          showToast('file saved successfully!');
          setTimeout(() => {
            setNextStepsClosing(true);
            setTimeout(() => {
              setNextStepsOpen(false);
              setNextStepsClosing(false);
              setProcessedFile(null);
              setSelectedFile(null);
            }, 300);
          }, 500);
          return;
        } catch (err: any) {
          if (err.name === 'AbortError') { addLog('save cancelled by user'); return; }
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = processedFile.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addLog('file saved successfully');
      showToast('file saved successfully!');
      setTimeout(() => {
        setNextStepsClosing(true);
        setTimeout(() => {
          setNextStepsOpen(false);
          setNextStepsClosing(false);
          setProcessedFile(null);
          setSelectedFile(null);
        }, 300);
      }, 500);
    } catch (error: any) {
      addLog(`ERROR saving file: ${error?.message || String(error)}`);
      showToast('error saving file');
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'video/mp4' || file.type === 'video/quicktime') {
        handleFileSelect({ target: { files: [file] } } as any);
      } else {
        addLog('error: please drop a valid video file (MP4 or MOV)');
      }
    }
  };

  // --- MP4 binary helpers ---

  const readU32BE = (data: Uint8Array, offset: number): number =>
    (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];

  const writeU32BE = (data: Uint8Array, offset: number, value: number): void => {
    data[offset] = (value >> 24) & 0xff;
    data[offset + 1] = (value >> 16) & 0xff;
    data[offset + 2] = (value >> 8) & 0xff;
    data[offset + 3] = value & 0xff;
  };

  const readU64BE = (data: Uint8Array, offset: number): bigint => {
    const hi = BigInt(readU32BE(data, offset));
    const lo = BigInt(readU32BE(data, offset + 4));
    return (hi << 32n) | lo;
  };

  const writeU64BE = (data: Uint8Array, offset: number, value: bigint): void => {
    writeU32BE(data, offset, Number((value >> 32n) & 0xFFFFFFFFn));
    writeU32BE(data, offset + 4, Number(value & 0xFFFFFFFFn));
  };

  const boxTypeStr = (type: Uint8Array): string =>
    String.fromCharCode(type[0], type[1], type[2], type[3]);

  const parseBoxes = (data: Uint8Array, start: number, end: number): any[] => {
    const boxes: any[] = [];
    let pos = start;
    while (pos + 8 <= end) {
      const rawSize = readU32BE(data, pos);
      let size = rawSize;
      if (rawSize === 1) {
        if (pos + 16 > end) break;
        const hi = readU32BE(data, pos + 8);
        const lo = readU32BE(data, pos + 12);
        size = (hi << 32) + lo;
      } else if (rawSize === 0) {
        size = end - pos;
      }
      if (size < 8 || pos + size > end) break;
      // store as plain bytes (not a slice view) to avoid unhashable/subarray issues
      const type = new Uint8Array([data[pos + 4], data[pos + 5], data[pos + 6], data[pos + 7]]);
      boxes.push({ offset: pos, size, type, end: pos + size });
      pos += size;
    }
    return boxes;
  };

  const buildBox = (type: Uint8Array, payload: Uint8Array): Uint8Array => {
    const size = 8 + payload.length;
    const box = new Uint8Array(size);
    writeU32BE(box, 0, size);
    box.set(type, 4);
    box.set(payload, 8);
    return box;
  };

  const buildFullBox = (type: Uint8Array, version: number, flags: number, payload: Uint8Array): Uint8Array => {
    const verFlags = new Uint8Array(4);
    writeU32BE(verFlags, 0, (version << 24) | (flags & 0x00ffffff));
    const fullPayload = new Uint8Array(verFlags.length + payload.length);
    fullPayload.set(verFlags, 0);
    fullPayload.set(payload, verFlags.length);
    return buildBox(type, fullPayload);
  };

  const concatUint8Arrays = (arrays: Uint8Array[]): Uint8Array => {
    const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const arr of arrays) {
      result.set(arr, offset);
      offset += arr.length;
    }
    return result;
  };

  const fourcc = (s: string): Uint8Array => new Uint8Array([s.charCodeAt(0), s.charCodeAt(1), s.charCodeAt(2), s.charCodeAt(3)]);

  // --- codec detection ---

  const detectVideoCodec = (data: Uint8Array): string => {
    const boxes = parseBoxes(data, 0, data.length);
    const moov = boxes.find(b => boxTypeStr(b.type) === 'moov');
    if (!moov) return 'avc1';

    const moovChildren = parseBoxes(data, moov.offset + 8, moov.end);
    for (const trak of moovChildren) {
      if (boxTypeStr(trak.type) !== 'trak') continue;
      const trakChildren = parseBoxes(data, trak.offset + 8, trak.end);
      let isVideo = false;
      for (const tc of trakChildren) {
        if (boxTypeStr(tc.type) === 'mdia') {
          const mdiaChildren = parseBoxes(data, tc.offset + 8, tc.end);
          for (const mc of mdiaChildren) {
            if (boxTypeStr(mc.type) === 'hdlr') {
              const ht = String.fromCharCode(data[mc.offset + 16], data[mc.offset + 17], data[mc.offset + 18], data[mc.offset + 19]);
              if (ht === 'vide') isVideo = true;
            }
          }
        }
      }
      if (!isVideo) continue;
      for (const tc of trakChildren) {
        if (boxTypeStr(tc.type) !== 'mdia') continue;
        const mdiaChildren = parseBoxes(data, tc.offset + 8, tc.end);
        for (const mc of mdiaChildren) {
          if (boxTypeStr(mc.type) !== 'minf') continue;
          const minfChildren = parseBoxes(data, mc.offset + 8, mc.end);
          for (const mi of minfChildren) {
            if (boxTypeStr(mi.type) !== 'stbl') continue;
            const stblChildren = parseBoxes(data, mi.offset + 8, mi.end);
            for (const sc of stblChildren) {
              if (boxTypeStr(sc.type) !== 'stsd') continue;
              const entries = parseBoxes(data, sc.offset + 8, sc.end);
              if (entries.length > 0) return boxTypeStr(entries[0].type);
            }
          }
        }
      }
    }
    return 'avc1';
  };

  // --- audio bitrate spoofing ---

  const extractMp4aBitrates = (data: Uint8Array, start: number, end: number, results: [number, number][]): void => {
    let pos = start;
    while (pos + 8 <= end) {
      const sz = readU32BE(data, pos);
      if (sz < 8 || pos + sz > end) break;
      const typ = boxTypeStr(data.slice(pos + 4, pos + 8));
      if (typ === 'mp4a' && sz >= 36) {
        let cpos = pos + 36;
        while (cpos + 8 <= pos + sz) {
          const csz = readU32BE(data, cpos);
          if (csz < 8 || cpos + csz > pos + sz) break;
          const ctyp = boxTypeStr(data.slice(cpos + 4, cpos + 8));
          if (ctyp === 'esds' && csz >= 30) {
            const maxBr = readU32BE(data, cpos + 22);
            const avgBr = readU32BE(data, cpos + 26);
            results.push([avgBr, maxBr]);
          }
          cpos += csz;
        }
      } else if (['moov', 'trak', 'mdia', 'minf', 'stbl', 'stsd'].includes(typ)) {
        extractMp4aBitrates(data, pos + 8, pos + sz, results);
      }
      pos += sz;
    }
  };

  const applyMp4aBitrates = (data: Uint8Array, start: number, end: number, avg: number, mx: number): number => {
    let count = 0;
    let pos = start;
    while (pos + 8 <= end) {
      const sz = readU32BE(data, pos);
      if (sz < 8 || pos + sz > end) break;
      const typ = boxTypeStr(data.slice(pos + 4, pos + 8));
      if (typ === 'mp4a' && sz >= 36) {
        let cpos = pos + 36;
        while (cpos + 8 <= pos + sz) {
          const csz = readU32BE(data, cpos);
          if (csz < 8 || cpos + csz > pos + sz) break;
          const ctyp = boxTypeStr(data.slice(cpos + 4, cpos + 8));
          if (ctyp === 'esds' && csz >= 30) {
            writeU32BE(data, cpos + 22, mx);
            writeU32BE(data, cpos + 26, avg);
            count++;
          } else if (ctyp === 'btrt' && csz >= 20) {
            writeU32BE(data, cpos + 12, avg);
            writeU32BE(data, cpos + 16, mx);
          }
          cpos += csz;
        }
      } else if (['moov', 'trak', 'mdia', 'minf', 'stbl', 'stsd'].includes(typ)) {
        count += applyMp4aBitrates(data, pos + 8, pos + sz, avg, mx);
      }
      pos += sz;
    }
    return count;
  };

  const spoofAudioBitrate = (data: Uint8Array, sourceData: Uint8Array): void => {
    const srcBoxes = parseBoxes(sourceData, 0, sourceData.length);
    const srcMoov = srcBoxes.find(b => boxTypeStr(b.type) === 'moov');
    if (!srcMoov) return;
    const srcBitrates: [number, number][] = [];
    extractMp4aBitrates(sourceData, srcMoov.offset + 8, srcMoov.end, srcBitrates);
    if (srcBitrates.length === 0) return;
    const [srcAvg, srcMax] = srcBitrates[0];

    const tgtBoxes = parseBoxes(data, 0, data.length);
    const tgtMoov = tgtBoxes.find(b => boxTypeStr(b.type) === 'moov');
    if (!tgtMoov) return;
    const count = applyMp4aBitrates(data, tgtMoov.offset + 8, tgtMoov.end, srcAvg, srcMax);
    addLog(`spoofed audio bitrate on ${count} mp4a entries (avg=${srcAvg}, max=${srcMax})`);
  };

  // --- mvhd v1 upgrade ---

  const upgradeMvhdToV1 = (mvhd: Uint8Array): Uint8Array => {
    const ver = mvhd[8];
    const timescale = ver === 0 ? readU32BE(mvhd, 20) : readU32BE(mvhd, 28);
    const ntidOff = ver === 0 ? 96 : 108;
    const ntid = readU32BE(mvhd, ntidOff);

    const body = new Uint8Array(112);
    body[0] = 1; // version=1, flags=0
    writeU32BE(body, 20, timescale);
    // duration = 0xFFFFFFFFFFFFFFFF
    writeU32BE(body, 24, 0xFFFFFFFF);
    writeU32BE(body, 28, 0xFFFFFFFF);
    writeU32BE(body, 32, 0x00010000); // rate
    body[36] = 0x01; body[37] = 0x00; // volume
    writeU32BE(body, 44, 0x00010000); // matrix[0]
    writeU32BE(body, 60, 0x00010000); // matrix[4]
    writeU32BE(body, 76, 0x40000000); // matrix[8]
    writeU32BE(body, 108, 5); // nexttrackid

    return buildBox(fourcc('mvhd'), body);
  };

  // --- elst +1 ---

  const patchElstPlusOne = (edtsData: Uint8Array): Uint8Array => {
    const children = parseBoxes(edtsData, 8, edtsData.length);
    const newChildren: Uint8Array[] = [];
    for (const c of children) {
      if (boxTypeStr(c.type) === 'elst') {
        const elst = new Uint8Array(edtsData.slice(c.offset, c.end));
        const ver = elst[8];
        const count = readU32BE(elst, 12);
        if (count > 0) {
          const durOff = ver === 0 ? 16 : 20;
          const dur = readU32BE(elst, durOff);
          writeU32BE(elst, durOff, dur + 1);
          addLog(`elst segment_duration: ${dur} → ${dur + 1}`);
        }
        newChildren.push(elst);
      } else {
        newChildren.push(edtsData.slice(c.offset, c.end));
      }
    }
    return buildBox(fourcc('edts'), concatUint8Arrays(newChildren));
  };

  // --- main patch pipeline ---

  const patchMP4 = (data: Uint8Array, cfg: PatchConfig, sourceData: Uint8Array): Uint8Array => {
    const buffer = new Uint8Array(data);

    // detect codec and override dummy size
    const videoCodec = detectVideoCodec(buffer);
    const autoDummy = CODEC_DUMMY_SIZES[videoCodec] ?? 8;
    addLog(`detected codec: ${videoCodec} (dummy=${autoDummy})`);
    const effectiveCfg = { ...cfg, dummySampleSize: autoDummy };

    addLog('[1/7] parsing box structure...');
    const boxes = parseBoxes(buffer, 0, buffer.length);

    let ftypBox: any = null, moovBox: any = null, mdatBox: any = null;
    for (const box of boxes) {
      const t = boxTypeStr(box.type);
      if (t === 'ftyp') ftypBox = box;
      else if (t === 'moov') moovBox = box;
      else if (t === 'mdat') mdatBox = box;
    }
    if (!moovBox || !mdatBox) throw new Error('missing moov or mdat box');

    addLog('[2/7] reconstructing layout (ftyp → moov → mdat)...');
    const ftypData = ftypBox ? buffer.slice(ftypBox.offset, ftypBox.end) : new Uint8Array(0);
    const moovData = new Uint8Array(buffer.slice(moovBox.offset, moovBox.end));
    const mdatHeaderSize = readU32BE(buffer, mdatBox.offset) === 1 ? 16 : 8;
    const mdatPayload = buffer.slice(mdatBox.offset + mdatHeaderSize, mdatBox.end);
    const mdatData = buildBox(fourcc('mdat'), mdatPayload);

    addLog('[3/7] patching moov...');
    const patchedMoov = patchMoov(moovData, effectiveCfg);

    addLog('[4/7] assembling output...');
    const output = new Uint8Array(ftypData.length + patchedMoov.length + mdatData.length);
    output.set(ftypData, 0);
    output.set(patchedMoov, ftypData.length);
    output.set(mdatData, ftypData.length + patchedMoov.length);

    addLog('[5/7] fixing chunk offsets...');
    const newMdatOffset = ftypData.length + patchedMoov.length + 8;
    const oldMdatPayloadOffset = mdatBox.offset + mdatHeaderSize;
    const offsetDelta = newMdatOffset - oldMdatPayloadOffset;
    if (offsetDelta !== 0) {
      fixChunkOffsets(output, offsetDelta);
      addLog(`shifted offsets by ${offsetDelta}`);
    }

    addLog('[6/7] post-patch fixes...');
    zeroMp4aSamplerate(output);
    spoofAudioBitrate(output, sourceData);
    stripFreeBoxes(output);

    addLog('[7/7] appending trailing data...');
    const garbage = buildTrailingGarbage(effectiveCfg.trailingBytes);
    const finalOutput = new Uint8Array(output.length + garbage.length);
    finalOutput.set(output, 0);
    finalOutput.set(garbage, output.length);

    addLog(`patched successfully (${buffer.length} → ${finalOutput.length} bytes)`);
    return finalOutput;
  };

  const patchMoov = (moovData: Uint8Array, cfg: PatchConfig): Uint8Array => {
    const children = parseBoxes(moovData, 8, moovData.length);
    const newChildren: Uint8Array[] = [];

    let videoTrakIdx = -1, audioTrakIdx = -1, tmcdTrakIdx = -1;
    for (let i = 0; i < children.length; i++) {
      if (boxTypeStr(children[i].type) !== 'trak') continue;
      const trakChildren = parseBoxes(moovData, children[i].offset + 8, children[i].end);
      for (const tc of trakChildren) {
        if (boxTypeStr(tc.type) !== 'mdia') continue;
        const mdiaChildren = parseBoxes(moovData, tc.offset + 8, tc.end);
        for (const mc of mdiaChildren) {
          if (boxTypeStr(mc.type) !== 'hdlr') continue;
          const ht = String.fromCharCode(moovData[mc.offset + 16], moovData[mc.offset + 17], moovData[mc.offset + 18], moovData[mc.offset + 19]);
          if (ht === 'vide') videoTrakIdx = i;
          else if (ht === 'soun') audioTrakIdx = i;
          else if (ht === 'tmcd') tmcdTrakIdx = i;
        }
      }
    }

    addLog(`video trak: ${videoTrakIdx}, audio trak: ${audioTrakIdx}, tmcd trak: ${tmcdTrakIdx}`);

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const type = boxTypeStr(child.type);

      if (type === 'mvhd') {
        const mvhd = new Uint8Array(moovData.slice(child.offset, child.end));
        newChildren.push(upgradeMvhdToV1(mvhd));
      } else if (type === 'trak') {
        const trakData = new Uint8Array(moovData.slice(child.offset, child.end));
        const isTmcd = i === tmcdTrakIdx;
        const isAudio = i === audioTrakIdx;
        const isVideo = i === videoTrakIdx;

        if (isAudio) {
          const primary = patchTrak(trakData, isVideo, true, false, 2, false, cfg);
          newChildren.push(primary);
          addLog('duplicating audio track for inflation...');
          const clone = new Uint8Array(trakData);
          const clonePatched = patchTrak(clone, false, true, true, 4, true, cfg);
          newChildren.push(clonePatched);
          addLog(`clone appended: size=${clonePatched.length}`);
        } else if (isTmcd) {
          const patched = patchTrak(trakData, false, false, false, 3, false, cfg);
          newChildren.push(patched);
        } else {
          const patched = patchTrak(trakData, isVideo, false, false, 1, false, cfg);
          newChildren.push(patched);
        }
      } else if (type === 'udta') {
        continue;
      } else {
        newChildren.push(moovData.slice(child.offset, child.end));
      }
    }

    const combinedUdta = buildCombinedUdta(cfg);
    newChildren.push(combinedUdta);
    addLog(`injected dual metadata (${combinedUdta.length} bytes)`);

    const moovPayload = concatUint8Arrays(newChildren);
    return buildBox(fourcc('moov'), moovPayload);
  };

  const patchTrak = (trakData: Uint8Array, isVideo: boolean, isAudio: boolean, inflate: boolean, trackId: number, isClone: boolean, cfg: PatchConfig): Uint8Array => {
    const trakChildren = parseBoxes(trakData, 8, trakData.length);
    const newChildren: Uint8Array[] = [];

    for (const tc of trakChildren) {
      const tcType = boxTypeStr(tc.type);

      if (tcType === 'tkhd') {
        const tkhd = new Uint8Array(trakData.slice(tc.offset, tc.end));
        const ver = tkhd[8];
        if (ver === 0) {
          writeU32BE(tkhd, 12, 0);
          writeU32BE(tkhd, 16, 0);
        } else {
          writeU64BE(tkhd, 12, 0n);
          writeU64BE(tkhd, 20, 0n);
        }
        if (trackId > 0) {
          const tidOff = ver === 0 ? 20 : 28;
          writeU32BE(tkhd, tidOff, trackId);
        }
        newChildren.push(tkhd);
      } else if (tcType === 'tref') {
        if (isClone) continue;
        newChildren.push(trakData.slice(tc.offset, tc.end));
      } else if (tcType === 'edts') {
        if (isClone) continue;
        if (isVideo) {
          const edtsData = new Uint8Array(trakData.slice(tc.offset, tc.end));
          newChildren.push(patchElstPlusOne(edtsData));
        } else {
          newChildren.push(trakData.slice(tc.offset, tc.end));
        }
      } else if (tcType === 'mdia') {
        const mdiaData = new Uint8Array(trakData.slice(tc.offset, tc.end));
        newChildren.push(patchMdia(mdiaData, isVideo, isAudio, inflate, cfg));
      } else {
        newChildren.push(trakData.slice(tc.offset, tc.end));
      }
    }

    return buildBox(fourcc('trak'), concatUint8Arrays(newChildren));
  };

  const patchMdia = (mdiaData: Uint8Array, isVideo: boolean, isAudio: boolean, inflate: boolean, cfg: PatchConfig): Uint8Array => {
    const mdiaChildren = parseBoxes(mdiaData, 8, mdiaData.length);
    const newChildren: Uint8Array[] = [];

    for (const mc of mdiaChildren) {
      const mcType = boxTypeStr(mc.type);
      if (mcType === 'mdhd') {
        const mdhd = new Uint8Array(mdiaData.slice(mc.offset, mc.end));
        const ver = mdhd[8];
        if (ver === 0) {
          writeU32BE(mdhd, 12, 0);
          writeU32BE(mdhd, 16, 0);
        } else {
          writeU64BE(mdhd, 12, 0n);
          writeU64BE(mdhd, 20, 0n);
        }
        newChildren.push(mdhd);
      } else if (mcType === 'hdlr') {
        if (isVideo) newChildren.push(buildHdlr(fourcc('vide'), 'VideoHandler'));
        else if (isAudio) newChildren.push(buildHdlr(fourcc('soun'), 'SoundHandler'));
        else newChildren.push(buildHdlr(fourcc('vide'), ''));
      } else if (mcType === 'minf') {
        const minfData = new Uint8Array(mdiaData.slice(mc.offset, mc.end));
        newChildren.push(patchMinf(minfData, isAudio, inflate, cfg));
      } else {
        newChildren.push(mdiaData.slice(mc.offset, mc.end));
      }
    }

    return buildBox(fourcc('mdia'), concatUint8Arrays(newChildren));
  };

  const patchMinf = (minfData: Uint8Array, isAudio: boolean, inflate: boolean, cfg: PatchConfig): Uint8Array => {
    const minfChildren = parseBoxes(minfData, 8, minfData.length);
    const newChildren: Uint8Array[] = [];
    for (const mc of minfChildren) {
      const mcType = boxTypeStr(mc.type);
      if (mcType === 'nmhd') continue;
      else if (mcType === 'stbl' && isAudio && inflate) {
        const stblData = new Uint8Array(minfData.slice(mc.offset, mc.end));
        newChildren.push(patchStbl(stblData, cfg));
      } else {
        newChildren.push(minfData.slice(mc.offset, mc.end));
      }
    }
    return buildBox(fourcc('minf'), concatUint8Arrays(newChildren));
  };

  const patchStbl = (stblData: Uint8Array, cfg: PatchConfig): Uint8Array => {
    const stblChildren = parseBoxes(stblData, 8, stblData.length);
    let stszBox: any = null, sttsBox: any = null, stscBox: any = null, stcoBox: any = null;
    for (const sc of stblChildren) {
      const t = boxTypeStr(sc.type);
      if (t === 'stsz') stszBox = sc;
      else if (t === 'stts') sttsBox = sc;
      else if (t === 'stsc') stscBox = sc;
      else if (t === 'stco') stcoBox = sc;
    }
    if (!stszBox || !sttsBox || !stscBox || !stcoBox) return stblData;

    const inflateFactor = cfg.inflationRate;
    const dummySize = cfg.dummySampleSize;

    const stszPayload = stblData.slice(stszBox.offset + 12, stszBox.end);
    if (stszPayload.length < 8) return stblData;
    const uniformSize = readU32BE(stszPayload, 0);
    const sampleCount = readU32BE(stszPayload, 4);

    const originalSizes: number[] = [];
    if (uniformSize === 0) {
      let pos = 8;
      for (let i = 0; i < sampleCount; i++) {
        if (pos + 4 > stszPayload.length) break;
        originalSizes.push(readU32BE(stszPayload, pos));
        pos += 4;
      }
    } else {
      for (let i = 0; i < sampleCount; i++) originalSizes.push(uniformSize);
    }
    if (originalSizes.length === 0) return stblData;

    const realCount = originalSizes.length;
    const extraCount = realCount * (inflateFactor - 1);

    const stscPayload = stblData.slice(stscBox.offset + 12, stscBox.end);
    if (stscPayload.length < 4) return stblData;
    const stscEntryCount = readU32BE(stscPayload, 0);
    const stscEntries: [number, number, number][] = [];
    let pos = 4;
    for (let i = 0; i < stscEntryCount; i++) {
      if (pos + 12 > stscPayload.length) break;
      stscEntries.push([readU32BE(stscPayload, pos), readU32BE(stscPayload, pos + 4), readU32BE(stscPayload, pos + 8)]);
      pos += 12;
    }
    const lastSdi = stscEntries.length > 0 ? stscEntries[stscEntries.length - 1][2] : 1;

    const stcoPayload = stblData.slice(stcoBox.offset + 12, stcoBox.end);
    if (stcoPayload.length < 4) return stblData;
    const stcoEntryCount = readU32BE(stcoPayload, 0);
    const stcoOffsets: number[] = [];
    pos = 4;
    for (let i = 0; i < stcoEntryCount; i++) {
      if (pos + 4 > stcoPayload.length) break;
      stcoOffsets.push(readU32BE(stcoPayload, pos));
      pos += 4;
    }
    if (stcoOffsets.length === 0) return stblData;

    const origChunks = stcoOffsets.length;
    let adjustedStscEntries = stscEntries;
    let adjustedStcoOffsets = stcoOffsets;

    const computedTotal = stscEntries.reduce((total, e, i) => {
      const nfc = i + 1 < stscEntries.length ? stscEntries[i + 1][0] : origChunks + 1;
      return total + (nfc > e[0] ? (nfc - e[0]) * e[1] : 0);
    }, 0);

    if (stscEntries.length === 0 || computedTotal !== realCount) {
      adjustedStscEntries = [[1, realCount, lastSdi]];
      adjustedStcoOffsets = [stcoOffsets[0]];
    }

    const firstDummyOffset = adjustedStcoOffsets[0];
    const newSizes = [...originalSizes, ...Array(extraCount).fill(dummySize)];
    const newCount = newSizes.length;

    const newStszPayload = new Uint8Array(8 + newCount * 4);
    writeU32BE(newStszPayload, 0, 0);
    writeU32BE(newStszPayload, 4, newCount);
    for (let i = 0; i < newCount; i++) writeU32BE(newStszPayload, 8 + i * 4, newSizes[i]);
    const newStsz = buildFullBox(fourcc('stsz'), 0, 0, newStszPayload);
    addLog(`INFLATE: factor=${inflateFactor}, dummy=${dummySize}, real=${realCount}, extra=${extraCount}, new=${newCount}`);

    const origSttsPay = stblData.slice(sttsBox.offset + 12, sttsBox.end);
    const origTc = origSttsPay.length >= 4 ? readU32BE(origSttsPay, 0) : 0;
    const extPayload = new Uint8Array(origSttsPay.length + 8);
    writeU32BE(extPayload, 0, origTc + 1);
    extPayload.set(origSttsPay.slice(4), 4);
    writeU32BE(extPayload, origSttsPay.length, extraCount);
    writeU32BE(extPayload, origSttsPay.length + 4, 1);
    const newStts = buildFullBox(fourcc('stts'), 0, 0, extPayload);

    const newStscEntries = [...adjustedStscEntries];
    if (extraCount > 0) newStscEntries.push([adjustedStcoOffsets.length + 1, extraCount, lastSdi]);
    const newStscPayload = new Uint8Array(4 + newStscEntries.length * 12);
    writeU32BE(newStscPayload, 0, newStscEntries.length);
    for (let i = 0; i < newStscEntries.length; i++) {
      writeU32BE(newStscPayload, 4 + i * 12, newStscEntries[i][0]);
      writeU32BE(newStscPayload, 4 + i * 12 + 4, newStscEntries[i][1]);
      writeU32BE(newStscPayload, 4 + i * 12 + 8, newStscEntries[i][2]);
    }
    const newStsc = buildFullBox(fourcc('stsc'), 0, 0, newStscPayload);

    const newStcoOffsets = [...adjustedStcoOffsets];
    if (extraCount > 0) newStcoOffsets.push(firstDummyOffset);
    const newStcoPayload = new Uint8Array(4 + newStcoOffsets.length * 4);
    writeU32BE(newStcoPayload, 0, newStcoOffsets.length);
    for (let i = 0; i < newStcoOffsets.length; i++) writeU32BE(newStcoPayload, 4 + i * 4, newStcoOffsets[i]);
    const newStco = buildFullBox(fourcc('stco'), 0, 0, newStcoPayload);

    const newChildren: Uint8Array[] = [];
    for (const sc of stblChildren) {
      const t = boxTypeStr(sc.type);
      if (t === 'stsz') newChildren.push(newStsz);
      else if (t === 'stts') newChildren.push(newStts);
      else if (t === 'stsc') newChildren.push(newStsc);
      else if (t === 'stco') newChildren.push(newStco);
      else newChildren.push(stblData.slice(sc.offset, sc.end));
    }
    return buildBox(fourcc('stbl'), concatUint8Arrays(newChildren));
  };

  const buildHdlr = (handlerType: Uint8Array, name: string): Uint8Array => {
    const nameBytes = new TextEncoder().encode(name);
    const payload = new Uint8Array(4 + 4 + 12 + nameBytes.length + 1);
    payload.set(handlerType, 4);
    payload.set(nameBytes, 20);
    payload[20 + nameBytes.length] = 0;
    return buildFullBox(fourcc('hdlr'), 0, 0, payload);
  };

  const buildIlstEntry = (tag: Uint8Array, value: Uint8Array): Uint8Array => {
    const dataPayload = new Uint8Array(8 + value.length);
    writeU32BE(dataPayload, 0, 1);
    writeU32BE(dataPayload, 4, 0);
    dataPayload.set(value, 8);
    return buildBox(tag, buildBox(fourcc('data'), dataPayload));
  };

  const buildCombinedUdta = (cfg: PatchConfig): Uint8Array => {
    const enc = new TextEncoder();
    const ilst1Entries: Uint8Array[] = [];
    const tagMap: [Uint8Array, string][] = [
      [new Uint8Array([0xa9, 0x6e, 0x61, 0x6d]), cfg.encoder ? '' : ''], // placeholder
      [fourcc('\xa9nam'), ''], [fourcc('\xa9ART'), ''], [fourcc('\xa9wrt'), ''],
      [fourcc('\xa9alb'), ''], [fourcc('\xa9day'), ''], [fourcc('\xa9too'), cfg.encoder || ''],
      [fourcc('\xa9cmt'), cfg.comment || ''], [fourcc('\xa9gen'), ''],
      [fourcc('cprt'), ''], [fourcc('\xa9grp'), ''],
    ];
    // rebuild properly with actual values
    const realTagMap: [Uint8Array, string][] = [
      [new Uint8Array([0xa9, 0x6e, 0x61, 0x6d]), ''], // ©nam — title not exposed in web config
      [new Uint8Array([0xa9, 0x41, 0x52, 0x54]), ''], // ©ART
      [new Uint8Array([0xa9, 0x77, 0x72, 0x74]), ''], // ©wrt
      [new Uint8Array([0xa9, 0x61, 0x6c, 0x62]), ''], // ©alb
      [new Uint8Array([0xa9, 0x64, 0x61, 0x79]), ''], // ©day
      [new Uint8Array([0xa9, 0x74, 0x6f, 0x6f]), cfg.encoder || ''], // ©too
      [new Uint8Array([0xa9, 0x63, 0x6d, 0x74]), cfg.comment || ''], // ©cmt
      [new Uint8Array([0xa9, 0x67, 0x65, 0x6e]), ''], // ©gen
      [new Uint8Array([0x63, 0x70, 0x72, 0x74]), ''], // cprt
      [new Uint8Array([0xa9, 0x67, 0x72, 0x70]), ''], // ©grp
    ];
    for (const [tag, val] of realTagMap) {
      if (val) ilst1Entries.push(buildIlstEntry(tag, enc.encode(val)));
    }

    const ilst1 = buildBox(fourcc('ilst'), concatUint8Arrays(ilst1Entries));
    const hdlr1Payload = new Uint8Array(4 + 4 + 12 + 21);
    hdlr1Payload.set([0x6d, 0x64, 0x69, 0x72], 4);
    hdlr1Payload.set([0x61, 0x70, 0x70, 0x6c], 20);
    const hdlr1 = buildFullBox(fourcc('hdlr'), 0, 0, hdlr1Payload);
    const meta1Inner = concatUint8Arrays([hdlr1, ilst1]);
    const meta1Payload = new Uint8Array(4 + meta1Inner.length);
    meta1Payload.set(meta1Inner, 4);
    const meta1 = buildFullBox(fourcc('meta'), 0, 375, meta1Payload);

    const hdlr2Payload = new Uint8Array(4 + 4 + 12 + 13);
    hdlr2Payload.set([0x6d, 0x64, 0x69, 0x72], 4);
    const hdlr2 = buildFullBox(fourcc('hdlr'), 0, 0, hdlr2Payload);

    let nameBox: Uint8Array = new Uint8Array(0);
    if (cfg.nameBoxPayload) {
      nameBox = buildBox(fourcc('name'), enc.encode(cfg.nameBoxPayload));
    }

    const ilst2Entries: Uint8Array[] = [];
    if (cfg.commentShort) {
      ilst2Entries.push(buildIlstEntry(new Uint8Array([0xa9, 0x63, 0x6d, 0x74]), enc.encode(cfg.commentShort)));
    }
    const ilst2 = buildBox(fourcc('ilst'), concatUint8Arrays(ilst2Entries));
    const meta2Inner = concatUint8Arrays([hdlr2, nameBox, ilst2]);
    const meta2Payload = new Uint8Array(4 + meta2Inner.length);
    meta2Payload.set(meta2Inner, 4);
    const meta2 = buildFullBox(fourcc('meta'), 0, 0, meta2Payload);

    return buildBox(fourcc('udta'), concatUint8Arrays([meta1, meta2]));
  };

  const buildTrailingGarbage = (size: number): Uint8Array => {
    const garbage = new Uint8Array(size);
    const pattern = new Uint8Array([0x00, 0x00, 0x00, 0x04]);
    for (let i = 0; i + 4 <= size; i += 4) garbage.set(pattern, i);
    return garbage;
  };

  const fixChunkOffsets = (data: Uint8Array, delta: number): void => {
    const topBoxes = parseBoxes(data, 0, data.length);
    for (const box of topBoxes) {
      if (boxTypeStr(box.type) === 'moov') fixOffsetsRecursive(data, box.offset + 8, box.end, delta);
    }
  };

  const fixOffsetsRecursive = (data: Uint8Array, start: number, end: number, delta: number): void => {
    let pos = start;
    while (pos + 8 <= end) {
      const sz = readU32BE(data, pos);
      if (sz < 8 || pos + sz > end) break;
      const typ = boxTypeStr(data.slice(pos + 4, pos + 8));
      if (typ === 'stco') {
        const cnt = readU32BE(data, pos + 12);
        for (let i = 0; i < cnt; i++) {
          const v = readU32BE(data, pos + 16 + i * 4);
          if (v > 0) writeU32BE(data, pos + 16 + i * 4, v + delta);
        }
      } else if (typ === 'co64') {
        const cnt = readU32BE(data, pos + 12);
        for (let i = 0; i < cnt; i++) {
          const hi = readU32BE(data, pos + 16 + i * 8);
          const lo = readU32BE(data, pos + 20 + i * 8);
          let v = (hi << 32) + lo;
          if (v > 0) {
            v += delta;
            writeU32BE(data, pos + 16 + i * 8, (v >> 32) & 0xFFFFFFFF);
            writeU32BE(data, pos + 20 + i * 8, v & 0xFFFFFFFF);
          }
        }
      } else if (['moov', 'trak', 'mdia', 'minf', 'stbl'].includes(typ)) {
        fixOffsetsRecursive(data, pos + 8, pos + sz, delta);
      }
      pos += sz;
    }
  };

  const zeroMp4aSamplerate = (data: Uint8Array): void => {
    const topBoxes = parseBoxes(data, 0, data.length);
    const moov = topBoxes.find(b => boxTypeStr(b.type) === 'moov');
    if (!moov) return;
    zeroMp4aRecursive(data, moov.offset + 8, moov.end);
  };

  const zeroMp4aRecursive = (data: Uint8Array, start: number, end: number): void => {
    let pos = start;
    while (pos + 8 <= end) {
      const sz = readU32BE(data, pos);
      if (sz < 8 || pos + sz > end) break;
      const typ = boxTypeStr(data.slice(pos + 4, pos + 8));
      if (typ === 'mp4a' && sz >= 36) {
        writeU32BE(data, pos + 28, 0);
      } else if (['moov', 'trak', 'mdia', 'minf', 'stbl', 'stsd'].includes(typ)) {
        zeroMp4aRecursive(data, pos + 8, pos + sz);
      }
      pos += sz;
    }
  };

  const stripFreeBoxes = (data: Uint8Array): void => {
    const topBoxes = parseBoxes(data, 0, data.length);
    const keepRanges: [number, number][] = [];
    for (const box of topBoxes) {
      const t = boxTypeStr(box.type);
      if (t !== 'free' && t !== 'skip') keepRanges.push([box.offset, box.end]);
    }
    if (keepRanges.length === topBoxes.length) return;
    let writePos = 0;
    for (const [start, end] of keepRanges) {
      data.copyWithin(writePos, start, end);
      writePos += end - start;
    }
  };

  return (
    <>
      <div style={{
        minHeight: '100vh',
        background: 'var(--md-background)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
          <div className="blob-1" style={{
            position: 'absolute', top: '-20%', right: '-15%', width: '800px', height: '800px',
            background: `radial-gradient(circle at center, ${isDark ? 'var(--blob-color-1)' : 'var(--md-primary-container)'} 0%, transparent 70%)`,
            opacity: isDark ? 'var(--blob-opacity)' : '0.3', filter: 'blur(40px)',
          }} />
          <div className="blob-2" style={{
            position: 'absolute', bottom: '-25%', left: '-20%', width: '700px', height: '700px',
            background: `radial-gradient(circle at center, ${isDark ? 'var(--blob-color-2)' : 'var(--md-secondary-container)'} 0%, transparent 70%)`,
            opacity: isDark ? 'var(--blob-opacity-secondary)' : '0.25', filter: 'blur(35px)',
          }} />
        </div>
        <div className="page-shell">
          <header className="page-header">
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--md-primary)' }}>arrow_back</span>
              <span className="m3-title-large" style={{ color: 'var(--md-on-surface)' }}>back</span>
            </Link>
            <div className="theme-toggle" style={{
              display: 'inline-flex', borderRadius: 'var(--md-shape-full)',
              background: 'var(--md-surface-container)', padding: '4px', boxShadow: 'var(--md-elevation-1)',
            }}>
              <button onClick={() => toggleTheme('light')} style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '10px 20px',
                borderRadius: 'var(--md-shape-full)', background: !isDark ? 'var(--md-primary)' : 'transparent',
                color: !isDark ? 'var(--md-on-primary)' : 'var(--md-on-surface)', border: 'none', cursor: 'pointer',
                transition: 'all 0.3s var(--md-motion-spring-bouncy)',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>light_mode</span>
              </button>
              <button onClick={() => toggleTheme('dark')} style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '10px 20px',
                borderRadius: 'var(--md-shape-full)', background: isDark ? 'var(--md-primary)' : 'transparent',
                color: isDark ? 'var(--md-on-primary)' : 'var(--md-on-surface)', border: 'none', cursor: 'pointer',
                transition: 'all 0.3s var(--md-motion-spring-bouncy)',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>dark_mode</span>
              </button>
            </div>
          </header>

          <section style={{ marginBottom: '48px' }}>
            <div className="page-title-row">
              <div style={{
                width: '64px', height: '64px', borderRadius: 'var(--md-shape-large)',
                background: 'var(--md-primary-container)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', overflow: 'hidden', flexShrink: 0,
              }}>
                <img src="/assets/tikutils.svg" alt="TikTok" style={{ width: '64px', height: '64px' }} />
              </div>
              <div className="page-title-text">
                <h1 className="m3-headline-large" style={{ color: 'var(--md-on-surface)', margin: 0 }}>tiktok patcher</h1>
                <p className="m3-body-medium" style={{ color: 'var(--md-on-surface-variant)', margin: 0 }}>
                  patch videos for lossless tiktok uploads
                </p>
                <p className="m3-body-small" style={{ color: 'var(--md-outline)', margin: '4px 0 0 0', fontSize: '12px' }}>
                  derived from <Link to="https://github.com/buwryme/tikutils" style={{ color: 'var(--md-primary)', textDecoration: 'none' }} target="_blank" rel="noopener noreferrer">TikUtils</Link>.<br />
                  runs fully locally!
                </p>
              </div>
              {!loaded ? (
                <div className="page-title-status" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="m3-circular-progress" style={{ width: '20px', height: '20px' }} />
                  <span className="m3-body-medium">loading ffmpeg...</span>
                </div>
              ) : (
                <div className="page-title-status" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--md-primary)' }}>check_circle</span>
                  <span className="m3-body-medium">ready to patch</span>
                </div>
              )}
            </div>

            <div className="m3-card-elevated" style={{ marginBottom: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <h2 className="m3-title-large" style={{ margin: 0 }}>process video</h2>
              </div>
              <input ref={fileInputRef} type="file" accept="video/mp4,video/quicktime" onChange={handleFileSelect} style={{ display: 'none' }} disabled={!loaded || processing} />
              <div
                onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                onClick={() => !processing && !selectedFile && loaded && fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${isDragging ? 'var(--md-primary)' : selectedFile ? 'var(--md-primary)' : 'var(--md-outline-variant)'}`,
                  borderRadius: 'var(--md-shape-large)', padding: selectedFile ? '24px' : '48px 24px', textAlign: 'center',
                  cursor: !processing && !selectedFile && loaded ? 'pointer' : 'default',
                  background: isDragging ? 'var(--md-primary-container)' : selectedFile ? 'var(--md-primary-container)' : 'var(--md-surface-container-low)',
                  transition: 'all 0.4s var(--md-motion-spring-bouncy)', opacity: !loaded || processing ? 0.5 : 1, position: 'relative',
                }}
              >
                {selectedFile && !processing && (
                  <button onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setProcessedFile(null); }} style={{
                    position: 'absolute', top: '12px', right: '12px', width: '32px', height: '32px', borderRadius: '50%',
                    background: 'var(--md-error-container)', border: 'none', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s var(--md-motion-spring-bouncy)',
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1) rotate(90deg)'; e.currentTarget.style.background = 'var(--md-error)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1) rotate(0deg)'; e.currentTarget.style.background = 'var(--md-error-container)'; }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--md-on-error-container)' }}>close</span>
                  </button>
                )}
                <div style={{ transition: 'all 0.4s var(--md-motion-spring-bouncy)', transform: selectedFile ? 'scale(0.95)' : 'scale(1)' }}>
                  <span className="material-symbols-outlined" style={{
                    fontSize: selectedFile ? '36px' : '48px',
                    color: isDragging ? 'var(--md-primary)' : selectedFile ? 'var(--md-primary)' : 'var(--md-on-surface-variant)',
                    marginBottom: selectedFile ? '8px' : '16px', display: 'block',
                    transition: 'all 0.4s var(--md-motion-spring-bouncy)',
                    animation: selectedFile ? 'iconMorph 0.4s var(--md-motion-spring-bouncy)' : 'none',
                  }}>
                    {processing ? 'hourglass_empty' : selectedFile ? 'videocam' : 'upload_file'}
                  </span>
                  {selectedFile ? (
                    <div style={{ animation: 'fadeInUp 0.4s var(--md-motion-spring-bouncy)' }}>
                      <p className="m3-title-medium" style={{ color: 'var(--md-on-primary-container)', margin: '0 0 4px 0' }}>
                        file imported: {selectedFile.name}
                      </p>
                      <p className="m3-body-medium" style={{ color: 'var(--md-on-primary-container)', margin: 0, opacity: 0.8 }}>
                        ({(selectedFile.size / 1024 / 1024).toFixed(1)}MB)
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="m3-title-medium" style={{ color: 'var(--md-on-surface)', margin: '0 0 8px 0' }}>
                        {processing ? 'processing...' : 'drag & drop a video here to patch it'}
                      </p>
                      {!processing && (
                        <p className="m3-body-medium" style={{ color: 'var(--md-on-surface-variant)', margin: 0 }}>
                          ... or <strong>click inside the box to select manually</strong>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {processing && (
                <div style={{ marginTop: '24px' }}>
                  <div style={{ height: '4px', background: 'var(--md-surface-container)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: 'var(--md-primary)', transition: 'width 0.3s ease' }} />
                  </div>
                  <p className="m3-body-medium" style={{ marginTop: '8px', textAlign: 'center' }}>{progress}%</p>
                </div>
              )}

              {logs.length > 0 && (
                <div ref={logsContainerRef} style={{
                  marginTop: '24px', background: 'var(--md-surface-container)', borderRadius: 'var(--md-shape-medium)',
                  padding: '16px', height: '120px', overflowY: 'auto', fontFamily: "'Google Sans Code', monospace",
                  fontSize: '12px', color: 'var(--md-on-surface-variant)',
                }}>
                  {logs.map((log, i) => (
                    <div key={i} style={{ marginBottom: '4px', lineHeight: '1.4' }}>{log}</div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '24px' }}>
              <button onClick={handlePatch} disabled={!loaded || processing || !selectedFile || !!processedFile}
                className="m3-btn-filled" style={{ padding: '12px 48px', fontSize: '16px', borderRadius: 'var(--md-shape-full)' }}>
                <span className="material-symbols-outlined">auto_fix_high</span> patch
              </button>
            </div>

            <div className="m3-card-elevated" style={{ marginTop: '24px' }}>
              <h2 className="m3-title-large" style={{ marginBottom: '16px' }}>how it works</h2>
              <div style={{ display: 'grid', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--md-primary)', marginTop: '2px' }}>videocam</span>
                  <div>
                    <p className="m3-body-large" style={{ margin: 0, marginBottom: '4px' }}>video stream remains untouched</p>
                    <p className="m3-body-medium" style={{ margin: 0, color: 'var(--md-on-surface-variant)' }}>
                      the original H.264/H.265 encoded frames are preserved exactly, without re-encoding. only the MP4 container structure is modified.
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--md-primary)', marginTop: '2px' }}>graphic_eq</span>
                  <div>
                    <p className="m3-body-large" style={{ margin: 0, marginBottom: '4px' }}>sample table inflation</p>
                    <p className="m3-body-medium" style={{ margin: 0, color: 'var(--md-on-surface-variant)' }}>
                      the <code style={{ fontFamily: '"Roboto Mono", monospace', fontSize: '12px', background: 'var(--md-surface-container)', padding: '2px 6px', borderRadius: '4px' }}>stsz</code> table is expanded with codec-aware dummy samples (8B for H.264, 16B for HEVC). a cloned audio track with inflated sample tables triggers TikTok's passthrough.
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--md-primary)', marginTop: '2px' }}>link</span>
                  <div>
                    <p className="m3-body-large" style={{ margin: 0, marginBottom: '4px' }}>chunk offset recalculation</p>
                    <p className="m3-body-medium" style={{ margin: 0, color: 'var(--md-on-surface-variant)' }}>
                      the <code style={{ fontFamily: '"Roboto Mono", monospace', fontSize: '12px', background: 'var(--md-surface-container)', padding: '2px 6px', borderRadius: '4px' }}>stco</code> and <code style={{ fontFamily: '"Roboto Mono", monospace', fontSize: '12px', background: 'var(--md-surface-container)', padding: '2px 6px', borderRadius: '4px' }}>stsc</code> tables are rebuilt to correctly map samples to their new byte offsets.
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--md-primary)', marginTop: '2px' }}>info</span>
                  <div>
                    <p className="m3-body-large" style={{ margin: 0, marginBottom: '4px' }}>metadata injection</p>
                    <p className="m3-body-medium" style={{ margin: 0, color: 'var(--md-on-surface-variant)' }}>
                      full iTunes metadata (10 tags) written to dual <code style={{ fontFamily: '"Roboto Mono", monospace', fontSize: '12px', background: 'var(--md-surface-container)', padding: '2px 6px', borderRadius: '4px' }}>meta</code> boxes inside <code style={{ fontFamily: '"Roboto Mono", monospace', fontSize: '12px', background: 'var(--md-surface-container)', padding: '2px 6px', borderRadius: '4px' }}>udta</code>.
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--md-primary)', marginTop: '2px' }}>memory</span>
                  <div>
                    <p className="m3-body-large" style={{ margin: 0, marginBottom: '4px' }}>trailing garbage injection</p>
                    <p className="m3-body-medium" style={{ margin: 0, color: 'var(--md-on-surface-variant)' }}>
                      padding bytes appended after media data to produce structural anomalies that prevent parser assumptions.
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--md-primary)', marginTop: '2px' }}>check_circle</span>
                  <div>
                    <p className="m3-body-large" style={{ margin: 0, marginBottom: '4px' }}>supported codecs</p>
                    <p className="m3-body-medium" style={{ margin: 0, color: 'var(--md-on-surface-variant)' }}>
                      H.264 (AVC), H.265 (HEVC), VP9, AV1, MPEG-4 Visual. AAC audio. dummy sample sizes auto-detected per codec.
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--md-primary)', marginTop: '2px' }}>code</span>
                  <div>
                    <p className="m3-body-large" style={{ margin: 0, marginBottom: '4px' }}>implementation details</p>
                    <p className="m3-body-medium" style={{ margin: 0, color: 'var(--md-on-surface-variant)' }}>
                      for the full technical breakdown, see the <strong><a href="https://github.com/buwryme/tikutils/blob/main/src/backend/patcher.py" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--md-primary)', textDecoration: 'none' }}>source code</a></strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <PrivacyModal isOpen={privacyOpen} isClosing={privacyClosing} onClose={() => {
        setPrivacyClosing(true);
        setTimeout(() => { setPrivacyOpen(false); setPrivacyClosing(false); }, 200);
      }} />
      <AcknowledgementsModal isOpen={acknowledgementsOpen} isClosing={acknowledgementsClosing} onClose={() => {
        setAcknowledgementsClosing(true);
        setTimeout(() => { setAcknowledgementsOpen(false); setAcknowledgementsClosing(false); }, 200);
      }} />

      <Footer onPrivacyClick={() => setPrivacyOpen(true)} onAcknowledgementsClick={() => setAcknowledgementsOpen(true)} />

      <Modal isOpen={nextStepsOpen} isClosing={nextStepsClosing} onClose={() => {
        setNextStepsClosing(true);
        setTimeout(() => { setNextStepsOpen(false); setNextStepsClosing(false); }, 300);
      }} title="patched! what's next?" actions={
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="m3-btn-outlined" onClick={() => {
            setNextStepsClosing(true);
            setTimeout(() => { setNextStepsOpen(false); setNextStepsClosing(false); setProcessedFile(null); setSelectedFile(null); }, 300);
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span> cancel
          </button>
          <button className="m3-btn-filled" onClick={handleSave} style={{ marginLeft: 'auto' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>save</span> save
          </button>
        </div>
      }>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--md-primary)', marginTop: '2px', flexShrink: 0 }}>videocam</span>
            <div style={{ flex: 1 }}><p className="m3-body-large" style={{ margin: 0, marginBottom: '4px' }}>save the file</p></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--md-primary)', marginTop: '2px', flexShrink: 0 }}>upload_file</span>
            <div style={{ flex: 1 }}>
              <p className="m3-body-large" style={{ margin: 0, marginBottom: '4px' }}>upload the saved file to <strong><a href="https://www.tiktok.com/tiktokstudio/upload" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--md-primary)', textDecoration: 'none' }}>TikTok Studio</a></strong> <strong>via desktop</strong></p>
              <p className="m3-body-medium" style={{ margin: 0, color: 'var(--md-on-surface-variant)', fontSize: '12px', fontWeight: '600', opacity: 0.7 }}>desktop uploading is required</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--md-primary)', marginTop: '2px', flexShrink: 0 }}>public</span>
            <div style={{ flex: 1 }}>
              <p className="m3-body-large" style={{ margin: 0, marginBottom: '4px' }}>make sure your region matches</p>
              <p className="m3-body-medium" style={{ margin: 0, color: 'var(--md-on-surface-variant)' }}>ensure your region matches the region you created your account with. otherwise, you have a higher risk of being shadowbanned</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--md-primary)', marginTop: '2px', flexShrink: 0 }}>edit</span>
            <div style={{ flex: 1 }}>
              <p className="m3-body-large" style={{ margin: 0, marginBottom: '8px' }}>you can only change the following:</p>
              <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--md-on-surface-variant)', listStyleType: 'disc' }} className="m3-body-medium">
                <li style={{ marginBottom: '4px' }}>thumbnail</li>
                <li style={{ marginBottom: '4px' }}>description</li>
                <li>privacy</li>
              </ul>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--md-error)', marginTop: '2px', flexShrink: 0 }}>block</span>
            <div style={{ flex: 1 }}>
              <p className="m3-body-large" style={{ margin: 0, marginBottom: '8px' }}>you should NOT:</p>
              <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--md-on-surface-variant)', listStyleType: 'disc' }} className="m3-body-medium">
                <li style={{ marginBottom: '4px' }}>edit the video right inside the interface</li>
                <li style={{ marginBottom: '4px' }}>change/add audio</li>
                <li>anything else that directly changes the video</li>
              </ul>
              <p className="m3-body-medium" style={{ margin: '8px 0 0 0', color: 'var(--md-on-surface-variant)' }}>otherwise tiktok will recompress it, since these steps re-encode it either way.</p>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--md-on-surface-variant)', fontWeight: '600', opacity: 0.7 }}>posting on mobile is not supported.</p>
        </div>
      </Modal>

      <Toast message={toast.message} isVisible={toast.visible} isClosing={toast.closing} toastKey={`${toast.id}-${toast.updateKey}`} />
    </>
  );
}