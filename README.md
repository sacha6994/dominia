# Dominia — SSL & Domain Monitoring

Application SaaS de surveillance des certificats SSL et noms de domaine en temps réel.

## Fonctionnalités

- **Monitoring SSL** — Vérification quotidienne automatique des certificats SSL
- **Expiration domaine** — Suivi WHOIS des dates d'expiration de vos noms de domaine
- **Alertes email** — Notifications automatiques à 30, 14, 7 et 1 jour avant expiration
- **Webhooks** — Alertes Slack, Discord et webhooks génériques
- **Rapports PDF** — Rapport mensuel automatique envoyé par email
- **Page de statut publique** — Lien partageable pour chaque domaine
- **Dashboard** — Vue d'ensemble en temps réel

## Stack technique

- **Frontend** — Next.js 14 (App Router), React 18, Tailwind CSS
- **Backend** — API Routes Next.js, Supabase (PostgreSQL + Auth)
- **Paiement** — Stripe (abonnements Starter / Pro / Agency)
- **Emails** — Resend
- **PDF** — @react-pdf/renderer
- **SSL Check** — ssl-checker
- **WHOIS** — whoiser

## Démarrage rapide

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Variables d'environnement

Copier `.env.local` et renseigner :

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PRICE_STARTER` / `NEXT_PUBLIC_STRIPE_PRICE_PRO` / `NEXT_PUBLIC_STRIPE_PRICE_AGENCY`
- `RESEND_API_KEY` / `RESEND_FROM_EMAIL`
- `WHOIS_API_KEY`
- `NEXT_PUBLIC_APP_URL`

## Déploiement

Optimisé pour [Vercel](https://vercel.com). Configurer les crons via `vercel.json`.
