import { existsSync, copyFileSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const args = process.argv.slice(2);

const target = "x86_64-pc-windows-msvc";
const profile = args.includes("--debug") ? "debug" : "release";
const noArchive = args.includes("--no-archive");
const xwinCacheDir = args.includes("--xwin-cache-dir")
  ? resolve(repoRoot, args[args.indexOf("--xwin-cache-dir") + 1])
  : join(repoRoot, ".xwin-cache");
const splatRoot = join(xwinCacheDir, "splat");
const profileDir = profile === "release" ? "release" : "debug";

function llvmBinDir() {
  if (process.env.LLVM_BIN && existsSync(process.env.LLVM_BIN)) return process.env.LLVM_BIN;
  const brewPrefix = spawnSync("brew", ["--prefix", "llvm"], { encoding: "utf8" });
  if (brewPrefix.status === 0) {
    const dir = join(brewPrefix.stdout.trim(), "bin");
    if (existsSync(dir)) return dir;
  }
  for (const dir of ["/opt/homebrew/opt/llvm/bin", "/usr/local/opt/llvm/bin"]) {
    if (existsSync(dir)) return dir;
  }
  return null;
}

function findTool(name, extra = []) {
  for (const d of extra) {
    const c = join(d, name);
    if (existsSync(c)) return c;
  }
  const r = spawnSync("which", [name], { encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : null;
}

const llvmBin = llvmBinDir();
const clangCl = findTool("clang-cl", llvmBin ? [llvmBin] : []);
const llvmLib = findTool("llvm-lib", llvmBin ? [llvmBin] : []);
const lldLink = findTool("lld-link", llvmBin ? [llvmBin] : []);

const missing = [];
if (!clangCl) missing.push("clang-cl");
if (!llvmLib) missing.push("llvm-lib");
if (!lldLink) missing.push("lld-link");
if (missing.length) {
  throw new Error(`Missing LLVM tools: ${missing.join(", ")}. Install with: brew install llvm`);
}

const inc = ["sdk/include/ucrt", "sdk/include/shared", "sdk/include/um", "crt/include"]
  .map((p) => `-I${join(splatRoot, p)}`).join(" ");
const libs = ["crt/lib/x86_64", "sdk/lib/ucrt/x86_64", "sdk/lib/um/x86_64"]
  .map((p) => `-L native=${join(splatRoot, p)}`).join(" ");

const env = {
  ...process.env,
  AR_x86_64_pc_windows_msvc: llvmLib,
  CC_x86_64_pc_windows_msvc: clangCl,
  CFLAGS_x86_64_pc_windows_msvc: `--target=${target} ${inc}`,
  PATH: llvmBin ? `${llvmBin}:${process.env.PATH || ""}` : process.env.PATH,
  RUSTFLAGS: `${libs} -C linker=${lldLink}`,
};

const cargoArgs = ["build", "-p", "yona-migrate", "--target", target];
if (profile === "release") cargoArgs.push("--release");
console.log(`==> cargo ${cargoArgs.join(" ")}`);

const r = spawnSync("cargo", cargoArgs, { cwd: repoRoot, env, stdio: "inherit" });
if (r.status !== 0) process.exit(r.status ?? 1);

// ── Archive ───────────────────────────────────────────────────────────────

const binaryPath = join(repoRoot, "target", target, profileDir, "yona-migrate.exe");
if (!existsSync(binaryPath)) {
  throw new Error(`binary not found: ${binaryPath}`);
}

const artifactDir = join(repoRoot, "dist", `windows-msvc-${target}`);
mkdirSync(artifactDir, { recursive: true });
copyFileSync(binaryPath, join(artifactDir, "yona-migrate.exe"));

console.log(`binary : ${join(artifactDir, "yona-migrate.exe")}`);

if (!noArchive) {
  const archivePath = join(repoRoot, "dist", `yona-migrate-windows-msvc-${target}.zip`);
  if (existsSync(archivePath)) rmSync(archivePath);
  spawnSync("zip", ["-qry", archivePath, "."], { cwd: artifactDir, stdio: "inherit" });
  console.log(`archive: ${archivePath}`);
}
