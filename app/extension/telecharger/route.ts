import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { connection } from "next/server"
import JSZip from "jszip"

// Le dossier `extension/` en .zip, refait à chaque demande : tu télécharges
// toujours la dernière version de ton travail.
export async function GET() {
  await connection()
  const dossier = path.join(process.cwd(), "extension")
  const zip = new JSZip()
  const racine = zip.folder("kreasnap")!

  for (const entree of await readdir(dossier, { withFileTypes: true, recursive: true })) {
    if (!entree.isFile()) continue
    const complet = path.join(entree.parentPath, entree.name)
    racine.file(path.relative(dossier, complet), await readFile(complet))
  }

  const contenu = await zip.generateAsync({ type: "uint8array" })
  return new Response(Buffer.from(contenu), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="kreasnap.zip"',
    },
  })
}
