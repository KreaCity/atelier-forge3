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
  3. La page t'affiche un code : copie-le, reviens ici, colle-le après
     « Paste code here » et appuie sur Entrée.

TXT

BROWSER=true claude auth login --claudeai

echo ""
if claude auth status --json 2>/dev/null | grep -q '"loggedIn": *true'; then
  echo "✅ C'est fait, tu es connecté à Claude. Tape « claude » pour commencer."
else
  echo "❌ La connexion n'a pas abouti. Relance « connexion » ;"
  echo "   si ça recommence, préviens ton coach."
  exit 1
fi
