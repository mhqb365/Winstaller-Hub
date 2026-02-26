const fs = require("fs");
const path = require("path");

module.exports = async function afterPack(context) {
  if (!context || !context.appOutDir) return;
  const projectDir =
    (context.packager && context.packager.projectDir) || process.cwd();

  const officeDir = path.join(context.appOutDir, "apps", "Office");
  fs.mkdirSync(officeDir, { recursive: true });

  const sourceSmartMonExe = path.join(projectDir, "src", "apps", "smartmontools.exe");
  const targetSmartMonExe = path.join(context.appOutDir, "apps", "smartmontools.exe");
  if (fs.existsSync(sourceSmartMonExe)) {
    fs.copyFileSync(sourceSmartMonExe, targetSmartMonExe);
  }

  const sourceSmartMonDir = path.join(projectDir, "src", "apps", "smartmontools");
  const targetSmartMonDir = path.join(context.appOutDir, "apps", "smartmontools");
  if (fs.existsSync(sourceSmartMonDir)) {
    fs.cpSync(sourceSmartMonDir, targetSmartMonDir, {
      recursive: true,
      force: true,
    });
  }

  const bundledSmartctlDir = path.join(
    context.appOutDir,
    "apps",
    "tools",
    "smartctl",
  );
  fs.mkdirSync(bundledSmartctlDir, { recursive: true });

  const sourceSmartctlDir = path.join(
    projectDir,
    "src",
    "apps",
    "tools",
    "smartctl",
  );
  if (fs.existsSync(sourceSmartctlDir)) {
    fs.cpSync(sourceSmartctlDir, bundledSmartctlDir, {
      recursive: true,
      force: true,
    });
  }
};
