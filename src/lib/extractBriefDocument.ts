// Client-side text extraction for uploaded brief documents.
// Supports PDF (via pdfjs-dist), plain text/markdown, and a best-effort fallback.

import * as pdfjsLib from "pdfjs-dist";
// Vite serves the worker as a URL — required for pdfjs-dist v3+.
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const MAX_CHARS = 60_000; // ~15k tokens — well under Gemini context

export interface ExtractedDoc {
  text: string;
  pages: number;
  truncated: boolean;
}

export async function extractTextFromFile(file: File): Promise<ExtractedDoc> {
  const name = file.name.toLowerCase();
  const type = (file.type || "").toLowerCase();

  // Plain text-ish formats
  if (
    type.startsWith("text/") ||
    name.endsWith(".txt") ||
    name.endsWith(".md") ||
    name.endsWith(".markdown") ||
    name.endsWith(".csv")
  ) {
    const raw = await file.text();
    const truncated = raw.length > MAX_CHARS;
    return { text: raw.slice(0, MAX_CHARS), pages: 1, truncated };
  }

  // PDF
  if (type === "application/pdf" || name.endsWith(".pdf")) {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let out = "";
    let truncated = false;
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((it: any) => (typeof it.str === "string" ? it.str : ""))
        .join(" ");
      out += `\n\n--- Page ${i} ---\n${pageText}`;
      if (out.length > MAX_CHARS) {
        truncated = true;
        out = out.slice(0, MAX_CHARS);
        break;
      }
    }
    return { text: out.trim(), pages: pdf.numPages, truncated };
  }

  throw new Error(
    "Unsupported file. Upload a PDF, .txt, .md, or paste the contents into the Type tab.",
  );
}

/**
 * Render the first page of a PDF to a JPEG so it can be routed through a
 * vision model when text extraction returns nothing (i.e. scanned decks).
 */
export async function renderPdfFirstPageToImage(
  file: File,
  maxWidth = 1400,
): Promise<{ base64: string; mime: string }> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1 });
  const scale = Math.min(maxWidth / viewport.width, 2);
  const scaled = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(scaled.width);
  canvas.height = Math.floor(scaled.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  await page.render({ canvasContext: ctx, viewport: scaled } as any).promise;
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  const base64 = dataUrl.split(",")[1] || "";
  return { base64, mime: "image/jpeg" };
}
