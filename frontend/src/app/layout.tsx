import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { EngineGate } from "@/lib/engine";
import "./globals.css";

export const metadata: Metadata = {
  title: "CounterPick FC",
  description: "Phân tích đối thủ và gợi ý đấu pháp cho Career Mode (chạy ngay trong trình duyệt, dữ liệu không rời máy bạn)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        <EngineGate>{children}</EngineGate>
      </body>
    </html>
  );
}
