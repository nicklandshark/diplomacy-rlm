#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="${1:-$HOME/Library/Fonts}"
OTF_DIR="$ROOT_DIR/public/fonts/otf"
WEB_DIR="$ROOT_DIR/public/fonts/web"

mkdir -p "$OTF_DIR" "$WEB_DIR"

declare -a SOURCES=(
  "MDSystemTrial-Regular.otf:MDSystemTrial-Regular.otf"
  "MDSystemTrial-Medium.otf:MDSystemTrial-Medium.otf"
  "MDSystemTrial-Bold.otf:MDSystemTrial-Bold.otf"
  "MDSystemCondensedTrial-Regular.otf:MDSystemCondensedTrial-Regular.otf"
  "MDSystemCondensedTrial-Semibold.otf:MDSystemCondensedTrial-Semibold.otf"
  "MDSystemCondensedTrial-Bold.otf:MDSystemCondensedTrial-Bold.otf"
  "GeistPixel-Square.otf:GeistPixel-Square.otf"
  "DecimaMono.otf:DecimaMono-Regular.otf"
  "DecimaMono-Bold.otf:DecimaMono-Bold.otf"
  "Tanker-Regular.otf:Tanker-Regular.otf"
  "Kawingan-Regular.otf:Kawingan-Regular.otf"
  "Kawingan-Bold.otf:Kawingan-Bold.otf"
)

missing=0
for mapping in "${SOURCES[@]}"; do
  src="${mapping%%:*}"
  dest="${mapping##*:}"
  if [[ ! -f "$SOURCE_DIR/$src" ]]; then
    echo "Missing source font: $SOURCE_DIR/$src"
    missing=1
  fi
done

if [[ "$missing" -ne 0 ]]; then
  echo "Aborting due to missing source fonts."
  exit 1
fi

for mapping in "${SOURCES[@]}"; do
  src="${mapping%%:*}"
  dest="${mapping##*:}"
  cp "$SOURCE_DIR/$src" "$OTF_DIR/$dest"
  pyftsubset "$OTF_DIR/$dest" \
    --output-file="$WEB_DIR/${dest%.otf}.woff2" \
    --flavor=woff2 \
    --unicodes='*' \
    --layout-features='*'
  pyftsubset "$OTF_DIR/$dest" \
    --output-file="$WEB_DIR/${dest%.otf}.woff" \
    --flavor=woff \
    --unicodes='*' \
    --layout-features='*'
done

echo "Prepared fonts in:"
echo "  $OTF_DIR"
echo "  $WEB_DIR"
