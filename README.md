# Carnet de ukulélé

Application web installable (PWA) pour débuter au ukulélé : schémas d'accords, chansons avec lecteur, exercices et une séance du jour organisée en file d'attente. Elle fonctionne hors ligne une fois installée.

## Mettre en ligne sur GitHub Pages

1. Crée un dépôt sur GitHub, par exemple `carnet-ukulele`. Il peut être public ou privé, mais GitHub Pages sur un dépôt privé demande un compte payant.
2. Dépose tous les fichiers de ce dossier à la racine du dépôt (bouton **Add file → Upload files**), en gardant le dossier `icons/`.
3. Va dans **Settings → Pages**, choisis **Deploy from a branch**, branche `main`, dossier `/ (root)`, puis **Save**.
4. Après une minute environ, l'adresse s'affiche en haut de la page : `https://<ton-pseudo>.github.io/carnet-ukulele/`.

## Installer sur Android

Ouvre l'adresse dans Chrome, puis menu **⋮ → Installer l'application** (ou **Ajouter à l'écran d'accueil**). L'appli s'ouvre alors en plein écran, sans barre d'adresse, et marche sans connexion.

## Ajouter du contenu

Deux façons de faire.

**Depuis l'appli, pour ajouter ponctuellement** : onglet Aujourd'hui → *Mes contenus, imports et sauvegardes* → choisir un fichier `.json` ou coller le JSON. L'import est vérifié avant d'être appliqué : en cas d'erreur, rien n'est modifié et l'appli liste ce qui ne va pas. Ce contenu reste sur le téléphone. Le bouton *Copier le message pour Claude* prépare une demande complète, avec le format, tes accords et les identifiants existants, à coller dans une conversation.

**Dans le dépôt, pour que ce soit permanent** : modifie `content.json` sur GitHub. L'appli le recharge à chaque ouverture quand il y a du réseau.

Essaie `exemple-import.json` pour voir le principe : il ajoute l'accord Bm, deux exercices et une séance à la suite de ta file.

### Format

```json
{
  "chords":    { "Bm": { "frets": [4,2,2,2], "fingers": [3,1,1,1], "tip": "…" } },
  "songs":     [ { "id": "…", "title": "…", "artist": "…", "key": "Am", "bpm": 90, "bpb": 4,
                   "pattern": "D-DU-UDU", "simple": "D-D-D-D-", "diff": 1, "genre": "Indie folk",
                   "lang": "fr", "note": "Source et simplifications",
                   "sections": [ { "name": "Couplet", "rep": "×2", "bars": ["Am", "C G", "F", "E7"] } ] } ],
  "exercises": [ { "id": "…", "cat": "change", "tags": ["a"], "title": "Am ↔ Dm", "desc": "…",
                   "bpm": 60, "diff": 1, "sections": [ { "name": "Boucle", "bars": ["Am", "Dm"] } ] } ],
  "plan":      [ [ ["st-island", 2, 70], ["ch-am-dm", 2, 60] ] ],
  "planMode":  "append"
}
```

- **frets** : case jouée sur chaque corde, dans l'ordre G C E A (0 = corde à vide). **fingers** : doigt utilisé (1 index, 2 majeur, 3 annulaire, 4 auriculaire).
- **bars** : une entrée par mesure. `"C G"` met deux accords dans la même mesure.
- **pattern** et **simple** : une case par croche (8 en 4/4, 6 en 3/4 ou 6/8). D = vers le bas, U = vers le haut, - = rien.
- **bpb** : temps par mesure, 4, 3 ou 6. En 6/8, le bpm compte les croches.
- **diff** : 1 à 3. **cat** (exercices) : `strum` (rythme), `change` (changement d'accords), `seq` (enchaînement). **tags** : `r` rythme, `a` accords.
- **plan** : liste de séances. Chaque exercice est `[id, minutes, vitesse en %]`. L'id peut désigner une chanson ou un exercice.
- **planMode** : `append` ajoute les séances à la suite de ta file ; `replace` remplace tout le parcours et repart de la séance 1.
- Un import qui réutilise l'id d'un élément existant le remplace.

## Sauvegarde

La progression et les contenus importés sont stockés dans le navigateur du téléphone. Pense à *Exporter une sauvegarde* de temps en temps. Pour restaurer, sur le même téléphone ou un autre, importe le fichier de sauvegarde au même endroit.

## Mettre à jour l'appli

Après une modification de `index.html`, `app.js` ou des icônes, change `VERSION` en haut de `sw.js` (par exemple `carnet-v2`). À la prochaine ouverture, l'appli propose *Mettre à jour*. Une modification de `content.json` seul n'en a pas besoin.

## Sources des grilles

Les grilles viennent principalement d'ukutabs.com, ukulele-tabs.com, Cifra Club et e-chords. La plupart des chansons indiquent leur source et les simplifications faites dans leur note ; les premières ajoutées (Dreams, Fast Car, Fever, Back to Black, Wish You Were Here, les traditionnels) ont été écrites de mémoire et sont à vérifier. Les paroles ne sont pas incluses : chaque chanson renvoie vers Ultimate Guitar.
