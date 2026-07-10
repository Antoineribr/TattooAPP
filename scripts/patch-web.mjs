import { readFileSync, writeFileSync } from "fs";

const path = "dist/index.html";
const appConfig = JSON.parse(readFileSync("app.json", "utf8")).expo;
const appName = appConfig.name ?? "INK";
const title = `${appName} — Trouve le bon tatoueur`;
const description =
  "Découvre des tatoueurs disponibles près de chez toi, explore leurs styles et envoie des demandes de projet qualifiées.";

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

let html = readFileSync(path, "utf8");

// Expo génère un document générique : on le rend correctement identifiable sur le web.
html = html.replace(/<html\b[^>]*>/i, '<html lang="fr">');
html = html.replace(
  /<script src="\/_expo\/static\/js\/web\//g,
  '<script type="module" src="/_expo/static/js/web/'
);

const titleTag = `<title>${escapeHtml(title)}</title>`;
const metadata = `
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="theme-color" content="#F5F3EE" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />`;

if (/<title\b[^>]*>[\s\S]*?<\/title>/i.test(html)) {
  html = html.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, titleTag);
  html = html.replace(/<\/head>/i, `${metadata}\n  </head>`);
} else {
  html = html.replace(/<\/head>/i, `${titleTag}${metadata}\n  </head>`);
}

writeFileSync(path, html);
console.log("✓ Patched index.html with web metadata and ES modules");
