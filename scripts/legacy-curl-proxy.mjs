import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { Buffer } from "node:buffer";

const upstreamBaseUrl = (process.env.YONA_LEGACY_PROXY_UPSTREAM ?? "http://192.168.45.10:9000")
  .replace(/\/$/, "");
const bindHost = process.env.YONA_LEGACY_PROXY_HOST ?? "127.0.0.1";
const bindPort = Number(process.env.YONA_LEGACY_PROXY_PORT ?? "19100");
const requestTimeoutSeconds = process.env.YONA_LEGACY_PROXY_TIMEOUT_SECONDS ?? "30";
const hopByHopHeaders = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

export function upstreamUrlForRequest(baseUrl, requestUrl) {
  const url = new URL(requestUrl ?? "/", baseUrl);
  return url.toString();
}

export function parseCurlHeaderBlock(headerText) {
  const lines = headerText.split(/\r?\n/u).filter(Boolean);
  const statusLine = lines.shift() ?? "";
  const statusMatch = statusLine.match(/^HTTP\/\S+\s+(\d+)/u);
  const status = statusMatch ? Number(statusMatch[1]) : 502;
  const headers = [];
  for (const line of lines) {
    const separator = line.indexOf(":");
    if (separator <= 0) {
      continue;
    }
    const name = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (!hopByHopHeaders.has(name.toLowerCase())) {
      headers.push([name, value]);
    }
  }
  return { status, headers };
}

function responsePartsFromCurlOutput(output) {
  const delimiter = Buffer.from("\r\n\r\n");
  const delimiterIndex = output.indexOf(delimiter);
  if (delimiterIndex < 0) {
    return {
      body: output,
      headers: [],
      status: 502,
    };
  }
  const headerText = output.slice(0, delimiterIndex).toString("latin1");
  const body = output.slice(delimiterIndex + delimiter.length);
  return {
    ...parseCurlHeaderBlock(headerText),
    body,
  };
}

function requestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

function curlArgsForRequest(request, url, body) {
  const args = ["-sS", "--max-time", requestTimeoutSeconds, "-D", "-", "-o", "-"];
  const method = request.method ?? "GET";
  if (method !== "GET") {
    args.push("-X", method);
  }
  for (const [name, value] of Object.entries(request.headers)) {
    const normalized = name.toLowerCase();
    if (hopByHopHeaders.has(normalized) || normalized === "accept-encoding") {
      continue;
    }
    const headerValue = Array.isArray(value) ? value.join(", ") : value;
    if (headerValue) {
      args.push("-H", `${name}: ${headerValue}`);
    }
  }
  if (body.length > 0) {
    args.push("--data-binary", "@-");
  }
  args.push(url);
  return args;
}

async function proxyRequest(request, response) {
  const body = await requestBody(request);
  const url = upstreamUrlForRequest(upstreamBaseUrl, request.url);
  const curl = spawn("curl", curlArgsForRequest(request, url, body), {
    stdio: ["pipe", "pipe", "pipe"],
  });
  const stdoutChunks = [];
  const stderrChunks = [];
  curl.stdout.on("data", (chunk) => stdoutChunks.push(Buffer.from(chunk)));
  curl.stderr.on("data", (chunk) => stderrChunks.push(Buffer.from(chunk)));
  if (body.length > 0) {
    curl.stdin.end(body);
  } else {
    curl.stdin.end();
  }
  const exitCode = await new Promise((resolve) => curl.on("close", resolve));
  if (exitCode !== 0) {
    const message = Buffer.concat(stderrChunks).toString("utf8").trim();
    response.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    response.end(message || `curl exited with code ${exitCode}`);
    return;
  }
  const proxied = responsePartsFromCurlOutput(Buffer.concat(stdoutChunks));
  for (const [name, value] of proxied.headers) {
    response.appendHeader(name, value);
  }
  response.writeHead(proxied.status, { "content-length": String(proxied.body.length) });
  response.end(proxied.body);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const server = createServer((request, response) => {
    proxyRequest(request, response).catch((error) => {
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end(error instanceof Error ? error.message : String(error));
    });
  });
  server.listen(bindPort, bindHost, () => {
    console.log(`legacy curl proxy listening: http://${bindHost}:${bindPort} -> ${upstreamBaseUrl}`);
  });
}
