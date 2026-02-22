import { contextBridge, ipcRenderer } from "electron";
import { electronAPI } from "@electron-toolkit/preload";

// Custom APIs for renderer
const api = {
  runInstaller: (path) => ipcRenderer.invoke("run-installer", path),
  selectFile: () => ipcRenderer.invoke("select-file"),
  selectFolder: (options) => ipcRenderer.invoke("select-folder", options),
  searchWinget: (query) => ipcRenderer.invoke("search-winget", query),
  checkWingetStatus: () => ipcRenderer.invoke("check-winget-status"),
  installWinget: () => ipcRenderer.invoke("install-winget"),
  backupDrivers: (payload, taskKey) =>
    ipcRenderer.invoke("backup-drivers", payload, taskKey),
  restoreDrivers: (payload, taskKey) =>
    ipcRenderer.invoke("restore-drivers", payload, taskKey),
  cleanSystemRam: (taskKey) => ipcRenderer.invoke("clean-system-ram", taskKey),
  cleanSystemDisk: (taskKey) =>
    ipcRenderer.invoke("clean-system-disk", taskKey),
  getSysInfo: () => ipcRenderer.invoke("get-sys-info"),
  getPerformanceMetrics: () => ipcRenderer.invoke("get-performance-metrics"),
  runBenchmark: (benchmarkType, options) =>
    ipcRenderer.invoke("run-benchmark", benchmarkType, options),
  getDiskHealthAll: () => ipcRenderer.invoke("get-disk-health-all"),
  getOfficeLocal: () => ipcRenderer.invoke("get-office-local"),
  installOfficeLocal: (isoPath) =>
    ipcRenderer.invoke("install-office-local", isoPath),
  installOfficeOnline: (payload, taskKey) =>
    ipcRenderer.invoke("install-office-online", payload, taskKey),
  cleanOffice: (taskKey) => ipcRenderer.invoke("clean-office-c2r", taskKey),
  launchRevo: () => ipcRenderer.invoke("launch-revo"),
  activeWindows: () => ipcRenderer.invoke("active-windows"),
  activeOffice: (type = "standard") =>
    ipcRenderer.invoke("active-office", type),
  cancelInstallation: (path) => ipcRenderer.invoke("cancel-installation", path),
  deleteFile: (path) => ipcRenderer.invoke("delete-file", path),
  saveLibrary: (data) => ipcRenderer.invoke("save-library", data),
  loadLibrary: () => ipcRenderer.invoke("load-library"),
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  wingetSourceUpdate: () => ipcRenderer.invoke("winget-source-update"),
  getInstalledApps: (options) =>
    ipcRenderer.invoke("get-installed-apps", options),
  onInstalledAppsUpdated: (callback) => {
    if (typeof callback !== "function") return () => {};
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("installed-apps-updated", listener);
    return () => ipcRenderer.removeListener("installed-apps-updated", listener);
  },

  openExternal: (url) => ipcRenderer.invoke("open-external", url),
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = electronAPI;
  window.api = api;
}
