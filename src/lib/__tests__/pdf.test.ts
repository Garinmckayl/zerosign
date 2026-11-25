import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import {
  decodePngDataUrl,
  embedSignatureOnFirstPage,
  inspectPdf,
} from "../pdf";

// Valid 1x1 transparent PNG
const SAMPLE_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

async function makeBlankPdf(pageCount = 1): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    doc.addPage([612, 792]);
  }
  return doc.save();
}

describe("PDF signature embedding", () => {
  it("inspects page count and dimensions of a PDF", async () => {
    const pdfBytes = await makeBlankPdf(2);
    const meta = await inspectPdf(pdfBytes);

    expect(meta.pageCount).toBe(2);
    expect(meta.pageWidth).toBe(612);
    expect(meta.pageHeight).toBe(792);
  });

  it("embeds a PNG signature onto page 1 and preserves valid PDF structure", async () => {
    const originalPdf = await makeBlankPdf(2);
    const sigBytes = decodePngDataUrl(
      `data:image/png;base64,${SAMPLE_PNG_BASE64}`
    );

    const signedPdf = await embedSignatureOnFirstPage(originalPdf, sigBytes, {
      xPercent: 0.5,
      yPercent: 0.75,
      widthPercent: 0.3,
    });

    expect(signedPdf.byteLength).toBeGreaterThan(originalPdf.byteLength);

    const loaded = await PDFDocument.load(signedPdf);
    expect(loaded.getPageCount()).toBe(2);
    expect(loaded.getPage(0).getSize()).toEqual({ width: 612, height: 792 });
  });

  it("rejects out-of-range placement coordinates", async () => {
    const originalPdf = await makeBlankPdf(1);
    const sigBytes = decodePngDataUrl(SAMPLE_PNG_BASE64);

    await expect(
      embedSignatureOnFirstPage(originalPdf, sigBytes, {
        xPercent: 1.5,
        yPercent: 0.5,
      })
    ).rejects.toThrow(/coordinates/i);
  });
});
