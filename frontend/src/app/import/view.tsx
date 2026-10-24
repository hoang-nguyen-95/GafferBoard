"use client";

import Link from "next/link";
import { useRef, useState, type DragEvent } from "react";
import { expectedFiles, type TableReport } from "@/engine/importer";
import type { Meta } from "@/lib/api";
import { backupUserData, hasData, importFiles, restoreUserData, useApi, useDataVersion, wipeAll } from "@/lib/engine";

const EXPECTED = expectedFiles();
const KNOWN = new Set(EXPECTED.map((e) => e.file));

type Picked = Map<string, File>; // tên file chữ thường -> File

/** Gom mọi file .csv từ thao tác thả (kể cả thả cả thư mục). */
async function collect(dt: DataTransfer): Promise<File[]> {
  const out: File[] = [];
  const walk = async (entry: FileSystemEntry): Promise<void> => {
    if (entry.isFile) {
      const file = await new Promise<File>((res, rej) => (entry as FileSystemFileEntry).file(res, rej));
      out.push(file);
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      for (;;) {
        const batch = await new Promise<FileSystemEntry[]>((res, rej) => reader.readEntries(res, rej));
        if (!batch.length) break;
        for (const e of batch) await walk(e);
      }
    }
  };
  const entries = [...dt.items].map((i) => i.webkitGetAsEntry?.()).filter((e): e is FileSystemEntry => !!e);
  if (entries.length) for (const e of entries) await walk(e);
  else out.push(...dt.files);
  return out;
}

const fmtSize = (n: number) => (n > 1_000_000 ? `${(n / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1000))} KB`);

export default function ImportView() {
  useDataVersion();
  const meta = useApi<Meta>("/meta")?.data ?? null;
  const [picked, setPicked] = useState<Picked>(new Map());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<TableReport[] | null>(null);
  const [over, setOver] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const filesInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const restoreInput = useRef<HTMLInputElement>(null);

  function add(files: File[]) {
    const csv = files.filter((f) => f.name.toLowerCase().endsWith(".csv"));
    setPicked((prev) => {
      const next = new Map(prev);
      for (const f of csv) next.set(f.name.toLowerCase(), f);
      return next;
    });
    setReports(null);
    setError(csv.length === 0 && files.length > 0 ? "Chỉ nhận file .csv." : null);
  }

  async function onDrop(e: DragEvent) {
    e.preventDefault();
    setOver(false);
    add(await collect(e.dataTransfer));
  }

  async function run() {
    setBusy(true);
    setError(null);
    setReports(null);
    try {
      const texts = new Map<string, string>();
      for (const [name, file] of picked) if (KNOWN.has(name)) texts.set(name, await file.text());
      await new Promise((r) => setTimeout(r, 30)); // cho trình duyệt kịp vẽ trạng thái "đang nhập" trước khi tính toán nặng
      setReports(await importFiles(texts));
      setPicked(new Map());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không nhập được dữ liệu.");
    } finally {
      setBusy(false);
    }
  }

  function saveBackup() {
    const url = URL.createObjectURL(new Blob([backupUserData()], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `counterpick-du-lieu-ca-nhan-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function restore(file: File | undefined) {
    if (!file) return;
    setNote(null);
    try {
      await restoreUserData(await file.text());
      setNote("Đã khôi phục dữ liệu cá nhân.");
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Không khôi phục được.");
    }
  }

  async function wipe() {
    if (!confirm("Xóa toàn bộ dữ liệu game và dữ liệu cá nhân (ghi chú, kết quả, đội hình nhập tay) khỏi trình duyệt này?")) return;
    await wipeAll();
    setReports(null);
    setNote("Đã xóa.");
  }

  const present = new Set(picked.keys());
  const recognised = [...picked.keys()].filter((n) => KNOWN.has(n));
  const ignored = [...picked.keys()].filter((n) => !KNOWN.has(n));
  const btn = "rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Nhập dữ liệu từ game</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Kéo thả các file CSV bạn xuất từ Live Editor vào khung dưới đây. Mọi thứ được xử lý ngay trong trình duyệt của bạn:
          <strong> không file nào được tải lên máy chủ</strong>, dữ liệu chỉ được lưu trong bộ nhớ của trình duyệt này. Có file mới
          thì nhập lại, ghi chú và kết quả của bạn được giữ nguyên.
        </p>
      </div>

      <section
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={`rounded-lg border-2 border-dashed p-8 text-center ${over ? "border-emerald-500 bg-emerald-500/10" : "border-zinc-300 dark:border-zinc-700"}`}
      >
        <p className="mb-3">Thả file (hoặc cả thư mục) <code>.csv</code> vào đây</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" className={btn} onClick={() => filesInput.current?.click()}>Chọn file…</button>
          <button type="button" className={btn} onClick={() => folderInput.current?.click()}>Chọn thư mục…</button>
        </div>
        <input ref={filesInput} type="file" accept=".csv,text/csv" multiple hidden onChange={(e) => { add([...(e.target.files ?? [])]); e.target.value = ""; }} />
        <input
          ref={(el) => { folderInput.current = el; el?.setAttribute("webkitdirectory", ""); }}
          type="file" multiple hidden onChange={(e) => { add([...(e.target.files ?? [])]); e.target.value = ""; }}
        />
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Các file cần có</h2>
        <ul className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          {EXPECTED.map((e) => (
            <li key={e.file} className="flex items-baseline gap-2">
              <span className={present.has(e.file) ? "text-emerald-600" : "text-zinc-400"}>{present.has(e.file) ? "✓" : "○"}</span>
              <code>{e.file}</code>
              <span className="text-xs text-zinc-500">{e.what}{e.optional ? " (không bắt buộc)" : ""}</span>
            </li>
          ))}
        </ul>
        {recognised.length > 0 && (
          <p className="mt-3 text-xs text-zinc-500">
            Đã chọn {recognised.length} file hợp lệ ({fmtSize(recognised.reduce((n, k) => n + picked.get(k)!.size, 0))}).
            {ignored.length > 0 && ` Bỏ qua ${ignored.length} file không dùng tới: ${ignored.slice(0, 6).join(", ")}${ignored.length > 6 ? "…" : ""}.`}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button" onClick={run} disabled={busy || recognised.length === 0}
            className="rounded bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? "Đang nhập…" : "Nhập dữ liệu"}
          </button>
          {picked.size > 0 && !busy && <button type="button" className={btn} onClick={() => setPicked(new Map())}>Bỏ chọn</button>}
        </div>
        {error && <p className="mt-3 rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400">{error}</p>}
        {reports && (
          <div className="mt-4 rounded border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm">
            <p className="mb-2 font-medium">Nhập xong.</p>
            <ul className="space-y-0.5 text-xs">
              {reports.map((r) => (
                <li key={r.table}>
                  <code>{r.table}</code>:{" "}
                  {r.status === "skipped" ? `bỏ qua (${r.note})` : `đọc ${r.read}, mới ${r.inserted}, cập nhật ${r.updated}, xóa ${r.deleted}`}
                </li>
              ))}
            </ul>
            <p className="mt-3"><Link href="/" className="underline">Về trang chủ →</Link></p>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Chưa có file xuất?</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>Mở FC 26, vào Career Mode và bật Live Editor (phím F9).</li>
          <li>Tạo một thư mục trống để chứa file xuất (vd <code>D:/XboxGames/fc_exports</code>).</li>
          <li><a href="/export_tables.lua" download className="underline">Tải script xuất dữ liệu</a>, mở bằng Notepad và sửa <code>OUT_DIR</code> ở đầu file thành thư mục vừa tạo.</li>
          <li>Live Editor → Features → Lua Engine → dán nội dung script → Execute.</li>
          <li>Quay lại đây, thả các file <code>.csv</code> trong thư mục đó vào khung phía trên.</li>
        </ol>
        <p className="mt-2 text-xs text-zinc-500">
          Script chỉ đọc bảng dữ liệu của game rồi ghi ra CSV; không sửa save hay game. Cần Live Editor do bên thứ ba phát triển,
          dùng cho Career Mode offline và tự chịu trách nhiệm khi dùng.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Dữ liệu đang lưu trên trình duyệt này</h2>
        {hasData() && meta ? (
          <p className="text-sm text-zinc-500">
            {meta.teams} đội, {meta.players} cầu thủ.{" "}
            {meta.last_import_at ? `Nhập lần cuối: ${new Date(meta.last_import_at).toLocaleString("vi-VN")}.` : ""}
          </p>
        ) : (
          <p className="text-sm text-zinc-500">Chưa có dữ liệu.</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={btn} onClick={saveBackup}>Sao lưu dữ liệu cá nhân (.json)</button>
          <button type="button" className={btn} onClick={() => restoreInput.current?.click()}>Khôi phục từ file sao lưu…</button>
          <button type="button" onClick={wipe} className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950">
            Xóa mọi dữ liệu
          </button>
          <input ref={restoreInput} type="file" accept=".json,application/json" hidden onChange={(e) => { void restore(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          Ghi chú, kết quả, đội hình nhập tay và đội bạn chọn chỉ nằm trong trình duyệt này. Xóa dữ liệu trình duyệt là mất, nên hãy sao lưu nếu quan trọng.
        </p>
        {note && <p className="mt-2 text-sm">{note}</p>}
      </section>
    </div>
  );
}
