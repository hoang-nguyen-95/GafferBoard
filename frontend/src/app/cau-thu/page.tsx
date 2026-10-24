import { PlayersExplorer } from "@/components/PlayersExplorer";

export const metadata = { title: "Danh sách cầu thủ · CounterPick FC" };

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
      <h1 className="text-3xl font-bold tracking-tight">Danh sách cầu thủ</h1>
      <p className="mt-2 mb-6 max-w-3xl text-zinc-600 dark:text-zinc-400">
        Toàn bộ cầu thủ kèm mọi chỉ số có trong dữ liệu. Lọc theo vị trí, giải, tuổi, OVR; bấm tên cột để sắp xếp; bấm tên cầu thủ để xem phân tích theo phân vị so với cùng vị trí.
      </p>
      <PlayersExplorer />
    </main>
  );
}
