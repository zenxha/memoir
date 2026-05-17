#!/usr/bin/env bash
set -euo pipefail

command -v node  >/dev/null || { echo "node not found"; exit 1; }
command -v pnpm  >/dev/null || { npm i -g pnpm; }
command -v ffmpeg >/dev/null || { echo "ffmpeg not found — brew install ffmpeg"; exit 1; }

echo "▶ installing dependencies"
pnpm install

echo "▶ building contract"
pnpm --filter @memoir/contract build

echo "▶ building frontends"
pnpm --filter @memoir/desktop build
pnpm --filter @memoir/mobile  build

if [ ! -f .env ]; then
  cp .env.example .env
  echo "▶ created .env — fill in MAPBOX_TOKEN (and optionally Tailscale paths) before starting"
fi

echo "✓ done — run: pnpm --filter @memoir/server start"
