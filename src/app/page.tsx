import { getDocumentStore } from "@/lib/store";
import { ZeroSignWorkbench } from "@/components/zerosign-workbench";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const store = getDocumentStore();
  const initialDocs = store.listDocuments().map((doc) => ({
    id: doc.id,
    title: doc.title,
    originalFilename: doc.originalFilename,
    pageCount: doc.pageCount,
    pageWidth: doc.pageWidth,
    pageHeight: doc.pageHeight,
    status: doc.status,
    signerName: doc.signerName,
    signedAt: doc.signedAt ? doc.signedAt.toISOString() : null,
    createdAt: doc.createdAt.toISOString(),
  }));

  return <ZeroSignWorkbench initialDocuments={initialDocs} />;
}
