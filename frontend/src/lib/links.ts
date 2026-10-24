export const REPO_URL = "https://github.com/hoang-nguyen-95/GafferBoard";
/** Trang các bản phát hành (file .exe do GitHub Actions build, xem docs/desktop.md). */
export const RELEASES_URL = `${REPO_URL}/releases`;
export const RELEASES_LATEST_URL = `${REPO_URL}/releases/latest`;
// Tên file không kèm số phiên bản để đường dẫn "latest/download" luôn trỏ tới bản mới nhất và tải thẳng về máy.
export const INSTALLER_FILE = "CounterPickFC-Setup.exe";
export const PORTABLE_FILE = "CounterPickFC-Portable.exe";
export const INSTALLER_URL = `${REPO_URL}/releases/latest/download/${INSTALLER_FILE}`;
export const PORTABLE_URL = `${REPO_URL}/releases/latest/download/${PORTABLE_FILE}`;
/** Tương thích chỗ cũ. */
export const DESKTOP_DOWNLOAD_URL = RELEASES_LATEST_URL;
