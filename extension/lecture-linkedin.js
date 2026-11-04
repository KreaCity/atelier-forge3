// Ce fichier est glissé dans la page LinkedIn quand on clique sur l'icône.
// Il lit le nom, le poste, l'entreprise et l'adresse du profil, puis les renvoie.
//
// LinkedIn change souvent ses noms de classes, et ils sont illisibles : on se
// repère donc sur ce qui bouge peu, le nom de la personne et l'ordre des lignes
// sous ce nom. `sources` dit où chaque valeur a été trouvée : le diagnostic
// s'en sert pour montrer ce qui a cessé de marcher, sans recopier le profil.
(() => {
  const propre = (texte) => (texte || "").replace(/\s+/g, " ").trim();

  if (!/linkedin\.com\/in\//.test(location.href)) {
    return { ok: false, raison: "pas-un-profil" };
  }

  const main = document.querySelector("main") || document.body;
  const sources = { nom: "", poste: "", entreprise: "" };

  // Le nom : le titre de l'onglet est le plus stable, sinon le grand titre.
  let nom = propre(document.title.replace(/^\(\d+\)\s*/, "").split(/ [-|] /)[0]);
  if (nom && !/^linkedin$/i.test(nom)) {
    sources.nom = "titre-onglet";
  } else {
    nom = propre(main.querySelector("h1, h2")?.innerText);
    if (nom) sources.nom = "grand-titre";
  }

  // Le haut du profil : la première rubrique qui affiche ce nom.
  const zoneHaut =
    [...main.querySelectorAll("section")].find((rubrique) =>
      [...rubrique.querySelectorAll("h1, h2, a")].some((el) => propre(el.innerText) === nom)
    ) || null;

  // Les lignes sous le nom, sans le bruit (« · », abonnés, coordonnées).
  const bruit = /^(·|coordonn[ée]es|contact info)$|abonn[ée]s|followers|relations|connections/i;
  const lignes = zoneHaut
    ? [...zoneHaut.querySelectorAll("p")].filter((p) => {
        const texte = propre(p.innerText);
        return texte && texte !== nom && !bruit.test(texte);
      })
    : [];
  const titreLinkedIn = propre(lignes[0]?.innerText);

  // L'entreprise : la ligne qui est un lien, sous le titre (« Krea.city + 3 autres »).
  let entreprise = "";
  const ligneEntreprise = lignes.slice(1).find((p) => p.querySelector("a") || p.closest("a"));
  if (ligneEntreprise) {
    entreprise = propre(ligneEntreprise.innerText).replace(/\s*\+\s*\d+\s+\S+$/, "");
    if (entreprise) sources.entreprise = "haut-du-profil";
  }

  // Le poste actuel, lu dans la rubrique « Expérience » quand LinkedIn l'affiche.
  let poste = "";
  const titreExperience = [...main.querySelectorAll("h2")].find((h) =>
    /^(exp[ée]rience)/i.test(propre(h.innerText))
  );
  const premierPoste = titreExperience?.closest("section")?.querySelector("li");
  if (premierPoste) {
    const textes = [...premierPoste.querySelectorAll('span[aria-hidden="true"], p')]
      .map((el) => propre(el.innerText))
      .filter(Boolean);
    if (textes[1] && textes[1].includes("·")) {
      poste = textes[0];
      sources.poste = "experience";
      if (!entreprise) {
        entreprise = propre(textes[1].split("·")[0]);
        sources.entreprise = "experience";
      }
    }
  }

  // Sinon, « Poste chez Entreprise » dans le titre, ou le titre tel quel.
  const morceaux = titreLinkedIn.match(/^(.*?)\s+(?:chez|at|@)\s+(.+)$/i);
  if (!poste && morceaux) {
    poste = propre(morceaux[1]);
    sources.poste = "titre-du-profil";
    if (!entreprise) {
      entreprise = propre(morceaux[2].split(/[|,·•]/)[0]);
      sources.entreprise = "titre-du-profil";
    }
  } else if (!poste && titreLinkedIn) {
    poste = titreLinkedIn;
    sources.poste = "titre-du-profil";
  }

  return { ok: Boolean(nom), raison: nom ? "" : "nom-introuvable", nom, poste, entreprise, url: location.href, sources };
})();
