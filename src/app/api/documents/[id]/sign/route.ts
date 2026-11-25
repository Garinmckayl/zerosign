import { NextResponse } from "next/server";
import { decodePngDataUrl } from "@/lib/pdf";
import { getDocumentStore } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    signatureDataUrl?: string;
    xPercent?: number;
    yPercent?: number;
    widthPercent?: number;
    signerName?: string;
  } | null;

  if (!body?.signatureDataUrl) {
    return NextResponse.json(
      { error: "signatureDataUrl is required." },
      { status: 400 }
    );
  }

  try {
    const signaturePngBytes = decodePngDataUrl(body.signatureDataUrl);
    const store = getDocumentStore();
    const updated = await store.signDocument({
      id,
      signaturePngBytes,
      placement: {
        xPercent: typeof body.xPercent === "number" ? body.xPercent : 0.5,
        yPercent: typeof body.yPercent === "number" ? body.yPercent : 0.78,
        widthPercent:
          typeof body.widthPercent === "number" ? body.widthPercent : 0.28,
      },
      signerName: body.signerName,
    });

    return NextResponse.json({ document: updated });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to sign PDF document.",
      },
      { status: 400 }
    );
  }
}
