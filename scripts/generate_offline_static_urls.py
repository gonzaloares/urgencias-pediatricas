#!/usr/bin/env python3
"""Genera la lista post-build de recursos estáticos necesarios para uso offline."""

from __future__ import annotations

import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SITE = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT / "site"

ALLOWED_ASSET_SUFFIXES = {
    ".css",
    ".js",
    ".mjs",
    ".woff",
    ".woff2",
    ".svg",
    ".png",
    ".ico",
}


def relative_url(path: Path) -> str:
    return path.relative_to(SITE).as_posix()


def main() -> int:
    if not SITE.exists():
        raise SystemExit(f"No existe el directorio de build: {SITE}")

    urls: set[str] = set()

    assets = SITE / "assets"
    if assets.exists():
        for path in assets.rglob("*"):
            if path.is_file() and path.suffix.lower() in ALLOWED_ASSET_SUFFIXES:
                urls.add(relative_url(path))

    search_index = SITE / "search" / "search_index.json"
    if not search_index.exists():
        raise SystemExit("No se encontró search/search_index.json en el build de MkDocs")
    urls.add(relative_url(search_index))

    output = SITE / "offline-static-urls.json"
    output.write_text(
        json.dumps(sorted(urls), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"Offline static assets: {len(urls)} resources")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
