import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { DesktopSync } from "@/lib/desktop";
import { IS_DESKTOP_BUILD } from "@/lib/target";
import { EngineGate } from "@/lib/engine";
import "./globals.css";

export const metadata: Metadata = {
  title: "CounterPick FC",
  description: "Cẩm nang chỉ số cầu thủ và đấu pháp cho FC 26 Career Mode, kèm ứng dụng Windows tự phân tích đối thủ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        {IS_DESKTOP_BUILD && <DesktopSync />}
        <EngineGate>{children}</EngineGate>
        {!IS_DESKTOP_BUILD && <SiteFooter />}
      </body>
    </html>
  );
}
