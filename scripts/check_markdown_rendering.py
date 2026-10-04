#!/usr/bin/env python3
"""Detecta comparadores Markdown que pueden renderizarse como citas en listas."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LIST_COMPARATOR_RE = re.compile(r"^\s*(?:[-*+]|\d+[.)])\s+([<>])\s*\d")


def main() -> int:
    errors: list[str] = []

    for path in sorted((ROOT / "docs").rglob("*.md")):
        in_fence = False
        for lineno, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            if line.lstrip().startswith("```"):
                in_fence = not in_fence
                continue
            if in_fence:
                continue

            match = LIST_COMPARATOR_RE.match(line)
            if match:
                operator = match.group(1)
                entity = "&gt;" if operator == ">" else "&lt;"
                errors.append(
                    f"{path.relative_to(ROOT)}:{lineno}: "
                    f"comparador '{operator}' tras marcador de lista; usar '{entity}' "
                    "para evitar que Markdown lo interprete de forma especial."
                )

    if errors:
        print("ERROR: comparadores Markdown potencialmente problemáticos:\n")
        for error in errors:
            print(f"- {error}")
        return 1

    print("OK: no hay comparadores problemáticos al inicio de elementos de lista.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
