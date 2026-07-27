import { readFileSync, writeFileSync } from "fs";

const path = "dist/index.html";
const SITE_URL = "https://tattoo-app-zeta.vercel.app";
const appConfig = JSON.parse(readFileSync("app.json", "utf8")).expo;
const appName = appConfig.name ?? "INK";
const title = `${appName} — Trouve le bon tatoueur`;
const description =
  "Découvre des tatoueurs vérifiés et disponibles près de chez toi, explore leurs styles et envoie une demande de projet qualifiée. INK remplace tes DM Instagram par de vraies mises en relation.";

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

let html = readFileSync(path, "utf8");

// Expo génère un document générique et en anglais : on le rend correctement
// identifiable (langue, titre, description, Open Graph, canonical) pour le SEO
// et les partages, et on charge le bundle en module ES (requis par Safari).
html = html.replace(/<html\b[^>]*>/i, '<html lang="fr">');
html = html.replace(
  /<script src="\/_expo\/static\/js\/web\//g,
  '<script type="module" src="/_expo/static/js/web/'
);

const titleTag = `<title>${escapeHtml(title)}</title>`;
const metadata = `
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="theme-color" content="#0A0A0B" />
    <link rel="canonical" href="${SITE_URL}/" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${escapeHtml(appName)}" />
    <meta property="og:url" content="${SITE_URL}/" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:locale" content="fr_FR" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />`;

if (/<title\b[^>]*>[\s\S]*?<\/title>/i.test(html)) {
  html = html.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, titleTag);
  html = html.replace(/<\/head>/i, `${metadata}\n  </head>`);
} else {
  html = html.replace(/<\/head>/i, `${titleTag}${metadata}\n  </head>`);
}

writeFileSync(path, html);
console.log("✓ Patched index.html : métadonnées web (FR, OG, canonical) + ES modules");
