import { describe, expect, it } from "vitest";
import { prefixBasePath } from "./runtime-config";

describe("prefixBasePath", () => {
  const basePath = "/team/yoram";

  it("prefixes app-local URLs exactly once at a path segment boundary", () => {
    expect(prefixBasePath(basePath, "/files/7")).toBe("/team/yoram/files/7");
    expect(prefixBasePath(basePath, "/team/yoram/files/7")).toBe("/team/yoram/files/7");
    expect(prefixBasePath(basePath, "/team/yoram")).toBe("/team/yoram");
    expect(prefixBasePath(basePath, "/team/yoram/")).toBe("/team/yoram/");
    expect(prefixBasePath(basePath, "/team/yoramish/files")).toBe(
      "/team/yoram/team/yoramish/files",
    );
  });

  it("preserves query strings and hashes while avoiding a duplicate prefix", () => {
    expect(prefixBasePath(basePath, "/files/7?download=1#preview")).toBe(
      "/team/yoram/files/7?download=1#preview",
    );
    expect(prefixBasePath(basePath, "/team/yoram/files/7?download=1#preview")).toBe(
      "/team/yoram/files/7?download=1#preview",
    );
    expect(prefixBasePath(basePath, "/team/yoram?tab=files#preview")).toBe(
      "/team/yoram?tab=files#preview",
    );
  });

  it("keeps root-base and existing non-path input semantics", () => {
    expect(prefixBasePath("/", "/files/7?download=1#preview")).toBe("/files/7?download=1#preview");
    expect(prefixBasePath("/", "files/7")).toBe("/files/7");
    expect(prefixBasePath("/", "/")).toBe("/");

    expect(prefixBasePath(basePath, "https://cdn.example.test/files/7")).toBe(
      "https://cdn.example.test/files/7",
    );
    expect(prefixBasePath(basePath, "//cdn.example.test/files/7")).toBe(
      "/team/yoram//cdn.example.test/files/7",
    );
    expect(prefixBasePath(basePath, "#preview")).toBe("/team/yoram/#preview");
    expect(prefixBasePath(basePath, "files/7")).toBe("/team/yoram/files/7");
  });
});
