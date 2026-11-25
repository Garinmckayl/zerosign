import { PDFDocument } from "pdf-lib";

export interface SignaturePlacement {
  /** Normalized X coordinate (0..1) from left edge of page 1 (center of signature) */
  xPercent: number;
  /** Normalized Y coordinate (0..1) from top edge of page 1 (center of signature) */
  yPercent: number;
  /** Normalized signature box width as fraction of page width (default 0.28) */
  widthPercent?: number;
}

export interface PdfMetadata {
  pageCount: number;
  pageWidth: number;
  pageHeight: number;
}

export function decodePngDataUrl(input: string): Uint8Array {
  const cleaned = input.replace(/^data:image\/png;base64,/, "").trim();
  if (!cleaned) {
    throw new Error("Signature PNG data is empty.");
  }
  const bytes = Buffer.from(cleaned, "base64");
  if (bytes.length < 8) {
    throw new Error("Invalid PNG signature payload.");
  }
  return new Uint8Array(bytes);
}

export async function inspectPdf(pdfBytes: Uint8Array): Promise<PdfMetadata> {
  if (!pdfBytes || pdfBytes.byteLength === 0) {
    throw new Error("PDF file is empty.");
  }
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  if (pages.length === 0) {
    throw new Error("PDF document has no pages.");
  }
  const firstPage = pages[0];
  const { width, height } = firstPage.getSize();
  return {
    pageCount: pages.length,
    pageWidth: Math.round(width),
    pageHeight: Math.round(height),
  };
}

export async function embedSignatureOnFirstPage(
  pdfBytes: Uint8Array,
  signaturePngBytes: Uint8Array,
  placement: SignaturePlacement
): Promise<Uint8Array> {
  if (!pdfBytes || pdfBytes.byteLength === 0) {
    throw new Error("PDF file is empty.");
  }
  if (!signaturePngBytes || signaturePngBytes.byteLength === 0) {
    throw new Error("Signature image is empty.");
  }

  const { xPercent, yPercent, widthPercent = 0.28 } = placement;
  if (
    Number.isNaN(xPercent) ||
    Number.isNaN(yPercent) ||
    xPercent < 0 ||
    xPercent > 1 ||
    yPercent < 0 ||
    yPercent > 1
  ) {
    throw new Error("Signature coordinates must be between 0 and 1.");
  }

  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  if (pages.length === 0) {
    throw new Error("PDF document has no pages.");
  }

  const firstPage = pages[0];
  const { width: pageWidth, height: pageHeight } = firstPage.getSize();

  const pngImage = await pdfDoc.embedPng(signaturePngBytes);
  const targetWidth = Math.max(
    40,
    Math.min(pageWidth * 0.8, pageWidth * Math.max(0.08, Math.min(0.8, widthPercent)))
  );
  const aspectRatio = pngImage.height / Math.max(1, pngImage.width);
  const targetHeight = targetWidth * aspectRatio;

  // Convert top-left normalized browser coordinates into bottom-left PDF coordinates
  const rawX = xPercent * pageWidth - targetWidth / 2;
  const rawY = (1 - yPercent) * pageHeight - targetHeight / 2;

  const clampedX = Math.max(0, Math.min(pageWidth - targetWidth, rawX));
  const clampedY = Math.max(0, Math.min(pageHeight - targetHeight, rawY));

  firstPage.drawImage(pngImage, {
    x: clampedX,
    y: clampedY,
    width: targetWidth,
    height: targetHeight,
  });

  return pdfDoc.save();
}
