import { existsSync, mkdirSync, rmSync, copyFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);

function parseArgs(argv) {
  const options = {
    features: "db-matrix",
    noArchive: false,
    profile: "release",
    refreshXwin: false,
    skipFrontend: false,
    target: "x86_64-pc-windows-msvc",
    xwinCacheDir: join(repoRoot, ".xwin-cache"),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") {
      continue;
    }
    const readValue = () => {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${arg} requires a value`);
      }
      index += 1;
      return value;
    };

    if (arg === "--features") {
      options.features = readValue();
    } else if (arg === "--no-archive") {
      options.noArchive = true;
    } else if (arg === "--profile") {
      options.profile = readValue();
    } else if (arg === "--refresh-xwin") {
      options.refreshXwin = true;
    } else if (arg === "--skip-frontend") {
      options.skipFrontend = true;
    } else if (arg === "--target") {
      options.target = readValue();
    } else if (arg === "--xwin-cache-dir") {
      options.xwinCacheDir = resolve(repoRoot, readValue());
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  if (!["debug", "release"].includes(options.profile)) {
    throw new Error("--profile must be debug or release");
  }
  if (options.target !== "x86_64-pc-windows-msvc") {
    throw new Error("xwin cross build currently supports --target x86_64-pc-windows-msvc");
  }

  return options;
}

function printHelp() {
  console.log(`Build a Windows MSVC yoram.exe on macOS using xwin.

Usage:
  pnpm build:windows-msvc:xwin [-- --features db-matrix|none] [-- --profile release|debug]

Options:
  --features <value>       Cargo features to pass. Use "none" for no extra features.
  --profile <value>        release or debug. Default: release.
  --skip-frontend          Reuse frontend/dist instead of running pnpm --dir frontend build.
  --no-archive             Do not create dist/yoram-windows-msvc-<target>.zip.
  --refresh-xwin           Re-run xwin splat even when the sysroot already exists.
  --xwin-cache-dir <path>  xwin cache/sysroot directory. Default: .xwin-cache.
`);
}

function run(command, args, options = {}) {
  console.log(`==> ${[command, ...args].join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    env: { ...process.env, ...options.env },
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with ${result.status ?? result.signal}`);
  }
}

function runCapture(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    return null;
  }
  return result.stdout.trim();
}

function findTool(name, extraDirectories = []) {
  for (const directory of extraDirectories) {
    const candidate = join(directory, name);
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  const found = runCapture("which", [name]);
  return found && found.length > 0 ? found : null;
}

function llvmBinDirectory() {
  if (process.env.LLVM_BIN && existsSync(process.env.LLVM_BIN)) {
    return process.env.LLVM_BIN;
  }
  const brewPrefix = runCapture("brew", ["--prefix", "llvm"]);
  if (brewPrefix) {
    const directory = join(brewPrefix, "bin");
    if (existsSync(directory)) {
      return directory;
    }
  }
  for (const directory of ["/opt/homebrew/opt/llvm/bin", "/usr/local/opt/llvm/bin"]) {
    if (existsSync(directory)) {
      return directory;
    }
  }
  return null;
}

function ensureXwinSysroot(options) {
  const splatRoot = join(options.xwinCacheDir, "splat");
  const required = [
    join(splatRoot, "crt", "lib", "x86_64", "msvcrt.lib"),
    join(splatRoot, "sdk", "include", "ucrt", "assert.h"),
    join(splatRoot, "sdk", "lib", "ucrt", "x86_64", "ucrt.lib"),
  ];

  if (!options.refreshXwin && required.every((path) => existsSync(path))) {
    return splatRoot;
  }

  run("xwin", [
    "--accept-license",
    "--cache-dir",
    options.xwinCacheDir,
    "splat",
    "--output",
    splatRoot,
  ]);
  for (const path of required) {
    if (!existsSync(path)) {
      throw new Error(`xwin sysroot is missing required file: ${path}`);
    }
  }
  return splatRoot;
}

function buildEnv(options, splatRoot) {
  const llvmBin = llvmBinDirectory();
  const clangCl = findTool("clang-cl", llvmBin ? [llvmBin] : []);
  const llvmLib = findTool("llvm-lib", llvmBin ? [llvmBin] : []);
  const lldLink = findTool("lld-link", llvmBin ? [llvmBin] : []);
  if (!clangCl || !llvmLib || !lldLink) {
    throw new Error(
      "Homebrew LLVM tools are required: clang-cl, llvm-lib, and lld-link. Install with `brew install llvm` or set LLVM_BIN.",
    );
  }

  const includeFlags = [
    join(splatRoot, "sdk", "include", "ucrt"),
    join(splatRoot, "sdk", "include", "shared"),
    join(splatRoot, "sdk", "include", "um"),
    join(splatRoot, "crt", "include"),
  ]
    .map((path) => `-I${path}`)
    .join(" ");

  const libFlags = [
    join(splatRoot, "crt", "lib", "x86_64"),
    join(splatRoot, "sdk", "lib", "ucrt", "x86_64"),
    join(splatRoot, "sdk", "lib", "um", "x86_64"),
  ]
    .map((path) => `-L native=${path}`)
    .join(" ");

  const frontendDist = join(repoRoot, "frontend", "dist");
  return {
    AR_x86_64_pc_windows_msvc: llvmLib,
    CC_x86_64_pc_windows_msvc: clangCl,
    CFLAGS_x86_64_pc_windows_msvc: `--target=${options.target} ${includeFlags}`,
    PATH: llvmBin ? `${llvmBin}:${process.env.PATH ?? ""}` : process.env.PATH,
    RUSTFLAGS: `${process.env.RUSTFLAGS ?? ""} ${libFlags} -C linker=${lldLink}`.trim(),
    YONA_EMBED_ASSET_ROOT: frontendDist,
  };
}

function writeSampleConfig(path) {
  writeFileSync(
    path,
    `schema_policy = "up"
use_embedded_assets = true
base_path = "/"

[site]
name = "Yoram"
allow_anonymous_access = true

[database]
url = "sqlite://yoram.db?mode=rwc"

[auth]
signup_require_confirm = false
`,
  );
}

function archiveArtifacts(artifactDir, archivePath) {
  if (existsSync(archivePath)) {
    rmSync(archivePath);
  }
  run("zip", ["-qry", archivePath, "."], { cwd: artifactDir });
}

const options = parseArgs(process.argv.slice(2));
const splatRoot = ensureXwinSysroot(options);
const frontendDist = join(repoRoot, "frontend", "dist");

if (!options.skipFrontend) {
  run("pnpm", ["--dir", "frontend", "build"]);
}
if (!existsSync(frontendDist)) {
  throw new Error(`frontend dist not found: ${frontendDist}`);
}

run("rustup", ["target", "add", options.target]);

const cargoArgs = ["build", "-p", "yoram-server", "--bin", "yoram", "--target", options.target];
if (options.profile === "release") {
  cargoArgs.push("--release");
}
if (options.features.trim() !== "" && options.features !== "none") {
  cargoArgs.push("--features", options.features);
}

run("cargo", cargoArgs, { env: buildEnv(options, splatRoot) });

const profileDir = options.profile === "release" ? "release" : "debug";
const binaryPath = join(repoRoot, "target", options.target, profileDir, "yoram.exe");
if (!existsSync(binaryPath)) {
  throw new Error(`binary not found after build: ${binaryPath}`);
}

const artifactDir = join(repoRoot, "dist", `windows-msvc-${options.target}`);
mkdirSync(artifactDir, { recursive: true });
const artifactBinary = join(artifactDir, "yoram.exe");
const sampleConfig = join(artifactDir, "yoram.toml");
copyFileSync(binaryPath, artifactBinary);
writeSampleConfig(sampleConfig);

if (!options.noArchive) {
  archiveArtifacts(artifactDir, join(repoRoot, "dist", `yoram-windows-msvc-${options.target}.zip`));
}

console.log(`binary : ${artifactBinary}`);
console.log(`config : ${sampleConfig}`);
if (!options.noArchive) {
  console.log(`archive: ${join(repoRoot, "dist", `yoram-windows-msvc-${options.target}.zip`)}`);
}
