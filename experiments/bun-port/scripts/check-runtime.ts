const expected = await Bun.file(new URL("../BUN_VERSION.json", import.meta.url)).json();
const actualRevision = Bun.revision;

if (Bun.version !== expected.version || actualRevision !== expected.revision) {
  throw new Error(
    `Expected Bun ${expected.version}+${expected.revision.slice(0, 9)}, got ${Bun.version}+${actualRevision}`,
  );
}

console.log(`${Bun.version}+${actualRevision}`);
