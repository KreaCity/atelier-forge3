#!/usr/bin/env bash
# `connexion` : se connecter à Claude depuis l'atelier.
#
# Pourquoi ce script : dans un Codespace, Claude ouvre tout seul une page de
# connexion qui revient vers http://localhost:<port>, c'est-à-dire vers
# l'ordinateur de l'apprenant et pas vers l'atelier : on tombe sur « Ce site
# est inaccessible ». Quand Claude NE PEUT PAS ouvrir de navigateur, il propose
# un autre lien, dont la page affiche un code à coller (parcours officiel).
# BROWSER=true l'empêche d'ouvrir le navigateur : il ne reste que le bon chemin.

set -u

if claude auth status --json 2>/dev/null | grep -q '"loggedIn": *true'; then
  echo "✅ Tu es déjà connecté à Claude. Tape « claude » pour commencer."
  exit 0
fi

cat <<'TXT'

Connexion à Claude, en 3 gestes :

  1. Ouvre le lien qui va s'afficher (Ctrl+clic, ou Cmd+clic sur Mac).
  2. Connecte-toi à ton compte Claude et clique « Autoriser ».
  3. La page t'affiche un code : copie-le, reviens ici et colle-le.

TXT

# Claude masque ce qu'on colle (comme un mot de passe) : l'apprenant croit que
# rien ne se passe. On lit donc le code NOUS-MÊMES, en clair, et on le lui
# transmet par un tube nommé.
dossier=$(mktemp -d)
tube="$dossier/code"
journal="$dossier/journal"
mkfifo "$tube"
BROWSER=true claude auth login --claudeai <"$tube" >"$journal" 2>&1 &
pid=$!
exec 3>"$tube"   # garde le tube ouvert tant qu'on n'a pas le code

lien=""
for _ in $(seq 1 60); do
  lien=$(grep -oE 'https://[^[:space:]]*oauth/authorize[^[:space:]]*' "$journal" | head -1)
  [ -n "$lien" ] && break
  sleep 0.5
done

if [ -z "$lien" ]; then
  echo "❌ La connexion n'a pas pu démarrer :"
  cat "$journal"
  exec 3>&-; kill "$pid" 2>/dev/null; rm -rf "$dossier"
  exit 1
fi

echo "Le lien :"
echo ""
echo "   $lien"
echo ""
read -r -p "Colle le code ici puis appuie sur Entrée : " code
code=$(printf '%s' "$code" | tr -d '[:space:]')
printf '%s\n' "$code" >&3
exec 3>&-

for _ in $(seq 1 40); do
  kill -0 "$pid" 2>/dev/null || break
  sleep 0.5
done
kill "$pid" 2>/dev/null

echo ""
if claude auth status --json 2>/dev/null | grep -q '"loggedIn": *true'; then
  echo "✅ C'est fait, tu es connecté à Claude. Tape « claude » pour commencer."
  rm -rf "$dossier"
else
  if grep -q "Invalid code" "$journal"; then
    echo "❌ Le code n'a pas été accepté. Vérifie que tu as copié le code en entier"
    echo "   (avec le bouton « Copier » de la page), puis relance « connexion »."
  else
    echo "❌ La connexion n'a pas abouti. Voici ce que Claude a répondu :"
    tail -3 "$journal" | sed 's/^/   /'
    echo "   Relance « connexion » ; si ça recommence, préviens ton coach."
  fi
  rm -rf "$dossier"
  exit 1
fi
