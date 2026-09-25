# themotorlist.ge

TMLG website: the delivery wall, presenter videos, document requests and payment info.

## How it goes live

Every push to `main` runs **Deploy themotorlist.ge** (`.github/workflows/deploy.yml`):
it builds the site with `build-site.sh` and uploads `site/` to the Proservice hosting over FTP.
Only files the workflow uploaded are ever replaced; data collected on the server is left alone.

## One-time setup (repository Settings → Secrets and variables → Actions)

**Secrets** (encrypted, never visible after saving)

| Name | Example |
|---|---|
| `FTP_SERVER` | `ftp.themotorlist.ge` |
| `FTP_USERNAME` | from the Proservice hosting panel |
| `FTP_PASSWORD` | from the Proservice hosting panel |

**Variables**

| Name | Example | Needed |
|---|---|---|
| `LEGAL_NAME` | `TMLG LLC` | yes, shown on the privacy page |
| `CONTACT_EMAIL` | `hello@themotorlist.ge` | yes, shown on the privacy page |
| `FTP_DIR` | `./public_html/` | only if the site folder is different |
| `FTP_PROTOCOL` | `ftps` | only if the host needs plain `ftp` |

Until the secrets and the two required variables exist, the workflow runs but skips the upload.

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
