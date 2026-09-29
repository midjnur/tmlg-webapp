#!/usr/bin/env bash
# Builds the live website into ./site from the prototype. Run: ./build-site.sh
# Document requests are collected via Cloudflare Functions + D1 database
# Transactional emails sent via Resend (RESEND_API_KEY in Cloudflare Pages settings)
set -euo pipefail
cd "$(dirname "$0")"
LEGAL_NAME="${LEGAL_NAME:-}"; CONTACT_EMAIL="${CONTACT_EMAIL:-}"
[[ -n "$LEGAL_NAME" && -n "$CONTACT_EMAIL" ]] || { echo "Set LEGAL_NAME and CONTACT_EMAIL, e.g. LEGAL_NAME='TMLG LLC' CONTACT_EMAIL='hello@yourdomain.ge' ./build-site.sh"; exit 1; }
rm -rf site && mkdir -p site
# Photos/videos get a baked-in watermark on the way out (deterrent — not
# traceable per viewer, unlike the PDF watermark which the Worker adds live).
bash scripts/watermark-media.sh prototype/media site/media
cp -R prototype/docs site/
cp site-extra/favicon.svg site/
# Request collection switches on once the TMLG dashboard is on the server.
cp prototype/delivery-wall.html site/index.html
{ echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="description" content="Cars bought in Europe and delivered to Georgia and Central Asia, filmed every step of the way."><title>Not Selling Cars. Delivering Dreams.</title><link rel="icon" href="/favicon.svg" type="image/svg+xml"><style>[hidden]{display:none!important}body{margin:0}</style></head><body>'; cat site/index.html; echo '</body></html>'; } > site/index.tmp && mv site/index.tmp site/index.html
sed -i.bak -e "s|__LEGAL_NAME__|$LEGAL_NAME|g" -e "s|__CONTACT_EMAIL_RAW__|$CONTACT_EMAIL|g" site/index.html && rm site/index.html.bak
sed -e "s|__LEGAL_NAME__|$LEGAL_NAME|g" -e "s|__CONTACT_EMAIL__|<a href=\"mailto:$CONTACT_EMAIL\">$CONTACT_EMAIL</a>|g" site-extra/privacy.html > site/privacy.html
cp site-extra/robots.txt site/
echo "Built ./site ($(du -sh site | cut -f1))"
