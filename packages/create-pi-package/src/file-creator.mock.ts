import { vol } from "memfs";

export function hasCreatedFile(file: string) {
  return vol.existsSync(file);
}

export function readCreatedFile(file: string) {
  return vol.readFileSync(file, "utf8") as string;
}

export function listCreatedFiles() {
  return vol.toJSON() as Record<string, string>;
}

export function resetCreatedFiles() {
  vol.reset();
}
