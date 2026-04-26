declare module 'fs-extra' {
  export function ensureDir(path: string): Promise<void>;
  export function outputFile(path: string, data: string): Promise<void>;
  export function pathExists(path: string): Promise<boolean>;
  export function readdir(path: string): Promise<string[]>;

  const fs: {
    ensureDir: typeof ensureDir;
    outputFile: typeof outputFile;
    pathExists: typeof pathExists;
    readdir: typeof readdir;
  };

  export default fs;
}
