import { NextResponse } from "next/server";
import { getDocumentStore } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const variant = searchParams.get("variant") === "signed" ? "signed" : "original";
  const download = searchParams.get("download") === "1";

  const store = getDocumentStore();
  const result = store.readDocumentBytes(id, variant);

  if (!result) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  return new NextResponse(Buffer.from(result.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${result.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
