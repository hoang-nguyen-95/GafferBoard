import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { DesktopSync } from "@/lib/desktop";
import { SITE_URL } from "@/lib/links";
import { IS_DESKTOP_BUILD } from "@/lib/target";
import { EngineGate } from "@/lib/engine";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "CounterPick FC",
  description: "Cẩm nang chỉ số cầu thủ và đấu pháp cho FC 26 Career Mode, kèm ứng dụng Windows tự phân tích đối thủ",
  openGraph: {
    type: "website", siteName: "CounterPick FC", locale: "vi_VN", url: "/",
    title: "CounterPick FC: cẩm nang FC 26 Career Mode",
    description: "Hiểu chỉ số cầu thủ, chọn mua đúng người, đọc đối thủ và lập kế hoạch chuyển nhượng.",
  },
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
