# CaissePasSecure

Application bancaire simplifiée pour l'apprentissage de la sécurité des applications web.

## Installation

1. Installer les dépendances :

```bash
npm install
```

1.5  Mettre à jour la dépendance de express-session :

```bash
npm install express-session@latest
```

2. Copier le fichier de configuration :

```bash
cp .env.example .env
```

3. Initialiser la base de données :

```bash
npm run init-db
```

4. Lancer l'application :

```bash
npm start
```

5. Accéder à l'application : http://localhost:3000

## Comptes de test

| Email                     | Mot de passe | Rôle  |
| ------------------------- | ------------ | ----- |
| alice@test.com            | alice123     | user  |
| bob@test.com              | bob123       | user  |
| diana@test.com            | diana123     | user  |
| admin@caissepassecure.com | admin123     | admin |

## Note importante

Cette application contient des vulnérabilités intentionnelles à des fins pédagogiques. Ne jamais déployer en production.
