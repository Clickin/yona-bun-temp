// Minimal SMTP catch-box for the differential sweep.
//
// Accepts one message per connection on port 2525 and stores the raw DATA
// payload as .agent/differential/mail-out/{seq}.eml. Implements just enough of
// the protocol for play2-mailplugin (commons-email) and lettre: EHLO/HELO,
// MAIL FROM, RCPT TO, DATA with dot-stuffing, RSET, NOOP, QUIT.
import net from "node:net";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const port = Number(process.env.MAIL_SINK_PORT ?? 2525);
const outDir = process.env.MAIL_SINK_DIR ?? ".agent/differential/mail-out";
mkdirSync(outDir, { recursive: true });

let seq = 0;
const sockets = new Set();

const server = net.createServer((socket) => {
  sockets.add(socket);
  let buffer = "";
  let inData = false;
  let message = [];
  let closed = false;

  const reply = (text) => {
    if (!closed && !socket.destroyed) socket.write(`${text}\r\n`);
  };

  reply("220 parity-mail-sink ESMTP");
  socket.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    let index;
    while ((index = buffer.indexOf("\r\n")) >= 0) {
      const line = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      if (inData) {
        if (line === ".") {
          inData = false;
          seq += 1;
          const file = path.join(outDir, `${String(seq).padStart(4, "0")}.eml`);
          writeFileSync(file, `${message.join("\r\n")}\r\n`);
          message = [];
          reply("250 OK stored");
        } else {
          // SMTP dot-stuffing removes one leading dot from lines beginning "..".
          message.push(line.startsWith("..") ? line.slice(1) : line);
        }
        continue;
      }
      const verb = line.slice(0, 4).toUpperCase();
      if (verb === "EHLO") {
        // EHLO responses are multiline: every line except the final one uses
        // 250- so both commons-email and lettre consume the greeting correctly.
        reply("250-parity-mail-sink");
        reply("250 SIZE 10485760");
      } else if (verb === "HELO") {
        reply("250 parity-mail-sink");
      } else if (verb === "MAIL" || verb === "RCPT") {
        reply("250 OK");
      } else if (verb === "DATA") {
        inData = true;
        message = [];
        reply("354 End data with <CR><LF>.<CR><LF>");
      } else if (verb === "RSET") {
        inData = false;
        message = [];
        reply("250 OK");
      } else if (verb === "NOOP") {
        reply("250 OK");
      } else if (verb === "QUIT") {
        reply("221 Bye");
        closed = true;
        socket.end();
      } else if (line.trim() !== "") {
        reply("250 OK");
      }
    }
  });
  socket.on("close", () => sockets.delete(socket));
  socket.on("error", () => socket.destroy());
});

server.listen(port, "127.0.0.1", () => {
  console.log(`mail-sink listening: 127.0.0.1:${port} -> ${outDir}`);
});

const shutdown = () => {
  for (const socket of sockets) socket.destroy();
  server.close(() => process.exit(0));
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

