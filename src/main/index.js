import { app, ipcMain, BrowserWindow, dialog, shell } from "electron";
import path, { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import { spawn, spawnSync, execSync } from "child_process";
import fs from "fs";
import __cjs_mod_local__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod_local__.createRequire(import.meta.url);
function getFileArchitecture(filePath) {
  try {
    const buffer = Buffer.alloc(4096);
    const fd = fs.openSync(filePath, "r");
    fs.readSync(fd, buffer, 0, 4096, 0);
    fs.closeSync(fd);
    const content = buffer.toString("binary");
    const peOffset = buffer.indexOf("PE\0\0");
    if (peOffset !== -1) {
      const machineType = buffer.readUInt16LE(peOffset + 4);
      if (machineType === 34404) return "x64";
      if (machineType === 332) return "x86";
    }
    const name = filePath.toLowerCase();
    if (
      name.includes("x64") ||
      name.includes("64bit") ||
      name.includes("amd64")
    )
      return "x64";
    if (name.includes("x86") || name.includes("32bit") || name.includes("i386"))
      return "x86";
    return "Universal";
  } catch (e) {
    return "Universal";
  }
}
function isRunningAsAdmin() {
  try {
    execSync("netsh interface show interface", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 720,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === "linux"
      ? { icon: path.join(__dirname, "../../build/icon.png") }
      : {}),
    ...(process.platform === "win32"
      ? { icon: path.join(__dirname, "../../build/icon.ico") }
      : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      sandbox: false,
    },
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
    if (process.platform === "win32" && !isRunningAsAdmin()) {
      console.warn(
        "WARNING: Winstaller Hub is not running with administrator privileges.",
      );
      console.warn(
        "WARNING: Some features may not work correctly. Please restart as admin.",
      );
      mainWindow.webContents.send("admin-warning", {
        message:
          "The app is not running with Administrator privileges. Some features may not work correctly. Please restart the app as Administrator.",
      });
    }
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}
app.whenReady().then(() => {
  electronApp.setAppUserModelId("com.electron");
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });
  function getAppsPath() {
    const exeDir = path.dirname(app.getPath("exe"));
    const externalApps = path.join(exeDir, "apps");
    if (fs.existsSync(externalApps)) return externalApps;
    const bundledApps = path.join(app.getAppPath(), "src", "apps");
    if (fs.existsSync(bundledApps)) return bundledApps;
    return bundledApps;
  }
  function getLibraryPath() {
    const appsPath = getAppsPath();
    if (!fs.existsSync(appsPath)) {
      fs.mkdirSync(appsPath, { recursive: true });
    }
    return path.join(appsPath, "installers.json");
  }
  ipcMain.handle("save-library", async (event, data) => {
    try {
      await fs.promises.writeFile(
        getLibraryPath(),
        JSON.stringify(data, null, 2),
        "utf8",
      );
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  ipcMain.handle("load-library", async () => {
    try {
      const libPath = getLibraryPath();
      if (fs.existsSync(libPath)) {
        const content = fs.readFileSync(libPath, "utf-8");
        return JSON.parse(content);
      }
      return [];
    } catch (e) {
      console.error("Failed to load library:", e);
      return [];
    }
  });
  ipcMain.handle("get-app-version", async () => {
    try {
      return app.getVersion();
    } catch (e) {
      return "";
    }
  });
  const runningProcesses = /* @__PURE__ */ new Map();
  const mountedIsos = /* @__PURE__ */ new Set();
  function cleanup() {
    console.log("App quitting: Cleaning up");
    runningProcesses.forEach((child, path2) => {
      try {
        console.log(`Killing process for ${path2} (PID: ${child.pid})`);
        const { execSync: execSync2 } = require2("child_process");
        execSync2(`taskkill /F /T /PID ${child.pid}`);
      } catch (e) {
        try {
          child.kill();
        } catch (err) {}
      }
    });
    runningProcesses.clear();
    if (mountedIsos.size > 0) {
      console.log(`Dismounting ${mountedIsos.size} ISO`);
      const { execSync: execSync2 } = require2("child_process");
      mountedIsos.forEach((isoPath) => {
        try {
          console.log(`Dismounting: ${isoPath}`);
          execSync2(
            `powershell -Command "Dismount-DiskImage -ImagePath '${isoPath}'"`,
          );
        } catch (e) {
          console.error(`Failed to dismount ${isoPath}:`, e.message);
        }
      });
      mountedIsos.clear();
    }
  }
  ipcMain.handle("cancel-installation", async (event, path2) => {
    console.log(`Main process: cancellation requested for ${path2}`);
    const child = runningProcesses.get(path2);
    if (child) {
      try {
        const { exec } = require2("child_process");
        exec(`taskkill /F /T /PID ${child.pid}`, (err) => {
          if (err) {
            console.error(`Error killing process ${child.pid}:`, err);
            child.kill("SIGKILL");
          }
        });
        runningProcesses.delete(path2);
        return { success: true };
      } catch (error) {
        console.error("Error during cancellation:", error);
        return { success: false, error: error.message };
      }
    }
    return { success: false, error: "Process not found" };
  });
  async function checkAppExists(appId) {
    if (!appId.includes(".") && !appId.includes("\\")) return true;
    return new Promise((resolve) => {
      console.log(`Main process: checking if ${appId} exists`);
      const child = spawn("winget", [
        "list",
        "--id",
        appId,
        "--accept-source-agreements",
      ]);
      child.on("close", (code) => resolve(code === 0));
    });
  }
  ipcMain.handle("run-installer", async (event, inputPath) => {
    let installerPath = inputPath;
    if (path.isAbsolute(installerPath) && !fs.existsSync(installerPath)) {
      const fileName = path.basename(installerPath);
      const bundledPath = path.join(getAppsPath(), fileName);
      if (fs.existsSync(bundledPath)) {
        console.log(
          `Portable path resolved: ${installerPath} -> ${bundledPath}`,
        );
        installerPath = bundledPath;
      }
    }
    console.log("Main process: running installer", installerPath);
    const wingetErrors = {
      "0x0": "Installation completed successfully.",
      "0x8A150014": "This app is already installed.",
      "0x8A15002B": "This app is already up to date.",
      "0x8A150019":
        "Administrator privileges are required. Please run the app as Administrator.",
      "0x8A150011":
        "Hash mismatch detected. Please retry or check your network connection.",
      "0x8A150005": "Network error or unable to download package.",
      "0x8A150012": "Package source is unavailable or failed.",
      "0x8A15000F": "No compatible version found for installation.",
      "0x8A15002D": "Installation was canceled by the user.",
      "0x8A150010":
        "No applicable installer found for this system architecture.",
      "0x80070002":
        "Required file was not found. Try removing old versions or install manually (0x80070002).",
      "0x8A150015": "The app is currently in use or locked by another process.",
      "0x8A150017": "A system restart is required to complete installation.",
    };
    return new Promise((resolve) => {
      try {
        const isWinget =
          !installerPath.includes("\\") && !installerPath.includes("/");
        if (isWinget) {
          console.log("Main process: installing via winget", installerPath);
          const psCmd = `
            try {
              $output = & winget install --id "${installerPath}" --exact --silent --accept-package-agreements --accept-source-agreements 2>&1
              exit $LASTEXITCODE
            } catch {
              Write-Error $_
              exit 1
            }
          `;
          const child = spawn(
            "powershell.exe",
            ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", psCmd],
            {
              stdio: ["ignore", "pipe", "pipe"],
            },
          );
          runningProcesses.set(installerPath, child);
          let output = "";
          child.stdout.on("data", (data) => {
            const text = data.toString().trim();
            console.log(`[Winget Out]: ${text}`);
            output += text + "\n";
          });
          child.stderr.on("data", (data) => {
            const text = data.toString().trim();
            console.error(`[Winget Err]: ${text}`);
            output += text + "\n";
          });
          child.on("close", async (code) => {
            console.log(`Winget process exited with code ${code}`);
            runningProcesses.delete(installerPath);
            const unsignedCode = code >>> 0;
            const hexCode = "0x" + unsignedCode.toString(16).toUpperCase();
            let userFriendlyMessage =
              wingetErrors[hexCode] || `Winget system error (${hexCode})`;
            let isActuallySuccess =
              unsignedCode === 0 ||
              unsignedCode === 2316632084 ||
              unsignedCode === 2316632107;
            if (unsignedCode === 0) {
              const exists = await checkAppExists(installerPath);
              if (!exists) {
                isActuallySuccess = false;
                userFriendlyMessage =
                  "Installation reported success, but the app was not found on the system.";
              }
            }
            resolve({
              success: isActuallySuccess,
              method: "winget",
              code,
              hexCode,
              error: isActuallySuccess ? null : userFriendlyMessage,
              alreadyInstalled: unsignedCode === 2316632084,
            });
          });
          child.on("error", (err) => {
            console.error("Winget spawn error:", err);
            resolve({
              success: false,
              error: `Unable to run Winget: ${err.message}`,
            });
          });
        } else {
          console.log("Main process: launching local installer", installerPath);
          const fileName = path.basename(installerPath).toLowerCase();
          if (fileName.endsWith(".iso") || fileName.endsWith(".img")) {
            console.error(
              "Main process: Cannot run ISO/IMG file directly via run-installer.",
            );
            resolve({
              success: false,
              error:
                "ISO/IMG files cannot be launched directly from this action. Use the Office tab flow to mount and install them.",
            });
            return;
          }
          const isZaDark = fileName.includes("zadark");
          let args = [];
          if (installerPath.toLowerCase().endsWith(".msi")) {
            args = ["/quiet", "/qn", "/norestart"];
          } else if (installerPath.toLowerCase().endsWith(".exe")) {
            if (isZaDark) {
              args = ["install"];
            } else if (
              fileName === "setup.exe" ||
              fileName.includes("office") ||
              fileName.includes("visio") ||
              fileName.includes("project")
            ) {
              args = [];
            } else {
              args = ["/S"];
            }
          }
          console.log(
            `Main process: launching ${isZaDark ? "SILENT" : "STANDARD"} installer: ${fileName}`,
          );
          const psCmd = `
            try {
              & "${installerPath}" ${args.map((a) => `"${a}"`).join(" ")}
              exit $LASTEXITCODE
            } catch {
              Write-Error $_
              exit 1
            }
          `;
          const child = spawn(
            "powershell.exe",
            ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", psCmd],
            {
              stdio: ["ignore", "pipe", "pipe"],
            },
          );
          runningProcesses.set(installerPath, child);
          child.stdout.on("data", (data) =>
            console.log(`[Installer Out]: ${data.toString().trim()}`),
          );
          child.stderr.on("data", (data) =>
            console.error(`[Installer Err]: ${data.toString().trim()}`),
          );
          child.on("close", (code) => {
            console.log(`Local installer exited with code ${code}`);
            runningProcesses.delete(installerPath);
            const isSuccess =
              code === 0 || code === 3010 || (isZaDark && code === null);
            resolve({ success: isSuccess, method: "local", code });
          });
          child.on("error", (err) => {
            console.error("Local installer spawn error:", err);
            resolve({
              success: false,
              error: `Launch error: ${err.message}`,
            });
          });
        }
      } catch (error) {
        console.error("Main process: Error spawning installer", error);
        resolve({ success: false, error: error.message });
      }
    });
  });
  ipcMain.handle("search-winget", async (_, query) => {
    console.log("Main process: searching winget for", query);
    return new Promise((resolve) => {
      const child = spawn("winget", [
        "search",
        query,
        "--accept-source-agreements",
      ]);
      let output = "";
      child.stdout.on("data", (data) => (output += data.toString()));
      child.stderr.on("data", (data) =>
        console.error(`[Winget Search Err]: ${data.toString()}`),
      );
      child.on("close", (code) => {
        console.log(`Winget search exited with code ${code}.`);
        const cleanOutput = output.replace(/\x1B\[[0-9;]*[mGJK]/g, "");
        const lines = cleanOutput
          .split(/\r?\n/)
          .map((l) => l.trimEnd())
          .filter((l) => l.trim().length > 0);
        if (lines.length < 2) return resolve([]);
        const sepIndex = lines.findIndex(
          (l) => l.trim().startsWith("---") || l.trim().startsWith("==="),
        );
        const dataLines =
          sepIndex !== -1
            ? lines.slice(sepIndex + 1)
            : lines.filter((l) => !l.includes("Name") && !l.includes("Id"));
        const results = dataLines
          .slice(0, 15)
          .map((line) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.length < 5) return null;
            const parts = trimmed.split(/\s{2,}/);
            if (parts.length >= 2) {
              const name = parts[0];
              const id = parts[1];
              const version = parts[2] || "Unknown";
              if (id && !id.includes(" ") && id.length > 2) {
                return { name, id, version, isWinget: true };
              }
            }
            const allParts = trimmed.split(/\s+/);
            if (allParts.length >= 2) {
              const potentialId = allParts.find(
                (p, i) => i > 0 && (p.includes(".") || p.length > 5),
              );
              if (potentialId) {
                return {
                  name: allParts[0],
                  id: potentialId,
                  version:
                    allParts[allParts.indexOf(potentialId) + 1] || "Unknown",
                  isWinget: true,
                };
              }
            }
            return null;
          })
          .filter(Boolean);
        console.log(
          `Successfully caught ${results.length} results via Smart Parser.`,
        );
        resolve(results);
      });
      child.on("error", (err) => {
        console.error("Winget search spawn error:", err);
        resolve([]);
      });
    });
  });
  ipcMain.handle("select-file", async () => {
    console.log("Main process: select-file triggered");
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win, {
      title: "Select Installer (EXE or MSI)",
      properties: ["openFile"],
      filters: [{ name: "Executables", extensions: ["exe", "msi"] }],
    });
    if (result.canceled) {
      console.log("Main process: select-file canceled");
      return null;
    }
    const sourcePath = result.filePaths[0];
    const fileName = path.basename(sourcePath);
    const targetDir = getAppsPath();
    const targetPath = path.join(targetDir, fileName);
    try {
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      if (sourcePath !== targetPath) {
        console.log(`Copying installer: ${sourcePath} -> ${targetPath}`);
        fs.copyFileSync(sourcePath, targetPath);
      }
      return {
        name: fileName.replace(/\.[^/.]+$/, ""),
        path: targetPath,
        fileName,
        arch: getFileArchitecture(targetPath),
      };
    } catch (error) {
      console.error("Failed to copy installer:", error);
      return {
        name: fileName.replace(/\.[^/.]+$/, ""),
        path: sourcePath,
        fileName,
      };
    }
  });
  ipcMain.handle("select-folder", async (event, options = {}) => {
    console.log("Main process: select-folder triggered");
    const win = BrowserWindow.getFocusedWindow();
    const title =
      options && typeof options.title === "string" && options.title.trim()
        ? options.title.trim()
        : "Select folder";
    const result = await dialog.showOpenDialog(win, {
      title,
      properties: ["openDirectory", "createDirectory", "promptToCreate"],
    });
    if (result.canceled || !Array.isArray(result.filePaths)) return null;
    return result.filePaths[0] || null;
  });
  ipcMain.handle("delete-file", async (event, inputPath) => {
    let filePath = inputPath;
    if (path.isAbsolute(filePath) && !fs.existsSync(filePath)) {
      const fileName = path.basename(filePath);
      const bundledPath = path.join(getAppsPath(), fileName);
      if (fs.existsSync(bundledPath)) filePath = bundledPath;
    }
    console.log("Main process: deleting file", filePath);
    try {
      if (!filePath || typeof filePath !== "string") return { success: false };
      const appsPath = getAppsPath();
      const absolutePath = path.resolve(filePath);
      if (fs.existsSync(absolutePath) && absolutePath.startsWith(appsPath)) {
        await fs.promises.unlink(absolutePath);
        console.log(`Successfully deleted: ${absolutePath}`);
        return { success: true };
      } else {
        console.warn(
          `File not found or outside apps directory: ${absolutePath}`,
        );
        return { success: false, error: "Access denied or file not found" };
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      return { success: false, error: error.message };
    }
  });
  function compareVersions(v1, v2) {
    const parts1 = v1.replace(/^v/, "").split(".").map(Number);
    const parts2 = v2.replace(/^v/, "").split(".").map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    return 0;
  }
  ipcMain.handle("check-winget-status", async () => {
    console.log("Main process: checking winget status");
    const bundledVersion = "v1.9.2514";
    const resolveFromAppInstallerPackage = () => {
      try {
        const psResult = spawnSync(
          "powershell.exe",
          [
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            "$pkg = Get-AppxPackage -Name Microsoft.DesktopAppInstaller -ErrorAction SilentlyContinue | Sort-Object -Property Version -Descending | Select-Object -First 1; if ($pkg) { $pkg.Version.ToString() }",
          ],
          { encoding: "utf8" },
        );
        const versionText = String(psResult.stdout || "").trim();
        if (!versionText) {
          return { status: "missing", bundleVersion: bundledVersion };
        }
        const normalizedVersion = versionText.startsWith("v")
          ? versionText
          : `v${versionText}`;
        const comparison = compareVersions(normalizedVersion, bundledVersion);
        if (comparison < 0) {
          return {
            status: "outdated",
            currentVersion: normalizedVersion,
            bundleVersion: bundledVersion,
          };
        }
        return { status: "ready", currentVersion: normalizedVersion };
      } catch {
        return { status: "missing", bundleVersion: bundledVersion };
      }
    };
    return new Promise((resolve) => {
      const child = spawn("winget", ["--version"]);
      let output = "";
      child.stdout.on("data", (data) => (output += data.toString()));
      child.on("close", (code) => {
        if (code !== 0) {
          resolve(resolveFromAppInstallerPackage());
        } else {
          const currentVersion = output.trim();
          const comparison = compareVersions(currentVersion, bundledVersion);
          if (comparison < 0) {
            resolve({
              status: "outdated",
              currentVersion,
              bundleVersion: bundledVersion,
            });
          } else {
            resolve({ status: "ready", currentVersion });
          }
        }
      });
      child.on("error", () => {
        resolve(resolveFromAppInstallerPackage());
      });
    });
  });
  ipcMain.handle("install-winget", async () => {
    console.log("Main process: install-winget triggered");
    return new Promise((resolve) => {
      const appsPath = getAppsPath();
      const directBundlePath = path.join(appsPath, "Winget.msixbundle");
      const fallbackBundlePath = fs.existsSync(appsPath)
        ? fs
            .readdirSync(appsPath)
            .map((fileName) => path.join(appsPath, fileName))
            .find((fullPath) => {
              const lower = path.basename(fullPath).toLowerCase();
              return (
                lower.endsWith(".msixbundle") &&
                (lower.includes("winget") || lower.includes("appinstaller"))
              );
            })
        : null;
      const bundlePath = fs.existsSync(directBundlePath)
        ? directBundlePath
        : fallbackBundlePath;
      console.log("Main process: winget bundle candidate:", bundlePath);
      if (!bundlePath || !fs.existsSync(bundlePath)) {
        resolve({
          success: false,
          error:
            "Winget.msixbundle was not found in the apps folder. Add the file and try again.",
        });
        return;
      }

      const tempDir = app.getPath("temp");
      const uniqueId = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
      const runnerPath = path.join(
        tempDir,
        `winstaller-winget-${uniqueId}.ps1`,
      );
      const statusPath = path.join(
        tempDir,
        `winstaller-winget-${uniqueId}.json`,
      );
      const escapedBundlePath = bundlePath.replace(/'/g, "''");
      const escapedRunnerPath = runnerPath.replace(/'/g, "''");
      const escapedStatusPath = statusPath.replace(/'/g, "''");
      const runWithAdmin = !isRunningAsAdmin();

      const cleanupTempFiles = () => {
        try {
          if (fs.existsSync(runnerPath)) fs.unlinkSync(runnerPath);
        } catch {}
        try {
          if (fs.existsSync(statusPath)) fs.unlinkSync(statusPath);
        } catch {}
      };

      const runnerScript = `
param(
  [Parameter(Mandatory=$true)][string]$BundlePath,
  [Parameter(Mandatory=$true)][string]$StatusPath
)
$ErrorActionPreference = 'Stop'
$result = [ordered]@{
  success = $false
  message = ''
  error = ''
  version = ''
  output = ''
}

function Finish-Result([int]$ExitCode) {
  try {
    $result | ConvertTo-Json -Compress | Set-Content -LiteralPath $StatusPath -Encoding UTF8
  } catch {}
  exit $ExitCode
}

try {
  if (-not (Test-Path -LiteralPath $BundlePath)) {
    throw "Bundle file not found: $BundlePath"
  }

  $result.output += "Installing App Installer from: $BundlePath\`n"
  try {
    Add-AppxPackage -Path $BundlePath -ForceApplicationShutdown -ErrorAction Stop | Out-Null
    $result.output += "Add-AppxPackage completed.\`n"
  } catch {
    $msg = [string]$_.Exception.Message
    if ($msg -match '0x80073D06|already installed|already exists') {
      $result.output += "App Installer already installed, skip package add.\`n"
    } else {
      throw
    }
  }

  $installed = Get-AppxPackage -Name Microsoft.DesktopAppInstaller -ErrorAction SilentlyContinue |
    Sort-Object -Property Version -Descending |
    Select-Object -First 1
  if (-not $installed) {
    throw "Microsoft.DesktopAppInstaller not detected after install."
  }

  $result.success = $true
  $result.message = "Winget/App Installer installed."
  $result.version = [string]$installed.Version
  $result.output += "Detected App Installer version: $($installed.Version)\`n"
  Finish-Result 0
} catch {
  $result.error = [string]$_.Exception.Message
  $result.output += "Install Winget failed: $($result.error)\`n"
  Finish-Result 1
}
      `;

      try {
        fs.writeFileSync(runnerPath, runnerScript, "utf8");
      } catch (writeErr) {
        resolve({
          success: false,
          error: `Unable to create Winget installer script: ${writeErr.message}`,
        });
        return;
      }

      const launchScript = runWithAdmin
        ? `
          try {
            $proc = Start-Process powershell.exe -Verb RunAs -WindowStyle Hidden -Wait -PassThru -ArgumentList @(
              '-NoProfile',
              '-ExecutionPolicy', 'Bypass',
              '-File', '${escapedRunnerPath}',
              '-BundlePath', '${escapedBundlePath}',
              '-StatusPath', '${escapedStatusPath}'
            )
            exit $proc.ExitCode
          } catch {
            Write-Host "ELEVATION_ERROR:$($_.Exception.Message)"
            exit 1223
          }
        `
        : `
          & powershell.exe -NoProfile -ExecutionPolicy Bypass -File '${escapedRunnerPath}' -BundlePath '${escapedBundlePath}' -StatusPath '${escapedStatusPath}'
          exit $LASTEXITCODE
        `;

      const child = spawn(
        "powershell.exe",
        ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", launchScript],
        { windowsHide: true },
      );
      runningProcesses.set("winget-installer", child);
      let output = "";
      child.stdout.on("data", (data) => {
        const text = data.toString().trim();
        if (!text) return;
        output += `${text}\n`;
        console.log(`[Winget Install Out]: ${text}`);
      });
      child.stderr.on("data", (data) => {
        const text = data.toString().trim();
        if (!text) return;
        output += `${text}\n`;
        console.error(`[Winget Install Err]: ${text}`);
      });
      child.on("close", (code) => {
        console.log(`Winget installation process exited with code ${code}`);
        runningProcesses.delete("winget-installer");
        let statusPayload = null;
        try {
          if (fs.existsSync(statusPath)) {
            statusPayload = JSON.parse(fs.readFileSync(statusPath, "utf8"));
          }
        } catch {}
        cleanupTempFiles();

        const statusOutput =
          statusPayload && statusPayload.output
            ? String(statusPayload.output)
            : "";
        if (statusOutput) {
          output += statusOutput;
        }

        if (code === 0 || (statusPayload && statusPayload.success)) {
          resolve({
            success: true,
            message:
              "Winget/App Installer was installed successfully. Reopen the app if the status has not refreshed yet.",
            output,
          });
        } else if (code === 1223 || output.includes("ELEVATION_ERROR:")) {
          resolve({
            success: false,
            error:
              "UAC was canceled or administrator permission was denied. Winget installation cannot continue.",
            output,
          });
        } else {
          resolve({
            success: false,
            error:
              statusPayload && statusPayload.error
                ? String(statusPayload.error)
                : "Winget installation failed. Please try again and click Yes when the UAC prompt appears.",
            output,
          });
        }
      });
      child.on("error", (err) => {
        console.error("Winget installer spawn error:", err);
        runningProcesses.delete("winget-installer");
        cleanupTempFiles();
        resolve({
          success: false,
          error: `Failed to start Winget installer: ${err.message}`,
        });
      });
    });
  });
  ipcMain.handle("winget-source-update", async () => {
    console.log("Main process: winget-source-update triggered");
    return new Promise((resolve) => {
      const child = spawn("winget", ["source", "update"], {
        shell: true,
      });
      child.on("close", (code) => {
        resolve({ success: code === 0 });
      });
      child.on("error", (err) => {
        console.error("Winget source update error:", err);
        resolve({ success: false, error: err.message });
      });
    });
  });
  const INSTALLED_APPS_CACHE_MS = 60 * 1e3;
  let installedAppsCache = {
    data: [],
    updatedAt: 0,
  };
  let installedAppsFetchPromise = null;

  const parseWingetListOutput = (rawOutput = "") => {
    const cleanOutput = String(rawOutput || "").replace(
      /\x1B\[[0-9;]*[mGJK]/g,
      "",
    );
    const lines = cleanOutput.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const sepIndex = lines.findIndex(
      (l) => l.trim().startsWith("---") || l.trim().startsWith("==="),
    );
    if (sepIndex === -1) return [];
    return lines
      .slice(sepIndex + 1)
      .map((line) => {
        const parts = line.trim().split(/\s{2,}/);
        if (parts.length < 3) return null;
        return {
          name: String(parts[0] || "").trim(),
          id: String(parts[1] || "").trim(),
          version: String(parts[2] || "").trim(),
        };
      })
      .filter((item) => item && item.name && item.id);
  };

  const getRegistryOfficeApps = () => {
    if (process.platform !== "win32") return Promise.resolve([]);
    const psScript = `
      $ErrorActionPreference = 'SilentlyContinue'
      try {
        $result = @()

        $c2r = Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Office\\ClickToRun\\Configuration' -ErrorAction SilentlyContinue
        if ($c2r) {
          $releaseIds = @()
          if ($c2r.ProductReleaseIds) {
            $releaseIds = [string]$c2r.ProductReleaseIds -split ',' |
              ForEach-Object { $_.Trim() } |
              Where-Object { $_ }
          }

          $clientVersion = ''
          if ($c2r.ClientVersionToReport) {
            $clientVersion = [string]$c2r.ClientVersionToReport
          } elseif ($c2r.VersionToReport) {
            $clientVersion = [string]$c2r.VersionToReport
          }

          foreach ($rid in $releaseIds) {
            $result += [pscustomobject]@{
              name = "Microsoft Office $rid"
              id = "c2r\\$rid"
              version = $clientVersion
            }
          }
        }

        $uninstallPaths = @(
          'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
          'HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'
        )

        $officeEntries = Get-ItemProperty $uninstallPaths -ErrorAction SilentlyContinue |
          Where-Object {
            $_.DisplayName -and ($_.DisplayName -match 'Microsoft 365|Office|Visio|Project')
          } |
          Select-Object DisplayName, DisplayVersion, PSChildName

        foreach ($entry in $officeEntries) {
          $displayName = [string]$entry.DisplayName
          if (-not $displayName) { continue }
          $displayVersion = ''
          if ($entry.DisplayVersion) { $displayVersion = [string]$entry.DisplayVersion }
          $entryId = if ($entry.PSChildName) { [string]$entry.PSChildName } else { $displayName }

          $result += [pscustomobject]@{
            name = $displayName
            id = "registry\\$entryId"
            version = $displayVersion
          }
        }

        $result | ConvertTo-Json -Compress
      } catch {
        '[]' | Write-Output
      }
    `;

    return new Promise((resolve) => {
      try {
        const child = spawn(
          "powershell.exe",
          ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", psScript],
          {
            stdio: ["ignore", "pipe", "ignore"],
            windowsHide: true,
          },
        );
        let output = "";
        child.stdout.on("data", (data) => (output += data.toString()));
        child.on("close", () => {
          try {
            const lines = String(output)
              .split(/\r?\n/)
              .map((line) => line.trim())
              .filter(Boolean);
            const jsonLine = [...lines]
              .reverse()
              .find(
                (line) =>
                  (line.startsWith("[") && line.endsWith("]")) ||
                  (line.startsWith("{") && line.endsWith("}")),
              );
            if (!jsonLine) {
              resolve([]);
              return;
            }
            const parsed = JSON.parse(jsonLine);
            const list = Array.isArray(parsed) ? parsed : [parsed];
            const normalized = list
              .filter((item) => item && typeof item === "object")
              .map((item) => ({
                name: String(item.name || "").trim(),
                id: String(item.id || item.name || "").trim(),
                version: String(item.version || "").trim(),
              }))
              .filter((item) => item.name && item.id);
            resolve(normalized);
          } catch {
            resolve([]);
          }
        });
        child.on("error", () => resolve([]));
      } catch {
        resolve([]);
      }
    });
  };

  const mergeInstalledApps = (wingetApps = [], registryApps = []) => {
    const merged = /* @__PURE__ */ new Map();
    [...wingetApps, ...registryApps].forEach((app2) => {
      const name = String(app2.name || "").trim();
      const id = String(app2.id || "").trim();
      const version = String(app2.version || "").trim();
      if (!name || !id) return;
      const key = `${id.toLowerCase()}|${name.toLowerCase()}`;
      if (!merged.has(key)) {
        merged.set(key, { name, id, version });
      }
    });
    return Array.from(merged.values());
  };

  const getWingetInstalledApps = () =>
    new Promise((resolve) => {
      try {
        const child = spawn(
          "winget",
          ["list", "--accept-source-agreements", "--disable-interactivity"],
          {
            windowsHide: true,
          },
        );
        let output = "";
        let done = false;
        const finish = (value) => {
          if (done) return;
          done = true;
          resolve(value);
        };
        const timeout = setTimeout(() => {
          try {
            child.kill();
          } catch {}
          finish([]);
        }, 15 * 1e3);
        child.stdout.on("data", (data) => (output += data.toString()));
        child.on("close", (code) => {
          clearTimeout(timeout);
          finish(code === 0 ? parseWingetListOutput(output) : []);
        });
        child.on("error", () => {
          clearTimeout(timeout);
          finish([]);
        });
      } catch {
        resolve([]);
      }
    });

  const fetchInstalledAppsFromSystem = async () => {
    const [wingetApps, registryApps] = await Promise.all([
      getWingetInstalledApps(),
      getRegistryOfficeApps(),
    ]);
    return mergeInstalledApps(wingetApps, registryApps);
  };
  const broadcastInstalledAppsUpdated = (apps) => {
    const payload = Array.isArray(apps) ? apps : [];
    BrowserWindow.getAllWindows().forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send("installed-apps-updated", payload);
      }
    });
  };

  const startInstalledAppsRefresh = (force = false) => {
    const now = Date.now();
    const cacheValid =
      installedAppsCache.updatedAt > 0 &&
      now - installedAppsCache.updatedAt < INSTALLED_APPS_CACHE_MS;

    if (!force && cacheValid && installedAppsCache.data.length > 0) {
      return null;
    }
    if (installedAppsFetchPromise) {
      return installedAppsFetchPromise;
    }

    console.log("Main process: fetching installed apps via winget");
    installedAppsFetchPromise = fetchInstalledAppsFromSystem()
      .then((apps) => {
        installedAppsCache = {
          data: Array.isArray(apps) ? apps : [],
          updatedAt: Date.now(),
        };
        broadcastInstalledAppsUpdated(installedAppsCache.data);
        return installedAppsCache.data;
      })
      .catch((error) => {
        console.error("Main process: get-installed-apps failed:", error);
        return installedAppsCache.data || [];
      })
      .finally(() => {
        installedAppsFetchPromise = null;
      });

    return installedAppsFetchPromise;
  };

  ipcMain.handle("get-installed-apps", async (event, options) => {
    const force =
      options === true ||
      (options && typeof options === "object" && options.force === true);
    const waitForFresh = !!(
      options &&
      typeof options === "object" &&
      options.waitForFresh === true
    );

    const hasCache = installedAppsCache.updatedAt > 0;
    const pendingRefresh = startInstalledAppsRefresh(force);

    if (waitForFresh && pendingRefresh) {
      return pendingRefresh;
    }
    return hasCache ? installedAppsCache.data : [];
  });
  ipcMain.handle("get-sys-info", async () => {
    const os = require2("os");
    const platform = process.platform;
    let osName = "Windows";
    if (platform === "win32") {
      const release = os.release();
      if (release.startsWith("10.0.1904")) osName = "Windows 10";
      else if (release.startsWith("10.0.22")) osName = "Windows 11";
      else osName = "Windows (Legacy)";
    }
    const totalMem = Math.round(os.totalmem() / (1024 * 1024 * 1024));
    const freeMem = Math.round(os.freemem() / (1024 * 1024 * 1024));
    const baseInfo = {
      arch: process.arch,
      platform,
      hostname: os.hostname(),
      os: osName,
      osVersion: os.release(),
      cpu: os.cpus()[0].model,
      ram: `${totalMem} GB`,
      freeRam: `${freeMem} GB`,
      uptime: Math.floor(os.uptime() / 3600),
      // hours
    };
    if (platform !== "win32") {
      return baseInfo;
    }
    const psScript = `
      $ErrorActionPreference = 'SilentlyContinue'
      try {
        $cs = Get-CimInstance Win32_ComputerSystem | Select-Object -First 1
        $bios = Get-CimInstance Win32_BIOS | Select-Object -First 1
        $board = Get-CimInstance Win32_BaseBoard | Select-Object -First 1
        $csp = Get-CimInstance Win32_ComputerSystemProduct | Select-Object -First 1
        $osInfo = Get-CimInstance Win32_OperatingSystem | Select-Object -First 1
        $wmiBatteries = @(Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue)

        $machineType = 'Unknown'
        switch ([int]$cs.PCSystemType) {
          1 { $machineType = 'Desktop' }
          2 { $machineType = 'Mobile' }
          3 { $machineType = 'Workstation' }
          4 { $machineType = 'Enterprise Server' }
          5 { $machineType = 'SOHO Server' }
          6 { $machineType = 'Appliance PC' }
          7 { $machineType = 'Performance Server' }
          8 { $machineType = 'Maximum' }
          9 { $machineType = 'Slate' }
          10 { $machineType = 'Convertible' }
          11 { $machineType = 'Detachable' }
        }

        $biosVersion = ''
        if ($bios.SMBIOSBIOSVersion) {
          $biosVersion = $bios.SMBIOSBIOSVersion
        } elseif ($bios.Version) {
          $biosVersion = $bios.Version
        }

        $biosRelease = ''
        if ($bios.ReleaseDate) {
          try {
            $biosRelease = [Management.ManagementDateTimeConverter]::ToDateTime($bios.ReleaseDate).ToString('dd/MM/yyyy')
          } catch {}
        }

        $smbiosVersion = ''
        if ($bios.SMBIOSMajorVersion -ne $null -and $bios.SMBIOSMinorVersion -ne $null) {
          $smbiosVersion = "$($bios.SMBIOSMajorVersion).$($bios.SMBIOSMinorVersion)"
        }

        $batteryStatus = 'N/A'
        $batteryLevel = $null
        $batteryName = 'N/A'
        $batteryPresent = $false
        $batteryCount = 0
        $batteryDesignCapacity = $null
        $batteryFullChargeCapacity = $null
        $batteryCurrentCapacity = $null
        $batteryWearLevel = $null
        $batteryCycleCount = $null
        $batteryItems = @()

        $parseBatteryNumber = {
          param($rawValue)
          if ($rawValue -eq $null) { return $null }
          $digits = [regex]::Replace([string]$rawValue, '[^0-9]', '')
          if ($digits -eq '') { return $null }
          $numberValue = [double]$digits
          if ($numberValue -le 0) { return $null }
          return $numberValue
        }

        $getBatteryStatusText = {
          param($statusCode)
          if ($statusCode -eq $null) { return 'Unknown' }
          switch ([int]$statusCode) {
            1 { return 'Discharging' }
            2 { return 'AC Charging' }
            3 { return 'Fully Charged' }
            4 { return 'Low' }
            5 { return 'Critical' }
            6 { return 'Charging' }
            7 { return 'Charging (High)' }
            8 { return 'Charging (Low)' }
            9 { return 'Charging (Critical)' }
            11 { return 'Partially Charged' }
            default { return 'Unknown' }
          }
        }

        # WMI aggregate fallback values (sum all batteries when available)
        $batteryStaticList = @(Get-CimInstance -Namespace root\\wmi -ClassName BatteryStaticData -ErrorAction SilentlyContinue)
        $batteryStaticSum = 0.0
        foreach ($batteryStatic in $batteryStaticList) {
          $designValue = & $parseBatteryNumber $batteryStatic.DesignedCapacity
          if ($designValue -ne $null) {
            $batteryStaticSum += $designValue
          }
        }
        if ($batteryStaticSum -gt 0) {
          $batteryDesignCapacity = [int][math]::Round($batteryStaticSum)
        }

        $batteryFullList = @(Get-CimInstance -Namespace root\\wmi -ClassName BatteryFullChargedCapacity -ErrorAction SilentlyContinue)
        $batteryFullSumWmi = 0.0
        foreach ($batteryFullItem in $batteryFullList) {
          $fullValue = & $parseBatteryNumber $batteryFullItem.FullChargedCapacity
          if ($fullValue -ne $null) {
            $batteryFullSumWmi += $fullValue
          }
        }
        if ($batteryFullSumWmi -gt 0) {
          $batteryFullChargeCapacity = [int][math]::Round($batteryFullSumWmi)
        }

        # Prefer values from powercfg battery report (supports multi-battery reliably)
        $powerCfgDesignCapacity = $null
        $powerCfgFullChargeCapacity = $null
        $powerCfgCycleCount = $null
        $powerCfgBatteryItems = @()
        $powerCfgBatteryNames = @()
        $batteryReportPath = Join-Path $env:TEMP 'winstaller-battery-report.xml'
        try {
          if (Test-Path $batteryReportPath) {
            Remove-Item $batteryReportPath -Force -ErrorAction SilentlyContinue
          }

          & powercfg /batteryreport /output "$batteryReportPath" /xml | Out-Null

          if (Test-Path $batteryReportPath) {
            $reportRaw = Get-Content -Path $batteryReportPath -Raw

            try {
              [xml]$batteryReportXml = $reportRaw
              $reportBatteries = @()
              if ($batteryReportXml.BatteryReport -and $batteryReportXml.BatteryReport.Batteries) {
                $reportBatteries = @($batteryReportXml.BatteryReport.Batteries.Battery)
              } elseif ($batteryReportXml.Report -and $batteryReportXml.Report.Batteries) {
                $reportBatteries = @($batteryReportXml.Report.Batteries.Battery)
              }

              if ($reportBatteries.Count -gt 0) {
                $designSum = 0.0
                $fullSum = 0.0
                $maxCycle = $null
                foreach ($reportBattery in $reportBatteries) {
                  $batteryId = [string]$reportBattery.Id
                  if (-not $batteryId) {
                    $batteryId = [string]$reportBattery.Name
                  }
                  if ($batteryId -and -not ($powerCfgBatteryNames -contains $batteryId)) {
                    $powerCfgBatteryNames += $batteryId
                  }

                  $designValue = & $parseBatteryNumber $reportBattery.DesignCapacity
                  $fullValue = & $parseBatteryNumber $reportBattery.FullChargeCapacity
                  $cycleValueRaw = & $parseBatteryNumber $reportBattery.CycleCount
                  $cycleValue = $null
                  if ($cycleValueRaw -ne $null) {
                    $cycleValue = [int][math]::Round([double]$cycleValueRaw)
                  }

                  if ($designValue -ne $null) { $designSum += [double]$designValue }
                  if ($fullValue -ne $null) { $fullSum += [double]$fullValue }
                  if ($cycleValue -ne $null -and ($maxCycle -eq $null -or $cycleValue -gt $maxCycle)) {
                    $maxCycle = $cycleValue
                  }

                  $powerCfgBatteryItems += [ordered]@{
                    id = $batteryId
                    designCapacity = $designValue
                    fullChargeCapacity = $fullValue
                    cycleCount = $cycleValue
                  }
                }

                if ($designSum -gt 0) { $powerCfgDesignCapacity = [int][math]::Round($designSum) }
                if ($fullSum -gt 0) { $powerCfgFullChargeCapacity = [int][math]::Round($fullSum) }
                if ($maxCycle -ne $null -and $maxCycle -ge 0) { $powerCfgCycleCount = [int]$maxCycle }
              }
            } catch {}

            # Regex fallback for layouts with unexpected XML structure
            if (($powerCfgDesignCapacity -eq $null -or [double]$powerCfgDesignCapacity -le 0) -and $reportRaw) {
              $designMatches = [regex]::Matches($reportRaw, '(?is)<DesignCapacity>\\s*([^<]+)\\s*</DesignCapacity>')
              if ($designMatches.Count -gt 0) {
                $designSum = 0.0
                foreach ($match in $designMatches) {
                  $value = & $parseBatteryNumber $match.Groups[1].Value
                  if ($value -ne $null) { $designSum += [double]$value }
                }
                if ($designSum -gt 0) { $powerCfgDesignCapacity = [int][math]::Round($designSum) }
              }
            }

            if (($powerCfgFullChargeCapacity -eq $null -or [double]$powerCfgFullChargeCapacity -le 0) -and $reportRaw) {
              $fullMatches = [regex]::Matches($reportRaw, '(?is)<FullChargeCapacity>\\s*([^<]+)\\s*</FullChargeCapacity>')
              if ($fullMatches.Count -gt 0) {
                $fullSum = 0.0
                foreach ($match in $fullMatches) {
                  $value = & $parseBatteryNumber $match.Groups[1].Value
                  if ($value -ne $null) { $fullSum += [double]$value }
                }
                if ($fullSum -gt 0) { $powerCfgFullChargeCapacity = [int][math]::Round($fullSum) }
              }
            }

            if (($powerCfgCycleCount -eq $null) -and $reportRaw) {
              $cycleMatches = [regex]::Matches($reportRaw, '(?is)<CycleCount>\\s*([^<]+)\\s*</CycleCount>')
              if ($cycleMatches.Count -gt 0) {
                $maxCycle = $null
                foreach ($match in $cycleMatches) {
                  $value = & $parseBatteryNumber $match.Groups[1].Value
                  if ($value -ne $null) {
                    $cycleValue = [int][math]::Round([double]$value)
                    if ($maxCycle -eq $null -or $cycleValue -gt $maxCycle) {
                      $maxCycle = $cycleValue
                    }
                  }
                }
                if ($maxCycle -ne $null -and $maxCycle -ge 0) { $powerCfgCycleCount = [int]$maxCycle }
              }
            }
          }
        } catch {}
        if (Test-Path $batteryReportPath) {
          Remove-Item $batteryReportPath -Force -ErrorAction SilentlyContinue
        }

        if ($powerCfgDesignCapacity -ne $null -and [double]$powerCfgDesignCapacity -gt 0) {
          $batteryDesignCapacity = [int]$powerCfgDesignCapacity
        }
        if ($powerCfgFullChargeCapacity -ne $null -and [double]$powerCfgFullChargeCapacity -gt 0) {
          $batteryFullChargeCapacity = [int]$powerCfgFullChargeCapacity
        }
        if ($powerCfgCycleCount -ne $null -and [double]$powerCfgCycleCount -ge 0) {
          $batteryCycleCount = [int]$powerCfgCycleCount
        }

        # Aggregate WMI battery names/status/level for multi-battery machines
        $wmiBatteryEntries = @()
        $wmiBatteryNames = @()
        $wmiStatusCodes = @()
        $wmiLevelList = @()
        $wmiDesignSum = 0.0
        $wmiFullSum = 0.0
        $wmiCycleMax = $null

        foreach ($battery in $wmiBatteries) {
          if (-not $battery) { continue }
          $nameText = [string]$battery.Name
          if ($nameText -and -not ($wmiBatteryNames -contains $nameText)) {
            $wmiBatteryNames += $nameText
          }

          $statusCode = $null
          if ($battery.BatteryStatus -ne $null) {
            $statusCode = [int]$battery.BatteryStatus
            $wmiStatusCodes += $statusCode
          }
          $levelValue = $null
          if ($battery.EstimatedChargeRemaining -ne $null) {
            $levelValue = [double]$battery.EstimatedChargeRemaining
            if ($levelValue -lt 0) { $levelValue = 0 }
            if ($levelValue -gt 100) { $levelValue = 100 }
            $wmiLevelList += [double]$levelValue
          }

          $designValue = & $parseBatteryNumber $battery.DesignCapacity
          if ($designValue -ne $null) { $wmiDesignSum += [double]$designValue }
          $fullValue = & $parseBatteryNumber $battery.FullChargeCapacity
          if ($fullValue -ne $null) { $wmiFullSum += [double]$fullValue }

          if ($battery.CycleCount -ne $null) {
            $cycleValue = [double]$battery.CycleCount
            if ($cycleValue -ge 0) {
              $cycleRounded = [int][math]::Round($cycleValue)
              if ($wmiCycleMax -eq $null -or $cycleRounded -gt $wmiCycleMax) {
                $wmiCycleMax = $cycleRounded
              }
            }
          }
          $cycleCountValue = $null
          if ($battery.CycleCount -ne $null -and [double]$battery.CycleCount -ge 0) {
            $cycleCountValue = [int][math]::Round([double]$battery.CycleCount)
          }

          $wmiBatteryEntries += [ordered]@{
            name = $nameText
            statusCode = $statusCode
            level = $levelValue
            designCapacity = $designValue
            fullChargeCapacity = $fullValue
            cycleCount = $cycleCountValue
          }
        }

        if (($batteryDesignCapacity -eq $null -or [double]$batteryDesignCapacity -le 0) -and $wmiDesignSum -gt 0) {
          $batteryDesignCapacity = [int][math]::Round($wmiDesignSum)
        }
        if (($batteryFullChargeCapacity -eq $null -or [double]$batteryFullChargeCapacity -le 0) -and $wmiFullSum -gt 0) {
          $batteryFullChargeCapacity = [int][math]::Round($wmiFullSum)
        }
        if (($batteryCycleCount -eq $null) -and $wmiCycleMax -ne $null -and [double]$wmiCycleMax -ge 0) {
          $batteryCycleCount = [int]$wmiCycleMax
        }

        # Final cycle fallback from root\\wmi
        if ($batteryCycleCount -eq $null) {
          $batteryCycleList = @(Get-CimInstance -Namespace root\\wmi -ClassName BatteryCycleCount -ErrorAction SilentlyContinue)
          $cycleMax = $null
          foreach ($batteryCycle in $batteryCycleList) {
            if ($batteryCycle -and $batteryCycle.CycleCount -ne $null) {
              $cycleRaw = [double]$batteryCycle.CycleCount
              if ($cycleRaw -ge 0) {
                $cycleRounded = [int][math]::Round($cycleRaw)
                if ($cycleMax -eq $null -or $cycleRounded -gt $cycleMax) {
                  $cycleMax = $cycleRounded
                }
              }
            }
          }
          if ($cycleMax -ne $null -and [double]$cycleMax -ge 0) {
            $batteryCycleCount = [int]$cycleMax
          }
        }

        # Build flexible per-battery cards data
        $batteryItems = @()
        $pairCount = [Math]::Max($powerCfgBatteryItems.Count, $wmiBatteryEntries.Count)
        if ($pairCount -eq 0 -and $powerCfgBatteryNames.Count -gt 0) {
          $pairCount = $powerCfgBatteryNames.Count
        }
        for ($i = 0; $i -lt $pairCount; $i++) {
          $powerItem = $null
          if ($i -lt $powerCfgBatteryItems.Count) {
            $powerItem = $powerCfgBatteryItems[$i]
          }
          $wmiItem = $null
          if ($i -lt $wmiBatteryEntries.Count) {
            $wmiItem = $wmiBatteryEntries[$i]
          }

          $itemName = ''
          if ($powerItem -and $powerItem.id) {
            $itemName = [string]$powerItem.id
          }
          if ((-not $itemName) -and $i -lt $powerCfgBatteryNames.Count) {
            $itemName = [string]$powerCfgBatteryNames[$i]
          }
          if ((-not $itemName) -and $wmiItem -and $wmiItem.name) {
            $itemName = [string]$wmiItem.name
          }
          if (-not $itemName) {
            $itemName = "Battery $($i + 1)"
          }

          $itemDesignCapacity = $null
          if ($powerItem -and $powerItem.designCapacity -ne $null -and [double]$powerItem.designCapacity -gt 0) {
            $itemDesignCapacity = [int][math]::Round([double]$powerItem.designCapacity)
          } elseif ($wmiItem -and $wmiItem.designCapacity -ne $null -and [double]$wmiItem.designCapacity -gt 0) {
            $itemDesignCapacity = [int][math]::Round([double]$wmiItem.designCapacity)
          }

          $itemFullChargeCapacity = $null
          if ($powerItem -and $powerItem.fullChargeCapacity -ne $null -and [double]$powerItem.fullChargeCapacity -gt 0) {
            $itemFullChargeCapacity = [int][math]::Round([double]$powerItem.fullChargeCapacity)
          } elseif ($wmiItem -and $wmiItem.fullChargeCapacity -ne $null -and [double]$wmiItem.fullChargeCapacity -gt 0) {
            $itemFullChargeCapacity = [int][math]::Round([double]$wmiItem.fullChargeCapacity)
          }

          $itemLevel = $null
          if ($wmiItem -and $wmiItem.level -ne $null) {
            $itemLevel = [int][math]::Round([double]$wmiItem.level)
            if ($itemLevel -lt 0) { $itemLevel = 0 }
            if ($itemLevel -gt 100) { $itemLevel = 100 }
          }

          $itemCurrentCapacity = $null
          if ($itemLevel -ne $null -and $itemFullChargeCapacity -ne $null -and [double]$itemFullChargeCapacity -gt 0) {
            $itemCurrentCapacity = [int][math]::Round(([double]$itemFullChargeCapacity * [double]$itemLevel) / 100.0)
          }

          $itemWearLevel = $null
          if ($itemDesignCapacity -ne $null -and $itemFullChargeCapacity -ne $null -and [double]$itemDesignCapacity -gt 0) {
            $itemWearRaw = (1 - ([double]$itemFullChargeCapacity / [double]$itemDesignCapacity)) * 100
            if ($itemWearRaw -lt 0) { $itemWearRaw = 0 }
            if ($itemWearRaw -gt 100) { $itemWearRaw = 100 }
            $itemWearLevel = [int][math]::Round($itemWearRaw)
          }

          $itemCycleCount = $null
          if ($powerItem -and $powerItem.cycleCount -ne $null -and [double]$powerItem.cycleCount -ge 0) {
            $itemCycleCount = [int]$powerItem.cycleCount
          } elseif ($wmiItem -and $wmiItem.cycleCount -ne $null -and [double]$wmiItem.cycleCount -ge 0) {
            $itemCycleCount = [int]$wmiItem.cycleCount
          }

          $itemStatus = 'Unknown'
          if ($wmiItem -and $wmiItem.statusCode -ne $null) {
            $itemStatus = & $getBatteryStatusText $wmiItem.statusCode
          } elseif ($itemLevel -eq 100) {
            $itemStatus = 'Fully Charged'
          } elseif ($itemLevel -ne $null) {
            $itemStatus = 'Detected'
          }

          $batteryItems += [ordered]@{
            name = $itemName
            status = $itemStatus
            level = $itemLevel
            cycleCount = $itemCycleCount
            designCapacity = $itemDesignCapacity
            currentCapacity = $itemCurrentCapacity
            fullChargeCapacity = $itemFullChargeCapacity
            wearLevel = $itemWearLevel
          }
        }

        if ($batteryItems.Count -gt 0) {
          $batteryCount = $batteryItems.Count
          $batteryPresent = $true
          $batteryName = (($batteryItems | ForEach-Object { $_.name }) -join ' + ')
        } else {
          $batteryCountFromPowerCfg = $powerCfgBatteryItems.Count
          if ($powerCfgBatteryNames.Count -gt $batteryCountFromPowerCfg) {
            $batteryCountFromPowerCfg = $powerCfgBatteryNames.Count
          }
          $batteryCountFromWmi = $wmiBatteries.Count
          $batteryCount = [math]::Max([int]$batteryCountFromPowerCfg, [int]$batteryCountFromWmi)
          if ($batteryCount -gt 0) {
            $batteryPresent = $true
          }
          if ($powerCfgBatteryNames.Count -gt 0) {
            $batteryName = ($powerCfgBatteryNames -join ' + ')
          } elseif ($wmiBatteryNames.Count -gt 0) {
            $batteryName = ($wmiBatteryNames -join ' + ')
          }
        }

        # Aggregate status across batteries
        if ($wmiStatusCodes.Count -gt 0) {
          $hasCharging = $false
          $hasDischarging = $false
          $hasFull = $false
          foreach ($statusCode in $wmiStatusCodes) {
            if ($statusCode -eq 2 -or $statusCode -eq 6 -or $statusCode -eq 7 -or $statusCode -eq 8 -or $statusCode -eq 9) {
              $hasCharging = $true
            }
            if ($statusCode -eq 1) {
              $hasDischarging = $true
            }
            if ($statusCode -eq 3) {
              $hasFull = $true
            }
          }

          if ($hasCharging) {
            $batteryStatus = 'AC Charging'
          } elseif ($hasDischarging) {
            $batteryStatus = 'Discharging'
          } elseif ($hasFull) {
            $batteryStatus = 'Fully Charged'
          } else {
            switch ([int]$wmiStatusCodes[0]) {
              4 { $batteryStatus = 'Low' }
              5 { $batteryStatus = 'Critical' }
              11 { $batteryStatus = 'Partially Charged' }
              default { $batteryStatus = 'Unknown' }
            }
          }
        } elseif ($batteryPresent) {
          $batteryStatus = 'Detected'
        }

        # Level + current capacity aggregation for multi batteries
        $weightedCurrentCapacity = 0.0
        $weightedFullCapacity = 0.0
        foreach ($item in $batteryItems) {
          if ($item.fullChargeCapacity -ne $null -and [double]$item.fullChargeCapacity -gt 0 -and $item.level -ne $null) {
            $itemFull = [double]$item.fullChargeCapacity
            $itemLevel = [double]$item.level
            if ($itemLevel -lt 0) { $itemLevel = 0 }
            if ($itemLevel -gt 100) { $itemLevel = 100 }
            $weightedFullCapacity += $itemFull
            $weightedCurrentCapacity += ($itemFull * $itemLevel / 100.0)
          }
        }

        if ($weightedFullCapacity -gt 0 -and $weightedCurrentCapacity -ge 0) {
          $batteryCurrentCapacity = [int][math]::Round($weightedCurrentCapacity)
          $batteryLevel = [int][math]::Round(($weightedCurrentCapacity / $weightedFullCapacity) * 100)
          if (($batteryFullChargeCapacity -eq $null -or [double]$batteryFullChargeCapacity -le 0)) {
            $batteryFullChargeCapacity = [int][math]::Round($weightedFullCapacity)
          }
        } elseif ($wmiLevelList.Count -gt 0) {
          $batteryLevel = [int][math]::Round(($wmiLevelList | Measure-Object -Average).Average)
        }

        if ($batteryCurrentCapacity -eq $null -and $batteryLevel -ne $null -and $batteryFullChargeCapacity -ne $null -and [double]$batteryFullChargeCapacity -gt 0) {
          $batteryCurrentCapacity = [int][math]::Round(([double]$batteryFullChargeCapacity * [double]$batteryLevel) / 100.0)
        }

        if ($batteryDesignCapacity -ne $null -and $batteryFullChargeCapacity -ne $null -and [double]$batteryDesignCapacity -gt 0) {
          $wearRaw = (1 - ([double]$batteryFullChargeCapacity / [double]$batteryDesignCapacity)) * 100
          if ($wearRaw -lt 0) { $wearRaw = 0 }
          if ($wearRaw -gt 100) { $wearRaw = 100 }
          $batteryWearLevel = [int][math]::Round($wearRaw)
        }

        $result = [ordered]@{
          machineType = $machineType
          manufacturer = $cs.Manufacturer
          model = $cs.Model
          systemFamily = $cs.SystemFamily
          serviceTag = $bios.SerialNumber
          productId = $csp.IdentifyingNumber
          uuid = $csp.UUID
          boardManufacturer = $board.Manufacturer
          boardModel = $board.Product
          boardSerial = $board.SerialNumber
          boardVersion = $board.Version
          biosManufacturer = $bios.Manufacturer
          biosVersion = $biosVersion
          biosReleaseDate = $biosRelease
          smbiosVersion = $smbiosVersion
          osDisplayName = $osInfo.Caption
          osBuild = $osInfo.BuildNumber
          batteryPresent = $batteryPresent
          batteryCount = $batteryCount
          batteryName = $batteryName
          batteryStatus = $batteryStatus
          batteryLevel = $batteryLevel
          batteryDesignCapacity = $batteryDesignCapacity
          batteryFullChargeCapacity = $batteryFullChargeCapacity
          batteryCurrentCapacity = $batteryCurrentCapacity
          batteryWearLevel = $batteryWearLevel
          batteryCycleCount = $batteryCycleCount
          batteryItems = $batteryItems
        }
        $result | ConvertTo-Json -Compress
      } catch {
        '{}' | Write-Output
      }
    `;
    try {
      const psResult = spawnSync(
        "powershell.exe",
        ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", psScript],
        { encoding: "utf8" },
      );
      if (psResult.status !== 0 || !psResult.stdout) {
        return baseInfo;
      }
      const lines = psResult.stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      const jsonLine = [...lines]
        .reverse()
        .find((line) => line.startsWith("{") && line.endsWith("}"));
      if (!jsonLine) {
        return baseInfo;
      }
      const extra = JSON.parse(jsonLine);
      return { ...baseInfo, ...extra };
    } catch {
      return baseInfo;
    }
  });
  ipcMain.handle("get-performance-metrics", async () => {
    const os = require2("os");
    const fallback = {
      cpuPercent: 0,
      cpuSpeedGhz: 0,
      cpuName: os.cpus()[0]?.model || "CPU",
      ramPercent: 0,
      ramUsedGB: 0,
      ramTotalGB: Math.round((os.totalmem() / (1024 * 1024 * 1024)) * 10) / 10,
      gpuPercent: 0,
      gpuName: "N/A",
      gpus: [],
      networkBytesPerSec: 0,
      networkName: "N/A",
      networks: [],
      diskPercent: 0,
      diskDrive: "C:",
      diskUsedGB: 0,
      diskFreeGB: 0,
      diskTotalGB: 0,
      disks: [],
    };
    const psScript = `
      $ErrorActionPreference = 'SilentlyContinue'
      try {
        $cpuSample = Get-Counter '\\Processor Information(_Total)\\% Processor Utility' -ErrorAction SilentlyContinue
        if (-not $cpuSample) { $cpuSample = Get-Counter '\\Processor(_Total)\\% Processor Time' -ErrorAction SilentlyContinue }
        $cpuPercent = if ($cpuSample -and $cpuSample.CounterSamples.Count -gt 0) { $cpuSample.CounterSamples[0].CookedValue } else { 0 }

        $cpuInfo = Get-CimInstance Win32_Processor | Select-Object -First 1
        $cpuFreqSample = Get-Counter '\\Processor Information(_Total)\\Processor Frequency' -ErrorAction SilentlyContinue
        $cpuSpeedGhz = 0
        if ($cpuFreqSample -and $cpuFreqSample.CounterSamples.Count -gt 0) {
          $cpuSpeedGhz = [math]::Round(($cpuFreqSample.CounterSamples[0].CookedValue / 1000), 2)
        } elseif ($cpuInfo -and $cpuInfo.CurrentClockSpeed) {
          $cpuSpeedGhz = [math]::Round(($cpuInfo.CurrentClockSpeed / 1000), 2)
        }
        $cpuName = if ($cpuInfo -and $cpuInfo.Name) { $cpuInfo.Name } else { 'CPU' }

        $osInfo = Get-CimInstance Win32_OperatingSystem
        $totalMemKB = [double]$osInfo.TotalVisibleMemorySize
        $freeMemKB = [double]$osInfo.FreePhysicalMemory
        $usedMemKB = $totalMemKB - $freeMemKB
        $ramPercent = if ($totalMemKB -gt 0) { ($usedMemKB / $totalMemKB) * 100 } else { 0 }
        $ramUsedGB = [math]::Round(($usedMemKB / 1MB), 1)
        $ramTotalGB = [math]::Round(($totalMemKB / 1MB), 1)

        $gpuControllers = @(Get-CimInstance Win32_VideoController | Where-Object { $_.Name -and $_.Name.Trim().Length -gt 0 })
        $gpuEngines = @(Get-CimInstance Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine -ErrorAction SilentlyContinue)
        
        $gpuList = @()
        $gpuPercent = 0
        
        if ($gpuControllers.Count -eq 0) {
          $gpuList += [ordered]@{ name = 'N/A'; percent = 0 }
        } else {
          # Attempt to calculate utilization for each controller
          # For single GPU, we sum all 3D engines
          if ($gpuControllers.Count -eq 1) {
            $util = ($gpuEngines | Where-Object { $_.Name -like "*engtype_3D" } | Measure-Object -Property UtilizationPercentage -Sum).Sum
            if ($util -gt 100) { $util = 100 }
            $gpuPercent = $util
            $gpuList += [ordered]@{ name = [string]$gpuControllers[0].Name; percent = [math]::Round([double]$util, 1) }
          } else {
            # Multi-GPU: Basic distribution by index or sum (heuristic)
            # Standard: First one is usually primary iGPU or dGPU
            $total3D = ($gpuEngines | Where-Object { $_.Name -like "*engtype_3D" } | Measure-Object -Property UtilizationPercentage -Sum).Sum
            foreach ($vc in $gpuControllers) {
               $p = 0.0
               # If it's the first one, assign the sum as a guess
               if ($gpuList.Count -eq 0) { $p = $total3D }
               if ($p -gt 100) { $p = 100 }
               if ($p -gt $gpuPercent) { $gpuPercent = $p }
               $gpuList += [ordered]@{ name = [string]$vc.Name; percent = [math]::Round([double]$p, 1) }
            }
          }
        }

        if ($gpuList.Count -eq 0) {
          $gpuList += [ordered]@{
            name = 'N/A'
            percent = 0
          }
        }
        $gpuName = [string]$gpuList[0].name

        $netCounters = (Get-Counter '\\Network Interface(*)\\Bytes Total/sec')
        $networkUtilByName = @{}
        if ($netCounters -and $netCounters.CounterSamples) {
          foreach ($sample in $netCounters.CounterSamples) {
            $instanceName = [string]$sample.InstanceName
            if (-not $instanceName) { continue }
            if ($instanceName -match 'Loopback|isatap|Teredo|Pseudo') { continue }
            if (-not $networkUtilByName.ContainsKey($instanceName)) {
              $networkUtilByName[$instanceName] = 0.0
            }
            $networkUtilByName[$instanceName] += [double]$sample.CookedValue
          }
        }

        $adapterList = @()
        $adapterLookup = @{}
        if (Get-Command Get-NetAdapter -ErrorAction SilentlyContinue) {
          $netAdapters = @(
            Get-NetAdapter |
              Where-Object {
                $_.InterfaceDescription -and
                $_.InterfaceDescription.Trim().Length -gt 0 -and
                $_.InterfaceDescription -notmatch 'Loopback|isatap|Teredo|Pseudo|Hyper-V Virtual'
              }
          )
          foreach ($adapter in $netAdapters) {
            $adapterAlias = [string]$adapter.Name
            $adapterDesc = [string]$adapter.InterfaceDescription
            $adapterStatus = [string]$adapter.Status
            if (-not $adapterStatus) { $adapterStatus = 'Unknown' }
            $adapterConnected = $false
            if ($adapterStatus -eq 'Up') { $adapterConnected = $true }
            $adapterLinkSpeed = ''
            if ($adapter.LinkSpeed) { $adapterLinkSpeed = [string]$adapter.LinkSpeed }

            $adapterItem = [ordered]@{
              alias = if ($adapterAlias) { $adapterAlias } else { $adapterDesc }
              description = if ($adapterDesc) { $adapterDesc } else { $adapterAlias }
              status = $adapterStatus
              connected = $adapterConnected
              linkSpeed = $adapterLinkSpeed
            }
            $adapterList += $adapterItem

            $adapterKeys = @($adapterAlias, $adapterDesc)
            foreach ($rawKey in $adapterKeys) {
              if (-not $rawKey) { continue }
              $lookupKey = ([string]$rawKey).ToLower().Replace('_', ' ').Trim()
              if (-not $lookupKey) { continue }
              if (-not $adapterLookup.ContainsKey($lookupKey)) {
                $adapterLookup[$lookupKey] = $adapterItem
              }
            }
          }
        }

        $networkBytesPerSec = 0
        $networkList = @()
        $seenAdapters = @{}
        foreach ($instanceName in $networkUtilByName.Keys) {
          $bytes = [double]$networkUtilByName[$instanceName]
          if ($bytes -lt 0) { $bytes = 0 }
          $networkBytesPerSec += $bytes

          $instanceKey = ([string]$instanceName).ToLower().Replace('_', ' ').Trim()
          $friendlyName = ([string]$instanceName) -replace '_', ' '
          $adapterInfo = $null
          if ($instanceKey -and $adapterLookup.ContainsKey($instanceKey)) {
            $adapterInfo = $adapterLookup[$instanceKey]
          } elseif ($instanceKey) {
            foreach ($knownKey in $adapterLookup.Keys) {
              if ($instanceKey -like "*$knownKey*" -or $knownKey -like "*$instanceKey*") {
                $adapterInfo = $adapterLookup[$knownKey]
                break
              }
            }
          }

          $displayName = $friendlyName
          $description = $friendlyName
          $adapterStatus = 'Unknown'
          $connected = $bytes -gt 0
          $linkSpeed = ''
          if ($adapterInfo) {
            if ($adapterInfo.alias) { $displayName = [string]$adapterInfo.alias }
            if ($adapterInfo.description) { $description = [string]$adapterInfo.description }
            if ($adapterInfo.status) { $adapterStatus = [string]$adapterInfo.status }
            if ($adapterInfo.linkSpeed) { $linkSpeed = [string]$adapterInfo.linkSpeed }
            $connected = [bool]$adapterInfo.connected
            $seenAdapters[([string]$displayName).ToLower()] = $true
          }

          $inUse = $bytes -ge 1024
          $activity = 'Disconnected'
          if ($connected) {
            if ($inUse) {
              $activity = 'In use'
            } else {
              $activity = 'Idle'
            }
          }

          $networkList += [ordered]@{
            name = $displayName
            description = $description
            bytesPerSec = [math]::Round([double]$bytes, 1)
            connected = $connected
            inUse = $inUse
            activity = $activity
            adapterStatus = $adapterStatus
            linkSpeed = $linkSpeed
          }
        }

        foreach ($adapterInfo in $adapterList) {
          $adapterName = [string]$adapterInfo.alias
          if (-not $adapterName) { continue }
          $adapterKey = $adapterName.ToLower()
          if ($seenAdapters.ContainsKey($adapterKey)) { continue }

          $activity = 'Disconnected'
          if ([bool]$adapterInfo.connected) {
            $activity = 'Idle'
          }

          $networkList += [ordered]@{
            name = $adapterName
            description = [string]$adapterInfo.description
            bytesPerSec = 0
            connected = [bool]$adapterInfo.connected
            inUse = $false
            activity = $activity
            adapterStatus = [string]$adapterInfo.status
            linkSpeed = [string]$adapterInfo.linkSpeed
          }
        }

        if ($networkList.Count -eq 0) {
          $networkList += [ordered]@{
            name = 'N/A'
            description = 'N/A'
            bytesPerSec = 0
            connected = $false
            inUse = $false
            activity = 'Unknown'
            adapterStatus = 'Unknown'
            linkSpeed = ''
          }
        }

        $networkList = @(
          $networkList | Sort-Object
            @{Expression = { if ($_.inUse) { 0 } else { 1 } }},
            @{Expression = { if ($_.connected) { 0 } else { 1 } }},
            @{Expression = { -[double]$_.bytesPerSec }},
            @{Expression = { [string]$_.name }}
        )
        $networkName = [string]$networkList[0].name

        $diskList = @()
        $diskInfos = Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3"
        foreach ($disk in $diskInfos) {
          if (-not $disk.DeviceID) { continue }
          if (-not $disk.Size -or [double]$disk.Size -le 0) { continue }
          $drive = [string]$disk.DeviceID
          $diskTotalGB = [math]::Round(([double]$disk.Size / 1GB), 1)
          $diskFreeGB = [math]::Round(([double]$disk.FreeSpace / 1GB), 1)
          $diskUsedGB = [math]::Round(($diskTotalGB - $diskFreeGB), 1)
          if ($diskUsedGB -lt 0) { $diskUsedGB = 0 }
          $diskPercent = 0
          if ($diskTotalGB -gt 0) {
            $diskPercent = ($diskUsedGB / $diskTotalGB) * 100
          }
          if ($diskPercent -gt 100) { $diskPercent = 100 }
          if ($diskPercent -lt 0) { $diskPercent = 0 }

          $diskList += [ordered]@{
            drive = $drive
            percent = [math]::Round([double]$diskPercent, 1)
            usedGB = [math]::Round([double]$diskUsedGB, 1)
            freeGB = [math]::Round([double]$diskFreeGB, 1)
            totalGB = [math]::Round([double]$diskTotalGB, 1)
          }
        }
        if ($diskList.Count -eq 0) {
          $diskList += [ordered]@{
            drive = 'N/A'
            percent = 0
            usedGB = 0
            freeGB = 0
            totalGB = 0
          }
        }
        $diskList = @($diskList | Sort-Object -Property drive)
        $diskDrive = [string]$diskList[0].drive
        $diskPercent = [double]$diskList[0].percent
        $diskUsedGB = [double]$diskList[0].usedGB
        $diskFreeGB = [double]$diskList[0].freeGB
        $diskTotalGB = [double]$diskList[0].totalGB

        $result = [ordered]@{
          cpuPercent = [math]::Round([double]$cpuPercent, 1)
          cpuSpeedGhz = [math]::Round([double]$cpuSpeedGhz, 2)
          cpuName = $cpuName
          ramPercent = [math]::Round([double]$ramPercent, 1)
          ramUsedGB = [math]::Round([double]$ramUsedGB, 1)
          ramTotalGB = [math]::Round([double]$ramTotalGB, 1)
          gpuPercent = [math]::Round([double]$gpuPercent, 1)
          gpuName = $gpuName
          gpus = $gpuList
          networkBytesPerSec = [math]::Round([double]$networkBytesPerSec, 1)
          networkName = $networkName
          networks = $networkList
          diskPercent = [math]::Round([double]$diskPercent, 1)
          diskDrive = $diskDrive
          diskUsedGB = [math]::Round([double]$diskUsedGB, 1)
          diskFreeGB = [math]::Round([double]$diskFreeGB, 1)
          diskTotalGB = [math]::Round([double]$diskTotalGB, 1)
          disks = $diskList
        }
        $result | ConvertTo-Json -Compress
      } catch {
        $fallback = [ordered]@{
          cpuPercent = 0
          cpuSpeedGhz = 0
          cpuName = 'CPU'
          ramPercent = 0
          ramUsedGB = 0
          ramTotalGB = 0
          gpuPercent = 0
          gpuName = 'N/A'
          gpus = @(
            [ordered]@{
              name = 'N/A'
              percent = 0
            }
          )
          networkBytesPerSec = 0
          networkName = 'N/A'
          networks = @(
            [ordered]@{
              name = 'N/A'
              description = 'N/A'
              bytesPerSec = 0
              connected = $false
              inUse = $false
              activity = 'Unknown'
              adapterStatus = 'Unknown'
              linkSpeed = ''
            }
          )
          diskPercent = 0
          diskDrive = 'C:'
          diskUsedGB = 0
          diskFreeGB = 0
          diskTotalGB = 0
          disks = @(
            [ordered]@{
              drive = 'N/A'
              percent = 0
              usedGB = 0
              freeGB = 0
              totalGB = 0
            }
          )
        }
        $fallback | ConvertTo-Json -Compress
      }
    `;
    return new Promise((resolve) => {
      try {
        const child = spawn("powershell.exe", [
          "-NoProfile",
          "-ExecutionPolicy",
          "Bypass",
          "-Command",
          psScript,
        ]);
        let output = "";
        child.stdout.on("data", (data) => (output += data.toString()));
        child.stderr.on("data", () => {});
        child.on("close", () => {
          try {
            const lines = output
              .split(/\r?\n/)
              .map((line) => line.trim())
              .filter(Boolean);
            const jsonLine = [...lines]
              .reverse()
              .find((line) => line.startsWith("{") && line.endsWith("}"));
            if (!jsonLine) {
              resolve(fallback);
              return;
            }
            const parsed = JSON.parse(jsonLine);
            resolve({ ...fallback, ...parsed });
          } catch {
            resolve(fallback);
          }
        });
        child.on("error", () => resolve(fallback));
      } catch {
        resolve(fallback);
      }
    });
  });
  function parseJsonObjectFromText(rawText) {
    const text = String(rawText || "").trim();
    if (!text) return null;
    const startIndex = text.indexOf("{");
    const endIndex = text.lastIndexOf("}");
    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
      return null;
    }
    const jsonText = text.slice(startIndex, endIndex + 1);
    try {
      return JSON.parse(jsonText);
    } catch {
      return null;
    }
  }
  function parseJsonArrayFromText(rawText) {
    const text = String(rawText || "").trim();
    if (!text) return [];

    try {
      const parsedDirect = JSON.parse(text);
      if (Array.isArray(parsedDirect)) return parsedDirect;
      if (parsedDirect && typeof parsedDirect === "object")
        return [parsedDirect];
    } catch {}

    const arrayStart = text.indexOf("[");
    const arrayEnd = text.lastIndexOf("]");
    if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd >= arrayStart) {
      const arrayJson = text.slice(arrayStart, arrayEnd + 1);
      try {
        const parsedArray = JSON.parse(arrayJson);
        if (Array.isArray(parsedArray)) return parsedArray;
        if (parsedArray && typeof parsedArray === "object")
          return [parsedArray];
      } catch {}
    }

    const objectStart = text.indexOf("{");
    const objectEnd = text.lastIndexOf("}");
    if (objectStart !== -1 && objectEnd !== -1 && objectEnd >= objectStart) {
      const objectJson = text.slice(objectStart, objectEnd + 1);
      try {
        const parsedObject = JSON.parse(objectJson);
        if (Array.isArray(parsedObject)) return parsedObject;
        if (parsedObject && typeof parsedObject === "object") {
          return [parsedObject];
        }
      } catch {}
    }

    return [];
  }
  function toFiniteNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }
  function resolveSmartctlPath() {
    const candidatePaths = [
      "smartctl.exe",
      "smartctl",
      path.join("C:", "Program Files", "smartmontools", "bin", "smartctl.exe"),
      path.join(
        "C:",
        "Program Files",
        "smartmontools",
        "bin64",
        "smartctl.exe",
      ),
      path.join(getAppsPath(), "tools", "smartctl", "smartctl.exe"),
      path.join(getAppsPath(), "smartctl.exe"),
    ];
    for (const candidate of candidatePaths) {
      try {
        if (candidate.toLowerCase().endsWith(".exe")) {
          if (fs.existsSync(candidate)) return candidate;
          continue;
        }
        const probe = spawnSync(candidate, ["--version"], {
          encoding: "utf8",
          windowsHide: true,
          timeout: 4000,
        });
        if (!probe.error) return candidate;
      } catch {}
    }
    try {
      const whereResult = spawnSync("where", ["smartctl.exe"], {
        encoding: "utf8",
        windowsHide: true,
        timeout: 4000,
      });
      if (whereResult.status === 0 && whereResult.stdout) {
        const firstPath = whereResult.stdout
          .split(/\r?\n/)
          .map((line) => line.trim())
          .find((line) => line.length > 0 && fs.existsSync(line));
        if (firstPath) return firstPath;
      }
    } catch {}
    return null;
  }
  function extractSmartctlHealth(report) {
    if (!report || typeof report !== "object") return null;

    const extracted = {};
    const modelName = String(report.model_name || "").trim();
    if (modelName) {
      extracted.model = modelName;
    }

    const tempCurrent = toFiniteNumber(report?.temperature?.current);
    const nvmeTempRaw = toFiniteNumber(
      report?.nvme_smart_health_information_log?.temperature,
    );
    const nvmeTemp =
      nvmeTempRaw !== null
        ? nvmeTempRaw > 200
          ? nvmeTempRaw - 273
          : nvmeTempRaw
        : null;
    const finalTemp = tempCurrent !== null ? tempCurrent : nvmeTemp;
    if (finalTemp !== null && finalTemp > -30 && finalTemp < 200) {
      extracted.temperatureC = Math.round(finalTemp);
    }

    const nvmeUsed = toFiniteNumber(
      report?.nvme_smart_health_information_log?.percentage_used,
    );
    if (nvmeUsed !== null) {
      const used = Math.min(100, Math.max(0, Math.round(nvmeUsed)));
      extracted.wearUsedPercent = used;
      extracted.healthPercent = Math.max(0, 100 - used);
      extracted.healthSource = "smartctl-nvme";
      return extracted;
    }

    const scsiUsed = toFiniteNumber(
      report?.scsi_percentage_used_endurance_indicator,
    );
    if (scsiUsed !== null) {
      const used = Math.min(100, Math.max(0, Math.round(scsiUsed)));
      extracted.wearUsedPercent = used;
      extracted.healthPercent = Math.max(0, 100 - used);
      extracted.healthSource = "smartctl-scsi";
      return extracted;
    }

    const ataRows = report?.ata_smart_attributes?.table;
    if (Array.isArray(ataRows)) {
      const wearIds = new Set([177, 202, 231, 233]);
      const wearRow = ataRows.find((row) => wearIds.has(Number(row?.id)));
      if (wearRow) {
        const normalized = toFiniteNumber(wearRow?.value);
        if (normalized !== null) {
          const health = Math.min(100, Math.max(0, Math.round(normalized)));
          extracted.healthPercent = health;
          extracted.wearUsedPercent = Math.max(0, 100 - health);
          extracted.healthSource = "smartctl-ata-normalized";
          return extracted;
        }
        const rawUsed = toFiniteNumber(wearRow?.raw?.value);
        if (rawUsed !== null) {
          const used = Math.min(100, Math.max(0, Math.round(rawUsed)));
          extracted.wearUsedPercent = used;
          extracted.healthPercent = Math.max(0, 100 - used);
          extracted.healthSource = "smartctl-ata-raw";
          return extracted;
        }
      }
    }

    if (typeof report?.smart_status?.passed === "boolean") {
      extracted.healthStatus = report.smart_status.passed
        ? "Healthy"
        : "Warning";
      extracted.healthSource = "smartctl-status";
      return extracted;
    }

    return Object.keys(extracted).length > 0 ? extracted : null;
  }
  function readSmartctlHealthByDiskNumber(diskNumber) {
    const diskIndex = Number(diskNumber);
    if (!Number.isFinite(diskIndex) || diskIndex < 0) return null;

    const smartctlPath = resolveSmartctlPath();
    if (!smartctlPath) return null;

    const deviceCandidates = [
      [`/dev/pd${diskIndex}`],
      ["-d", "nvme", `/dev/pd${diskIndex}`],
      ["-d", "sat", `/dev/pd${diskIndex}`],
      [`/dev/nvme${diskIndex}`],
    ];

    for (const deviceArgs of deviceCandidates) {
      try {
        const result = spawnSync(
          smartctlPath,
          ["--json", "-a", ...deviceArgs],
          {
            encoding: "utf8",
            windowsHide: true,
            timeout: 15000,
          },
        );
        const parsed = parseJsonObjectFromText(
          `${result.stdout || ""}\n${result.stderr || ""}`,
        );
        if (!parsed) continue;
        const extracted = extractSmartctlHealth(parsed);
        if (extracted) return extracted;
      } catch {}
    }

    return null;
  }
  function mergeBenchmarkHealth(baseHealth, smartHealth) {
    if (!smartHealth) return baseHealth;
    const merged = { ...(baseHealth || {}) };

    if (
      smartHealth.model &&
      (!merged.model ||
        merged.model === "N/A" ||
        String(merged.model).trim() === "")
    ) {
      merged.model = smartHealth.model;
    }

    const smartTemp = toFiniteNumber(smartHealth.temperatureC);
    const existingTemp = toFiniteNumber(merged.temperatureC);
    if (smartTemp !== null && (existingTemp === null || existingTemp <= 0)) {
      merged.temperatureC = Math.round(smartTemp);
    }

    const smartHealthPercent = toFiniteNumber(smartHealth.healthPercent);
    if (smartHealthPercent !== null) {
      const normalizedHealth = Math.min(
        100,
        Math.max(0, Math.round(smartHealthPercent)),
      );
      merged.healthPercent = normalizedHealth;

      const smartWear = toFiniteNumber(smartHealth.wearUsedPercent);
      merged.wearUsedPercent =
        smartWear !== null
          ? Math.min(100, Math.max(0, Math.round(smartWear)))
          : Math.max(0, 100 - normalizedHealth);
    }

    if (
      smartHealth.healthStatus &&
      (!merged.healthStatus || merged.healthStatus === "Unknown")
    ) {
      merged.healthStatus = smartHealth.healthStatus;
    }

    if (smartHealth.healthSource) {
      merged.healthSource = smartHealth.healthSource;
    }

    return merged;
  }
  function readDiskHealthListFallback() {
    const fallbackScript = `
      $ErrorActionPreference = "SilentlyContinue"
      try {
        $result = @()
        $disks = @(Get-Disk -ErrorAction SilentlyContinue)
        $wmi = @(Get-CimInstance Win32_DiskDrive -ErrorAction SilentlyContinue)

        if (($disks.Count -eq 0) -and ($wmi.Count -gt 0)) {
          foreach ($diskDrive in $wmi) {
            $diskNumber = [int]$diskDrive.Index
            $letters = @(Get-Partition -DiskNumber $diskNumber -ErrorAction SilentlyContinue |
              Where-Object { $_.DriveLetter } |
              Select-Object -ExpandProperty DriveLetter -ErrorAction SilentlyContinue)

            $driveText = "N/A"
            if ($letters.Count -gt 0) {
              $driveText = (($letters | Sort-Object -Unique | ForEach-Object { "$($_):" }) -join ", ")
            }

            $result += [PSCustomObject]@{
              drive = $driveText
              diskNumber = $diskNumber
              model = if ($diskDrive.Model) { [string]$diskDrive.Model } else { "N/A" }
              mediaType = if ($diskDrive.InterfaceType) { [string]$diskDrive.InterfaceType } else { "N/A" }
              healthStatus = if ($diskDrive.Status) { [string]$diskDrive.Status } else { "Unknown" }
              operationalStatus = if ($diskDrive.Status) { [string]$diskDrive.Status } else { "Unknown" }
              wearUsedPercent = $null
              healthPercent = $null
              healthSource = "windows-fallback"
              sizeGB = if ($diskDrive.Size -and [double]$diskDrive.Size -gt 0) { [math]::Round(([double]$diskDrive.Size / 1GB), 1) } else { $null }
              temperatureC = $null
            }
          }
        } else {
          foreach ($disk in $disks) {
            $diskNumber = [int]$disk.Number
            $letters = @(Get-Partition -DiskNumber $diskNumber -ErrorAction SilentlyContinue |
              Where-Object { $_.DriveLetter } |
              Select-Object -ExpandProperty DriveLetter -ErrorAction SilentlyContinue)

            $driveText = "N/A"
            if ($letters.Count -gt 0) {
              $driveText = (($letters | Sort-Object -Unique | ForEach-Object { "$($_):" }) -join ", ")
            }

            $wmiMatch = $wmi | Where-Object { $_.Index -eq $diskNumber } | Select-Object -First 1

            $modelText = "N/A"
            if ($disk.Model) {
              $modelText = [string]$disk.Model
            } elseif ($disk.FriendlyName) {
              $modelText = [string]$disk.FriendlyName
            } elseif ($wmiMatch -and $wmiMatch.Model) {
              $modelText = [string]$wmiMatch.Model
            }

            $mediaText = "N/A"
            if ($disk.BusType -and $disk.BusType.ToString() -ne "Unknown") {
              $mediaText = [string]$disk.BusType
            } elseif ($wmiMatch -and $wmiMatch.InterfaceType) {
              $mediaText = [string]$wmiMatch.InterfaceType
            }

            $statusText = "Unknown"
            if ($disk.HealthStatus) {
              $statusText = [string]$disk.HealthStatus
            } elseif ($wmiMatch -and $wmiMatch.Status) {
              $statusText = [string]$wmiMatch.Status
            }

            $operationalText = "Unknown"
            if ($disk.OperationalStatus) {
              $op = $disk.OperationalStatus
              if ($op -is [System.Array]) {
                $operationalText = ($op | ForEach-Object { "$_" }) -join ", "
              } else {
                $operationalText = [string]$op
              }
            } elseif ($wmiMatch -and $wmiMatch.Status) {
              $operationalText = [string]$wmiMatch.Status
            }

            $sizeValue = $null
            if ($disk.Size -and [double]$disk.Size -gt 0) {
              $sizeValue = [math]::Round(([double]$disk.Size / 1GB), 1)
            } elseif ($wmiMatch -and $wmiMatch.Size -and [double]$wmiMatch.Size -gt 0) {
              $sizeValue = [math]::Round(([double]$wmiMatch.Size / 1GB), 1)
            }

            $result += [PSCustomObject]@{
              drive = $driveText
              diskNumber = $diskNumber
              model = $modelText
              mediaType = $mediaText
              healthStatus = $statusText
              operationalStatus = $operationalText
              wearUsedPercent = $null
              healthPercent = $null
              healthSource = "windows-fallback"
              sizeGB = $sizeValue
              temperatureC = $null
            }
          }
        }

        @($result | Sort-Object -Property diskNumber) | ConvertTo-Json -Compress -Depth 4
      } catch {
        "[]"
      }
    `;

    try {
      const fallbackRun = spawnSync(
        "powershell.exe",
        [
          "-NoProfile",
          "-ExecutionPolicy",
          "Bypass",
          "-Command",
          fallbackScript,
        ],
        {
          encoding: "utf8",
          windowsHide: true,
          timeout: 30000,
        },
      );
      const fallbackRaw = `${fallbackRun.stdout || ""}\n${fallbackRun.stderr || ""}`;
      return parseJsonArrayFromText(fallbackRaw);
    } catch {
      return [];
    }
  }
  ipcMain.handle("get-disk-health-all", async () => {
    console.log("Main process: get-disk-health-all triggered");
    if (process.platform !== "win32") {
      return {
        success: false,
        error: "Disk health is only supported on Windows.",
      };
    }

    const psScript = `
      $ErrorActionPreference = "Continue"
      try {
        $result = @()
        $disks = @(Get-Disk -ErrorAction SilentlyContinue)
        $diskDrives = @(Get-CimInstance Win32_DiskDrive -ErrorAction SilentlyContinue)

        if (($disks.Count -eq 0) -and ($diskDrives.Count -gt 0)) {
          $disks = @(
            $diskDrives | ForEach-Object {
              [PSCustomObject]@{
                Number = [int]$_.Index
                Model = [string]$_.Model
                FriendlyName = [string]$_.Caption
                BusType = [string]$_.InterfaceType
                HealthStatus = [string]$_.Status
                OperationalStatus = [string]$_.Status
                Size = [double]$_.Size
              }
            }
          )
        }

        $physicalDisks = @()
        if (Get-Command Get-PhysicalDisk -ErrorAction SilentlyContinue) {
          $physicalDisks = @(Get-PhysicalDisk -ErrorAction SilentlyContinue)
        }

        foreach ($disk in $disks) {
          $diskNumber = [int]$disk.Number
          $entry = [ordered]@{
            drive = "N/A"
            diskNumber = $diskNumber
            model = "N/A"
            mediaType = "N/A"
            healthStatus = "Unknown"
            operationalStatus = "Unknown"
            wearUsedPercent = $null
            healthPercent = $null
            healthSource = "windows-api"
            sizeGB = $null
            temperatureC = $null
          }

          if ($disk.Model) {
            $entry.model = [string]$disk.Model
          } elseif ($disk.FriendlyName) {
            $entry.model = [string]$disk.FriendlyName
          }

          if ($disk.BusType -and $disk.BusType.ToString() -ne "Unknown") {
            $entry.mediaType = [string]$disk.BusType
          }
          if ($disk.HealthStatus) {
            $entry.healthStatus = [string]$disk.HealthStatus
          }
          if ($disk.OperationalStatus) {
            $op = $disk.OperationalStatus
            if ($op -is [System.Array]) {
              $entry.operationalStatus = ($op | ForEach-Object { "$_" }) -join ", "
            } else {
              $entry.operationalStatus = [string]$op
            }
          }
          if ($disk.Size -and [double]$disk.Size -gt 0) {
            $entry.sizeGB = [math]::Round(([double]$disk.Size / 1GB), 1)
          }

          try {
            $letters = @(Get-Partition -DiskNumber $diskNumber -ErrorAction SilentlyContinue |
              Where-Object { $_.DriveLetter } |
              Select-Object -ExpandProperty DriveLetter -ErrorAction SilentlyContinue)
            if ($letters.Count -gt 0) {
              $entry.drive = (($letters | Sort-Object -Unique | ForEach-Object { "$($_):" }) -join ", ")
            }
          } catch {}

          $physical = $null
          if ($physicalDisks.Count -gt 0) {
            $physical = $physicalDisks |
              Where-Object { "$($_.DeviceId)" -eq "$diskNumber" } |
              Select-Object -First 1

            if (-not $physical -and $disk.FriendlyName) {
              $physical = $physicalDisks |
                Where-Object { $_.FriendlyName -like "*$($disk.FriendlyName)*" } |
                Select-Object -First 1
            }
          }

          if ($physical) {
            if ($physical.FriendlyName) {
              $entry.model = [string]$physical.FriendlyName
            }
            if ($physical.MediaType -and $physical.MediaType.ToString() -ne "Unspecified") {
              $entry.mediaType = [string]$physical.MediaType
            }
            if ($physical.HealthStatus) {
              $entry.healthStatus = [string]$physical.HealthStatus
            }
            if ($physical.OperationalStatus) {
              $op2 = $physical.OperationalStatus
              if ($op2 -is [System.Array]) {
                $entry.operationalStatus = ($op2 | ForEach-Object { "$_" }) -join ", "
              } else {
                $entry.operationalStatus = [string]$op2
              }
            }
            if ($physical.Size -and [double]$physical.Size -gt 0) {
              $entry.sizeGB = [math]::Round(([double]$physical.Size / 1GB), 1)
            }

            try {
              if (Get-Command Get-StorageReliabilityCounter -ErrorAction SilentlyContinue) {
                $reliability = Get-StorageReliabilityCounter -PhysicalDisk $physical -ErrorAction Stop
                if ($reliability -and $null -ne $reliability.Wear -and "$($reliability.Wear)".Trim() -ne "") {
                  $wearRaw = [double]$reliability.Wear
                  if ($wearRaw -lt 0) { $wearRaw = 0 }
                  if ($wearRaw -gt 100) { $wearRaw = 100 }
                  $wearRounded = [int][math]::Round($wearRaw)
                  if ($wearRounded -gt 0) {
                    $entry.wearUsedPercent = $wearRounded
                    $entry.healthPercent = [int][math]::Round(100 - $wearRaw)
                  }
                }
                if ($reliability -and $reliability.Temperature -and [double]$reliability.Temperature -gt 0) {
                  $entry.temperatureC = [int][math]::Round([double]$reliability.Temperature)
                }
              }
            } catch {}
          }

          $diskDrive = $diskDrives | Where-Object { $_.Index -eq $diskNumber } | Select-Object -First 1
          if ($diskDrive) {
            if (($entry.model -eq "N/A" -or [string]::IsNullOrWhiteSpace($entry.model)) -and $diskDrive.Model) {
              $entry.model = [string]$diskDrive.Model
            }
            if (($entry.mediaType -eq "N/A" -or [string]::IsNullOrWhiteSpace($entry.mediaType)) -and $diskDrive.MediaType) {
              $entry.mediaType = [string]$diskDrive.MediaType
            }
            if (($entry.healthStatus -eq "Unknown") -and $diskDrive.Status) {
              $entry.healthStatus = [string]$diskDrive.Status
            }
            if (($entry.sizeGB -eq $null) -and $diskDrive.Size -and [double]$diskDrive.Size -gt 0) {
              $entry.sizeGB = [math]::Round(([double]$diskDrive.Size / 1GB), 1)
            }
          }

          $result += $entry
        }

        @($result | Sort-Object -Property diskNumber) | ConvertTo-Json -Compress
      } catch {
        "[]"
      }
    `;

    return new Promise((resolve) => {
      const child = spawn("powershell.exe", [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        psScript,
      ]);

      let output = "";
      child.stdout.on("data", (data) => {
        output += data.toString();
      });
      child.stderr.on("data", (data) => {
        output += data.toString();
      });

      child.on("close", () => {
        let disks = parseJsonArrayFromText(output);
        if (!Array.isArray(disks)) {
          disks = [];
        }
        if (disks.length === 0) {
          const fallbackDisks = readDiskHealthListFallback();
          if (Array.isArray(fallbackDisks) && fallbackDisks.length > 0) {
            disks = fallbackDisks;
            console.log(
              `Main process: get-disk-health-all fallback resolved ${fallbackDisks.length} disk entries`,
            );
          }
        }
        if (disks.length === 0) {
          console.warn(
            "Main process: get-disk-health-all returned no disk entries. Raw output preview:",
            String(output || "").slice(0, 500),
          );
        }

        const enrichedDisks = disks.map((disk) => {
          const normalized = { ...(disk || {}) };
          try {
            if (Number.isFinite(Number(normalized.diskNumber))) {
              const smartHealth = readSmartctlHealthByDiskNumber(
                Number(normalized.diskNumber),
              );
              if (smartHealth) {
                return mergeBenchmarkHealth(normalized, smartHealth);
              }
            }
          } catch (smartErr) {
            console.warn(
              "Main process: SMART health fallback failed:",
              smartErr?.message || smartErr,
            );
          }
          return normalized;
        });

        resolve({
          success: true,
          disks: enrichedDisks,
        });
      });

      child.on("error", (error) => {
        resolve({
          success: false,
          error: `Failed to read disk health: ${error.message}`,
          disks: [],
        });
      });
    });
  });
  ipcMain.handle("run-benchmark", async (event, rawType, options = {}) => {
    console.log("Main process: run-benchmark triggered", rawType, options);
    if (process.platform !== "win32") {
      return {
        success: false,
        error: "Benchmark is only supported on Windows.",
      };
    }

    const normalizedType = String(rawType || "disk").toLowerCase();
    if (normalizedType !== "disk") {
      return {
        success: false,
        error: "Only disk benchmark is supported right now.",
      };
    }

    const rawDrive = String(options?.drive || "C:").toUpperCase();
    const driveMatch = rawDrive.match(/[A-Z]/);
    const driveLetter = driveMatch ? driveMatch[0] : "C";
    const drive = `${driveLetter}:`;
    const healthOnly = options && options.healthOnly === true;

    const winsatCommand = `winsat disk -drive ${driveLetter}`;

    const psScript = `
      $ErrorActionPreference = "Continue"
      try {
        $driveLetter = ${JSON.stringify(driveLetter)}
        $drive = "${driveLetter}:"

        $health = [ordered]@{
          drive = $drive
          diskNumber = $null
          model = "N/A"
          mediaType = "N/A"
          healthStatus = "Unknown"
          operationalStatus = "Unknown"
          wearUsedPercent = $null
          healthPercent = $null
          healthSource = "windows-api"
          sizeGB = $null
          temperatureC = $null
        }

        try {
          $partition = Get-Partition -DriveLetter $driveLetter -ErrorAction Stop | Select-Object -First 1
          if ($partition) {
            $diskNumber = [int]$partition.DiskNumber
            $health.diskNumber = $diskNumber

            $disk = Get-Disk -Number $diskNumber -ErrorAction SilentlyContinue
            if ($disk) {
              if ($disk.Model) {
                $health.model = [string]$disk.Model
              } elseif ($disk.FriendlyName) {
                $health.model = [string]$disk.FriendlyName
              }
              if ($disk.BusType -and $disk.BusType.ToString() -ne "Unknown") {
                $health.mediaType = [string]$disk.BusType
              }
              if ($disk.HealthStatus) {
                $health.healthStatus = [string]$disk.HealthStatus
              }
              if ($disk.OperationalStatus) {
                $op = $disk.OperationalStatus
                if ($op -is [System.Array]) {
                  $health.operationalStatus = ($op | ForEach-Object { "$_" }) -join ", "
                } else {
                  $health.operationalStatus = [string]$op
                }
              }
              if ($disk.Size -and [double]$disk.Size -gt 0) {
                $health.sizeGB = [math]::Round(([double]$disk.Size / 1GB), 1)
              }
            }

            if (Get-Command Get-PhysicalDisk -ErrorAction SilentlyContinue) {
              $physical = Get-PhysicalDisk -ErrorAction SilentlyContinue |
                Where-Object { $_.DeviceId -eq $diskNumber } |
                Select-Object -First 1

              if (-not $physical -and $disk -and $disk.FriendlyName) {
                $physical = Get-PhysicalDisk -ErrorAction SilentlyContinue |
                  Where-Object { $_.FriendlyName -like "*$($disk.FriendlyName)*" } |
                  Select-Object -First 1
              }

              if ($physical) {
                if ($physical.FriendlyName) {
                  $health.model = [string]$physical.FriendlyName
                }
                if ($physical.MediaType -and $physical.MediaType.ToString() -ne "Unspecified") {
                  $health.mediaType = [string]$physical.MediaType
                }
                if ($physical.HealthStatus) {
                  $health.healthStatus = [string]$physical.HealthStatus
                }
                if ($physical.OperationalStatus) {
                  $op2 = $physical.OperationalStatus
                  if ($op2 -is [System.Array]) {
                    $health.operationalStatus = ($op2 | ForEach-Object { "$_" }) -join ", "
                  } else {
                    $health.operationalStatus = [string]$op2
                  }
                }
                if ($physical.Size -and [double]$physical.Size -gt 0) {
                  $health.sizeGB = [math]::Round(([double]$physical.Size / 1GB), 1)
                }

                try {
                  if (Get-Command Get-StorageReliabilityCounter -ErrorAction SilentlyContinue) {
                    $reliability = Get-StorageReliabilityCounter -PhysicalDisk $physical -ErrorAction Stop
                    if ($reliability -and $null -ne $reliability.Wear -and "$($reliability.Wear)".Trim() -ne "") {
                      $wearRaw = [double]$reliability.Wear
                      if ($wearRaw -lt 0) { $wearRaw = 0 }
                      if ($wearRaw -gt 100) { $wearRaw = 100 }
                      $wearRounded = [int][math]::Round($wearRaw)

                      # On some NVMe drives Windows returns Wear=0 even when vendor SMART health is lower.
                      # To avoid false "100%" values, only publish health percent when wear is a positive value.
                      if ($wearRounded -gt 0) {
                        $health.wearUsedPercent = $wearRounded
                        $health.healthPercent = [int][math]::Round(100 - $wearRaw)
                      } else {
                        $health.wearUsedPercent = $null
                        $health.healthPercent = $null
                      }
                    }
                    if ($reliability -and $reliability.Temperature -and [double]$reliability.Temperature -gt 0) {
                      $health.temperatureC = [int][math]::Round([double]$reliability.Temperature)
                    }
                  }
                } catch {}
              }
            }

            $diskDrive = Get-CimInstance Win32_DiskDrive -ErrorAction SilentlyContinue |
              Where-Object { $_.Index -eq $diskNumber } |
              Select-Object -First 1

            if ($diskDrive) {
              if (($health.model -eq "N/A" -or [string]::IsNullOrWhiteSpace($health.model)) -and $diskDrive.Model) {
                $health.model = [string]$diskDrive.Model
              }
              if (($health.mediaType -eq "N/A" -or [string]::IsNullOrWhiteSpace($health.mediaType)) -and $diskDrive.MediaType) {
                $health.mediaType = [string]$diskDrive.MediaType
              }
              if (($health.healthStatus -eq "Unknown") -and $diskDrive.Status) {
                $health.healthStatus = [string]$diskDrive.Status
              }
              if (($health.sizeGB -eq $null) -and $diskDrive.Size -and [double]$diskDrive.Size -gt 0) {
                $health.sizeGB = [math]::Round(([double]$diskDrive.Size / 1GB), 1)
              }
            }
          }
        } catch {
          Write-Host "DISK_HEALTH_WARN:$($_.Exception.Message)"
        }

        Write-Host "WINSAT_HEALTH_JSON:$($health | ConvertTo-Json -Compress)"

        if (${healthOnly ? "$true" : "$false"}) {
          $winsatCode = 0
          Write-Host "WINSAT_EXIT_CODE:$winsatCode"
          exit 0
        }

        $winsatCommand = ${JSON.stringify(winsatCommand)}
        Write-Host "WINSAT_COMMAND:$winsatCommand"
        & cmd.exe /c $winsatCommand 2>&1 | Out-Host
        $winsatCode = $LASTEXITCODE
        Write-Host "WINSAT_EXIT_CODE:$winsatCode"
        exit $winsatCode
      } catch {
        Write-Host "Critical Error: $($_.Exception.Message)"
        exit 1
      }
    `;

    return new Promise((resolve) => {
      const child = spawn("powershell.exe", [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        psScript,
      ]);

      let output = "";
      child.stdout.on("data", (data) => {
        const text = data.toString();
        output += text;
        console.log(`[Benchmark Out]: ${text.trim()}`);
      });
      child.stderr.on("data", (data) => {
        const text = data.toString();
        output += text;
        console.error(`[Benchmark Err]: ${text.trim()}`);
      });
      child.on("close", (code) => {
        let health = null;
        try {
          const healthLine = output
            .split(/\r?\n/)
            .map((line) => line.trim())
            .find((line) => line.startsWith("WINSAT_HEALTH_JSON:"));
          if (healthLine) {
            const jsonText = healthLine.substring("WINSAT_HEALTH_JSON:".length);
            health = JSON.parse(jsonText);
          }
        } catch {}

        try {
          if (health && Number.isFinite(Number(health.diskNumber))) {
            const smartHealth = readSmartctlHealthByDiskNumber(
              Number(health.diskNumber),
            );
            if (smartHealth) {
              health = mergeBenchmarkHealth(health, smartHealth);
            }
          }
        } catch (smartErr) {
          console.warn(
            "Main process: SMART health fallback failed:",
            smartErr?.message || smartErr,
          );
        }
        if (health && health.healthSource) {
          console.log(
            "Main process: benchmark health source =",
            health.healthSource,
          );
        }

        const exitCodeMatch = output.match(/WINSAT_EXIT_CODE:(-?\d+)/i);
        const parsedExitCode = exitCodeMatch
          ? Number(exitCodeMatch[1])
          : Number(code);
        const success = parsedExitCode === 0;
        resolve({
          success,
          benchmarkType: "disk",
          drive,
          healthOnly,
          health,
          code: parsedExitCode,
          output,
          error: success
            ? null
            : `WinSAT disk test failed with code ${parsedExitCode}.`,
        });
      });
      child.on("error", (err) => {
        resolve({
          success: false,
          benchmarkType: "disk",
          drive,
          healthOnly,
          health: null,
          error: `Failed to start benchmark: ${err.message}`,
        });
      });
    });
  });
  ipcMain.handle("open-external", async (event, url) => {
    console.log("Main process: opening external URL:", url);
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      console.error("Failed to open external URL:", error);
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("get-office-local", async () => {
    const officeDir = path.join(getAppsPath(), "Office");
    console.log("Main process: scanning office dir:", officeDir);
    try {
      const fs2 = require2("fs");
      if (!fs2.existsSync(officeDir)) return [];
      const files = fs2.readdirSync(officeDir);
      return files
        .filter((f) => {
          const lower = f.toLowerCase();
          return lower.endsWith(".iso") || lower.endsWith(".img");
        })
        .map((f) => ({
          name: f.replace(/\.(iso|img)$/i, "").replace(/\./g, " "),
          fileName: f,
          path: path.join(officeDir, f),
        }));
    } catch (e) {
      console.error("Error reading office dir", e);
      return [];
    }
  });
  ipcMain.handle("install-office-local", async (event, imagePath) => {
    console.log(
      `Main process: install-office-local triggered for ${imagePath}`,
    );
    mountedIsos.add(imagePath);
    return new Promise((resolve) => {
      const psScript = `
        try {
            $imagePath = "${imagePath.replace(/\\/g, "\\\\")}"
            $imageExt = [System.IO.Path]::GetExtension($imagePath).ToLowerInvariant()
            Write-Host "Attempting native mount: $imagePath ($imageExt)"

            # 1. Try native mount with a tolerant strategy for ISO/IMG
            $mounted = $false
            try {
                if ($imageExt -eq ".iso") {
                    Mount-DiskImage -ImagePath $imagePath -StorageType ISO -Access ReadOnly -ErrorAction Stop | Out-Null
                } else {
                    Mount-DiskImage -ImagePath $imagePath -Access ReadOnly -ErrorAction Stop | Out-Null
                }
                $mounted = $true
            } catch {
                Write-Host "Native mount first attempt failed: $($_.Exception.Message)"
            }

            if (-not $mounted) {
                try {
                    Mount-DiskImage -ImagePath $imagePath -ErrorAction Stop | Out-Null
                    $mounted = $true
                    Write-Host "Native mount retry succeeded."
                } catch {
                    throw "Unable to mount image: $($_.Exception.Message)"
                }
            }

            # Wait for volume mount
            Start-Sleep -Seconds 3

            # 2. Scan mounted drives for Office setup
            $targetDrive = $null
            for ($i = 0; $i -lt 6; $i++) {
                $drives = Get-PSDrive -PSProvider FileSystem
                foreach ($d in $drives) {
                    $drivePath = "$($d.Root)"
                    if (Test-Path (Join-Path $drivePath "setup.exe")) {
                        if ((Test-Path (Join-Path $drivePath "office")) -or
                            (Test-Path (Join-Path $drivePath "catalog")) -or
                            (Test-Path (Join-Path $drivePath "proplus.ww"))) {
                            Write-Host "FOUND Office Installer at $drivePath"
                            $targetDrive = $drivePath
                            break
                        }
                    }
                }
                if ($targetDrive) { break }
                Write-Host "Waiting for drive to mount... ($($i+1)/6)"
                Start-Sleep -Seconds 2
            }

            if (-not $targetDrive) {
                throw "Could not find Office setup in mounted image."
            }

            # 3. Build install plan
            $setupFile = Join-Path $targetDrive "setup.exe"
            Write-Host "Launching Setup: $setupFile"

            $args = @()
            $tempConfig = $null
            $shouldDismount = $true
            $officeRootPath = Join-Path $targetDrive "Office"
            $officeDataPath = Join-Path $officeRootPath "Data"

            # Case A: MSI installer (Office 2010/2013/2016 VL)
            $wwFolders = Get-ChildItem -Path $targetDrive -Directory -Filter *.WW -ErrorAction SilentlyContinue
            if ($wwFolders) {
                $mainWw = $wwFolders | Where-Object { $_.Name -notlike "Office.*" } | Select-Object -First 1
                if (-not $mainWw) { $mainWw = $wwFolders[0] }
                $productID = $mainWw.Name.Replace(".WW", "")

                Write-Host "Detected MSI Office: $productID"
                $tempConfig = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "office_silent_$(Get-Random).xml")
                $xmlContent = @"
<Configuration Product="$productID">
    <Display Level="none" CompletionNotice="no" SuppressModal="yes" AcceptEula="yes" />
    <Setting Id="SETUP_REBOOT" Value="Never" />
</Configuration>
"@
                [System.IO.File]::WriteAllText($tempConfig, $xmlContent)
                $args = @("/config", $tempConfig)
            }
            # Case B: C2R installer (Office 2019/2021/2024/365)
            elseif (Test-Path $officeDataPath) {
                Write-Host "Detected C2R Office media"
                $shouldDismount = $false
                $preferredArch = if ([Environment]::Is64BitOperatingSystem) { "x64" } else { "x86" }
                $preferredSetupExe = if ($preferredArch -eq "x64") { "Setup64.exe" } else { "Setup32.exe" }

                # Prefer launcher executables from media
                $launcherCandidates = @(
                    (Join-Path $targetDrive ("Install " + $preferredArch + ".exe")),
                    (Join-Path $targetDrive "Install x64.exe"),
                    (Join-Path $targetDrive "Install x86.exe"),
                    (Join-Path $officeRootPath $preferredSetupExe),
                    (Join-Path $officeRootPath "Setup64.exe"),
                    (Join-Path $officeRootPath "Setup32.exe")
                ) | Select-Object -Unique
                $launcherFile = $launcherCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

                if ($launcherFile) {
                    $setupFile = $launcherFile
                    Write-Host "Using C2R launcher: $setupFile"
                } else {
                    # Fallback to setup.exe /configure with VALID ODT config
                    $existingConfigs = @(Get-ChildItem -Path $targetDrive -Filter *.xml -Recurse -File -ErrorAction SilentlyContinue)
                    $bestConfig = $null
                    $bestScore = -1
                    foreach ($configFile in $existingConfigs) {
                        $name = $configFile.Name.ToLower()
                        if ($name -eq "c2rfireflydata.xml") { continue }

                        $isValidConfig = $false
                        try {
                            [xml]$xmlProbe = Get-Content -Path $configFile.FullName -Raw
                            if ($xmlProbe -and $xmlProbe.Configuration) {
                                $isValidConfig = $true
                            }
                        } catch {}
                        if (-not $isValidConfig) { continue }

                        $score = 0
                        $full = $configFile.FullName.ToLower()
                        if ($full -like "*\\office\\config\\$preferredArch\\*") { $score += 100 }
                        if ($full -like "*\\office\\config\\*") { $score += 25 }
                        if ($name -eq "config.xml") { $score += 20 }
                        if ($name -match "install|proplus|standard|retail|volume|config") { $score += 10 }
                        if ($score -gt $bestScore) {
                            $bestScore = $score
                            $bestConfig = $configFile
                        }
                    }

                    if ($bestConfig) {
                        Write-Host "Using found C2R config: $($bestConfig.FullName)"
                        $args = @("/configure", $bestConfig.FullName)
                    } else {
                        Write-Host "No C2R launcher or valid config found, fallback to setup.exe"
                    }
                }
            }

            # 3.2 Execute installer
            if ($args.Count -gt 0) {
                Write-Host "Running Silent: $setupFile $($args -join ' ')"
                $proc = Start-Process -FilePath $setupFile -ArgumentList $args -PassThru -Wait
            } else {
                Write-Host "No silent config identified, running standard setup"
                $proc = Start-Process -FilePath $setupFile -PassThru -Wait
            }

            Write-Host "Setup finished with code $($proc.ExitCode)"

            # 4. Cleanup
            if ($tempConfig) { Remove-Item $tempConfig -ErrorAction SilentlyContinue }
            if ($shouldDismount) {
                Start-Sleep -Seconds 5
                Dismount-DiskImage -ImagePath $imagePath -ErrorAction SilentlyContinue
                Write-Host "ISO_DISMOUNTED"
            } else {
                Write-Host "ISO_KEPT_MOUNTED"
            }
            exit 0
        } catch {
            $msg = $_.Exception.Message
            Write-Host "Critical Error: $msg"
            try {
                Dismount-DiskImage -ImagePath $imagePath -ErrorAction SilentlyContinue | Out-Null
            } catch {}
            exit 1
        }
      `;
      const child = spawn("powershell.exe", [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        psScript,
      ]);
      runningProcesses.set(imagePath, child);
      let officeLocalLog = "";
      child.stdout.on("data", (data) => {
        const text = data.toString();
        officeLocalLog += text;
        console.log(`[Office Local Out]: ${text}`);
      });
      child.stderr.on("data", (data) => {
        const text = data.toString();
        officeLocalLog += text;
        console.error(`[Office Local Err]: ${text}`);
      });
      child.on("close", (code) => {
        console.log(`Office Local Install exited with code ${code}`);
        runningProcesses.delete(imagePath);
        const shouldKeepMounted = officeLocalLog.includes("ISO_KEPT_MOUNTED");
        const wasDismounted = officeLocalLog.includes("ISO_DISMOUNTED");
        if (shouldKeepMounted && !wasDismounted) {
          console.log(
            `Office image kept mounted for ongoing C2R installation: ${imagePath}`,
          );
        } else {
          mountedIsos.delete(imagePath);
        }
        resolve({ success: code === 0, code });
      });
    });
  });
  ipcMain.handle(
    "install-office-online",
    async (event, payload = {}, rawTaskKey) => {
      console.log("Main process: install-office-online triggered", payload);
      if (process.platform !== "win32") {
        return {
          success: false,
          error: "Office Online setup is only supported on Windows.",
        };
      }
      const taskKey =
        typeof rawTaskKey === "string" && rawTaskKey.trim().length > 0
          ? rawTaskKey.trim()
          : `office-online-${Date.now()}`;
      const officeClientEdition =
        String(payload.officeClientEdition || "64") === "32" ? "32" : "64";
      const mode =
        String(payload.mode || "install") === "download"
          ? "download"
          : "install";
      const removeMsi = payload.removeMsi !== false;
      const rawProductIds = Array.isArray(payload.productIds)
        ? payload.productIds
        : [payload.productId];
      const productIds = Array.from(
        new Set(
          rawProductIds.map((id) => String(id || "").trim()).filter(Boolean),
        ),
      );
      const languageId = String(payload.languageId || "en-us").trim();
      const channel = String(payload.channel || "Current").trim();
      const idPattern = /^[A-Za-z0-9._-]+$/;
      const langPattern = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,3}$/;
      const channelPattern = /^[A-Za-z0-9._-]+$/;
      if (productIds.length === 0) {
        return {
          success: false,
          error: "Please select at least one Office product ID.",
        };
      }
      const invalidProduct = productIds.find((id) => !idPattern.test(id));
      if (invalidProduct) {
        return {
          success: false,
          error: `Invalid Office product ID: ${invalidProduct}`,
        };
      }
      if (!langPattern.test(languageId)) {
        return { success: false, error: "Invalid Office language ID." };
      }
      if (!channelPattern.test(channel)) {
        return { success: false, error: "Invalid Office update channel." };
      }
      const psScript = `
        try {
          $ErrorActionPreference = "Stop"
          $OutputEncoding = [System.Text.Encoding]::UTF8

          $productIdsCsv = "${productIds.join(",")}"
          $languageId = "${languageId}"
          $channel = "${channel}"
          $edition = "${officeClientEdition}"
          $mode = "${mode}"
          $removeMsi = "${removeMsi ? "true" : "false"}"

          $odtRoot = Join-Path $env:ProgramData "WinstallerHub\\OfficeODT"
          New-Item -Path $odtRoot -ItemType Directory -Force | Out-Null

          Set-Location -Path $odtRoot
          
          $setupPath = $null
          $programFilesX86 = [Environment]::GetFolderPath("ProgramFilesX86")
          $candidatePaths = @(
            (Join-Path $odtRoot "setup.exe"),
            (Join-Path $env:ProgramFiles "OfficeDeploymentTool\\setup.exe"),
            (Join-Path $programFilesX86 "OfficeDeploymentTool\\setup.exe")
          )

          foreach ($candidate in $candidatePaths) {
            if ($candidate -and (Test-Path $candidate)) {
              $setupPath = $candidate
              break
            }
          }

          if (-not $setupPath) {
            Write-Host "Office Deployment Tool not found. Installing via winget..."
            try {
              & winget install --id Microsoft.OfficeDeploymentTool --silent --accept-package-agreements --accept-source-agreements --disable-interactivity | Out-Host
            } catch {
              Write-Host "winget install error: $($_.Exception.Message)"
            }

            foreach ($candidate in $candidatePaths) {
              if ($candidate -and (Test-Path $candidate)) {
                $setupPath = $candidate
                break
              }
            }
          }

          if (-not $setupPath) {
            throw "Cannot find Office Deployment Tool setup.exe. Please install 'Microsoft.OfficeDeploymentTool' first."
          }


          $configPath = Join-Path $odtRoot "online-config-$([Guid]::NewGuid().ToString('N')).xml"
          $removeMsiNode = ""
          if ($removeMsi -eq "true") {
            $removeMsiNode = '<RemoveMSI All="True" />'
          }

          $productIds = $productIdsCsv.Split(",") | Where-Object { $_ -and $_.Trim().Length -gt 0 }
          if ($productIds.Count -eq 0) {
            throw "No valid Office product IDs were provided."
          }

          $productXmlItems = @()
          foreach ($id in $productIds) {
            $productXmlItems += @"
    <Product ID="$id">
      <Language ID="$languageId" />
    </Product>
"@
          }
          $productsXml = $productXmlItems -join [Environment]::NewLine

          $configXml = @"
<Configuration>
  <Add OfficeClientEdition="$edition" Channel="$channel" MigrateArch="TRUE">
$productsXml
  </Add>
  $removeMsiNode
  <Display Level="Full" AcceptEULA="TRUE" />
  <Property Name="FORCEAPPSHUTDOWN" Value="TRUE" />
</Configuration>
"@

          [System.IO.File]::WriteAllText($configPath, $configXml, [System.Text.Encoding]::UTF8)

          Write-Host "Using setup: $setupPath"
          Write-Host "Generated config: $configPath"

          $args = @()
          if ($mode -eq "download") {
            $args = @("/download", $configPath)
          } else {
            $args = @("/configure", $configPath)
          }

          $setupProc = Start-Process -FilePath $setupPath -ArgumentList $args -PassThru
          $procId = $setupProc.Id
          
          $setupProc.WaitForExit()
          Write-Host "ODT exited with code $($setupProc.ExitCode)"
          exit $setupProc.ExitCode
        } catch {
          Write-Host "Critical Error: $($_.Exception.Message)"
          exit 1
        }
      `;
      return new Promise((resolve) => {
        const child = spawn(
          "powershell.exe",
          [
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-WindowStyle",
            "Hidden",
            "-Command",
            psScript,
          ],
          { windowsHide: true },
        );
        runningProcesses.set(taskKey, child);
        let output = "";
        child.stdout.on("data", (data) => {
          const text = data.toString();
          output += text;

          console.log(`[Office Online Out]: ${text.trim()}`);
        });
        child.stderr.on("data", (data) => {
          const text = data.toString();
          output += text;
          console.error(`[Office Online Err]: ${text.trim()}`);
        });
        child.on("close", (code) => {
          console.log(`Office Online process exited with code ${code}`);
          runningProcesses.delete(taskKey);
          resolve({
            success: code === 0,
            code,
            taskKey,
            output,
            error:
              code === 0
                ? null
                : "Office online setup failed. Check task logs or retry with another option.",
          });
        });
        child.on("error", (err) => {
          runningProcesses.delete(taskKey);
          resolve({
            success: false,
            taskKey,
            error: `Failed to start Office online setup: ${err.message}`,
          });
        });
      });
    },
  );
  ipcMain.handle("clean-office-c2r", async (event, rawTaskKey) => {
    console.log("Main process: clean-office-c2r triggered");
    if (process.platform !== "win32") {
      return {
        success: false,
        error: "Office cleanup is only supported on Windows.",
      };
    }
    const activeCleanupTask = Array.from(runningProcesses.keys()).find(
      (key) =>
        typeof key === "string" && key.startsWith("maintenance-office-clean-"),
    );
    if (activeCleanupTask) {
      return {
        success: false,
        error: "Office cleanup is already running.",
      };
    }
    const taskKey =
      typeof rawTaskKey === "string" && rawTaskKey.trim().length > 0
        ? rawTaskKey.trim()
        : `maintenance-office-clean-${Date.now()}`;
    const psScript = `
      $ErrorActionPreference = "Stop"
      $configPath = $null
      try {
        Write-Host "Stopping Office processes..."
        $officeProcessNames = @("WINWORD","EXCEL","POWERPNT","OUTLOOK","MSACCESS","VISIO","MSPUB","ONENOTE","ONENOTEM","lync","Teams","OfficeClickToRun")
        Get-Process -Name $officeProcessNames -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

        Write-Host "Ensuring ClickToRun service..."
        try { & sc.exe config ClickToRunSvc start= auto | Out-Host } catch {}
        try { Start-Service -Name ClickToRunSvc -ErrorAction SilentlyContinue } catch {}

        $programFilesX86 = [Environment]::GetFolderPath("ProgramFilesX86")
        $candidateOdtPaths = @(
          (Join-Path $env:ProgramData "WinstallerHub\\\\OfficeODT\\\\setup.exe"),
          (Join-Path $env:ProgramFiles "OfficeDeploymentTool\\\\setup.exe"),
          (Join-Path $programFilesX86 "OfficeDeploymentTool\\\\setup.exe")
        ) | Where-Object { $_ -and $_.Trim().Length -gt 0 }

        $setupPath = $candidateOdtPaths | Where-Object { Test-Path $_ } | Select-Object -First 1
        if (-not $setupPath) {
          Write-Host "Office Deployment Tool not found. Installing via winget..."
          try {
            & winget install --id Microsoft.OfficeDeploymentTool --silent --accept-package-agreements --accept-source-agreements --disable-interactivity | Out-Host
          } catch {
            Write-Host "winget install error: $($_.Exception.Message)"
          }
          $setupPath = $candidateOdtPaths | Where-Object { Test-Path $_ } | Select-Object -First 1
        }

        if (-not $setupPath) {
          throw "Cannot find Office Deployment Tool setup.exe."
        }

        $registryReleaseIds = @()
        try {
          $cfg = Get-ItemProperty "HKLM:\\\\SOFTWARE\\\\Microsoft\\\\Office\\\\ClickToRun\\\\Configuration" -ErrorAction Stop
          $rawIds = [string]$cfg.ProductReleaseIds
          if ($rawIds -and $rawIds.Trim().Length -gt 0) {
            $registryReleaseIds = $rawIds.Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ }
          }
        } catch {}

        $removeNodeXml = '  <Remove All="TRUE" />'
        if ($registryReleaseIds.Count -gt 0) {
          $targetReleaseIds = $registryReleaseIds |
            ForEach-Object { $_.Trim() } |
            Where-Object { $_ } |
            Select-Object -Unique

          $productLines = $targetReleaseIds | ForEach-Object { "    <Product ID=""$($_)"" />" }
          $productsXml = $productLines -join [Environment]::NewLine
          $removeNodeXml = @"
  <Remove>
$productsXml
  </Remove>
"@
        }

        $configPath = Join-Path $env:TEMP ("odt-clean-" + [Guid]::NewGuid().ToString("N") + ".xml")
        $configXml = @"
<Configuration>
$removeNodeXml
  <Display Level="Full" AcceptEULA="TRUE" />
  <Property Name="FORCEAPPSHUTDOWN" Value="TRUE" />
</Configuration>
"@
        [System.IO.File]::WriteAllText($configPath, $configXml, [System.Text.Encoding]::UTF8)

        Write-Host "Running cleanup with ODT: $setupPath"
        Write-Host "Using config: $configPath"
        $proc = Start-Process -FilePath $setupPath -ArgumentList @("/configure", $configPath) -PassThru -Wait
        Write-Host "ODT exit code: $($proc.ExitCode)"

        if ($proc.ExitCode -ne 0) {
          exit $proc.ExitCode
        }

        $remainingReleaseIds = ""
        try {
          $remainingReleaseIds = [string](Get-ItemProperty "HKLM:\\\\SOFTWARE\\\\Microsoft\\\\Office\\\\ClickToRun\\\\Configuration" -ErrorAction SilentlyContinue).ProductReleaseIds
        } catch {}

        if ($remainingReleaseIds -and $remainingReleaseIds.Trim().Length -gt 0) {
          Write-Host "REMAINING_RELEASE_IDS: $remainingReleaseIds"
          exit 2
        }

        Write-Host "CLEANUP_OK"
        exit 0
      } catch {
        Write-Host "Critical Error: $($_.Exception.Message)"
        exit 1
      } finally {
        if ($configPath -and (Test-Path $configPath)) {
          Remove-Item $configPath -Force -ErrorAction SilentlyContinue
        }
      }
    `;
    return new Promise((resolve) => {
      const child = spawn("powershell.exe", [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        psScript,
      ]);
      runningProcesses.set(taskKey, child);
      let output = "";
      child.stdout.on("data", (data) => {
        const text = data.toString();
        output += text;
        console.log(`[Office Cleanup Out]: ${text.trim()}`);
      });
      child.stderr.on("data", (data) => {
        const text = data.toString();
        output += text;
        console.error(`[Office Cleanup Err]: ${text.trim()}`);
      });
      child.on("close", (code) => {
        runningProcesses.delete(taskKey);
        const success = code === 0;
        let error = null;
        if (!success) {
          if (code === 2) {
            error =
              "Cleanup finished but Office ProductReleaseIds are still present. Please restart Windows and run cleanup again.";
          } else {
            error = `Office cleanup failed with code ${code}.`;
          }
        }
        resolve({
          success,
          code,
          taskKey,
          output,
          error,
          restartRecommended: success,
        });
      });
      child.on("error", (err) => {
        runningProcesses.delete(taskKey);
        resolve({
          success: false,
          taskKey,
          error: `Failed to start Office cleanup: ${err.message}`,
        });
      });
    });
  });
  ipcMain.handle("backup-drivers", async (event, payload = {}, rawTaskKey) => {
    console.log("Main process: backup-drivers triggered", payload);
    if (process.platform !== "win32") {
      return {
        success: false,
        error: "Driver backup is only supported on Windows.",
      };
    }

    const targetPath =
      typeof payload === "string"
        ? payload.trim()
        : String(payload.targetPath || "").trim();
    if (!targetPath) {
      return { success: false, error: "Please select a backup folder." };
    }

    const createSubfolder = !(
      payload &&
      typeof payload === "object" &&
      payload.createSubfolder === false
    );
    const now = /* @__PURE__ */ new Date();
    const timestamp = [
      now.getFullYear().toString(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
      "-",
      String(now.getHours()).padStart(2, "0"),
      String(now.getMinutes()).padStart(2, "0"),
      String(now.getSeconds()).padStart(2, "0"),
    ].join("");
    const outputPath = createSubfolder
      ? path.join(targetPath, `DriverBackup-${timestamp}`)
      : targetPath;

    const taskKey =
      typeof rawTaskKey === "string" && rawTaskKey.trim().length > 0
        ? rawTaskKey.trim()
        : `driver-backup-${Date.now()}`;

    const psScript = `
      $ErrorActionPreference = "Stop"
      try {
        $backupPath = ${JSON.stringify(outputPath)}
        if ([string]::IsNullOrWhiteSpace($backupPath)) {
          throw "Backup path is empty."
        }

        New-Item -Path $backupPath -ItemType Directory -Force | Out-Null
        $fullStoreSource = Join-Path $env:WINDIR "System32\\DriverStore\\FileRepository"
        if (-not (Test-Path -Path $fullStoreSource)) {
          throw "Windows DriverStore path not found: $fullStoreSource"
        }

        $fullStoreTarget = Join-Path $backupPath "FullDriverStore\\FileRepository"
        $thirdPartyTarget = Join-Path $backupPath "ThirdPartyExport"
        New-Item -Path $fullStoreTarget -ItemType Directory -Force | Out-Null
        New-Item -Path $thirdPartyTarget -ItemType Directory -Force | Out-Null

        Write-Host "BackupPath: $backupPath"
        Write-Host "Copying full DriverStore..."
        & robocopy "$fullStoreSource" "$fullStoreTarget" /E /R:1 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Host
        $robocopyCode = $LASTEXITCODE
        if ($robocopyCode -gt 7) {
          throw "Failed to copy full DriverStore (robocopy code $robocopyCode)."
        }

        Write-Host "Exporting third-party drivers (pnputil)..."
        & pnputil /export-driver * "$thirdPartyTarget" | Out-Host
        $pnputilCode = $LASTEXITCODE
        Write-Host "PNPUTIL_EXPORT_CODE:$pnputilCode"

        $fullStoreCount = (Get-ChildItem -Path $fullStoreTarget -Recurse -Filter *.inf -File -ErrorAction SilentlyContinue | Measure-Object).Count
        $thirdPartyCount = (Get-ChildItem -Path $thirdPartyTarget -Recurse -Filter *.inf -File -ErrorAction SilentlyContinue | Measure-Object).Count
        $driverCount = $fullStoreCount + $thirdPartyCount

        Write-Host "DRIVER_BACKUP_FULLSTORE_COUNT:$fullStoreCount"
        Write-Host "DRIVER_BACKUP_THIRDPARTY_COUNT:$thirdPartyCount"
        Write-Host "DRIVER_BACKUP_COUNT:$driverCount"
        exit 0
      } catch {
        Write-Host "Critical Error: $($_.Exception.Message)"
        exit 1
      }
    `;

    return new Promise((resolve) => {
      const child = spawn("powershell.exe", [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        psScript,
      ]);
      runningProcesses.set(taskKey, child);
      let output = "";
      child.stdout.on("data", (data) => {
        const text = data.toString();
        output += text;
        console.log(`[Driver Backup Out]: ${text.trim()}`);
      });
      child.stderr.on("data", (data) => {
        const text = data.toString();
        output += text;
        console.error(`[Driver Backup Err]: ${text.trim()}`);
      });
      child.on("close", (code) => {
        runningProcesses.delete(taskKey);
        const countMatch = output.match(/DRIVER_BACKUP_COUNT:(\d+)/i);
        const fullStoreCountMatch = output.match(
          /DRIVER_BACKUP_FULLSTORE_COUNT:(\d+)/i,
        );
        const thirdPartyCountMatch = output.match(
          /DRIVER_BACKUP_THIRDPARTY_COUNT:(\d+)/i,
        );
        const driverCount = countMatch ? Number(countMatch[1]) : null;
        const fullStoreCount = fullStoreCountMatch
          ? Number(fullStoreCountMatch[1])
          : null;
        const thirdPartyCount = thirdPartyCountMatch
          ? Number(thirdPartyCountMatch[1])
          : null;
        const isSuccess = code === 0;
        let error = null;
        if (!isSuccess) {
          const lowerOutput = output.toLowerCase();
          if (
            lowerOutput.includes("access is denied") ||
            lowerOutput.includes("administrator")
          ) {
            error =
              "Administrator privileges are required for driver backup. Please run app as Administrator.";
          } else {
            error = `Driver backup failed with code ${code}.`;
          }
        }

        resolve({
          success: isSuccess,
          code,
          taskKey,
          outputPath,
          driverCount,
          fullStoreCount,
          thirdPartyCount,
          output,
          error,
        });
      });
      child.on("error", (err) => {
        runningProcesses.delete(taskKey);
        resolve({
          success: false,
          taskKey,
          error: `Failed to start driver backup: ${err.message}`,
        });
      });
    });
  });
  ipcMain.handle("restore-drivers", async (event, payload = {}, rawTaskKey) => {
    console.log("Main process: restore-drivers triggered", payload);
    if (process.platform !== "win32") {
      return {
        success: false,
        error: "Driver restore is only supported on Windows.",
      };
    }

    const sourcePath =
      typeof payload === "string"
        ? payload.trim()
        : String(payload.sourcePath || "").trim();
    if (!sourcePath) {
      return {
        success: false,
        error: "Please select a driver backup folder.",
      };
    }

    const taskKey =
      typeof rawTaskKey === "string" && rawTaskKey.trim().length > 0
        ? rawTaskKey.trim()
        : `driver-restore-${Date.now()}`;

    const psScript = `
        $ErrorActionPreference = "Stop"
        try {
          $sourcePath = ${JSON.stringify(sourcePath)}
          if ([string]::IsNullOrWhiteSpace($sourcePath)) {
            throw "Driver backup path is empty."
          }
          if (-not (Test-Path -Path $sourcePath)) {
            throw "Driver backup folder does not exist: $sourcePath"
          }

          $fullStorePath = Join-Path $sourcePath "FullDriverStore\\FileRepository"
          $scanPath = if (Test-Path -Path $fullStorePath) { $fullStorePath } else { $sourcePath }
          $driverFiles = Get-ChildItem -Path $scanPath -Recurse -Filter *.inf -File -ErrorAction SilentlyContinue
          $driverCount = ($driverFiles | Measure-Object).Count
          if ($driverCount -le 0) {
            throw "No driver INF files found in the selected folder."
          }

          $driverPattern = Join-Path $scanPath "*.inf"
          Write-Host "SourcePath: $sourcePath"
          Write-Host "ScanPath: $scanPath"
          Write-Host "DriverFiles: $driverCount"

          & pnputil /add-driver "$driverPattern" /subdirs /install | Out-Host
          $exitCode = $LASTEXITCODE
          Write-Host "DRIVER_RESTORE_COUNT:$driverCount"
          if ($exitCode -ne 0) {
            Write-Host "PNPUTIL_EXIT_CODE:$exitCode"
            exit $exitCode
          }

          exit 0
        } catch {
          Write-Host "Critical Error: $($_.Exception.Message)"
          exit 1
        }
      `;

    return new Promise((resolve) => {
      const child = spawn("powershell.exe", [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        psScript,
      ]);
      runningProcesses.set(taskKey, child);
      let output = "";
      child.stdout.on("data", (data) => {
        const text = data.toString();
        output += text;
        console.log(`[Driver Restore Out]: ${text.trim()}`);
      });
      child.stderr.on("data", (data) => {
        const text = data.toString();
        output += text;
        console.error(`[Driver Restore Err]: ${text.trim()}`);
      });
      child.on("close", (code) => {
        runningProcesses.delete(taskKey);
        const countMatch = output.match(/DRIVER_RESTORE_COUNT:(\d+)/i);
        const driverCount = countMatch ? Number(countMatch[1]) : null;
        const totalPackagesMatch = output.match(
          /Total driver packages:\s*(\d+)/i,
        );
        const addedPackagesMatch = output.match(
          /Added driver packages:\s*(\d+)/i,
        );
        const totalDriverPackages = totalPackagesMatch
          ? Number(totalPackagesMatch[1])
          : null;
        const addedDriverCount = addedPackagesMatch
          ? Number(addedPackagesMatch[1])
          : null;
        const pnputilExitCodeMatch = output.match(/PNPUTIL_EXIT_CODE:(-?\d+)/i);
        const pnputilExitCode = pnputilExitCodeMatch
          ? Number(pnputilExitCodeMatch[1])
          : Number(code);
        const partial = pnputilExitCode === 259;
        const isSuccess = code === 0 || partial;
        let error = null;
        let warning = null;
        if (!isSuccess) {
          const lowerOutput = output.toLowerCase();
          if (
            lowerOutput.includes("access is denied") ||
            lowerOutput.includes("administrator")
          ) {
            error =
              "Administrator privileges are required for driver restore. Please run app as Administrator.";
          } else {
            error = `Driver restore failed with code ${code}.`;
          }
        } else if (partial) {
          warning =
            "Driver restore completed partially. Some drivers were skipped because they already exist or do not match current hardware.";
        }

        resolve({
          success: isSuccess,
          code,
          pnputilExitCode,
          partial,
          taskKey,
          driverCount,
          totalDriverPackages,
          addedDriverCount,
          output,
          error,
          warning,
        });
      });
      child.on("error", (err) => {
        runningProcesses.delete(taskKey);
        resolve({
          success: false,
          taskKey,
          error: `Failed to start driver restore: ${err.message}`,
        });
      });
    });
  });
  ipcMain.handle("clean-system-ram", async (event, rawTaskKey) => {
    console.log("Main process: clean-system-ram triggered");
    if (process.platform !== "win32") {
      return {
        success: false,
        error: "RAM cleanup is only supported on Windows.",
      };
    }

    const taskKey =
      typeof rawTaskKey === "string" && rawTaskKey.trim().length > 0
        ? rawTaskKey.trim()
        : `system-clean-ram-${Date.now()}`;

    const psScript = `
      $ErrorActionPreference = "Stop"
      try {
        Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class MemoryTools {
  [DllImport("psapi.dll")]
  public static extern int EmptyWorkingSet(IntPtr hProcess);

  [StructLayout(LayoutKind.Sequential)]
  public struct SYSTEM_MEMORY_LIST_COMMAND {
    public int Command;
  }

  [DllImport("ntdll.dll")]
  public static extern int NtSetSystemInformation(
    int systemInformationClass,
    ref SYSTEM_MEMORY_LIST_COMMAND command,
    int systemInformationLength
  );

  public static int PurgeStandbyList(int commandValue) {
    SYSTEM_MEMORY_LIST_COMMAND command = new SYSTEM_MEMORY_LIST_COMMAND();
    command.Command = commandValue;
    return NtSetSystemInformation(80, ref command, Marshal.SizeOf(typeof(SYSTEM_MEMORY_LIST_COMMAND)));
  }
}
"@ -ErrorAction SilentlyContinue

        $osBefore = Get-CimInstance Win32_OperatingSystem -ErrorAction Stop
        $beforeFreeMB = [int][math]::Round(([double]$osBefore.FreePhysicalMemory) / 1024.0)

        $trimmedCount = 0
        $processes = Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $PID }
        foreach ($proc in $processes) {
          try {
            if ($proc.Handle -and [MemoryTools]::EmptyWorkingSet($proc.Handle) -ne 0) {
              $trimmedCount++
            }
          } catch {}
        }

        $standbyStatus = "NA"
        try {
          $status = [MemoryTools]::PurgeStandbyList(4)
          if ($status -eq 0) {
            [MemoryTools]::PurgeStandbyList(5) | Out-Null
          }
          $standbyStatus = "$status"
        } catch {
          $standbyStatus = "NA"
        }

        [System.GC]::Collect()
        [System.GC]::WaitForPendingFinalizers()
        [System.GC]::Collect()

        Start-Sleep -Milliseconds 500

        $osAfter = Get-CimInstance Win32_OperatingSystem -ErrorAction Stop
        $afterFreeMB = [int][math]::Round(([double]$osAfter.FreePhysicalMemory) / 1024.0)
        $freedMB = [int][math]::Round($afterFreeMB - $beforeFreeMB)

        Write-Host "RAM_CLEAN_BEFORE_MB:$beforeFreeMB"
        Write-Host "RAM_CLEAN_AFTER_MB:$afterFreeMB"
        Write-Host "RAM_CLEAN_FREED_MB:$freedMB"
        Write-Host "RAM_CLEAN_TRIMMED_PROCESSES:$trimmedCount"
        Write-Host "RAM_CLEAN_STANDBY_STATUS:$standbyStatus"
        exit 0
      } catch {
        Write-Host "Critical Error: $($_.Exception.Message)"
        exit 1
      }
    `;

    return new Promise((resolve) => {
      const child = spawn("powershell.exe", [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        psScript,
      ]);
      runningProcesses.set(taskKey, child);
      let output = "";
      child.stdout.on("data", (data) => {
        const text = data.toString();
        output += text;
        console.log(`[RAM Cleanup Out]: ${text.trim()}`);
      });
      child.stderr.on("data", (data) => {
        const text = data.toString();
        output += text;
        console.error(`[RAM Cleanup Err]: ${text.trim()}`);
      });
      child.on("close", (code) => {
        runningProcesses.delete(taskKey);

        const beforeMatch = output.match(/RAM_CLEAN_BEFORE_MB:(-?\d+)/i);
        const afterMatch = output.match(/RAM_CLEAN_AFTER_MB:(-?\d+)/i);
        const freedMatch = output.match(/RAM_CLEAN_FREED_MB:(-?\d+)/i);
        const trimmedMatch = output.match(/RAM_CLEAN_TRIMMED_PROCESSES:(\d+)/i);
        const standbyMatch = output.match(
          /RAM_CLEAN_STANDBY_STATUS:([A-Za-z0-9-]+)/i,
        );

        const beforeFreeMB = beforeMatch ? Number(beforeMatch[1]) : null;
        const afterFreeMB = afterMatch ? Number(afterMatch[1]) : null;
        const freedMB = freedMatch ? Number(freedMatch[1]) : null;
        const trimmedProcesses = trimmedMatch ? Number(trimmedMatch[1]) : null;
        const standbyStatusRaw = standbyMatch ? String(standbyMatch[1]) : null;
        const standbyPurged =
          standbyStatusRaw && standbyStatusRaw !== "NA"
            ? Number(standbyStatusRaw) === 0
            : null;

        const isSuccess = code === 0;
        let error = null;
        if (!isSuccess) {
          const lowerOutput = output.toLowerCase();
          if (
            lowerOutput.includes("access is denied") ||
            lowerOutput.includes("administrator")
          ) {
            error =
              "Administrator privileges are recommended for full RAM cleanup.";
          } else {
            error = `RAM cleanup failed with code ${code}.`;
          }
        }

        resolve({
          success: isSuccess,
          code,
          taskKey,
          beforeFreeMB,
          afterFreeMB,
          freedMB,
          trimmedProcesses,
          standbyPurged,
          output,
          error,
        });
      });
      child.on("error", (err) => {
        runningProcesses.delete(taskKey);
        resolve({
          success: false,
          taskKey,
          error: `Failed to start RAM cleanup: ${err.message}`,
        });
      });
    });
  });
  ipcMain.handle("clean-system-disk", async (event, rawTaskKey) => {
    console.log("Main process: clean-system-disk triggered");
    if (process.platform !== "win32") {
      return {
        success: false,
        error: "Disk cleanup is only supported on Windows.",
      };
    }

    const taskKey =
      typeof rawTaskKey === "string" && rawTaskKey.trim().length > 0
        ? rawTaskKey.trim()
        : `system-clean-disk-${Date.now()}`;

    const psScript = `
      $ErrorActionPreference = "Stop"
      try {
        $systemDrive = if ($env:SystemDrive) { $env:SystemDrive } else { "C:" }
        $driveQuery = "DeviceID='$systemDrive'"
        $diskBefore = Get-CimInstance Win32_LogicalDisk -Filter $driveQuery -ErrorAction Stop
        $beforeFreeBytes = [int64]$diskBefore.FreeSpace

        $deletedItems = 0
        $failedItems = 0

        function Clear-FolderContent {
          param([string]$TargetPath)
          if ([string]::IsNullOrWhiteSpace($TargetPath)) { return }
          if (-not (Test-Path -LiteralPath $TargetPath)) { return }

          try {
            Get-ChildItem -LiteralPath $TargetPath -Force -ErrorAction SilentlyContinue | ForEach-Object {
              try {
                Remove-Item -LiteralPath $_.FullName -Recurse -Force -ErrorAction Stop
                $script:deletedItems++
              } catch {
                $script:failedItems++
              }
            }
          } catch {
            $script:failedItems++
          }
        }

        Clear-FolderContent $env:TEMP
        Clear-FolderContent (Join-Path $env:LOCALAPPDATA "Temp")
        Clear-FolderContent (Join-Path $env:WINDIR "Temp")
        Clear-FolderContent (Join-Path $env:WINDIR "SoftwareDistribution\\Download")

        $recycleBinCleared = $false
        try {
          Clear-RecycleBin -Force -ErrorAction Stop
          $recycleBinCleared = $true
        } catch {}

        $componentCleanupRan = $false
        $componentCleanupCode = -1
        try {
          $componentCleanupRan = $true
          $proc = Start-Process -FilePath "dism.exe" -ArgumentList @(
            "/Online",
            "/Cleanup-Image",
            "/StartComponentCleanup",
            "/NoRestart"
          ) -PassThru -Wait -WindowStyle Hidden
          $componentCleanupCode = $proc.ExitCode
        } catch {
          $componentCleanupCode = -1
        }

        Start-Sleep -Milliseconds 800

        $diskAfter = Get-CimInstance Win32_LogicalDisk -Filter $driveQuery -ErrorAction Stop
        $afterFreeBytes = [int64]$diskAfter.FreeSpace
        $freedBytes = $afterFreeBytes - $beforeFreeBytes
        if ($freedBytes -lt 0) { $freedBytes = 0 }

        Write-Host "DISK_CLEAN_BEFORE_BYTES:$beforeFreeBytes"
        Write-Host "DISK_CLEAN_AFTER_BYTES:$afterFreeBytes"
        Write-Host "DISK_CLEAN_FREED_BYTES:$freedBytes"
        Write-Host "DISK_CLEAN_DELETED_ITEMS:$deletedItems"
        Write-Host "DISK_CLEAN_FAILED_ITEMS:$failedItems"
        Write-Host "DISK_CLEAN_RECYCLE_BIN_CLEARED:$([int]$recycleBinCleared)"
        Write-Host "DISK_CLEAN_COMPONENT_RAN:$([int]$componentCleanupRan)"
        Write-Host "DISK_CLEAN_COMPONENT_EXIT_CODE:$componentCleanupCode"
        exit 0
      } catch {
        Write-Host "Critical Error: $($_.Exception.Message)"
        exit 1
      }
    `;

    return new Promise((resolve) => {
      const child = spawn("powershell.exe", [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        psScript,
      ]);
      runningProcesses.set(taskKey, child);
      let output = "";
      child.stdout.on("data", (data) => {
        const text = data.toString();
        output += text;
        console.log(`[Disk Cleanup Out]: ${text.trim()}`);
      });
      child.stderr.on("data", (data) => {
        const text = data.toString();
        output += text;
        console.error(`[Disk Cleanup Err]: ${text.trim()}`);
      });
      child.on("close", (code) => {
        runningProcesses.delete(taskKey);

        const beforeMatch = output.match(/DISK_CLEAN_BEFORE_BYTES:(\d+)/i);
        const afterMatch = output.match(/DISK_CLEAN_AFTER_BYTES:(\d+)/i);
        const freedMatch = output.match(/DISK_CLEAN_FREED_BYTES:(\d+)/i);
        const deletedMatch = output.match(/DISK_CLEAN_DELETED_ITEMS:(\d+)/i);
        const failedMatch = output.match(/DISK_CLEAN_FAILED_ITEMS:(\d+)/i);
        const recycleMatch = output.match(
          /DISK_CLEAN_RECYCLE_BIN_CLEARED:(\d+)/i,
        );
        const componentRanMatch = output.match(
          /DISK_CLEAN_COMPONENT_RAN:(\d+)/i,
        );
        const componentCodeMatch = output.match(
          /DISK_CLEAN_COMPONENT_EXIT_CODE:(-?\d+)/i,
        );

        const beforeFreeBytes = beforeMatch ? Number(beforeMatch[1]) : null;
        const afterFreeBytes = afterMatch ? Number(afterMatch[1]) : null;
        const freedBytes = freedMatch ? Number(freedMatch[1]) : null;
        const deletedItems = deletedMatch ? Number(deletedMatch[1]) : null;
        const failedItems = failedMatch ? Number(failedMatch[1]) : null;
        const recycleBinCleared = recycleMatch
          ? Number(recycleMatch[1]) === 1
          : null;
        const componentCleanupRan = componentRanMatch
          ? Number(componentRanMatch[1]) === 1
          : null;
        const componentCleanupCode = componentCodeMatch
          ? Number(componentCodeMatch[1])
          : null;

        const isSuccess = code === 0;
        const partial =
          isSuccess &&
          ((Number.isFinite(failedItems) && failedItems > 0) ||
            (componentCleanupRan &&
              Number.isFinite(componentCleanupCode) &&
              componentCleanupCode !== 0));
        let error = null;
        if (!isSuccess) {
          const lowerOutput = output.toLowerCase();
          if (
            lowerOutput.includes("access is denied") ||
            lowerOutput.includes("administrator")
          ) {
            error =
              "Administrator privileges are required for full disk cleanup.";
          } else {
            error = `Disk cleanup failed with code ${code}.`;
          }
        }

        resolve({
          success: isSuccess,
          partial,
          code,
          taskKey,
          beforeFreeBytes,
          afterFreeBytes,
          freedBytes,
          deletedItems,
          failedItems,
          recycleBinCleared,
          componentCleanupRan,
          componentCleanupCode,
          output,
          error,
        });
      });
      child.on("error", (err) => {
        runningProcesses.delete(taskKey);
        resolve({
          success: false,
          taskKey,
          error: `Failed to start disk cleanup: ${err.message}`,
        });
      });
    });
  });
  ipcMain.handle("active-windows", async () => {
    console.log("Main process: Active Windows triggered");
    const cmd = `Start-Process powershell -Verb RunAs -ArgumentList '-NoExit -NoProfile -ExecutionPolicy Bypass -Command "& {& ([ScriptBlock]::Create((irm https://get.activated.win))) /hwid}"'`;
    spawn("powershell.exe", ["-Command", cmd]);
    return { success: true };
  });
  ipcMain.handle("active-office", async (event, type) => {
    console.log(`Main process: Active Office triggered (${type})`);
    let cmd = "";
    if (type === "dns") {
      cmd = `Start-Process powershell -Verb RunAs -ArgumentList '-NoExit -NoProfile -Command "Set-DnsClientServerAddress -InterfaceIndex (Get-NetAdapter | Where-Object Status -eq Up).InterfaceIndex -ServerAddresses 1.1.1.1, 1.0.0.1; Write-Host DNS Updated to 1.1.1.1; Start-Sleep 3"'`;
    } else if (type === "tls") {
      cmd = `Start-Process powershell -Verb RunAs -ArgumentList '-NoExit -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Write-Host TLS 1.2 Enabled; Start-Sleep 3"'`;
    } else {
      cmd = `Start-Process powershell -Verb RunAs -ArgumentList '-NoExit -NoProfile -ExecutionPolicy Bypass -Command "& {& ([ScriptBlock]::Create((irm https://get.activated.win))) /ohook}"'`;
    }
    spawn("powershell.exe", ["-Command", cmd]);
    return { success: true };
  });
  ipcMain.handle("launch-revo", async () => {
    console.log("Main process: launching Revo Uninstaller");
    const appsPath = getAppsPath();
    const revoDir = path.join(appsPath, "RevoUninstaller");
    if (fs.existsSync(revoDir)) {
      const files = fs.readdirSync(revoDir);
      const exe = files.find((f) => f.toLowerCase().endsWith(".exe"));
      if (exe) {
        const fullPath = path.join(revoDir, exe);
        shell.openPath(fullPath);
        return { success: true };
      }
    }
    return { success: false, error: "Revo Uninstaller executable not found." };
  });
  createWindow();
  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
  app.on("before-quit", () => {
    cleanup();
  });
});
app.on("will-quit", () => {});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
