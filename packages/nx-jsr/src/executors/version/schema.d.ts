export type ReleaseType =
  | 'major'
  | 'minor'
  | 'patch'
  | 'premajor'
  | 'preminor'
  | 'prepatch'
  | 'prerelease';

export interface VersionExecutorSchema {
  packageRoot: string;
  mode?: 'manual' | 'auto';
  version?: string;
  releaseAs?: ReleaseType;
  preid?: string;
  push?: boolean;
  tagPrefix?: string;
}
