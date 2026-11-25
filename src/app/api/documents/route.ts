import { NextResponse } from "next/server";
import { getDocumentStore } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  const store = getDocumentStore();
  return NextResponse.json({ documents: store.listDocuments() });
}

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Upload a PDF file under the `file` field." },
      { status: 400 }
    );
  }

  if (
    file.type !== "application/pdf" &&
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    return NextResponse.json(
      { error: "Only PDF files are supported." },
      { status: 400 }
    );
  }

  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json(
      { error: "PDF file exceeds the 20MB limit." },
      { status: 400 }
    );
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const store = getDocumentStore();
    const doc = await store.createDocument({
      filename: file.name,
      pdfBytes: new Uint8Array(arrayBuffer),
    });
    return NextResponse.json({ document: doc }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to process PDF upload.",
      },
      { status: 400 }
    );
  }
}
