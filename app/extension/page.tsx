const ETAPES = [
  "Décompresse le fichier téléchargé : tu obtiens un dossier kreasnap.",
  "Dans Chrome, ouvre chrome://extensions et active le « Mode développeur », en haut à droite.",
  "Clique sur « Charger l'extension non empaquetée » et choisis le dossier kreasnap.",
  "Clique sur la pièce de puzzle en haut de Chrome, puis épingle KreaSnap.",
  "Ouvre KreaSnap, puis « Réglages », et colle ton jeton Notion et le lien de ta base.",
]

export default function Extension() {
  return (
    <main className="mx-auto max-w-xl p-8">
      <p className="text-sm font-semibold uppercase tracking-widest text-pink-600">
        Atelier Forge³ · KreaSnap
      </p>
      <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900">
        Ton extension est prête
      </h1>
      <p className="mt-4 text-lg text-slate-600">
        Un clic sur un profil LinkedIn, et sa fiche arrive dans ton Notion.
      </p>
      <a
        href="/extension/telecharger"
        className="mt-6 inline-block rounded-lg bg-pink-600 px-6 py-3 font-bold text-white"
      >
        Télécharger mon extension
      </a>
      <ol className="mt-8 list-decimal space-y-2 pl-5 text-slate-700">
        {ETAPES.map((etape) => (
          <li key={etape}>{etape}</li>
        ))}
      </ol>
      <h2 className="mt-10 text-xl font-bold text-slate-900">Après chaque changement</h2>
      <p className="mt-2 text-slate-700">
        Retélécharge, remplace ton dossier kreasnap, puis clique sur la flèche ↻ de KreaSnap dans
        chrome://extensions.
      </p>
      <h2 className="mt-10 text-xl font-bold text-slate-900">Ça coince ?</h2>
      <p className="mt-2 text-slate-700">
        Dans KreaSnap, clique sur « Copier le diagnostic pour Claude », puis colle-le à Claude dans
        ton atelier.
      </p>
    </main>
  )
}
