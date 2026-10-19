import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';
import Footer from '../components/Footer';
import Modal from '../components/Modal';
import PrivacyModal from '../components/PrivacyModal';
import AcknowledgementsModal from '../components/AcknowledgementsModal';
import Toast from '../components/Toast';
import { loadPatcherConfig, patchBytes } from '../lib/tiktokPatcher';

const PATCHER_STATUS_URL = 'https://gist.githubusercontent.com/buwryme/300e8b1048933c9b2bdf43d2983224e6/raw/tiktok-patcher-status';

export default function TikTokPatcherPage() {
  const navigate = useNavigate();
  const [ffmpeg, setFfmpeg] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
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
  const [patchedOutOpen, setPatchedOutOpen] = useState(false);
  const [patchedOutClosing, setPatchedOutClosing] = useState(false);
  const toastTimeoutRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('buwryy-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

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

  useEffect(() => {
    let cancelled = false;

    const checkPatcherStatus = async () => {
      try {
        const res = await fetch(`${PATCHER_STATUS_URL}?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const text = (await res.text()).trim();
        if (!cancelled && text === '0') setPatchedOutOpen(true);
      } catch {
        // fail open: if the status endpoint can't be reached, keep the patcher usable
      }
    };

    checkPatcherStatus();
    return () => { cancelled = true; };
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

  const handlePatchedOutClose = () => {
    setPatchedOutClosing(true);
    setTimeout(() => {
      setPatchedOutOpen(false);
      setPatchedOutClosing(false);
      navigate('/');
    }, 300);
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
      const patcherConfig = await loadPatcherConfig();
      const patched = patchBytes(outputArray, patcherConfig);
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
                  ported from <Link to="https://github.com/buwryme/tiktok-lossless-upload" style={{ color: 'var(--md-primary)', textDecoration: 'none' }} target="_blank" rel="noopener noreferrer">tiktok-lossless-upload</Link>.<br />
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
                      the original encoded frames are preserved exactly, without re-encoding. only the MP4 container structure is modified.
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--md-primary)', marginTop: '2px' }}>graphic_eq</span>
                  <div>
                    <p className="m3-body-large" style={{ margin: 0, marginBottom: '4px' }}>sample table inflation</p>
                    <p className="m3-body-medium" style={{ margin: 0, color: 'var(--md-on-surface-variant)' }}>
                      the video <code style={{ fontFamily: '"Roboto Mono", monospace', fontSize: '12px', background: 'var(--md-surface-container)', padding: '2px 6px', borderRadius: '4px' }}>stsz</code> table is expanded with codec-sized dummy samples. sample counts, sizes, and payloads are configured per codec.
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
                    <p className="m3-body-large" style={{ margin: 0, marginBottom: '4px' }}>metadata replacement</p>
                    <p className="m3-body-medium" style={{ margin: 0, color: 'var(--md-on-surface-variant)' }}>
                      every <code style={{ fontFamily: '"Roboto Mono", monospace', fontSize: '12px', background: 'var(--md-surface-container)', padding: '2px 6px', borderRadius: '4px' }}>udta</code> box is removed. a single <code style={{ fontFamily: '"Roboto Mono", monospace', fontSize: '12px', background: 'var(--md-surface-container)', padding: '2px 6px', borderRadius: '4px' }}>©too</code> watermark is written inside the video track.
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--md-primary)', marginTop: '2px' }}>memory</span>
                  <div>
                    <p className="m3-body-large" style={{ margin: 0, marginBottom: '4px' }}>faststart and bitrate rewrite</p>
                    <p className="m3-body-medium" style={{ margin: 0, color: 'var(--md-on-surface-variant)' }}>
                      <code style={{ fontFamily: '"Roboto Mono", monospace', fontSize: '12px', background: 'var(--md-surface-container)', padding: '2px 6px', borderRadius: '4px' }}>moov</code> is placed before <code style={{ fontFamily: '"Roboto Mono", monospace', fontSize: '12px', background: 'var(--md-surface-container)', padding: '2px 6px', borderRadius: '4px' }}>mdat</code>, and the video bitrate fields are rewritten from the real sample sizes.
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--md-primary)', marginTop: '2px' }}>check_circle</span>
                  <div>
                    <p className="m3-body-large" style={{ margin: 0, marginBottom: '4px' }}>supported codecs</p>
                    <p className="m3-body-medium" style={{ margin: 0, color: 'var(--md-on-surface-variant)' }}>
                      H.264 (AVC), H.265 (HEVC), VP9, AV1, MPEG-4 Visual. AAC audio. dummy sizes and payloads are configured per codec.
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--md-primary)', marginTop: '2px' }}>code</span>
                  <div>
                    <p className="m3-body-large" style={{ margin: 0, marginBottom: '4px' }}>implementation details</p>
                    <p className="m3-body-medium" style={{ margin: 0, color: 'var(--md-on-surface-variant)' }}>
                      for the full technical breakdown, see the <strong><a href="https://github.com/buwryme/buwryy.net/blob/main/src/lib/tiktokPatcher.ts" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--md-primary)', textDecoration: 'none' }}>TypeScript core</a></strong>.
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

      <Modal
        isOpen={patchedOutOpen}
        isClosing={patchedOutClosing}
        onClose={handlePatchedOutClose}
        title="the method no longer works; it has been patched by TikTok!"
        titleIcon={
          <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--md-error)' }}>warning</span>
        }
        actions={
          <button className="m3-btn-filled" onClick={handlePatchedOutClose}>
            ok, got it!
          </button>
        }
      >
        <p className="m3-body-medium" style={{ margin: 0, color: 'var(--md-on-surface-variant)' }}>
          recently, tiktok pushed an update that blocks the current functionality of the video structure patcher. don't worry; we are working on a fix. this is temporary. for now, check out the rest of the website! :P
        </p>
      </Modal>

      <Toast message={toast.message} isVisible={toast.visible} isClosing={toast.closing} toastKey={`${toast.id}-${toast.updateKey}`} />
    </>
  );
}