import { PassThrough } from "node:stream";
import { describe, expect, it } from "vitest";
import {
  buildGitHttpBackendEnv,
  createSmartHttpRequestBodySource,
  parseGitHttpBackendOutput,
  requiresReceivePackAuth,
  SmartHttpPayloadTooLargeError,
} from "./http-backend";

describe("git http-backend parser", () => {
  it("parses status and headers with CRLF delimiter", () => {
    const payload = Buffer.from(
      "Status: 200 OK\r\nContent-Type: application/x-git-upload-pack-advertisement\r\nCache-Control: no-cache\r\n\r\nPACKDATA",
      "utf-8",
    );

    const parsed = parseGitHttpBackendOutput(payload);

    expect(parsed.status).toBe(200);
    expect(parsed.headers.get("Content-Type")).toBe("application/x-git-upload-pack-advertisement");
    expect(Buffer.from(parsed.body).toString("utf-8")).toBe("PACKDATA");
  });

  it("falls back to LF delimiter", () => {
    const payload = Buffer.from(
      "Status: 403 Forbidden\nContent-Type: text/plain\n\nDenied",
      "utf-8",
    );
    const parsed = parseGitHttpBackendOutput(payload);

    expect(parsed.status).toBe(403);
    expect(parsed.headers.get("Content-Type")).toBe("text/plain");
    expect(Buffer.from(parsed.body).toString("utf-8")).toBe("Denied");
  });

  it("throws if separator is missing", () => {
    const payload = Buffer.from("Status: 200 OK\nContent-Type: text/plain", "utf-8");
    expect(() => parseGitHttpBackendOutput(payload)).toThrow("missing header/body delimiter");
  });

  it("builds CGI env including git protocol and actor", () => {
    const request = new Request(
      "http://localhost/api/repos/1001/smart-http/info/refs?service=git-upload-pack",
      {
        body: "packet-line",
        method: "POST",
        headers: {
          "git-protocol": "version=2",
          "content-type": "application/x-git-upload-pack-request",
        },
      },
    );

    const env = buildGitHttpBackendEnv({
      repoRoot: "/yona-data/repo",
      pathInfo: "/1001/info/refs",
      request,
      actorName: "editor",
      contentLength: 11,
      remoteAddress: "127.0.0.1",
    });

    expect(env.GIT_PROJECT_ROOT).toBe("/yona-data/repo");
    expect(env.PATH_INFO).toBe("/1001/info/refs");
    expect(env.REQUEST_METHOD).toBe("GET");
    expect(env.QUERY_STRING).toBe("service=git-upload-pack");
    expect(env.GIT_PROTOCOL).toBe("version=2");
    expect(env.HTTP_GIT_PROTOCOL).toBe("version=2");
    expect(env.CONTENT_LENGTH).toBe("11");
    expect(env.REMOTE_USER).toBe("editor");
    expect(env.REMOTE_ADDR).toBe("127.0.0.1");
  });

  it("requires auth for receive-pack by path or query", () => {
    const receivePackPathReq = new Request("http://localhost/repo/git-receive-pack", {
      method: "POST",
    });
    const receivePackServiceReq = new Request(
      "http://localhost/repo/info/refs?service=git-receive-pack",
      {
        method: "GET",
      },
    );
    const uploadPackReq = new Request("http://localhost/repo/info/refs?service=git-upload-pack", {
      method: "GET",
    });

    expect(requiresReceivePackAuth(receivePackPathReq, "/1001/git-receive-pack")).toBe(true);
    expect(requiresReceivePackAuth(receivePackServiceReq, "/1001/info/refs")).toBe(true);
    expect(requiresReceivePackAuth(uploadPackReq, "/1001/info/refs")).toBe(false);
  });

  it("spools POST bodies into a reusable source with the measured byte length", async () => {
    const request = new Request("http://localhost/repo/git-receive-pack", {
      body: "PACKDATA",
      method: "POST",
    });
    const source = await createSmartHttpRequestBodySource(request);
    const output = new PassThrough();
    const chunks: Buffer[] = [];

    output.on("data", (chunk: Buffer) => {
      chunks.push(Buffer.from(chunk));
    });

    await source.pipeTo(output);
    await source.cleanup();

    expect(source.contentLength).toBe(8);
    expect(Buffer.concat(chunks).toString("utf-8")).toBe("PACKDATA");
  });

  it("rejects bodies whose actual size exceeds the limit even when content-length is understated", async () => {
    const oversizedChunk = new Uint8Array(100 * 1024 * 1024 + 1);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(oversizedChunk);
        controller.close();
      },
    });
    const request = new Request("http://localhost/repo/git-receive-pack", {
      body: stream as BodyInit,
      duplex: "half" as RequestDuplex,
      headers: {
        "content-length": "1",
      },
      method: "POST",
    });

    await expect(createSmartHttpRequestBodySource(request)).rejects.toBeInstanceOf(
      SmartHttpPayloadTooLargeError,
    );
  });
});
