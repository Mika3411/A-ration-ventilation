# Documentation de reprise - Aération Ventilation

Ce document explique quoi brancher, quoi vérifier et comment reprendre le projet sans casser la production.

## Résumé rapide

Le projet n'est pas un simple site FTP. C'est une application React + Node/Express avec API, base PostgreSQL, paiement Stripe, espace client, admin et SEO côté serveur.

Architecture recommandée :

```txt
GitHub
  -> Render Web Service Node.js
      -> Express sert le build React et les API
      -> Render PostgreSQL
      -> Stripe
      -> SMTP OVH ou autre fournisseur email

OVH
  -> garde seulement le nom de domaine
  -> zone DNS pointée vers Render
```

Ne pas déployer uniquement le dossier `dist/` en FTP : la boutique peut s'afficher, mais les API, l'admin, les comptes client, Stripe et les emails ne fonctionneront pas correctement.

## Accès à récupérer

Le repreneur doit demander ces accès avant toute intervention :

- GitHub : dépôt `Mika3411/A-ration-ventilation`.
- Render : service web `aeration-ventilation` et base `aeration-ventilation-db`.
- OVH Manager : accès au domaine et à la zone DNS de `aeration-ventilation.fr`.
- Stripe : Dashboard, clés API, webhooks.
- Email/SMTP : boîte ou relais SMTP utilisé pour `contact@aeration-ventilation.fr`.
- Admin du site : URL `/admin`, identifiant et mot de passe admin.

Les accès FTP OVH ne suffisent pas pour maintenir ce projet. Ils peuvent servir à un ancien hébergement statique, mais pas à l'application complète.

Important : ne jamais committer `.env`, clés API, mots de passe, certificats ou captures d'écran contenant des secrets.

## Installation locale

Prérequis :

- Node.js récent.
- npm.
- Accès au dépôt GitHub.

Commandes :

```bash
npm ci
cp .env.example .env
npm test
npm run build
```

Sur Windows PowerShell, copier `.env.example` peut se faire avec :

```powershell
Copy-Item .env.example .env
```

Lancer seulement le front avec hot reload :

```bash
npm run dev
```

Lancer l'application complète localement, avec Express qui sert le build et les API :

```bash
npm run build
npm start
```

Par défaut, le serveur écoute sur le port `10000` si `PORT` n'est pas défini.

Point de santé :

```txt
GET /api/health
```

## Variables d'environnement

Les variables attendues sont listées dans `.env.example`.

Variables principales :

```txt
NODE_ENV=production
PORT=10000
SITE_URL=https://www.aeration-ventilation.fr

DATABASE_URL=postgres://...
DATABASE_SSL=auto
DATABASE_CA_CERT=

AUTH_SECRET=...
ADMIN_USERNAME=...
ADMIN_PASSWORD=...
ADMIN_SESSION_SECRET=...

CONTACT_TO=contact@aeration-ventilation.fr
CONTACT_FROM=contact@aeration-ventilation.fr
SMTP_HOST=...
SMTP_PORT=465
SMTP_USER=...
SMTP_PASS=...

STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_AUTOMATIC_TAX=false
```

Notes :

- `SITE_URL` doit être le domaine public final. Quand le domaine OVH pointe vers Render, utiliser `https://www.aeration-ventilation.fr`.
- `DATABASE_SSL=auto` est le réglage prévu pour Render.
- `ADMIN_PASSWORD`, `SMTP_PASS`, `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET` doivent être renseignés dans Render, pas dans Git.
- En production, sans `SITE_URL`, le serveur refuse de démarrer.
- En production, sans `DATABASE_URL`, le paiement Stripe est volontairement bloqué.

## Déploiement Render

Le fichier `render.yaml` décrit le déploiement recommandé :

- Web service Node.js : `aeration-ventilation`.
- Build command : `npm ci --include=dev && npm run build`.
- Start command : `npm start`.
- Health check : `/api/health`.
- Base PostgreSQL : `aeration-ventilation-db`.

Procédure de reprise :

1. Connecter le dépôt GitHub à Render.
2. Créer le service depuis le Blueprint `render.yaml` ou vérifier que le service existant utilise les mêmes commandes.
3. Vérifier les variables d'environnement Render.
4. Mettre `SITE_URL=https://www.aeration-ventilation.fr` quand le domaine final est prêt.
5. Déployer.
6. Vérifier `/api/health`.
7. Tester `/boutique`, `/admin`, `/espace-client`, `/contact`.

Les migrations PostgreSQL sont lancées automatiquement au démarrage via `server/database.js` et `server/database/initialize.js`.

## Si le site est sur un Render personnel

Situation actuelle possible : le service Render a été créé sur un compte personnel. Ce n'est pas bloquant pour lancer le site, mais ce n'est pas une bonne situation de reprise : facturation, accès, secrets, base de données et domaine dépendent d'une seule personne.

Objectif recommandé :

```txt
Compte Render personnel
  -> transition courte uniquement

Compte Render client / société
  -> production durable
  -> billing société
  -> accès mainteneur
  -> secrets et base sous contrôle société
```

Points importants :

- Render indique qu'on ne peut pas transférer directement un service individuel d'un workspace à un autre. Il faut soit inviter des collaborateurs dans le workspace actuel, soit recréer les services dans le workspace cible.
- Pour un vrai transfert d'organisation/workspace, passer par le support Render si l'offre le permet.
- Pour une reprise simple, le chemin le plus propre est souvent de recréer le web service et la base dans le compte Render du client, puis de migrer les variables et la base.

Plan de sortie conseillé :

1. Créer ou récupérer le compte Render final du client.
2. Connecter le dépôt GitHub au compte Render final.
3. Créer un nouveau service depuis `render.yaml`.
4. Créer une nouvelle base PostgreSQL Render.
5. Recopier les variables d'environnement non secrètes depuis cette doc.
6. Renseigner les secrets côté Render : `ADMIN_PASSWORD`, `AUTH_SECRET`, `ADMIN_SESSION_SECRET`, `SMTP_PASS`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
7. Si l'ancienne base contient des données réelles, exporter l'ancienne base et l'importer dans la nouvelle.
8. Tester le nouveau service sur son URL `*.onrender.com`.
9. Basculer le DNS OVH vers le nouveau service Render.
10. Vérifier le HTTPS, l'admin, la boutique, Stripe, les emails et l'espace client.
11. Garder l'ancien service quelques jours en secours.
12. Supprimer l'ancien service seulement après validation complète.

Si aucune vraie donnée client/commande n'existe encore, ne pas migrer la base : recréer proprement suffit. Le seed et les migrations reconstruisent les tables et le catalogue de départ.

Si des commandes, clients, codes promo ou produits admin existent déjà, il faut migrer PostgreSQL avant de couper l'ancien Render.

Commande de principe pour exporter une base PostgreSQL :

```bash
pg_dump "$OLD_DATABASE_URL" --format=custom --file=aeration-backup.dump
```

Commande de principe pour restaurer :

```bash
pg_restore --clean --if-exists --no-owner --dbname="$NEW_DATABASE_URL" aeration-backup.dump
```

Toujours tester la restauration sur une base non critique avant de basculer le domaine.

## Base de données

Tables principales :

- `customer_accounts` : comptes client.
- `shop_products` : produits gérés par l'admin.
- `shop_categories` : catégories.
- `promo_codes` : codes promo.
- `orders` : commandes Stripe.

Sources importantes :

- Schéma : `server/database/schema.js`.
- Migrations : `server/database/migrations.js`.
- Seed produits/catégories : `server/database/seeds.js`.
- Produits par défaut : `shared/products/defaultProducts.js`.

Comportement :

- Si `DATABASE_URL` existe, le serveur initialise la base au démarrage.
- Les produits par défaut servent de source initiale.
- Les modifications admin sont stockées dans PostgreSQL.
- Sans Postgres, certaines routes restent disponibles avec les données par défaut, mais l'admin complet, les comptes client et les commandes persistantes ne sont pas fiables.

## Domaine OVH vers Render

OVH doit seulement gérer le DNS du domaine.

Dans Render :

1. Ouvrir le service `aeration-ventilation`.
2. Aller dans `Settings` puis `Custom Domains`.
3. Ajouter `www.aeration-ventilation.fr`.
4. Ajouter ou vérifier aussi `aeration-ventilation.fr`.
5. Attendre que Render valide le domaine et génère le HTTPS.

Dans OVH Manager :

1. Aller dans `Web Cloud`.
2. Ouvrir le domaine `aeration-ventilation.fr`.
3. Aller dans `Zone DNS`.
4. Pointer `www` vers Render :

```txt
Type: CNAME
Sous-domaine: www
Cible: aeration-ventilation.onrender.com.
```

5. Pointer le domaine racine vers Render :

```txt
Type: A
Sous-domaine: @
Cible: 216.24.57.1
```

6. Supprimer les anciens `A`, `AAAA` ou `CNAME` contradictoires pour `@` et `www`.
7. Ne pas supprimer les entrées email `MX`, `TXT`, SPF, DKIM si les emails OVH sont utilisés.

Toujours vérifier dans Render les valeurs DNS demandées, car Render peut changer ses recommandations.

## Stripe

Le paiement utilise Stripe Checkout.

Variables à brancher dans Render :

```txt
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_AUTOMATIC_TAX=false
```

Webhook Stripe à créer dans le Dashboard Stripe :

```txt
https://www.aeration-ventilation.fr/api/stripe/webhook
```

Événements à écouter :

```txt
checkout.session.completed
invoice.finalized
invoice.paid
```

Après configuration :

1. Faire une commande de test.
2. Vérifier la redirection Stripe.
3. Vérifier que la commande est créée en base.
4. Vérifier que Stripe génère une facture payée.
5. Vérifier que les champs `stripe_invoice_id`, `stripe_invoice_url` et `stripe_invoice_pdf_url` sont remplis dans `orders`.
6. Vérifier que le lien facture apparaît dans l'espace client et dans l'admin membre.

Facturation automatique :

- Le serveur demande à Stripe de créer une facture pour chaque session Checkout via `invoice_creation.enabled`.
- Le serveur demande aussi la collecte optionnelle du numéro de TVA/identifiant fiscal via `tax_id_collection.enabled`.
- Les liens facture Stripe sont stockés dans la table `orders`.
- Le PDF est affiché côté client et côté admin dès que Stripe l'a finalisé.

À configurer dans le Dashboard Stripe avant production :

- Nom légal de l'entreprise.
- Adresse de l'entreprise.
- Numéro de TVA/SIRET/SIREN si applicable.
- Logo et couleur de marque.
- Mentions de facture et coordonnées de support.
- Emails automatiques Stripe si le client doit recevoir la facture directement par email.

À valider avec le comptable :

- Mentions légales obligatoires sur facture.
- TVA applicable.
- Numérotation et conservation des factures.
- Processus d'avoir/remboursement.

## Email / formulaire de contact

Le formulaire `/contact` envoie un email via SMTP.

Variables à brancher :

```txt
CONTACT_TO=contact@aeration-ventilation.fr
CONTACT_FROM=contact@aeration-ventilation.fr
SMTP_HOST=...
SMTP_PORT=465
SMTP_USER=...
SMTP_PASS=...
```

Si OVH est utilisé pour l'email, récupérer les paramètres SMTP depuis le Manager OVH ou la documentation de l'offre email.

Test après déploiement :

1. Envoyer une demande depuis `/contact`.
2. Vérifier la réception sur `CONTACT_TO`.
3. Regarder les logs Render si l'envoi échoue.

## Administration

URL :

```txt
/admin
```

Variables nécessaires :

```txt
ADMIN_USERNAME=...
ADMIN_PASSWORD=...
ADMIN_SESSION_SECRET=...
```

Fonctions admin :

- Gestion des produits.
- Images produit importées.
- Catégories.
- Codes promo.
- Membres / comptes client.
- Commandes rattachées aux clients.

Les produits et images saisis via l'admin dépendent de PostgreSQL. Ne pas considérer les fichiers du dossier `src/assets` comme seule source produit.

## Produits, images et SEO

Fichiers à connaître :

- `shared/products/defaultProducts.js` : catalogue par défaut, catégories et clés d'images autorisées.
- `src/data/products.js` : imports des images locales et options affichées dans l'admin.
- `src/assets/` : images statiques embarquées au build.
- `server/seo.js` : injection SEO côté serveur, JSON-LD, images SEO.
- `src/data/seo.js` : métadonnées front.

Quand un produit image statique est ajouté :

1. Ajouter l'image dans `src/assets/`.
2. L'importer dans `src/data/products.js`.
3. Ajouter/autoriser la clé image dans `shared/products/defaultProducts.js`.
4. Si nécessaire, ajouter le préfixe SEO dans `server/seo.js`.
5. Lancer `npm test` et `npm run build`.

Quand un produit doit être supprimé de la base existante :

1. Le retirer des données par défaut si nécessaire.
2. Supprimer ou remplacer ses références image.
3. Ajouter une migration de données dans `server/database/migrations.js`.
4. Déployer sur Render pour exécuter la migration contre PostgreSQL.
5. Vérifier l'admin et la boutique.

## Développement quotidien

Avant de pousser :

```bash
npm test
npm run build
git status
```

Déploiement standard :

```bash
git add -A
git commit -m "Message clair"
git push origin master
```

Render redéploie ensuite depuis GitHub si l'auto-deploy est activé.

## Vérifications après déploiement

Checklist rapide :

- `/api/health` répond `{ ok: true }`.
- La page d'accueil s'affiche.
- `/boutique` liste les produits.
- Une fiche produit s'ouvre.
- Ajout panier OK.
- Code promo OK si configuré.
- Paiement Stripe ouvre une session Checkout.
- Webhook Stripe marque la commande comme payée.
- `/espace-client` permet inscription/connexion si Postgres est branché.
- `/admin` permet de se connecter.
- Le formulaire `/contact` envoie un email.
- Le HTTPS Render est valide sur le domaine final.
- Les balises SEO/canonical utilisent le bon `SITE_URL`.

## Sécurité et secrets

À faire impérativement :

- Changer tout mot de passe visible dans une capture ou transmis par email non sécurisé.
- Changer le mot de passe FTP OVH qui a été affiché dans les captures.
- Mettre les secrets uniquement dans Render ou dans un coffre d'équipe.
- Garder `.env` local et ignoré par Git.
- Utiliser des valeurs longues et aléatoires pour `AUTH_SECRET` et `ADMIN_SESSION_SECRET`.
- Ne jamais exposer `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SMTP_PASS`, `DATABASE_URL`.

## FTP OVH

Le FTP OVH n'est pas le bon chemin pour ce projet.

Il peut servir uniquement à déposer des fichiers sur un hébergement OVH classique. Ici, l'application a besoin d'un runtime Node.js et d'une base PostgreSQL. Le bon rôle d'OVH est donc :

- gérer le nom de domaine ;
- conserver les emails si nécessaire ;
- pointer le DNS vers Render.

Le FTP ne doit pas être utilisé comme méthode de déploiement principale.
