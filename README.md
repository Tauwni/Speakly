# Speakly

Application web pour apprendre l'anglais de zéro (A0) jusqu'au niveau quasi bilingue (C2), avec un mode dédié à la préparation de l'oral d'anglais du DSCG (UE6 Anglais des affaires).

Elle fonctionne dans le navigateur, sur ordinateur comme sur téléphone, et s'installe comme une application (PWA). Aucun compte n'est nécessaire : la progression est enregistrée sur l'appareil.

## Fonctionnalités

- **Test de niveau adaptatif** au démarrage pour commencer au bon endroit.
- **Parcours de 140 leçons** de A0 à C2 : règle de grammaire, cartes mémoire, vocabulaire avec audio, puis exercices (QCM, écoute, dictée, traduction, phrases à remettre dans l'ordre, phrases à trous, association de paires, lecture, prononciation). Chaque niveau comprend une unité d'anglais professionnel.
- **Révisions espacées** : chaque mot revient au bon moment (1, 3, 7, 16 jours…).
- **Onglet Erreurs** : chaque faute est enregistrée avec ta réponse et la bonne réponse, classée par thème ou par leçon, et à retravailler jusqu'à deux réussites d'affilée.
- **Onglet Pratique** : séance du jour, verbes irréguliers, conjugaison, histoires à écouter, dialogues de situation, prononciation, nombres et heures, corrige l'erreur, expression écrite, verbes à particule, expressions idiomatiques, faux amis, examens de fin de niveau avec certificats.
- **Correction automatique de l'expression écrite** : note sur 20, texte annoté, fautes expliquées en français. Fonctionne hors ligne, avec une analyse complémentaire en ligne (LanguageTool) désactivable.
- **Préparation DSCG UE6** : les 7 thèmes du programme (vocabulaire, notions clés, article, synthèse corrigée), méthode de l'heure de préparation, phrases utiles et oraux blancs chronométrés avec enregistrement de la voix.
- **Ressources** : grammaire, lexique, tableau des verbes irréguliers, guide de prononciation, référentiels CECRL et DSCG.
- **Progrès** : série de jours, XP, objectif quotidien, maîtrise par niveau, badges.

## Utilisation

Version en ligne : https://tauwni.github.io/Speakly/

En local, il suffit de servir le dossier avec un petit serveur web, par exemple :

```bash
python3 -m http.server 8000
```

puis d'ouvrir http://localhost:8000.

## Organisation du code

| Fichier | Rôle |
|---|---|
| `index.html`, `style.css` | Page et design |
| `icons.js` | Logo et icônes SVG |
| `data/core.js` | Moteur de contenu des leçons |
| `data/a0.js` … `data/c2.js`, `data/more.js` | Leçons par niveau |
| `data/extra.js`, `data/dscg.js` | Contenu des entraînements et du mode DSCG |
| `app.js` | Parcours, moteur d'exercices, révisions, erreurs, statistiques |
| `practice.js` | Onglets Pratique et Ressources, examens, badges |
| `check.js` | Correction automatique de l'écrit |
| `dscg.js` | Mode Préparation DSCG |
| `sw.js`, `manifest.json` | Fonctionnement hors ligne et installation |

## Remarques

- Le format de l'épreuve et le programme DSCG sont repris de l'arrêté du 4 août 2025 (BO n° 32 du 28 août 2025) via des sources secondaires : vérifie les modalités de ta session sur le texte officiel.
- Les articles d'entraînement du mode DSCG sont des textes rédigés pour l'application, pas de vrais articles de presse.
- L'audio utilise la synthèse vocale du navigateur ; la reconnaissance vocale dépend du navigateur (Chrome, Safari récents).
