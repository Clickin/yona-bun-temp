import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RestrictedPage } from "./routes/-restricted-view";

describe("legacy restricted route parity", () => {
  it("keeps the authenticated legacy /restricted route mounted in React", () => {
    const legacyRoutes = fs.readFileSync(path.resolve(__dirname, "../../yona-original/conf/routes"), {
      encoding: "utf8",
    });
    const legacyController = fs.readFileSync(
      path.resolve(__dirname, "../../yona-original/app/controllers/Restricted.java"),
      { encoding: "utf8" },
    );
    const routeSource = fs.readFileSync(path.resolve(__dirname, "routes/restricted/route.tsx"), {
      encoding: "utf8",
    });

    expect(legacyRoutes).toContain("GET     /restricted");
    expect(legacyController).toContain("@Security.Authenticated(Secured.class)");
    expect(routeSource).toContain('createFileRoute("/restricted")');
    expect(routeSource).toContain('useRequireAuthenticatedRoute("/restricted")');
  });

  it("renders the legacy restricted sample page identity copy", () => {
    const html = renderToStaticMarkup(
      <RestrictedPage
        emailAddress="admin@example.com"
        isConfirmed={true}
        loginId="admin"
        userLabel="Site Admin"
      />,
    );

    expect(html).toContain("<h1>Sshhh...don&#x27;t tell anyone!</h1>");
    expect(html).toContain('width="560"');
    expect(html).toContain('height="315"');
    expect(html).toContain('src="https://www.youtube.com/embed/9bZkp7q19f0"');
    expect(html).toContain("Your name is Site Admin and your email address is admin@example.com");
    expect(html).toContain("<i>(verified)</i>!");
    expect(html).toContain("Logged in with provider &#x27;local&#x27; and the user ID &#x27;admin&#x27;");
    expect(html).toContain("Your session expires never");
  });

  it("renders the legacy unverified marker", () => {
    const html = renderToStaticMarkup(
      <RestrictedPage
        emailAddress="guest@example.com"
        isConfirmed={false}
        loginId="guest"
        userLabel="Guest"
      />,
    );

    expect(html).toContain("<i>(unverified)</i>!");
  });
});
