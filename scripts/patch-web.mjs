import { readFileSync, writeFileSync } from "fs";

const path = "dist/index.html";
let html = readFileSync(path, "utf8");
html = html.replace(
  /<script src="\/_expo\/static\/js\/web\//g,
  '<script type="module" src="/_expo/static/js/web/'
);
writeFileSync(path, html);
console.log("✓ Patched index.html with type=module");
