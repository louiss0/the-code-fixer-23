export interface PublishExecutorSchema {
  packageRoot: string;
  dryRun?: boolean;
  token?: string;
  allowDirty?: boolean;
}
