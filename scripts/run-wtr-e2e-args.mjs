import { basename } from "node:path";

export function chromeSpecFiles(manifest) {
  return manifest.chrome
    .map((name) => basename(name))
    .filter((name) => !name.startsWith("_diag-"))
    .sort();
}

export function chromeWtrArgs(files) {
  return files.map((name) => `tests/wtr/${name}`);
}
