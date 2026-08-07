import { readFileSync, test } from "../wtr-compat.ts";

test("probe stylex pins", () => {
  const viaUrl = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/commit/-commit-detail.stylex.ts", import.meta.url),
    "utf8",
  );
  const viaStr = readFileSync(
    "src/routes/$ownerName/$projectName/commit/-commit-detail.stylex.ts",
    "utf8",
  );
  const pin1 =
    'threadFoldHere: {\n    position: "absolute",\n    zIndex: 99,\n    right: "0px",\n    marginTop: "0px",\n    display: "block",\n  }';
  console.log("PROBE url len", viaUrl.length, "str len", viaStr.length);
  console.log("PROBE url pin1", viaUrl.includes(pin1), "str pin1", viaStr.includes(pin1));
  const i = viaStr.indexOf("threadFoldHere");
  console.log("PROBE str slice", JSON.stringify(viaStr.slice(i, i + 140)));
});
