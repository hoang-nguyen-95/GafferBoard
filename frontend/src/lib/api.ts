// Địa chỉ API FastAPI (chỉ dùng phía server của Next.js).
const API_URL = process.env.API_URL ?? "http://localhost:8000";

export type Team = {
  team_id: number;
  name: string;
  league_id: number | null;
  league_name: string | null;
  overall: number | null;
};

export async function apiGet<T>(path: string): Promise<T> {
  // Dữ liệu đổi mỗi khi người dùng nhập file xuất mới -> không được cache.
  const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API ${path} trả về ${res.status}`);
  return res.json() as Promise<T>;
}
