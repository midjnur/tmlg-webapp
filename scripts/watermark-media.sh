#!/usr/bin/env bash
# Overlays a "themotorlist.ge" watermark onto every photo and video before
# they're published, so anything saved/downloaded still carries the mark.
# Usage: watermark-media.sh <src-media-dir> <dest-media-dir>
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$1"
DEST="$2"

command -v ffmpeg >/dev/null || { echo "ffmpeg is required"; exit 1; }
python3 -c "import PIL" >/dev/null 2>&1 || { echo "python3 + Pillow is required (pip install Pillow)"; exit 1; }

python3 "$SCRIPT_DIR/make_watermark.py"
WM="$SCRIPT_DIR/watermark.png"

mkdir -p "$DEST"
FILTER='[1][0]scale2ref=w=iw*0.22:h=ow/mdar[wm][base];[base][wm]overlay=W-w-max(20\,W*0.02):H-h-max(20\,H*0.02)'

for f in "$SRC"/*.jpg; do
  [ -e "$f" ] || continue
  name=$(basename "$f")
  ffmpeg -y -loglevel error -i "$f" -i "$WM" -filter_complex "$FILTER" -update 1 -frames:v 1 -q:v 3 "$DEST/$name"
done

for f in "$SRC"/*.mp4; do
  [ -e "$f" ] || continue
  name=$(basename "$f")
  ffmpeg -y -loglevel error -i "$f" -i "$WM" -filter_complex "$FILTER" -c:v libx264 -preset veryfast -crf 20 -c:a copy -movflags +faststart "$DEST/$name"
done

echo "Watermarked $(ls "$SRC"/*.jpg 2>/dev/null | wc -l | tr -d ' ') photos and $(ls "$SRC"/*.mp4 2>/dev/null | wc -l | tr -d ' ') videos into $DEST"
