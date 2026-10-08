import { lireReglages, connecterBase, chercherFiche, enregistrerFiche } from "./notion.js";

const formulaire = document.getElementById("fiche");
const bouton = document.getElementById("enregistrer");
const message = document.getElementById("message");
const champs = ["nom", "poste", "entreprise", "url"];

function afficher(texte, genre = "") {
  message.className = `message ${genre}`;
  message.textContent = texte;
}

document.getElementById("ouvrir-options").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

let connexion = null;

async function demarrer() {
  // 1. Lire le profil LinkedIn ouvert dans l'onglet.
  const [onglet] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!onglet || !/^https:\/\/([a-z]+\.)?linkedin\.com\/in\//.test(onglet.url || "")) {
    afficher("Ouvre un profil LinkedIn (une adresse en linkedin.com/in/…), puis reclique sur l'icône.");
    return;
  }
  afficher("Je lis le profil…");
  const [{ result: profil }] = await chrome.scripting.executeScript({
    target: { tabId: onglet.id },
    files: ["lecture-linkedin.js"],
  });
  if (!profil || !profil.ok) {
    afficher("Je n'arrive pas à lire ce profil. Recharge la page LinkedIn et réessaie.", "erreur");
    return;
  }

  // 2. Montrer la fiche, que tu peux corriger.
  for (const champ of champs) document.getElementById(champ).value = profil[champ] || "";
  formulaire.hidden = false;
  afficher("");

  // 3. Se connecter à Notion et regarder si le profil y est déjà.
  try {
    connexion = await connecterBase(await lireReglages());
    if (await chercherFiche(connexion, profil.url)) {
      document.getElementById("deja-la").hidden = false;
      bouton.textContent = "Mettre à jour dans Notion";
    }
  } catch (erreur) {
    afficher(erreur.message, "erreur");
  }
}

formulaire.addEventListener("submit", async (e) => {
  e.preventDefault();
  bouton.disabled = true;
  afficher("J'enregistre…");
  try {
    connexion = connexion || (await connecterBase(await lireReglages()));
    const fiche = Object.fromEntries(champs.map((c) => [c, document.getElementById(c).value]));
    const resultat = await enregistrerFiche(connexion, fiche);
    afficher(
      resultat.action === "creation"
        ? `Fiche créée dans « ${connexion.nomBase} ».`
        : `Fiche mise à jour dans « ${connexion.nomBase} ».`,
      "ok"
    );
    const lien = document.createElement("a");
    lien.href = resultat.lien;
    lien.target = "_blank";
    lien.textContent = " Voir dans Notion";
    message.append(lien);
    bouton.textContent = "Mettre à jour dans Notion";
    document.getElementById("deja-la").hidden = false;
  } catch (erreur) {
    afficher(erreur.message, "erreur");
  } finally {
    bouton.disabled = false;
  }
});

demarrer().catch((erreur) => afficher(`Oups : ${erreur.message}`, "erreur"));
