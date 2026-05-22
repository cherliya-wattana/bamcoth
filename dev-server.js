import { createServer as createHttpServer } from "node:http";
import { createServer as createViteServer } from "vite";
import fs from "node:fs/promises";
import { generatePresentationPdf, getPresentationPreviewPayload } from "./generatePresentationPdf.js";

function getArgValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`));
  return inline ? inline.slice(name.length + 1) : fallback;
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}

function safeJsonForHtml(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

const host = getArgValue("--host", "127.0.0.1");
const port = Number(getArgValue("--port", process.env.PORT || "5173"));

const vite = await createViteServer({
  appType: "spa",
  server: { middlewareMode: true, allowedHosts: true },
});

const server = createHttpServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname.startsWith("/pdf-preview/")) {
      const jobId = decodeURIComponent(url.pathname.split("/").pop() || "");
      const previewPayload = getPresentationPreviewPayload(jobId);
      if (!previewPayload) {
        sendText(res, 404, "Preview payload not found");
        return;
      }

      const html = await vite.transformIndexHtml(
        req.url ?? "/pdf-preview",
        `<!doctype html>
<html lang="th">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ใบสรุปนำเสนอ PDF Preview</title>
    <script>window.__PDF_PREVIEW_PAYLOAD__=${safeJsonForHtml(previewPayload)};</script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`,
      );
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/presentation-summary/pdf") {
      const payload = await readJsonBody(req);
      const origin = `${url.protocol}//${url.host}`;
      const pdfPath = await generatePresentationPdf(payload, { origin });
      const pdfBuffer = await fs.readFile(pdfPath);
      const encodedName = encodeURIComponent("ใบสรุปนำเสนอ.pdf");

      res.writeHead(200, {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodedName}`,
        "Content-Length": pdfBuffer.length,
        "X-Generated-Pdf-Path": encodeURIComponent(pdfPath),
      });
      res.end(pdfBuffer);
      return;
    }

    if (url.pathname.startsWith("/api/")) {
      sendText(res, 404, "API endpoint not found");
      return;
    }

    vite.middlewares(req, res);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    sendText(res, 500, message);
  }
});

server.listen(port, host, () => {
  console.log(`Dev server running at http://${host}:${port}/`);
});
