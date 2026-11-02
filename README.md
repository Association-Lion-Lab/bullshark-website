# Site vitrine Bullshark

Site statique de présentation de [Bullshark](https://codeberg.org/The_Neckript/bullshark), une plateforme vocale et de chat auto-hébergée pour gamers. Bilingue EN/FR.

- **Aucune étape de build** : HTML/CSS/JS bruts, servis tels quels.
- **Zéro requête tierce** : polices auto-hébergées, pas de CDN, pas d'analytics, pas de cookies. Une CSP stricte (`default-src 'self'`) l'impose.
- **Intro animée** (canvas) : vue de l'intérieur de la gueule, la caméra nage vers la sortie, les mâchoires se referment, puis le site apparaît. Une fois par session, désactivée si `prefers-reduced-motion`.

## Structure

```
index.html              Page unique, contenu anglais (défaut, sans JS, SEO)
assets/js/boot.js       Lancé dans <head> : choix de langue + intro avant le premier rendu
assets/js/i18n.js       Traductions françaises
assets/js/main.js       i18n, intro, nav, onglets, bouton copier, apparitions au scroll
assets/css/style.css    Thème complet (sombre, panneaux dépolis)
assets/img/             Logo, og-image
assets/fonts/           Chakra Petch, Inter, JetBrains Mono (SIL OFL 1.1)
```

## Aperçu en local

À exécuter **en local**, à la racine du dépôt :

```bash
python3 -m http.server 8080
```

Puis ouvrir `http://localhost:8080`.

Paramètres d'URL utiles :

| Paramètre | Effet |
|---|---|
| `?intro=1` | Force l'intro, même déjà vue dans la session |
| `?intro=0` | Désactive l'intro |
| `?lang=fr` / `?lang=en` | Force la langue (sinon : choix mémorisé, puis langue du navigateur) |

## Modifier le contenu

- **Anglais** : directement dans `index.html`. Chaque texte traduisible porte un attribut `data-i18n="clé"`.
- **Français** : la même clé dans `assets/js/i18n.js`. Une clé absente retombe sur l'anglais.
- Les attributs (ex. `content` de la meta description, `aria-label`) passent par `data-i18n-attr="attribut:clé"`.

Le contenu vient des README de `bullshark` et `bullshark-desktop` (novembre 2026). Le site reste volontairement court : hero, fonctions, installation, appli desktop et plugins.

## Déploiement

N'importe quel serveur de fichiers statiques convient. Exemple Caddy, **sur le serveur distant** (`/etc/caddy/Caddyfile`) :

```
bullshark.example.org {
	root * /srv/bullshark-website
	file_server
	encode zstd gzip
	header {
		Content-Security-Policy "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'"
		Referrer-Policy strict-origin-when-cross-origin
		X-Content-Type-Options nosniff
	}
	@assets path /assets/*
	header @assets Cache-Control "public, max-age=604800"
}
```

`frame-ancestors` ne fonctionne qu'en en-tête HTTP, pas dans la balise `<meta>`.

Fonctionne aussi tel quel sur Codeberg Pages ou GitHub Pages.

### À faire avant la mise en ligne

- [ ] Remplacer `og:image` par une **URL absolue** (les réseaux sociaux ignorent les chemins relatifs) et ajouter `og:url` + `<link rel="canonical">`.
- [ ] Vérifier la procédure Docker : le `Dockerfile` copie `apps/server/build/out/bullshark-linux-*`, qui n'existe pas dans un clone frais.

## Licences

- Code du site : à définir par le propriétaire du dépôt.
- Polices : SIL Open Font License 1.1 (`assets/fonts/LICENSE-*.txt`).
- Logo et nom Bullshark : propriété du projet Bullshark.
