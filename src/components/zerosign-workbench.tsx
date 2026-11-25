"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eraser,
  FileText,
  PenTool,
  Type,
  Upload,
} from "lucide-react";

export interface DocumentItem {
  id: string;
  title: string;
  originalFilename: string;
  pageCount: number;
  pageWidth: number;
  pageHeight: number;
  status: "draft" | "signed";
  signerName: string | null;
  signedAt: string | null;
  createdAt: string;
}

interface ZeroSignWorkbenchProps {
  initialDocuments: DocumentItem[];
}

export function ZeroSignWorkbench({
  initialDocuments,
}: ZeroSignWorkbenchProps) {
  const [docs, setDocs] = useState<DocumentItem[]>(initialDocuments);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialDocuments[0]?.id ?? null
  );
  const [uploading, setUploading] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Signature pad state
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [typedName, setTypedName] = useState("Jane Doe");
  const [signerName, setSignerName] = useState("Jane Doe");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  // Page 1 click placement (normalized 0..1)
  const [placement, setPlacement] = useState({ xPercent: 0.72, yPercent: 0.82 });

  const selectedDoc = docs.find((d) => d.id === selectedId) ?? null;

  // Render typed signature cleanly onto canvas whenever mode === "type"
  useEffect(() => {
    if (mode !== "type") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!typedName.trim()) {
      setSignatureDataUrl(null);
      return;
    }

    ctx.fillStyle = "#111827";
    ctx.font = 'italic 44px "Snell Roundhand", "Brush Script MT", Georgia, serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(typedName.trim(), canvas.width / 2, canvas.height / 2);
    setSignatureDataUrl(canvas.toDataURL("image/png"));
  }, [mode, typedName]);

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureDataUrl(null);
  }

  function getCanvasPoint(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (mode !== "draw") return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const pt = getCanvasPoint(e);
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (mode !== "draw" || !isDrawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pt = getCanvasPoint(e);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  }

  function handlePointerUp() {
    if (mode !== "draw" || !isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureDataUrl(canvas.toDataURL("image/png"));
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/documents", { method: "POST", body: fd });
      const data = (await res.json()) as {
        document?: DocumentItem;
        error?: string;
      };
      if (!res.ok || !data.document) {
        setError(data.error ?? "Upload failed.");
        return;
      }
      setDocs((prev) => [data.document!, ...prev]);
      setSelectedId(data.document.id);
      setCurrentPage(1);
    } catch {
      setError("Network error during upload.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function handlePageClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPercent = Math.max(0.08, Math.min(0.92, (e.clientX - rect.left) / rect.width));
    const yPercent = Math.max(0.06, Math.min(0.94, (e.clientY - rect.top) / rect.height));
    setPlacement({ xPercent, yPercent });
  }

  async function handleEmbedSignature() {
    if (!selectedDoc) return;
    if (!signatureDataUrl) {
      setError("Draw or type a signature first.");
      return;
    }

    setError(null);
    setSigning(true);
    try {
      const res = await fetch(`/api/documents/${selectedDoc.id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signatureDataUrl,
          pageNumber: currentPage,
          xPercent: placement.xPercent,
          yPercent: placement.yPercent,
          widthPercent: 0.28,
          signerName: signerName.trim() || "Signer",
        }),
      });
      const data = (await res.json()) as {
        document?: DocumentItem;
        error?: string;
      };
      if (!res.ok || !data.document) {
        setError(data.error ?? "Signing failed.");
        return;
      }
      setDocs((prev) =>
        prev.map((d) => (d.id === data.document!.id ? data.document! : d))
      );
    } catch {
      setError("Network error while embedding signature.");
    } finally {
      setSigning(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0c0c0e] text-[#f4f2ec]">
      <header className="border-b border-white/10 bg-[#111114]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/[0.06]">
              <PenTool className="h-4 w-4 text-[#f5efe6]" />
            </div>
            <span className="text-base font-semibold tracking-tight text-[#f5efe6]">
              ZeroSign
            </span>
            <span className="rounded border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] text-[#a8a49c]">
              v0.1 · self-hosted
            </span>
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#f5efe6] px-4 py-2 text-xs font-semibold text-[#0c0c0e] transition-opacity hover:opacity-90">
            <Upload className="h-3.5 w-3.5" />
            {uploading ? "Uploading..." : "Upload PDF"}
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-12">
        {/* Left Sidebar: Documents + Signature Pad */}
        <section className="space-y-6 lg:col-span-5">
          {/* Document List */}
          <div className="rounded-xl border border-white/10 bg-[#141417] p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#a8a49c]">
              Documents ({docs.length})
            </h2>
            {docs.length === 0 ? (
              <p className="py-4 text-center text-xs text-[#78756e]">
                Upload a PDF to start signing.
              </p>
            ) : (
              <div className="max-h-48 space-y-1.5 overflow-y-auto">
                {docs.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(doc.id);
                      setCurrentPage(1);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                      doc.id === selectedId
                        ? "border-[#f5efe6]/30 bg-white/[0.07] text-[#f5efe6]"
                        : "border-transparent bg-[#0c0c0e] text-[#c8c4bc] hover:border-white/10"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <FileText className="h-3.5 w-3.5 shrink-0 text-[#a8a49c]" />
                      <span className="truncate font-medium">{doc.title}</span>
                    </span>
                    <span
                      className={`ml-2 shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] ${
                        doc.status === "signed"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-white/[0.06] text-[#a8a49c]"
                      }`}
                    >
                      {doc.status}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Signature Pad */}
          <div className="rounded-xl border border-white/10 bg-[#141417] p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#a8a49c]">
                1. Create Signature
              </h2>
              <div className="flex rounded-lg border border-white/10 bg-[#0c0c0e] p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setMode("draw");
                    clearCanvas();
                  }}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 cursor-pointer ${
                    mode === "draw"
                      ? "bg-[#f5efe6] font-semibold text-[#0c0c0e]"
                      : "text-[#a8a49c]"
                  }`}
                >
                  <PenTool className="h-3 w-3" />
                  Draw
                </button>
                <button
                  type="button"
                  onClick={() => setMode("type")}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 cursor-pointer ${
                    mode === "type"
                      ? "bg-[#f5efe6] font-semibold text-[#0c0c0e]"
                      : "text-[#a8a49c]"
                  }`}
                >
                  <Type className="h-3 w-3" />
                  Type
                </button>
              </div>
            </div>

            {mode === "type" && (
              <input
                type="text"
                value={typedName}
                onChange={(e) => {
                  setTypedName(e.target.value);
                  setSignerName(e.target.value);
                }}
                placeholder="Type your signature"
                className="w-full rounded-lg border border-white/10 bg-[#0c0c0e] px-3 py-2 text-sm text-[#f5efe6] outline-none focus:border-[#f5efe6]/40"
              />
            )}

            <div className="relative overflow-hidden rounded-lg border border-white/15 bg-white">
              <canvas
                ref={canvasRef}
                width={420}
                height={140}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                className="h-36 w-full touch-none cursor-crosshair"
              />
              {mode === "draw" && (
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="absolute right-2 top-2 inline-flex items-center gap-1 rounded bg-zinc-900/80 px-2 py-1 text-[11px] text-white hover:bg-zinc-900 cursor-pointer"
                >
                  <Eraser className="h-3 w-3" />
                  Clear
                </button>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-[#a8a49c]">Signer Name</label>
              <input
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Your full name"
                className="w-full rounded-lg border border-white/10 bg-[#0c0c0e] px-3 py-2 text-xs text-[#f5efe6] outline-none focus:border-[#f5efe6]/40"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {error}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleEmbedSignature}
                disabled={!selectedDoc || !signatureDataUrl || signing}
                className="flex-1 rounded-lg bg-[#f5efe6] px-4 py-2.5 text-xs font-semibold text-[#0c0c0e] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              >
                {signing ? "Embedding Signature..." : `Sign Page ${currentPage} with pdf-lib`}
              </button>

              {selectedDoc?.status === "signed" && (
                <a
                  href={`/api/documents/${selectedDoc.id}/file?variant=signed&download=1`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-500/15 px-4 py-2.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Signed PDF
                </a>
              )}
            </div>
          </div>
        </section>

        {/* Right Panel: Interactive Page 1 Placement Preview */}
        <section className="lg:col-span-7">
          <div className="rounded-xl border border-white/10 bg-[#141417] p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#a8a49c]">
                  2. Click Page 1 to Place Signature
                </h2>
                <p className="text-[11px] text-[#78756e]">
                  Position: X {Math.round(placement.xPercent * 100)}% · Y{" "}
                  {Math.round(placement.yPercent * 100)}%
                </p>
              </div>
              {selectedDoc?.status === "signed" && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Signed by {selectedDoc.signerName || "Signer"}
                </span>
              )}
            </div>

            {selectedDoc && selectedDoc.pageCount > 1 && (
              <div className="mb-3 flex items-center justify-center gap-3" aria-label="PDF page navigation">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage <= 1}
                  aria-label="Previous page"
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-[#0c0c0e] px-3 py-2 text-xs text-[#f5efe6] hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Previous
                </button>
                <span className="min-w-20 text-center font-mono text-xs text-[#c8c4bc]" aria-live="polite">
                  Page {currentPage} of {selectedDoc.pageCount}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(selectedDoc.pageCount, page + 1))}
                  disabled={currentPage >= selectedDoc.pageCount}
                  aria-label="Next page"
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-[#0c0c0e] px-3 py-2 text-xs text-[#f5efe6] hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {!selectedDoc ? (
              <div className="flex h-[520px] flex-col items-center justify-center rounded-lg border border-dashed border-white/15 bg-[#0c0c0e] text-center">
                <FileText className="mb-3 h-8 w-8 text-[#78756e]" />
                <p className="text-sm font-medium text-[#f5efe6]">
                  No PDF selected
                </p>
                <p className="mt-1 text-xs text-[#78756e]">
                  Upload any PDF using the button in the top-right to begin.
                </p>
              </div>
            ) : (
              <div
                onClick={handlePageClick}
                style={{
                  aspectRatio: `${selectedDoc.pageWidth} / ${selectedDoc.pageHeight}`,
                }}
                className="relative mx-auto w-full max-w-[540px] cursor-crosshair overflow-hidden rounded-lg border border-white/15 bg-white shadow-xl"
              >
                <iframe
                  key={`${selectedDoc.id}-${selectedDoc.status}-${selectedDoc.signedAt ?? "draft"}`}
                  src={`/api/documents/${selectedDoc.id}/file?variant=${selectedDoc.status === "signed" ? "signed" : "original"}#page=${currentPage}&toolbar=0&navpanes=0`}
                  title={selectedDoc.title}
                  className="pointer-events-none h-full w-full"
                />

                {/* Clickable Placement Overlay */}
                <div className="absolute inset-0 bg-transparent">
                  <div
                    style={{
                      left: `${placement.xPercent * 100}%`,
                      top: `${placement.yPercent * 100}%`,
                      width: "28%",
                    }}
                    className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded border-2 border-dashed border-sky-500 bg-sky-500/10 p-1 shadow-sm"
                  >
                    {signatureDataUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={signatureDataUrl}
                        alt="Signature placement preview"
                        className="h-auto w-full"
                      />
                    ) : (
                      <div className="py-2 text-center font-mono text-[10px] font-semibold text-sky-700">
                        SIGN HERE
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
