import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CounterPick FC",
  description: "Phân tích đối thủ và gợi ý đấu pháp cho Career Mode (chạy local, offline)",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
