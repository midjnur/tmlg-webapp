# themotorlist.ge

TMLG website: the delivery wall, presenter videos, document requests and payment info.
Hosted on **Cloudflare Pages** with **Functions** for document collection and **D1** for data storage.

## How it goes live

Cloudflare Pages' native Git integration deploys `tmlg-webapp` on every push to `main`
(configured entirely in the Cloudflare dashboard — no GitHub Actions involved):

- **Build command:** `LEGAL_NAME="TMLG LLC" CONTACT_EMAIL="el.tungia@gmail.com" bash build-site.sh`
- **Deploy command:** `npx wrangler pages deploy site --project-name=tmlg-webapp`
- **Runtime variables:** `RESEND_API_KEY` set in Cloudflare Pages Settings → Runtime variables

All set in **Cloudflare Pages → tmlg-webapp → Settings → Build configuration / Runtime variables**.

## One-time setup

### 1. Cloudflare Domain Setup

1. In Cloudflare dashboard: **Domains** → **Add site** → `themotorlist.ge`
2. Cloudflare gives you 2 nameservers to copy
3. Update nameservers at your domain registrar (where you registered `themotorlist.ge`)
4. Wait 10–30 mins for DNS to propagate

### 2. D1 Database

Once domain is added and nameservers are updated:

```bash
npx wrangler d1 create tmlg
# Copy the database_id into wrangler.toml and commit
npx wrangler d1 execute tmlg --file ./migrations/0001_init_documents.sql
```

### 3. Environment Variables in Cloudflare

In Cloudflare dashboard → Workers & Pages → tmlg-webapp → Settings → Runtime variables:

```
RESEND_API_KEY = (your Resend API key, optional)
```

## Where things live

- `prototype/delivery-wall.html`: the page itself (also published as the Claude artifact preview)
- `prototype/media/`: videos, posters, photos
- `prototype/docs/CAR0000001/`: documents visitors can request, one folder per car
- `site-extra/`: privacy page, robots.txt, extra config copied into the build
- `build-site.sh`: builds `site/` (wraps the page and fills in the privacy page)

## Build locally

```
LEGAL_NAME='TMLG LLC' CONTACT_EMAIL='el.tungia@gmail.com' ./build-site.sh
```
