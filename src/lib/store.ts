import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { desc, eq } from "drizzle-orm";
import { getDb, type ZeroSignDb } from "@/db";
import { documents, type DocumentRecord } from "@/db/schema";
import {
  embedSignatureOnFirstPage,
  inspectPdf,
  type SignaturePlacement,
} from "./pdf";

export interface DocumentStoreOptions {
  db?: ZeroSignDb;
  uploadDir?: string;
}

export class DocumentStore {
  private readonly db: ZeroSignDb;
  private readonly uploadDir: string;

  constructor(options: DocumentStoreOptions = {}) {
    this.db = options.db ?? getDb();
    this.uploadDir =
      options.uploadDir ??
      process.env.ZEROSIGN_UPLOAD_DIR ??
      path.join(process.cwd(), "data", "uploads");
    fs.mkdirSync(this.uploadDir, { recursive: true });
  }

  async createDocument(params: {
    filename: string;
    pdfBytes: Uint8Array;
    title?: string;
  }): Promise<DocumentRecord> {
    const meta = await inspectPdf(params.pdfBytes);
    const id = crypto.randomUUID();
    const safeName = params.filename.replace(/[^A-Za-z0-9._-]/g, "_") || "document.pdf";
    const originalPath = path.join(this.uploadDir, `${id}-original.pdf`);
    fs.writeFileSync(originalPath, params.pdfBytes);

    const record: DocumentRecord = {
      id,
      title: params.title?.trim() || safeName.replace(/\.pdf$/i, ""),
      originalFilename: safeName,
      originalPath,
      signedPath: null,
      pageCount: meta.pageCount,
      pageWidth: meta.pageWidth,
      pageHeight: meta.pageHeight,
      status: "draft",
      signerName: null,
      signedAt: null,
      createdAt: new Date(),
    };

    this.db.insert(documents).values(record).run();
    return record;
  }

  listDocuments(): DocumentRecord[] {
    return this.db
      .select()
      .from(documents)
      .orderBy(desc(documents.createdAt))
      .all();
  }

  getDocument(id: string): DocumentRecord | undefined {
    return this.db.select().from(documents).where(eq(documents.id, id)).get();
  }

  readDocumentBytes(
    id: string,
    variant: "original" | "signed" = "original"
  ): { bytes: Uint8Array; filename: string; record: DocumentRecord } | null {
    const record = this.getDocument(id);
    if (!record) return null;

    const targetPath =
      variant === "signed" && record.signedPath
        ? record.signedPath
        : record.originalPath;

    if (!fs.existsSync(targetPath)) return null;
    const bytes = new Uint8Array(fs.readFileSync(targetPath));
    const baseName = record.originalFilename.replace(/\.pdf$/i, "");
    const filename =
      variant === "signed" && record.signedPath
        ? `${baseName}-signed.pdf`
        : record.originalFilename;

    return { bytes, filename, record };
  }

  async signDocument(params: {
    id: string;
    signaturePngBytes: Uint8Array;
    placement: SignaturePlacement;
    signerName?: string;
  }): Promise<DocumentRecord> {
    const record = this.getDocument(params.id);
    if (!record) {
      throw new Error("Document not found.");
    }
    if (!fs.existsSync(record.originalPath)) {
      throw new Error("Original PDF file is missing on disk.");
    }

    const originalBytes = new Uint8Array(fs.readFileSync(record.originalPath));
    const signedBytes = await embedSignatureOnFirstPage(
      originalBytes,
      params.signaturePngBytes,
      params.placement
    );

    const signedPath = path.join(this.uploadDir, `${record.id}-signed.pdf`);
    fs.writeFileSync(signedPath, signedBytes);

    const signedAt = new Date();
    this.db
      .update(documents)
      .set({
        signedPath,
        status: "signed",
        signerName: params.signerName?.trim() || "Signer",
        signedAt,
      })
      .where(eq(documents.id, record.id))
      .run();

    const updated = this.getDocument(record.id);
    if (!updated) {
      throw new Error("Failed to reload signed document.");
    }
    return updated;
  }
}

export function getDocumentStore(): DocumentStore {
  return new DocumentStore();
}
