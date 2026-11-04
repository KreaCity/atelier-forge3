// Le diagnostic : ce que l'apprenant colle à Claude quand ça ne marche pas.
// Claude ne voit pas ce Chrome : ce texte lui dit où ça a cassé.
// Il ne contient JAMAIS le jeton, l'identifiant de la base ni le contenu du profil.

const etat = {
  etape: "demarrage",
  page: "inconnue",
  lecture: null,
  notion: null,
  erreur: null,
};

export function noter(champs) {
  Object.assign(etat, champs);
}

export function noterErreur(erreur) {
  etat.erreur = { message: masquer(erreur?.message || String(erreur)), status: erreur?.status ?? null };
}

// Au cas où un message d'erreur citerait un secret ou un identifiant.
export function masquer(texte) {
  return String(texte)
    .replace(/\b(ntn_|secret_)[A-Za-z0-9_-]+/g, "[jeton masqué]")
    .replace(/\b[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}\b/gi, "[identifiant masqué]");
}

export function rediger() {
  const { version } = chrome.runtime.getManifest();
  const navigateur = navigator.userAgent.match(/(Chrome|Edg)\/[\d.]+/)?.[0] || "inconnu";
  const lignes = [
    "Diagnostic KreaSnap (aide-moi à comprendre ce qui bloque, sans rien supposer)",
    `Version de l'extension : ${version}`,
    `Navigateur : ${navigateur}`,
    `Étape atteinte : ${etat.etape}`,
    `Page : ${etat.page}`,
  ];
  if (etat.lecture) {
    lignes.push("Lecture du profil :");
    for (const [champ, source] of Object.entries(etat.lecture)) {
      lignes.push(`- ${champ} : ${source || "NON TROUVÉ"}`);
    }
  }
  if (etat.notion) lignes.push(`Colonnes Notion reconnues : ${etat.notion}`);
  lignes.push(
    etat.erreur
      ? `Erreur : ${etat.erreur.message}${etat.erreur.status ? ` (code ${etat.erreur.status})` : ""}`
      : "Erreur : aucune"
  );
  return lignes.join("\n");
}
