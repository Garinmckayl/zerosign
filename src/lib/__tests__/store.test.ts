import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { afterEach, describe, expect, it } from "vitest";
import { createDatabase } from "@/db";
import { decodePngDataUrl } from "../pdf";
import { DocumentStore } from "../store";

const SAMPLE_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir && fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

async function createSamplePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([612, 792]);
  return doc.save();
}

describe("DocumentStore (SQLite + Drizzle)", () => {
  it("stores, lists, signs, and reads back a signed PDF", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "zerosign-test-"));
    tempDirs.push(tmpDir);

    const { db, sqlite } = createDatabase(path.join(tmpDir, "test.db"));
    const store = new DocumentStore({
      db,
      uploadDir: path.join(tmpDir, "uploads"),
    });

    const pdfBytes = await createSamplePdf();
    const created = await store.createDocument({
      filename: "nda-agreement.pdf",
      pdfBytes,
    });

    expect(created.status).toBe("draft");
    expect(created.title).toBe("nda-agreement");
    expect(store.listDocuments()).toHaveLength(1);

    const signed = await store.signDocument({
      id: created.id,
      signaturePngBytes: decodePngDataUrl(SAMPLE_PNG_BASE64),
      placement: { xPercent: 0.65, yPercent: 0.8 },
      signerName: "Ada Lovelace",
    });

    expect(signed.status).toBe("signed");
    expect(signed.signerName).toBe("Ada Lovelace");
    expect(signed.signedPath).toBeTruthy();

    const signedFile = store.readDocumentBytes(created.id, "signed");
    expect(signedFile).not.toBeNull();
    expect(signedFile?.filename).toBe("nda-agreement-signed.pdf");
    expect(signedFile!.bytes.byteLength).toBeGreaterThan(pdfBytes.byteLength);

    sqlite.close();
  });
});
