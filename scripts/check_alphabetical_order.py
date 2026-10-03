#!/usr/bin/env python3
"""Comprueba que la navegación y los índices estén en orden alfabético."""

from __future__ import annotations

import re
import sys
import unicodedata
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]


def sort_key(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", text.casefold())
    return "".join(ch for ch in normalized if not unicodedata.combining(ch))


def check_order(labels: list[str], context: str, errors: list[str]) -> None:
    expected = sorted(labels, key=sort_key)
    if labels != expected:
        errors.append(
            f"{context}: orden actual = {labels!r}; orden esperado = {expected!r}"
        )


def check_mkdocs(errors: list[str]) -> None:
    data = yaml.safe_load((ROOT / "mkdocs.yml").read_text(encoding="utf-8"))
    nav = data.get("nav", [])

    top_labels: list[str] = []
    for entry in nav:
        if not isinstance(entry, dict) or len(entry) != 1:
            continue
        label, value = next(iter(entry.items()))
        if label != "Inicio":
            top_labels.append(label)

        if isinstance(value, list):
            child_labels: list[str] = []
            for child in value:
                # El primer elemento suele ser el index.md de la sección.
                if isinstance(child, dict) and len(child) == 1:
                    child_labels.append(next(iter(child.keys())))
            if len(child_labels) > 1:
                check_order(child_labels, f"mkdocs.yml → {label}", errors)

    check_order(top_labels, "mkdocs.yml → capítulos", errors)


INDEX_LINK_RE = re.compile(r"^\s*-\s+\[([^\]]+)\]\([^)]+\)\s*$")


def check_indexes(errors: list[str]) -> None:
    for path in sorted((ROOT / "docs").glob("*/index.md")):
        labels: list[str] = []
        for line in path.read_text(encoding="utf-8").splitlines():
            match = INDEX_LINK_RE.match(line)
            if match:
                labels.append(match.group(1))
        if len(labels) > 1:
            check_order(labels, str(path.relative_to(ROOT)), errors)


def main() -> int:
    errors: list[str] = []
    check_mkdocs(errors)
    check_indexes(errors)

    if errors:
        print("ERROR: se ha encontrado contenido fuera de orden alfabético:\n")
        for error in errors:
            print(f"- {error}")
        return 1

    print("OK: capítulos y temas están en orden alfabético.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
