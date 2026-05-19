import { picklist } from "valibot";

export const folderChoicesSchema = picklist([
  "extensions",
  "prompts",
  "skills",
  "themes",
]);
export const allowedFolderChioces = folderChoicesSchema.options;
export type AllowedFolderChioceValues = Array<
  (typeof allowedFolderChioces)[number]
>;

export const runnerChiocesSchema = picklist(["jest", "vitest"]);
export const allowedTestRunnerChioces = runnerChiocesSchema.options;
export type AllowedTestRunnerChioces =
  (typeof allowedTestRunnerChioces)[number];

export const packageManagerChiocesSchema = picklist([
  "bun",
  "pnpm",
  "yarn",
  "npm",
]);
export const allowedPackageManagers = packageManagerChiocesSchema.options;
export type AllowedPackageManagers = (typeof allowedPackageManagers)[number];
