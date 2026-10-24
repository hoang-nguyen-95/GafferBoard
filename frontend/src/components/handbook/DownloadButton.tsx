import { INSTALLER_FILE, INSTALLER_URL } from "@/lib/links";

/** Nút tải thẳng file cài đặt: đường dẫn "latest/download" của GitHub trả file về chứ không mở trang. */
export function DownloadButton({ className = "" }: { className?: string }) {
  return (
    <a
      href={INSTALLER_URL}
      download={INSTALLER_FILE}
      className={`inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-base font-semibold text-white shadow hover:bg-emerald-700 ${className}`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v3h16v-3" />
      </svg>
      Tải ứng dụng cho Windows
    </a>
  );
}
