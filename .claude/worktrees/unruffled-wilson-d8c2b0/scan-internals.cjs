const fs = require("fs");
const path = require("path");

const DIST_DIR = path.resolve(__dirname, "dist/assets");
const SEARCH_TERM = "__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED";

function scanDirectory(dir) {
  const results = [];

  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    const stat = fs.statSync(filepath);

    if (stat.isFile() && file.endsWith(".js")) {
      const content = fs.readFileSync(filepath, "utf-8");
      if (content.includes(SEARCH_TERM)) {
        results.push({ file: filepath, index: content.indexOf(SEARCH_TERM) });
      }
    }
  }

  return results;
}

const matches = scanDirectory(DIST_DIR);

if (matches.length === 0) {
  console.log("✅ No se encontraron referencias a React internals prohibidos.");
} else {
  console.log("❌ Se encontraron referencias prohibidas en:");
  for (const match of matches) {
    console.log(`→ ${match.file} (posición: ${match.index})`);
  }
}
