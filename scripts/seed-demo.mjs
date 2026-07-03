/**
 * Seed 15 comptes clients démo avec interactions réalistes
 * Usage : node scripts/seed-demo.mjs
 * Prérequis : avoir des posts artiste existants en base
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://noeexgwelfrpixnmqmrp.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // clé service_role (pas anon)

if (!SUPABASE_SERVICE_KEY) {
  console.error("❌ SUPABASE_SERVICE_KEY manquant. Lance avec :");
  console.error("   SUPABASE_SERVICE_KEY=xxx node scripts/seed-demo.mjs");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_CLIENTS = [
  { email: "lea.martin@demo.fr",      name: "Léa Martin",      username: "lea_m",        city: "Paris",     styles: ["fine line", "minimaliste"] },
  { email: "thomas.b@demo.fr",        name: "Thomas Bernard",  username: "thomas_b",     city: "Lyon",      styles: ["blackwork", "géométrique"] },
  { email: "camille.r@demo.fr",       name: "Camille Rousseau",username: "cam_rss",      city: "Bordeaux",  styles: ["réalisme", "portrait"] },
  { email: "hugo.d@demo.fr",          name: "Hugo Dubois",     username: "hugo_dbs",     city: "Marseille", styles: ["japonais", "old school"] },
  { email: "manon.l@demo.fr",         name: "Manon Laurent",   username: "manon_l",      city: "Toulouse",  styles: ["watercolor", "fine line"] },
  { email: "lucas.m@demo.fr",         name: "Lucas Moreau",    username: "luc_mr",       city: "Nantes",    styles: ["dotwork", "mandala"] },
  { email: "emma.p@demo.fr",          name: "Emma Petit",      username: "emma_pt",      city: "Strasbourg",styles: ["lettering", "minimaliste"] },
  { email: "antoine.g@demo.fr",       name: "Antoine Garcia",  username: "ant_garcia",   city: "Nice",      styles: ["néo-trad", "illustratif"] },
  { email: "sofia.b@demo.fr",         name: "Sofia Blanc",     username: "sofia_bc",     city: "Rennes",    styles: ["fine line", "réalisme"] },
  { email: "mathieu.c@demo.fr",       name: "Mathieu Clement", username: "math_cl",      city: "Lille",     styles: ["blackwork", "couleur"] },
  { email: "ines.v@demo.fr",           name: "Inès Vidal",      username: "ines_v",       city: "Montpellier",styles: ["mandala", "géométrique"] },
  { email: "romain.f@demo.fr",        name: "Romain Fontaine", username: "romain_ft",    city: "Paris",     styles: ["japonais", "blackwork"] },
  { email: "julia.n@demo.fr",         name: "Julia Nguyen",    username: "julia_ng",     city: "Paris",     styles: ["fine line", "dotwork"] },
  { email: "kevin.a@demo.fr",         name: "Kevin Arnaud",    username: "kevin_ar",     city: "Grenoble",  styles: ["réalisme", "portrait"] },
  { email: "chloe.m@demo.fr",         name: "Chloé Morel",     username: "chloe_mr",     city: "Bordeaux",  styles: ["watercolor", "couleur"] },
];

const DEMO_PASSWORD = "Demo1234!";

const PROJECT_DESCRIPTIONS = [
  "Je voudrais un tatouage de rose en fine line sur l'avant-bras, style délicat et élégant.",
  "Un phoenix japonais dans le dos, grand format, couleurs vives.",
  "Portrait réaliste de mon chien sur la cuisse, noir et gris.",
  "Mandala géométrique sur l'épaule, noir et blanc, taille moyenne.",
  "Lettering de citation sur les côtes : 'Per aspera ad astra'.",
  "Sleeve japonais complet sur le bras droit, thème nature et koi.",
  "Petite lune minimaliste derrière l'oreille.",
  "Dragon en blackwork sur le mollet, style néo-trad.",
  "Constellation de mon signe astrologique, dotwork, avant-bras.",
  "Aquarelle d'une pivoine sur l'omoplate, couleurs pastel.",
];

const QUICK_MESSAGES = [
  "Bonjour ! Je suis très intéressé(e) par votre travail.",
  "J'adore votre style, est-ce que vous avez des disponibilités ?",
  "Pourriez-vous me donner une estimation pour ce type de projet ?",
  "Votre portfolio est magnifique, j'aimerais vous contacter pour un projet.",
  "Je cherche un tatoueur pour un projet sur mesure, votre style correspond exactement.",
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

async function main() {
  console.log("🌱 Démarrage du seed démo...\n");

  // Récupère les posts existants
  const { data: posts } = await supabase.from("posts").select("id, artist_id").eq("status", "published").limit(50);
  if (!posts?.length) {
    console.error("❌ Aucun post publié trouvé. Publie d'abord des posts artiste.");
    process.exit(1);
  }

  // Récupère les artistes
  const artistIds = [...new Set(posts.map(p => p.artist_id))];
  console.log(`✓ ${posts.length} posts trouvés, ${artistIds.length} artistes\n`);

  const createdClients = [];

  for (const client of DEMO_CLIENTS) {
    process.stdout.write(`Création de ${client.name}... `);

    // Crée le compte auth
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: client.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
    });

    if (authErr) {
      if (authErr.message.includes("already been registered")) {
        console.log("⚠️  existe déjà, on skip");
        // Récupère l'ID existant
        const { data: existing } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", client.username)
          .single();
        if (existing) createdClients.push({ ...client, id: existing.id });
        continue;
      }
      console.error(`❌ ${authErr.message}`);
      continue;
    }

    const userId = authData.user.id;

    // Met à jour le profil
    const { error: profErr } = await supabase.from("profiles").upsert({
      id: userId,
      role: "client",
      display_name: client.name,
      username: client.username,
      city: client.city,
      style_tags: client.styles,
      accepts_projects: false,
      is_verified: false,
      is_founder: false,
    });

    if (profErr) { console.error(`❌ profil: ${profErr.message}`); continue; }

    createdClients.push({ ...client, id: userId });
    console.log(`✓ ${userId.slice(0, 8)}...`);
    await sleep(300);
  }

  console.log(`\n✅ ${createdClients.length} clients créés/trouvés\n`);
  console.log("💫 Génération des interactions...\n");

  // Interactions : likes, saves, follows, project requests, messages
  for (const client of createdClients) {
    // Likes sur 3-8 posts aléatoires
    const likedPosts = pickN(posts, Math.floor(Math.random() * 6) + 3);
    for (const post of likedPosts) {
      await supabase.from("likes").upsert({ post_id: post.id, user_id: client.id }, { onConflict: "post_id,user_id", ignoreDuplicates: true });
    }

    // Saves sur 2-4 posts
    const savedPosts = pickN(posts, Math.floor(Math.random() * 3) + 2);
    for (const post of savedPosts) {
      await supabase.from("saves").upsert({ post_id: post.id, user_id: client.id }, { onConflict: "post_id,user_id", ignoreDuplicates: true });
    }

    // Follow 1-2 artistes
    const followedArtists = pickN(artistIds, Math.min(Math.floor(Math.random() * 2) + 1, artistIds.length));
    for (const artistId of followedArtists) {
      await supabase.from("follows").upsert({ artist_id: artistId, follower_id: client.id }, { onConflict: "artist_id,follower_id", ignoreDuplicates: true });
    }

    // 40% de chance d'envoyer une demande de projet
    if (Math.random() < 0.4) {
      const artistId = pick(artistIds);
      const description = pick(PROJECT_DESCRIPTIONS);

      const { data: req } = await supabase.from("project_requests").insert({
        client_id: client.id,
        artist_id: artistId,
        request_type: Math.random() > 0.3 ? "custom" : "flash",
        description,
        body_placement: pick(["avant-bras", "épaule", "cuisse", "dos", "mollet", "côtes"]),
        size_category: pick(["small", "medium", "large"]),
        color_preference: pick(["color", "black_grey", "any"]),
        budget_min: pick([80, 100, 150, 200, 300]),
        budget_max: pick([300, 400, 500, 700, 1000]),
        city: client.city,
        status: pick(["new", "in_discussion", "awaiting_reply"]),
      }).select("id").single();

      if (req) {
        // Crée la conversation
        const { data: conv } = await supabase.from("conversations").insert({
          client_id: client.id,
          artist_id: artistId,
          project_request_id: req.id,
        }).select("id").single();

        if (conv) {
          // Message initial du client
          await supabase.from("messages").insert({
            conversation_id: conv.id,
            sender_id: client.id,
            body: `🎨 Nouvelle demande : "${description.slice(0, 80)}…"`,
          });

          // 50% de chance d'avoir une réponse de l'artiste + message suivi
          if (Math.random() > 0.5) {
            await supabase.from("messages").insert({
              conversation_id: conv.id,
              sender_id: artistId,
              body: pick([
                "Bonjour ! Merci pour ta demande, je regarde ça.",
                "Salut ! Ton projet m'intéresse, peux-tu me donner plus de détails ?",
                "Merci pour ta confiance ! Je peux te proposer un rendez-vous.",
                "Super projet ! Quel budget as-tu en tête ?",
              ]),
            });

            await supabase.from("messages").insert({
              conversation_id: conv.id,
              sender_id: client.id,
              body: pick(QUICK_MESSAGES),
            });
          }
        }
      }
    }

    process.stdout.write(".");
    await sleep(200);
  }

  console.log("\n\n🎉 Seed terminé !");
  console.log(`   ${createdClients.length} clients démo`);
  console.log(`   Mot de passe : ${DEMO_PASSWORD}`);
  console.log("\n   Emails :");
  DEMO_CLIENTS.forEach(c => console.log(`   - ${c.email}`));
}

main().catch(console.error);
