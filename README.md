# themotorlist.ge

TMLG website: the delivery wall, presenter videos, document requests and payment info.
Hosted on **Cloudflare Pages** with **Functions** for document collection and **D1** for data storage.

## How it goes live

Every push to `main` runs **Deploy themotorlist.ge to Cloudflare Pages** (`.github/workflows/deploy.yml`):
it builds the site with `build-site.sh` and deploys `site/` + Functions to Cloudflare Pages.

## One-time setup

### 1. Cloudflare Authentication (repository Settings → Secrets and variables → Actions)

**Secrets** (encrypted, never visible after saving)

| Name | How to get |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Visit https://dash.cloudflare.com/profile/api-tokens → Create Token → Use "Edit Cloudflare Workers" template |
| `CLOUDFLARE_ACCOUNT_ID` | Dashboard → Sidebar → Copy account ID (23-char hex) |

**Variables**

| Name | Example | Needed |
|---|---|---|
| `LEGAL_NAME` | `TMLG LLC` | yes, shown on privacy page |
| `CONTACT_EMAIL` | `el.tungia@gmail.com` | yes, shown on privacy page |

### 2. Cloudflare Domain Setup

1. In Cloudflare dashboard: **Domains** → **Add site** → `themotorlist.ge`
2. Cloudflare gives you 2 nameservers to copy
3. Update nameservers at your domain registrar (where you registered `themotorlist.ge`)
4. Wait 10–30 mins for DNS to propagate

### 3. D1 Database

Once domain is added and nameservers are updated:

```bash
npx wrangler d1 create tmlg
# Copy the database_id into wrangler.toml and commit
npx wrangler d1 execute tmlg --file ./migrations/0001_init_documents.sql
```

### 4. Environment Variables in Cloudflare

In Cloudflare dashboard → Workers & Pages → themotorlist → Settings → Environment variables:

```
RESEND_API_KEY = (your Resend API key, optional)
```

Until all GitHub secrets and variables exist, the workflow runs but skips the deploy.

## Where things live

- `prototype/delivery-wall.html`: the page itself (also published as the Claude artifact preview)
- `prototype/media/`: videos, posters, photos
- `prototype/docs/CAR0000001/`: documents visitors can request, one folder per car
- `site-extra/`: privacy page, robots.txt, extra config copied into the build
- `build-site.sh`: builds `site/` (wraps the page and fills in the privacy page)

## Build locally

```
LEGAL_NAME='TMLG LLC' CONTACT_EMAIL='hello@themotorlist.ge' ./build-site.sh
```
