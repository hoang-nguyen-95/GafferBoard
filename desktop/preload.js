// Cầu nối an toàn giữa giao diện web và tiến trình chính: chỉ mở đúng các thao tác cần thiết.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktop", {
  isDesktop: true,
  getState: () => ipcRenderer.invoke("desktop:get-state"),
  chooseExportDir: () => ipcRenderer.invoke("desktop:choose-export-dir"),
  chooseLeDir: () => ipcRenderer.invoke("desktop:choose-le-dir"),
  installScript: () => ipcRenderer.invoke("desktop:install-script"),
  rescan: () => ipcRenderer.invoke("desktop:rescan"),
  describeExports: () => ipcRenderer.invoke("desktop:describe-exports"),
  openFolder: () => ipcRenderer.invoke("desktop:open-folder"),
  requestExport: () => ipcRenderer.invoke("desktop:request-export"),
  /** Báo giao diện đã sẵn sàng nhận file; `hasData` false thì gửi lại toàn bộ file trong thư mục. */
  ready: (hasData) => ipcRenderer.invoke("desktop:ready", Boolean(hasData)),
  /** Báo kết quả nhập: [{name, sig, ok}] để lần sau không nhập lại file không đổi. */
  acknowledge: (items) => ipcRenderer.send("desktop:ack", items),
  onFiles: (cb) => {
    const handler = (_event, batch) => cb(batch);
    ipcRenderer.on("desktop:files", handler);
    return () => ipcRenderer.removeListener("desktop:files", handler);
  },
});
