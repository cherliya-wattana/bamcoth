import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const previewJobs = new Map();

export function getPresentationPreviewPayload(jobId) {
  return previewJobs.get(jobId) ?? null;
}

export async function generatePresentationPdf(payload, options = {}) {
  validatePayload(payload);

  const origin = options.origin || "http://127.0.0.1:5173";
  const jobId = randomUUID();
  const workDir = path.resolve("outputs", "presentation-summary", jobId);
  await fs.mkdir(workDir, { recursive: true });

  const outputPdfPath = path.join(workDir, `presentation-summary-${jobId}.pdf`);
  const previewPayload = payload.__preview ?? {
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

  previewJobs.set(jobId, previewPayload);

  try {
    const previewUrl = `${origin.replace(/\/$/, "")}/pdf-preview/${jobId}`;
    await runBrowserPrint(previewUrl, outputPdfPath, workDir);
    await verifyGeneratedPdf(outputPdfPath);
    return outputPdfPath;
  } finally {
    windowSetTimeoutCleanup(jobId);
  }
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

function browserExecutableCandidates() {
  return [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
}

async function findBrowserExecutables() {
  const browsers = [];
  for (const candidate of browserExecutableCandidates()) {
    try {
      await fs.access(candidate);
      browsers.push(candidate);
    } catch {
      // Try the next installed browser location.
    }
  }
  return browsers;
}

async function findBrowserExecutable() {
  const [browserPath] = await findBrowserExecutables();
  if (browserPath) return browserPath;
  throw new Error("ไม่พบ Chrome หรือ Microsoft Edge สำหรับสร้าง PDF ให้ตรงกับหน้า preview");
}

async function runBrowserPrint(previewUrl, outputPdfPath, workDir) {
  const browserPaths = await findBrowserExecutables();
  if (browserPaths.length === 0) {
    await findBrowserExecutable();
  }

  const errors = [];
  for (const [index, browserPath] of browserPaths.entries()) {
    const profileDir = path.join(workDir, `browser-profile-${index}`);
    try {
      await fs.rm(outputPdfPath, { force: true });
      await runBrowserPrintOnce(browserPath, previewUrl, outputPdfPath, profileDir);
      return;
    } catch (error) {
      errors.push(`${path.basename(browserPath)}: ${error.message}`);
    }
  }

  throw new Error(errors.join("\n\n"));
}

async function runBrowserPrintOnce(browserPath, previewUrl, outputPdfPath, profileDir) {
  await fs.mkdir(profileDir, { recursive: true });

  const args = [
    "--headless=new",
    "--disable-gpu",
    "--disable-gpu-compositing",
    "--disable-dev-shm-usage",
    "--disable-extensions",
    "--disable-background-networking",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "--disable-ipc-flooding-protection",
    "--disable-popup-blocking",
    "--disable-prompt-on-repost",
    "--disable-sync",
    "--force-color-profile=srgb",
    "--hide-scrollbars",
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--no-first-run",
    "--no-default-browser-check",
    "--no-pdf-header-footer",
    "--print-to-pdf-no-header",
    "--disable-features=Translate,AcceptCHFrame,MediaRouter,OptimizationHints,CalculateNativeWinOcclusion,VizDisplayCompositor",
    `--user-data-dir=${profileDir}`,
    `--print-to-pdf=${outputPdfPath}`,
    previewUrl,
  ];

  return new Promise((resolve, reject) => {
    const child = spawn(browserPath, args, { windowsHide: true });
    let stderr = "";
    let stdout = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || stdout || `Browser PDF export exited with code ${code}`));
    });
  });
}

async function verifyGeneratedPdf(pdfPath) {
  const buffer = await fs.readFile(pdfPath);
  if (buffer.length < 1024) throw new Error("PDF ที่สร้างมีขนาดเล็กผิดปกติ");

  const text = buffer.toString("latin1");
  const mediaBoxes = Array.from(text.matchAll(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/g));
  const hasA4MediaBox = mediaBoxes.some((match) => {
    const width = Number(match[1]);
    const height = Number(match[2]);
    return Math.abs(width - 595.32) < 1 && Math.abs(height - 841.92) < 1;
  });
  if (!hasA4MediaBox) {
    throw new Error("ไม่พบขนาดหน้า A4 ใน PDF ที่ export");
  }
}

function windowSetTimeoutCleanup(jobId) {
  setTimeout(() => {
    previewJobs.delete(jobId);
  }, 5 * 60 * 1000).unref?.();
}
