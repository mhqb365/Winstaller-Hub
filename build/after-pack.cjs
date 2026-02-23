const fs = require("fs");
const path = require("path");

module.exports = async function afterPack(context) {
  if (!context || !context.appOutDir) return;
  const officeDir = path.join(context.appOutDir, "apps", "Office");
  fs.mkdirSync(officeDir, { recursive: true });
};
