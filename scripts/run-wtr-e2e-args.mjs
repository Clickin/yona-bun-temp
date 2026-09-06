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

export function isCurrentBuildProof(proof, current) {
  return (
    proof?.schemaVersion === 1 &&
    Array.isArray(proof.inputFiles) &&
    proof.inputFingerprint === current.inputFingerprint &&
    JSON.stringify(proof.inputFiles) === JSON.stringify(current.inputFiles) &&
    JSON.stringify(proof.inputConfig) === JSON.stringify(current.inputConfig) &&
    proof.distIdentity === current.distIdentity
  );
}

function measuredTiming(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

// Keep every shard's weights in the same unit. When a profile only knows
// some files, estimate the rest from the observed milliseconds-per-byte rate
// instead of adding bytes to milliseconds.
export function scheduleWtrShards(files, shardCount) {
  const known = files.filter((file) => measuredTiming(file.elapsedMs));
  const knownBytes = known.reduce(
    (total, file) => total + (Number.isFinite(file.size) && file.size > 0 ? file.size : 0),
    0,
  );
  const knownMs = known.reduce((total, file) => total + file.elapsedMs, 0);
  const millisecondsPerByte = knownBytes > 0 && knownMs > 0 ? knownMs / knownBytes : 1;
  const weighted = files.map((file) => {
    const size = Number.isFinite(file.size) && file.size >= 0 ? file.size : 0;
    const weight = measuredTiming(file.elapsedMs)
      ? file.elapsedMs
      : known.length > 0
        ? Math.max(1, size * millisecondsPerByte)
        : size;
    return { ...file, weight };
  });

  weighted.sort(
    (left, right) =>
      right.weight - left.weight ||
      (left.name < right.name ? -1 : left.name > right.name ? 1 : 0),
  );
  const shards = Array.from({ length: shardCount }, () => []);
  const totals = Array.from({ length: shardCount }, () => 0);
  for (const file of weighted) {
    const slot = totals.indexOf(Math.min(...totals));
    shards[slot].push(file);
    totals[slot] += file.weight;
  }
  return { shards, totals };
}
