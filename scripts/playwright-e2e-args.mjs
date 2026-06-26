const VALUE_OPTIONS = new Set([
  "-c",
  "--config",
  "-g",
  "--grep",
  "--grep-invert",
  "--global-timeout",
  "-j",
  "--workers",
  "--max-failures",
  "--only-changed",
  "--output",
  "--project",
  "--repeat-each",
  "--reporter",
  "--retries",
  "--shard",
  "--timeout",
  "--trace",
  "--update-snapshots",
  "--update-source-method",
]);

function optionName(arg) {
  const equalIndex = arg.indexOf("=");
  if (equalIndex === -1) {
    return arg;
  }
  return arg.slice(0, equalIndex);
}

export function normalizePlaywrightArgs(args) {
  const options = [];
  const positionals = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--") {
      positionals.push(...args.slice(index + 1));
      break;
    }

    if (!arg.startsWith("-")) {
      positionals.push(arg);
      continue;
    }

    options.push(arg);
    if (!arg.includes("=") && VALUE_OPTIONS.has(optionName(arg)) && index + 1 < args.length) {
      options.push(args[index + 1]);
      index += 1;
    }
  }

  return [...options, ...positionals];
}
