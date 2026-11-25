import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZeroSign — Open-Source Self-Hostable PDF Signing",
  description:
    "Upload a PDF, draw or type your signature, place it on page 1, and download the signed PDF. No subscriptions, no lock-in.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
