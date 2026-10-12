/**
 * Builds the browser extension (../extension) from the bookmark's autofill
 * script: writes extension/autofill.js, sets the manifest version from
 * AUTOFILL_VERSION and zips the extension into public/ for download.
 * Run from property-manager after changing lib/aade-autofill.ts: `npm run build:extension`.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { extensionAutofillScript, extensionVersion } from "../lib/aade-autofill";

const root = join(process.cwd(), "..");
const dir = join(root, "extension");
writeFileSync(join(dir, "autofill.js"), extensionAutofillScript());
const manifestPath = join(dir, "manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
manifest.version = extensionVersion();
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
const zip = join(process.cwd(), "public", "vrachychronia-extension.zip");
rmSync(zip, { force: true });
execFileSync("zip", ["-qr", zip, "manifest.json", "background.js", "aade.js", "connect.js", "autofill.js", "icons"], { cwd: dir });
console.log(`extension ${manifest.version} → ${zip}`);
