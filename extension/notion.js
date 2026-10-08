// Tout ce qui parle à Notion est ici.
// Le jeton et l'identifiant de la base viennent des options de l'extension,
// jamais de ce fichier.

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2025-09-03";

// --- Réglages enregistrés dans le navigateur ---

export async function lireReglages() {
  const { notionToken = "", notionBaseId = "" } = await chrome.storage.local.get([
    "notionToken",
    "notionBaseId",
  ]);
  return { token: notionToken, baseId: notionBaseId };
}

// Accepte un identifiant seul ou un lien Notion complet copié-collé.
export function extraireIdentifiant(texte) {
  const brut = (texte || "").trim();
  const avecTirets = brut.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  if (avecTirets) return avecTirets[0].replace(/-/g, "").toLowerCase();
  const sansTirets = brut.split("?")[0].match(/[0-9a-f]{32}/i);
  return sansTirets ? sansTirets[0].toLowerCase() : "";
}

// --- Adresse LinkedIn : une seule écriture pour un même profil ---

export function adresseProfil(adresse) {
  const lien = new URL(adresse);
  const morceau = lien.pathname.match(/\/in\/([^/]+)/);
  if (!morceau) return adresse;
  return `https://www.linkedin.com/in/${morceau[1].toLowerCase()}/`;
}

// --- Appel à Notion, avec des erreurs en français ---

async function appelNotion(token, chemin, options = {}) {
  const reponse = await fetch(NOTION_API + chemin, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
  });
  const corps = await reponse.json().catch(() => ({}));
  if (reponse.ok) return corps;

  const erreur = new Error(messageErreur(reponse.status, corps));
  erreur.status = reponse.status;
  throw erreur;
}

function messageErreur(status, corps) {
  if (status === 401) {
    return "Notion refuse le jeton. Vérifie-le dans les options de KreaSnap.";
  }
  if (status === 404) {
    return "Base introuvable. Dans Notion, ouvre ta base, clique sur « ••• » puis « Connexions » et ajoute ton intégration.";
  }
  if (status === 429) {
    return "Notion demande de ralentir. Réessaie dans quelques secondes.";
  }
  return `Notion a répondu une erreur (${status}) : ${corps.message || "inconnue"}`;
}

// --- Trouver la base et reconnaître ses colonnes ---

// Une base Notion contient une « source de données » : c'est elle qui porte
// les colonnes et les fiches. On accepte l'identifiant de l'une ou de l'autre.
async function trouverSource(token, baseId) {
  try {
    const base = await appelNotion(token, `/databases/${baseId}`);
    const premiere = base.data_sources && base.data_sources[0];
    if (!premiere) throw new Error("Cette base Notion ne contient aucun tableau.");
    return appelNotion(token, `/data_sources/${premiere.id}`);
  } catch (erreur) {
    if (erreur.status !== 404) throw erreur;
    return appelNotion(token, `/data_sources/${baseId}`);
  }
}

function chercherColonne(colonnes, types, motif) {
  const candidates = Object.entries(colonnes).filter(([, c]) => types.includes(c.type));
  const parNom = candidates.find(([nom]) => motif.test(nom));
  return parNom ? { nom: parNom[0], type: parNom[1].type } : null;
}

export async function connecterBase({ token, baseId }) {
  if (!token || !baseId) {
    throw new Error("KreaSnap n'est pas encore réglé. Ouvre les options pour coller ton jeton et ta base.");
  }
  const source = await trouverSource(token, baseId);
  const colonnes = source.properties || {};

  const titre = Object.entries(colonnes).find(([, c]) => c.type === "title");
  const urls = Object.entries(colonnes).filter(([, c]) => c.type === "url");
  const lien =
    chercherColonne(colonnes, ["url"], /linkedin|profil|lien|url/i) ||
    (urls[0] ? { nom: urls[0][0], type: "url" } : null);

  if (!lien) {
    throw new Error(
      "Ta base n'a pas de colonne de type « URL ». Ajoute-en une (par exemple « LinkedIn ») : KreaSnap s'en sert pour reconnaître un profil déjà enregistré."
    );
  }

  return {
    token,
    sourceId: source.id,
    nomBase: (source.title || []).map((t) => t.plain_text).join("") || "Sans titre",
    colonnes: {
      nom: { nom: titre[0], type: "title" },
      lien,
      poste: chercherColonne(colonnes, ["rich_text", "select"], /poste|fonction|titre|title|job|r[ôo]le/i),
      entreprise: chercherColonne(colonnes, ["rich_text", "select"], /entreprise|soci[ée]t[ée]|company|organisation|bo[îi]te/i),
    },
  };
}

// --- Lire et écrire les fiches ---

export async function chercherFiche(connexion, adresse) {
  const lienPropre = adresseProfil(adresse);
  const identifiant = lienPropre.match(/\/in\/([^/]+)/)[1];
  const resultat = await appelNotion(connexion.token, `/data_sources/${connexion.sourceId}/query`, {
    method: "POST",
    body: JSON.stringify({
      filter: { property: connexion.colonnes.lien.nom, url: { contains: `/in/${identifiant}` } },
      page_size: 20,
    }),
  });
  // « contient » trouverait aussi /in/jean-dupont en cherchant /in/jean :
  // on garde seulement l'adresse exactement identique.
  return (
    resultat.results.find((fiche) => {
      const valeur = fiche.properties[connexion.colonnes.lien.nom]?.url;
      try {
        return valeur && adresseProfil(valeur) === lienPropre;
      } catch {
        return false;
      }
    }) || null
  );
}

function valeur(type, texte) {
  const contenu = (texte || "").trim().slice(0, 2000);
  if (type === "title") return { title: [{ text: { content: contenu } }] };
  if (type === "rich_text") return { rich_text: contenu ? [{ text: { content: contenu } }] : [] };
  if (type === "select") return { select: contenu ? { name: contenu.replace(/,/g, " ").slice(0, 100) } : null };
  if (type === "url") return { url: contenu || null };
  return null;
}

export async function enregistrerFiche(connexion, fiche) {
  const { colonnes } = connexion;
  const proprietes = {
    [colonnes.nom.nom]: valeur("title", fiche.nom),
    [colonnes.lien.nom]: valeur("url", adresseProfil(fiche.url)),
  };
  if (colonnes.poste) proprietes[colonnes.poste.nom] = valeur(colonnes.poste.type, fiche.poste);
  if (colonnes.entreprise) proprietes[colonnes.entreprise.nom] = valeur(colonnes.entreprise.type, fiche.entreprise);

  const existante = await chercherFiche(connexion, fiche.url);
  if (existante) {
    const page = await appelNotion(connexion.token, `/pages/${existante.id}`, {
      method: "PATCH",
      body: JSON.stringify({ properties: proprietes }),
    });
    return { action: "mise-a-jour", lien: page.url };
  }
  const page = await appelNotion(connexion.token, "/pages", {
    method: "POST",
    body: JSON.stringify({
      parent: { type: "data_source_id", data_source_id: connexion.sourceId },
      properties: proprietes,
    }),
  });
  return { action: "creation", lien: page.url };
}
