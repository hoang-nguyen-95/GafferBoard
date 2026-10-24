// Hai bản build từ cùng một mã nguồn (chọn bằng biến NEXT_PUBLIC_TARGET lúc build):
//  - "web"     (mặc định): trang cẩm nang + trang tải ứng dụng, đưa lên Netlify/Cloudflare Pages. Không có công cụ phân tích.
//  - "desktop": toàn bộ công cụ phân tích, được đóng gói trong ứng dụng Windows (desktop/).
export const TARGET: "web" | "desktop" = process.env.NEXT_PUBLIC_TARGET === "desktop" ? "desktop" : "web";
export const IS_DESKTOP_BUILD = TARGET === "desktop";
