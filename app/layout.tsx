import type { Metadata, Viewport } from "next";
import { Nav } from "@/components/Nav";
import { AuthGate } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "정신나간채점",
  description: "정확·신속·나이스·간단 채점 — 문제집 사진으로 자동 채점",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Nav />
        <main className="mx-auto max-w-3xl px-4 py-6">
          <AuthGate>{children}</AuthGate>
        </main>
      </body>
    </html>
  );
}
