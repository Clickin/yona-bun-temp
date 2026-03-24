import { describe, expect, it } from "vitest";
import {
  DEFAULT_LANDING_FALLBACK_PATH,
  extractDefaultLandingSearchParams,
  isDefaultLandingPathEligible,
  normalizeDefaultLandingPath,
  resolveDefaultLandingPath,
  resolvePostAuthLandingPath,
} from "./default-landing";

describe("default landing helper", () => {
  it("accepts canonical workspace and resource pages", () => {
    expect(normalizeDefaultLandingPath("/me")).toBe("/me");
    expect(normalizeDefaultLandingPath("/users/doortts")).toBe("/users/doortts");
    expect(normalizeDefaultLandingPath("/labs/projectYobi/issues/12")).toBe(
      "/labs/projectYobi/issues/12",
    );
  });

  it("rejects auth, api, settings, new, and protected pages", () => {
    expect(normalizeDefaultLandingPath("/login")).toBeNull();
    expect(normalizeDefaultLandingPath("/api/me/sidebar")).toBeNull();
    expect(normalizeDefaultLandingPath("/organizations/new")).toBeNull();
    expect(normalizeDefaultLandingPath("/labs/projectYobi/settings")).toBeNull();
    expect(normalizeDefaultLandingPath("/protected")).toBeNull();
  });

  it("canonicalizes search urls and strips unknown query keys", () => {
    expect(
      normalizeDefaultLandingPath(
        "/search?scope=project&pageSize=20&ownerName=labs&projectName=projectYobi&lang=ko-KR&types=issue&types=bad",
      ),
    ).toBe("/search?pageSize=20&scope=project&ownerName=labs&projectName=projectYobi&types=issue");

    expect(
      extractDefaultLandingSearchParams(
        "/search?scope=global&pageSize=20&query=test&lang=ko-KR",
      ).toString(),
    ).toBe("pageSize=20&scope=global&query=test");
  });

  it("prefers explicit redirect then saved landing then fallback", () => {
    expect(resolvePostAuthLandingPath("/search?query=hello", "/me")).toBe(
      "/search?pageSize=20&scope=global&query=hello",
    );
    expect(resolvePostAuthLandingPath("/login", "/users/doortts")).toBe("/users/doortts");
    expect(resolvePostAuthLandingPath(undefined, null)).toBe(DEFAULT_LANDING_FALLBACK_PATH);
    expect(resolveDefaultLandingPath(null)).toBe(DEFAULT_LANDING_FALLBACK_PATH);
    expect(isDefaultLandingPathEligible("/me")).toBe(true);
    expect(isDefaultLandingPathEligible("/projects/new")).toBe(false);
  });
});
