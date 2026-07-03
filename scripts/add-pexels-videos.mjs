/**
 * Récupère les URLs vidéo depuis l'API Pexels et les met en base Supabase.
 * Usage: PEXELS_KEY=votre_cle node scripts/add-pexels-videos.mjs
 */

import { createClient } from "@supabase/supabase-js";

const PEXELS_KEY = process.env.PEXELS_KEY;
const SUPABASE_URL = "https://noeexgwelfrpixnmqmrp.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!PEXELS_KEY) {
  console.error("❌ Ajoute PEXELS_KEY=ta_cle devant la commande");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY);

// IDs vidéo Pexels confirmés depuis la recherche "tattoo"
const TATTOO_VIDEO_IDS = [
  13770929, 3795426, 7189989, 8347355, 9685365,
  8334864, 8334935, 17638560, 8334859, 8334967,
];

async function getPexelsVideoUrl(videoId) {
  const res = await fetch(`https://api.pexels.com/videos/videos/${videoId}`, {
    headers: { Authorization: PEXELS_KEY },
  });
  const data = await res.json();
  // Prendre la meilleure qualité HD disponible
  const files = data.video_files ?? [];
  const hd = files.find((f) => f.quality === "hd" && f.width <= 1080)
    || files.find((f) => f.quality === "sd")
    || files[0];
  return hd?.link ?? null;
}

async function main() {
  console.log("🎬 Récupération des URLs vidéo Pexels...");

  // Posts à convertir en vidéo (on prend les 10 premiers posts de l'artiste 1)
  const { data: posts } = await supabase
    .from("posts")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(10);

  if (!posts?.length) {
    console.error("❌ Aucun post trouvé en base");
    return;
  }

  for (let i = 0; i < Math.min(posts.length, TATTOO_VIDEO_IDS.length); i++) {
    const post = posts[i];
    const videoId = TATTOO_VIDEO_IDS[i];

    console.log(`⏳ Fetching video ${videoId}...`);
    const url = await getPexelsVideoUrl(videoId);

    if (!url) {
      console.log(`⚠️  Pas d'URL pour video ${videoId}`);
      continue;
    }

    // Thumbnail Pexels photo (même ID si existant, sinon garder l'existante)
    await supabase
      .from("posts")
      .update({ media_url: url, media_type: "video" })
      .eq("id", post.id);

    console.log(`✅ Post ${post.id} → vidéo ${videoId}`);
    await new Promise((r) => setTimeout(r, 300)); // rate limit
  }

  console.log("✅ Terminé !");
}

main();
