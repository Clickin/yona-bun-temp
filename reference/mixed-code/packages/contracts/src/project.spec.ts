import { describe, expect, it } from "vitest";
import {
  projectCreateInputSchema,
  projectDetailSchema,
  projectEnrollmentRequestSummarySchema,
  projectMemberDirectorySchema,
  projectMemberSchema,
  projectNameSchema,
  projectSummarySchema,
  projectUpdateInputSchema,
} from "./project";

describe("project contracts", () => {
  it("keeps the legacy project-name validation rules", () => {
    for (const value of ["projectYobi", "foo.bar", "_hello", "CUBRID", "hello-social"]) {
      expect(projectNameSchema.parse(value)).toBe(value);
    }

    for (const value of ["", "foo/bar", ".git", ".", "..", "white space"]) {
      expect(projectNameSchema.safeParse(value).success).toBe(false);
    }
  });

  it("normalizes create and update inputs", () => {
    expect(
      projectCreateInputSchema.parse({
        ownerName: "  yobi  ",
        overview: "  Yona project  ",
        projectName: "  projectYobi  ",
        projectScope: "public",
      }),
    ).toEqual({
      ownerName: "yobi",
      overview: "Yona project",
      projectName: "projectYobi",
      projectScope: "public",
    });

    expect(
      projectUpdateInputSchema.parse({
        currentOwnerName: "  yobi  ",
        currentProjectName: "  projectYobi  ",
        overview: "   ",
        projectName: "  projectYobi-1  ",
        projectScope: "private",
      }),
    ).toEqual({
      currentOwnerName: "yobi",
      currentProjectName: "projectYobi",
      overview: null,
      projectName: "projectYobi-1",
      projectScope: "private",
    });
  });

  it("parses summary and detail DTOs with public identifiers only", () => {
    expect(
      projectSummarySchema.parse({
        ownerName: "yobi",
        overview: "overview",
        projectName: "projectYobi",
        projectScope: "public",
      }),
    ).toEqual({
      ownerName: "yobi",
      overview: "overview",
      projectName: "projectYobi",
      projectScope: "public",
    });

    expect(
      projectDetailSchema.parse({
        organizationName: null,
        ownerName: "yobi",
        overview: "overview",
        projectName: "projectYobi",
        projectScope: "public",
        viewerCanUpdate: true,
      }),
    ).toEqual({
      organizationName: null,
      ownerName: "yobi",
      overview: "overview",
      projectName: "projectYobi",
      projectScope: "public",
      viewerCanUpdate: true,
    });
  });

  it("parses project member directories with pending enrollment requests", () => {
    expect(
      projectMemberSchema.parse({
        loginId: "yobi",
        role: "manager",
        userLabel: "Yobi",
      }),
    ).toEqual({
      loginId: "yobi",
      role: "manager",
      userLabel: "Yobi",
    });

    expect(
      projectEnrollmentRequestSummarySchema.parse({
        loginId: "guest-user",
        userLabel: "Guest User",
      }),
    ).toEqual({
      loginId: "guest-user",
      userLabel: "Guest User",
    });

    expect(
      projectMemberDirectorySchema.parse({
        enrollmentRequests: [
          {
            loginId: "guest-user",
            userLabel: "Guest User",
          },
        ],
        members: [
          {
            loginId: "yobi",
            role: "manager",
            userLabel: "Yobi",
          },
        ],
      }),
    ).toEqual({
      enrollmentRequests: [
        {
          loginId: "guest-user",
          userLabel: "Guest User",
        },
      ],
      members: [
        {
          loginId: "yobi",
          role: "manager",
          userLabel: "Yobi",
        },
      ],
    });
  });
});
