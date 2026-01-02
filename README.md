# Libris

Application web pour rechercher des livres via Google Books, gerer une
bibliotheque personnelle et partager sa wishlist.

## Stack

- Next.js (App Router)
- Tailwind CSS v4
- Supabase (Auth + Postgres)
- Google Books API

## Installation locale

1. Installer les dependances :

```bash
npm install
```

2. Copier les variables d'environnement :

```bash
copy .env.local.example .env.local
```

3. Remplir les variables dans `.env.local` :

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GOOGLE_BOOKS_API_KEY` (optionnel, mais recommande)

4. Creer la base Supabase :

- Executer `supabase/schema.sql` dans l'onglet SQL de votre projet Supabase.

5. Lancer le serveur :

```bash
npm run dev
```

## Scripts utiles

- `npm run dev` : serveur local
- `npm run build` : build production
- `npm run start` : serveur production

## Notes

- Les livres sont stockes une seule fois dans `books`, lies aux utilisateurs via
  `user_books`.
- La mise en cache Google Books est en memoire (5 minutes). Vous pouvez
  l'etendre si besoin.

## Deploiement

1. Creer un projet Supabase et appliquer `supabase/schema.sql`.
2. Deployer sur Vercel/Netlify avec les variables d'environnement.
3. Ajouter le domaine autorise dans les redirections Supabase (Auth).
