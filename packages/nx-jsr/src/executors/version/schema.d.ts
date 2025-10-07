export interface VersionExecutorSchema {
  packageRoot: string;
  version: string;
  push?: boolean;
  tagPrefix?: string;
}
