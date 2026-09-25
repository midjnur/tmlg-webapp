#!/usr/bin/env bash
# Builds the live website into ./site from the prototype. Run: ./build-site.sh
set -euo pipefail
cd "$(dirname "$0")"
LEGAL_NAME="${LEGAL_NAME:-}"; CONTACT_EMAIL="${CONTACT_EMAIL:-}"
[[ -n "$LEGAL_NAME" && -n "$CONTACT_EMAIL" ]] || { echo "Set LEGAL_NAME and CONTACT_EMAIL, e.g. LEGAL_NAME='TMLG LLC' CONTACT_EMAIL='hello@yourdomain.ge' ./build-site.sh"; exit 1; }
rm -rf site && mkdir -p site
cp -R prototype/media prototype/docs site/
# Request collection switches on once the TMLG dashboard is on the server.
cp prototype/delivery-wall.html site/index.html
{ echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="description" content="Cars bought in Europe and delivered to Georgia and Central Asia, filmed every step of the way."><link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 34 20%22%3E%3Ccircle cx=%224%22 cy=%2215%22 r=%223%22 fill=%22%23f0b429%22/%3E%3Ccircle cx=%2230%22 cy=%228%22 r=%223%22 fill=%22%23ebe9e3%22/%3E%3C/svg%3E"><style>[hidden]{display:none!important}body{margin:0}</style></head><body>'; cat site/index.html; echo '</body></html>'; } > site/index.tmp && mv site/index.tmp site/index.html
sed -e "s|__LEGAL_NAME__|$LEGAL_NAME|g" -e "s|__CONTACT_EMAIL__|<a href=\"mailto:$CONTACT_EMAIL\">$CONTACT_EMAIL</a>|g" site-extra/privacy.html > site/privacy.html
cp site-extra/robots.txt site/
echo "Built ./site ($(du -sh site | cut -f1))"
