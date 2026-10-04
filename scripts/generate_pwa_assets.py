#!/usr/bin/env python3
"""Genera los recursos PWA que deben existir antes de ejecutar MkDocs."""

from __future__ import annotations

import struct
import sys
import zlib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
ICONS = DOCS / "assets" / "icons"
TEMPLATE = ROOT / "scripts" / "service-worker.template.js"


def chunk(kind: bytes, data: bytes) -> bytes:
    return (
        struct.pack(">I", len(data))
        + kind
        + data
        + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)
    )


def write_icon(path: Path, size: int) -> None:
    """Crea un icono PNG teal con cruz médica blanca, sin dependencias externas."""
    teal = (0, 150, 136, 255)
    white = (255, 255, 255, 255)

    cross_thickness = max(8, round(size * 0.16))
    cross_length = round(size * 0.54)
    center = size // 2

    v_left = center - cross_thickness // 2
    v_right = v_left + cross_thickness
    v_top = center - cross_length // 2
    v_bottom = v_top + cross_length

    h_left = center - cross_length // 2
    h_right = h_left + cross_length
    h_top = center - cross_thickness // 2
    h_bottom = h_top + cross_thickness

    rows = bytearray()
    for y in range(size):
        rows.append(0)  # filtro PNG: None
        for x in range(size):
            in_vertical = v_left <= x < v_right and v_top <= y < v_bottom
            in_horizontal = h_left <= x < h_right and h_top <= y < h_bottom
            rows.extend(white if in_vertical or in_horizontal else teal)

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(bytes(rows), 9))
        + chunk(b"IEND", b"")
    )
    path.write_bytes(png)


def main() -> int:
    version = (sys.argv[1] if len(sys.argv) > 1 else "dev").strip()[:16] or "dev"

    ICONS.mkdir(parents=True, exist_ok=True)
    write_icon(ICONS / "icon-192.png", 192)
    write_icon(ICONS / "icon-512.png", 512)
    write_icon(ICONS / "apple-touch-icon.png", 180)

    template = TEMPLATE.read_text(encoding="utf-8")
    service_worker = template.replace("__BUILD_VERSION__", version)
    (DOCS / "service-worker.js").write_text(service_worker, encoding="utf-8")

    print(f"PWA assets generated for build {version}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
