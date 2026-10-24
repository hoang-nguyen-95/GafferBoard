/** Địa chỉ chính thức của trang web (Vercel). */
export const SITE_URL = "https://gaffer-board-eta.vercel.app";
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

/**
 * Ảnh chân dung cầu thủ: KHÔNG nằm trong repo hay bản cài đặt, trình duyệt của người xem tải trực tiếp từ máy chủ ảnh của EA theo mã cầu thủ.
 * Đây đúng là địa chỉ trang đánh giá cầu thủ của EA đang dùng (thư mục FC25, FC26 chưa có); thử 25 cầu thủ OVR>=75 thì 22 có ảnh, OVR<65 thì 7/25. Không có ảnh thì giao diện dùng avatar chữ viết tắt.
 * Đặt chuỗi rỗng để tắt hẳn việc tải ảnh ngoài.
 */
export const PLAYER_PHOTO_URL = "https://ratings-images-prod.pulse.ea.com/FC25/full/player-portraits/p{id}.png?padding=0.7";
export const playerPhotoUrl = (playerId: number) => (PLAYER_PHOTO_URL ? PLAYER_PHOTO_URL.replace("{id}", String(playerId)) : null);
