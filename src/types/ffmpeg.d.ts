// Type declarations for FFmpeg CDN imports
declare module 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js' {
  export class FFmpeg {
    constructor();
    on(event: string, callback: (data: any) => void): void;
    load(config: {
      coreURL: string;
      wasmURL: string;
      workerURL: string;
    }): Promise<void>;
    exec(args: string[]): Promise<number>;
    writeFile(path: string, data: Uint8Array): Promise<void>;
    readFile(path: string): Promise<Uint8Array>;
    deleteFile(path: string): Promise<void>;
  }
}

declare module 'https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/dist/esm/index.js' {
  export function toBlobURL(url: string, mimeType: string): Promise<string>;
  export function fetchFile(file: File | string): Promise<Uint8Array>;
}

declare module 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js' {
  export class FFmpeg {
    constructor();
    on(event: string, callback: (data: any) => void): void;
    load(config: {
      coreURL: string;
      wasmURL: string;
      workerURL: string;
    }): Promise<void>;
    exec(args: string[]): Promise<number>;
    writeFile(path: string, data: Uint8Array): Promise<void>;
    readFile(path: string): Promise<Uint8Array>;
    deleteFile(path: string): Promise<void>;
  }
}

declare module 'https://unpkg.com/@ffmpeg/util@0.12.1/dist/esm/index.js' {
  export function toBlobURL(url: string, mimeType: string): Promise<string>;
  export function fetchFile(file: File | string): Promise<Uint8Array>;
}
