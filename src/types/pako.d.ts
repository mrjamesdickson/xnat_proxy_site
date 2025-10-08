declare module 'pako' {
  interface InflateOptions {
    to?: 'string';
    chunkSize?: number;
    level?: number;
    raw?: boolean;
  }

  export function inflate(
    data: Uint8Array | ArrayBuffer | number[],
    options?: InflateOptions
  ): Uint8Array;
}
