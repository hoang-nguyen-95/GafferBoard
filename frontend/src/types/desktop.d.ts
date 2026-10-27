// Cầu nối do ứng dụng desktop (desktop/preload.js) thêm vào window. Không có khi chạy bản web thường.
export {};

declare global {
  interface DesktopState {
    exportDir: string | null;
    leDir: string | null;
    csvCount: number;
    watching: boolean;
    /** Nhịp tim của script xuất lặp trong Live Editor; null nếu chưa thấy. */
    heartbeat: { ageSeconds: number; state: string } | null;
    /** Lần cuối script tự động ghi dữ liệu (theo cp_state.csv); null nếu chưa từng. */
    lastExport: { ageSeconds: number } | null;
    /** Việc ứng dụng đã tự làm: thư mục script/autorun tìm được, số script vừa chép, lỗi (nếu có). */
    setup: { scriptDir: string | null; autorunDirs: string[]; written: number; errors: string[] };
  }
  interface DesktopFile { name: string; sig: string; text: string }
  interface DesktopApi {
    isDesktop: true;
    getState(): Promise<DesktopState>;
    chooseExportDir(): Promise<DesktopState>;
    chooseLeDir(): Promise<DesktopState>;
    installScript(): Promise<{ ok: boolean; path?: string; message: string; files?: { name: string; note: string }[] }>;
    requestExport(): Promise<{ ok: boolean; message: string }>;
    rescan(): Promise<DesktopState>;
    describeExports(): Promise<{ ok: boolean; count: number; text: string }>;
    openFolder(): Promise<void>;
    ready(hasData: boolean): Promise<DesktopState>;
    acknowledge(items: { name: string; sig: string; ok: boolean }[]): void;
    onFiles(cb: (batch: DesktopFile[]) => void): () => void;
  }
  interface Window {
    desktop?: DesktopApi;
  }
}
