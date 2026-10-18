// Copies the built plugin into a vault: npm run deploy -- "<path to vault>"
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const vault = process.argv[2] ?? process.env.OBSIDIAN_VAULT;
if (!vault || !existsSync(join(vault, ".obsidian"))) {
  console.error('Usage: npm run deploy -- "<path to vault>"  (or set OBSIDIAN_VAULT). The folder must contain .obsidian.');
  process.exit(1);
}

const target = join(vault, ".obsidian", "plugins", "agenda-panel");
mkdirSync(target, { recursive: true });
for (const file of ["main.js", "manifest.json", "styles.css"]) {
  if (!existsSync(file)) {
    console.error(`${file} is missing. Run "npm run build" first.`);
    process.exit(1);
  }
  copyFileSync(file, join(target, file));
}
console.log(`Installed to ${target}`);
