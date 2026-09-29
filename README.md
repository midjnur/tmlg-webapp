# themotorlist.ge

TMLG website: the delivery wall, presenter videos, document requests and payment info.
Hosted on **Cloudflare Workers** (static assets + a Worker for the API) with **D1** for data storage.

Live at **https://themotorlist.ge** and https://tmlg-webapp.midjnur.workers.dev.

## How it goes live

There is **one repo** (`github.com/midjnur/tmlg-webapp`, this one) and **one deploy path**:
run `wrangler deploy` from this directory. There is no CI/CD pipeline — deploys are manual,
on purpose, because Cloudflare's Git-integration auto-deploy for this project was unreliable
(wrong repo watched, build command silently not saved, "pages deploy" vs "deploy" mismatch).

```bash
npm install   # once, to pull in pdf-lib
LEGAL_NAME="TMLG LLC" CONTACT_EMAIL="el.tungia@gmail.com" bash build-site.sh
npx wrangler deploy
```

- `wrangler.toml` defines the Worker (`src/worker.js`), the static assets directory (`site/`),
  the D1 binding, and the `themotorlist.ge` custom domain route.
- `src/worker.js` handles `POST /api/documents`; everything else falls through to the static
  assets in `site/`.
- Secrets (like `RESEND_API_KEY`) are never stored in `wrangler.toml` — set them with
  `wrangler secret put`.

## Anti-scraping / anti-download protections

None of this makes the site "unscrapable" (a screenshot always works against any website) —
it stops automated bulk scraping and casual downloading:

- **`/docs/*` (PDFs)**: never public. Only served via a signed, HMAC link that expires in 24h,
  issued by `POST /api/documents`. The PDF is also watermarked *live*, per request, with the
  requester's email and the date (see `watermarkPdf` in `src/worker.js`, via `pdf-lib`) — so a
  leaked copy is traceable to whoever downloaded it.
- **`/media/*` (photos, videos)**: blocked unless the request's `Referer` is themotorlist.ge
  itself — stops hotlinking and naive scrapers fetching media URLs directly.
- **Photos and videos also carry a baked-in "themotorlist.ge" watermark**, applied by
  `scripts/watermark-media.sh` (ffmpeg + a Pillow-generated overlay) every time `build-site.sh`
  runs. This one isn't per-viewer/traceable, just deterrent branding — needs `ffmpeg` and
  `python3` + Pillow (`pip install Pillow`) on the machine that builds the site.
- **`robots.txt`** excludes `/media/` and `/docs/` from search indexing, while the rest of the
  site stays crawlable for SEO.
- Right-click / drag-save disabled on `<img>`/`<video>` (deterrent only).
- Recommended, not automatable from here: turn on **Bot Fight Mode** in the Cloudflare dashboard
  under themotorlist.ge → Security, for network-level bot detection.

## One-time setup (already done, kept for reference)

### 1. Cloudflare Domain Setup

1. In Cloudflare dashboard: **Domains** → **Add site** → `themotorlist.ge`
2. Cloudflare gives you 2 nameservers to copy
3. Update nameservers at your domain registrar
4. Wait for DNS to propagate

### 2. D1 Database

```bash
npx wrangler d1 create tmlg
# Copy the database_id into wrangler.toml
npx wrangler d1 execute tmlg --file ./migrations/0001_init_documents.sql
```

### 3. Secrets

```bash
echo "your-resend-api-key" | npx wrangler secret put RESEND_API_KEY
```

## Where things live

- `prototype/delivery-wall.html`: the page itself (also published as the Claude artifact preview)
- `prototype/media/`: videos, posters, photos
- `prototype/docs/CAR0000001/`: documents visitors can request, one folder per car
- `site-extra/`: privacy page, robots.txt, extra config copied into the build
- `build-site.sh`: builds `site/` (wraps the page and fills in the privacy page)
- `src/worker.js`: the Worker — API routes, falls through to static assets

## Deploy a change

```bash
LEGAL_NAME='TMLG LLC' CONTACT_EMAIL='el.tungia@gmail.com' ./build-site.sh
npx wrangler deploy
```
