# Traduc'Moji 🤪

Petit traducteur **français → emoji** (et emoji → français), sans compte ni serveur.

## Lancer
Ouvre `index.html` dans ton navigateur (double-clic). C'est tout !

## Fonctionnalités
- ✍️ Traduction en direct : expressions (« je t'aime », « bonne nuit »), verbes conjugués, pluriels, négation « ne … pas » → 🚫
- 🔤 Mode **Mixte** (garde les mots inconnus) ou **100 % emoji**
- 🔄 Décodage emoji → français
- 📋 Boutons copier / effacer sur les deux champs, 🎲 phrase au hasard
- 📖 Dictionnaire de ~595 emojis en 15 catégories (dont métiers, météo, drapeaux, fêtes & saisons, argot) avec recherche : un clic l'ajoute au champ emoji
- 🎮 5 mini-jeux : **Rébus**, **Emoji express** (30 s chrono), **Histoire en emojis** (jeu de soirée : on écrit, on vote, on retraduit), **Paires** (mémoire emoji ↔ mot) et **L'intrus** (trouver l'emoji d'une autre famille)
- 💡 Emoji du jour, phrases à essayer, astuces
- 🕘 Historique local (stocké seulement dans le navigateur)

## Structure
- `js/data.js` : dictionnaire (emojis + mots-clés), verbes irréguliers, rébus, suggestions
- `js/translator.js` : moteur de traduction
- `js/app.js` : interface
- `css/style.css` : styles
