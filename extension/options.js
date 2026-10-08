import { lireReglages, extraireIdentifiant, connecterBase } from "./notion.js";

const champToken = document.getElementById("token");
const champBase = document.getElementById("base");
const message = document.getElementById("message");

function afficher(texte, genre = "") {
  message.className = `message ${genre}`;
  message.textContent = texte;
}

lireReglages().then(({ token, baseId }) => {
  champToken.value = token;
  champBase.value = baseId;
});

document.getElementById("reglages").addEventListener("submit", async (e) => {
  e.preventDefault();
  const token = champToken.value.trim();
  const baseId = extraireIdentifiant(champBase.value);
  if (!token || !baseId) {
    afficher("Il me faut le jeton et le lien de la base.", "erreur");
    return;
  }
  // Rangé dans ce navigateur seulement : jamais dans le code.
  await chrome.storage.local.set({ notionToken: token, notionBaseId: baseId });
  champBase.value = baseId;

  afficher("Enregistré. Je teste la connexion…");
  try {
    const { nomBase, colonnes } = await connecterBase({ token, baseId });
    const manque = ["poste", "entreprise"].filter((c) => !colonnes[c]);
    let texte =
      `Connecté à « ${nomBase} ». Nom → « ${colonnes.nom.nom} », adresse → « ${colonnes.lien.nom} »` +
      (colonnes.poste ? `, poste → « ${colonnes.poste.nom} »` : "") +
      (colonnes.entreprise ? `, entreprise → « ${colonnes.entreprise.nom} »` : "") +
      ".";
    if (manque.length) {
      texte += ` Colonne introuvable pour : ${manque.join(", ")}. Ajoute une colonne texte « Poste » ou « Entreprise » si tu veux la remplir.`;
    }
    afficher(texte, "ok");
  } catch (erreur) {
    afficher(erreur.message, "erreur");
  }
});
