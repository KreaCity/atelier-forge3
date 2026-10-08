// Ce fichier est glissé dans la page LinkedIn quand on clique sur l'icône.
// Il lit le nom, le poste, l'entreprise et l'adresse du profil, puis les renvoie.
(() => {
  const propre = (texte) => (texte || "").replace(/\s+/g, " ").trim();

  if (!/linkedin\.com\/in\//.test(location.href)) {
    return { ok: false };
  }

  const main = document.querySelector("main") || document.body;

  // Le nom : le grand titre de la page, sinon le titre de l'onglet.
  const h1 = main.querySelector("h1");
  let nom = propre(h1 && h1.innerText);
  if (!nom) {
    nom = propre(document.title.replace(/^\(\d+\)\s*/, "").split(/ [-|] /)[0]);
  }

  // La phrase sous le nom (le « titre » LinkedIn).
  const zoneHaut = (h1 && h1.closest("section")) || main;
  const titreLinkedIn = propre(
    zoneHaut.querySelector(".text-body-medium.break-words, [data-generated-suggestion-target]")?.innerText
  );

  // Le poste actuel, lu dans la rubrique « Expérience ».
  let posteExperience = "";
  let entrepriseExperience = "";
  const ancreExperience = document.getElementById("experience");
  const rubrique = ancreExperience && ancreExperience.closest("section");
  const premierPoste = rubrique && rubrique.querySelector("li");
  if (premierPoste) {
    const lignes = [...premierPoste.querySelectorAll('span[aria-hidden="true"]')]
      .map((el) => propre(el.innerText))
      .filter(Boolean);
    if (lignes[1] && lignes[1].includes("·")) {
      // Cas simple : « Poste » puis « Entreprise · CDI »
      posteExperience = lignes[0];
      entrepriseExperience = propre(lignes[1].split("·")[0]);
    } else if (lignes[0]) {
      // Cas groupé : l'entreprise d'abord, puis ses différents postes
      entrepriseExperience = lignes[0];
    }
  }

  // L'entreprise affichée en haut du profil (bouton « Entreprise actuelle »).
  let entrepriseHaut = "";
  const bouton = zoneHaut.querySelector(
    '[aria-label^="Entreprise actuelle"], [aria-label^="Current company"]'
  );
  if (bouton) {
    const etiquette = bouton.getAttribute("aria-label") || "";
    entrepriseHaut = propre(etiquette.replace(/^[^:]*:\s*/, "").split(/\.\s/)[0]);
  }

  // Dernier recours : « Poste chez Entreprise » dans le titre LinkedIn.
  const morceaux = titreLinkedIn.match(/^(.*?)\s+(?:chez|at|@)\s+(.+)$/i);

  const poste = posteExperience || (morceaux ? propre(morceaux[1]) : titreLinkedIn);
  const entreprise =
    entrepriseHaut || entrepriseExperience || (morceaux ? propre(morceaux[2].split(/[|,·]/)[0]) : "");

  return { ok: true, nom, poste, entreprise, url: location.href };
})();
