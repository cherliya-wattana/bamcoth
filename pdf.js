import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import fs from "node:fs/promises";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "8mb",
    },
    responseLimit: false,
  },
  maxDuration: 60,
};

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw.trim() ? JSON.parse(raw) : {};
}

function getRequestOrigin(req) {
  const forwardedHost = req.headers["x-forwarded-host"];
  const host = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost || req.headers.host;
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto || "https";
  return `${protocol}://${host}`;
}

function validatePayload(payload) {
  if (!payload || typeof payload !== "object") throw new Error("ไม่พบข้อมูลสำหรับสร้าง PDF");
  if (!payload.debtorName) throw new Error("กรุณาเลือกลูกหนี้ก่อนสร้างใบสรุปนำเสนอ");
  if (!payload.clientCode) throw new Error("ไม่พบรหัสลูกค้าในข้อมูลลูกหนี้");
  if (!payload.objective) throw new Error("กรุณากรอกวัตถุประสงค์ก่อนสร้าง PDF");
  if (!Array.isArray(payload.purposeFor) || payload.purposeFor.length === 0) {
    throw new Error("กรุณาเลือกจุดประสงค์เพื่ออย่างน้อย 1 รายการ");
  }
  if (!Array.isArray(payload.recipients) || payload.recipients.length === 0) {
    throw new Error("กรุณาเลือกช่องเรียนอย่างน้อย 1 รายการ");
  }
}

function buildPreviewPayload(payload) {
  return payload.__preview ?? {
    debtor: {
      customerId: payload.clientCode,
      debtorName: payload.debtorName,
      portfolio: payload.portfolio,
      department: payload.department,
      team: payload.team,
    },
    reportData: [],
    debtTemplate: "",
  };
}

const documentFontFamily = `"Angsana New", "Noto Sans Thai", serif`;

const angsanaFontCandidates = [
  {
    family: "Angsana New",
    weight: "400 700",
    path: new URL("../../fonts/AngsanaNew.ttc", import.meta.url),
    format: "truetype-collection",
  },
  {
    family: "Angsana New",
    weight: "400 700",
    path: new URL("../../fonts/angsana.ttc", import.meta.url),
    format: "truetype-collection",
  },
  {
    family: "Angsana New",
    weight: "400 700",
    path: new URL("../../fonts/AngsanaNew.ttf", import.meta.url),
    format: "truetype",
  },
];

const notoThaiFontFiles = [
  { family: "Noto Sans Thai", weight: 400, path: new URL("../../fonts/NotoSansThai-Regular.ttf", import.meta.url) },
  { family: "Noto Sans Thai", weight: 500, path: new URL("../../fonts/NotoSansThai-Medium.ttf", import.meta.url) },
  { family: "Noto Sans Thai", weight: 600, path: new URL("../../fonts/NotoSansThai-SemiBold.ttf", import.meta.url) },
  { family: "Noto Sans Thai", weight: 700, path: new URL("../../fonts/NotoSansThai-Bold.ttf", import.meta.url) },
];

let thaiFontCssCache;

async function buildThaiFontCss() {
  if (thaiFontCssCache) return thaiFontCssCache;

  const availableAngsana = await findFirstExistingFont(angsanaFontCandidates);
  const fontsToEmbed = availableAngsana ? [availableAngsana, ...notoThaiFontFiles] : notoThaiFontFiles;

  const fontFaces = (
    await Promise.all(
      fontsToEmbed.map(async (font) => {
        const bytes = await readFontBytes(font.path);
        if (!bytes) return "";
        return `
@font-face {
  font-family: "${font.family}";
  font-style: normal;
  font-weight: ${font.weight};
  src: url(data:font/${font.format ?? "truetype"};base64,${bytes.toString("base64")}) format("${font.format ?? "truetype"}");
}`;
      }),
    )
  ).filter(Boolean);

  thaiFontCssCache = `
${fontFaces.join("\n")}
.print-document,
.print-document * {
  font-family: ${documentFontFamily} !important;
}`;
  return thaiFontCssCache;
}

async function findFirstExistingFont(fonts) {
  for (const font of fonts) {
    if (await readFontBytes(font.path)) return font;
  }
  return null;
}

async function readFontBytes(fontPath) {
  try {
    return await fs.readFile(fontPath);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function renderPdfFromPreview(origin, previewPayload) {
  const headlessType = "shell";
  const thaiFontCss = await buildThaiFontCss();
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: {
      width: 794,
      height: 1123,
      deviceScaleFactor: 1,
      isMobile: false,
      isLandscape: false,
      hasTouch: false,
    },
    executablePath: await chromium.executablePath(),
    headless: headlessType,
  });

  try {
    const page = await browser.newPage();

    await page.evaluateOnNewDocument((payload) => {
      window.__PDF_PREVIEW_PAYLOAD__ = payload;
    }, previewPayload);

    await page.goto(origin, {
      waitUntil: "networkidle0",
      timeout: 45_000,
    });
    await page.addStyleTag({ content: thaiFontCss });
    await page.waitForSelector(".print-page", { timeout: 20_000 });
    await page.evaluate(() => document.fonts?.ready?.then(() => true));
    await page.emulateMediaType("print");

    return await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0",
      },
    });
  } finally {
    await browser.close();
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).send("Method Not Allowed");
    return;
  }

  try {
    const payload = await readJsonBody(req);
    validatePayload(payload);

    const pdfBuffer = Buffer.from(await renderPdfFromPreview(getRequestOrigin(req), buildPreviewPayload(payload)));
    const encodedName = encodeURIComponent("ใบสรุปนำเสนอ.pdf");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodedName}`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.status(200).send(pdfBuffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).send(message);
  }
}
