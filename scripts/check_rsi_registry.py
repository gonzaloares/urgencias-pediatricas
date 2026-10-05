#!/usr/bin/env python3
"""Valida el registro reconciliado de secuencia rápida de intubación."""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "docs" / "data" / "rsi.json"


def calc(app: dict, weight: float, selector: str | None = None) -> float:
    kind = app.get("kind")

    if kind == "weight":
        value = weight * app["value"]
    elif kind == "weight_range":
        value = weight * app["default"]
    elif kind == "reversal_options":
        options = {opt["id"]: opt for opt in app["options"]}
        if selector not in options:
            raise ValueError("selector inválido")
        value = weight * options[selector]["value"]
    else:
        raise ValueError("entrada no calculable")

    minimum = app.get("min_dose")
    maximum = app.get("max_dose")
    if minimum:
        value = max(value, minimum["value"])
    if maximum:
        value = min(value, maximum["value"])
    return value


def main() -> int:
    errors: list[str] = []
    data = json.loads(REGISTRY.read_text(encoding="utf-8"))
    entries = data.get("entries", [])

    if data.get("schema_version") != 1:
        errors.append("schema_version debe ser 1")
    if len(entries) != 10:
        errors.append(f"se esperaban 10 entradas SRI; hay {len(entries)}")

    ids: set[str] = set()
    for entry in entries:
        for field in ("id", "drug", "role", "route", "cards_2024", "seup_4ed_2024", "app", "warnings"):
            if field not in entry:
                errors.append(f"{entry.get('id', '?')}: falta {field}")

        if entry.get("id") in ids:
            errors.append(f"id duplicado: {entry['id']}")
        ids.add(entry.get("id"))

        status = entry.get("app", {}).get("status")
        if status not in {
            "reconciled",
            "reconciled_cautious",
            "reconciled_from_cards",
            "conflict_hold",
        }:
            errors.append(f"{entry.get('id', '?')}: status inválido {status!r}")

        if status == "conflict_hold" and entry["app"].get("kind") is not None:
            errors.append(f"{entry['id']}: un conflicto abierto no debe ser calculable")

    by_id = {entry["id"]: entry for entry in entries}

    tests = [
        ("atropina-premedicacion-sri", 10, None, 0.2),
        ("fentanilo-premedicacion-sri", 20, None, 20),
        ("ketamina-sri", 20, None, 30),
        ("ketamina-sri", 50, None, 50),
        ("propofol-sri", 20, None, 20),
        ("etomidato-sri", 20, None, 6),
        ("etomidato-sri", 100, None, 20),
        ("rocuronio-sri", 20, None, 20),
        ("succinilcolina-sri", 20, None, 20),
        ("succinilcolina-sri", 200, None, 150),
        ("sugammadex-rocuronio", 20, "t2", 40),
        ("sugammadex-rocuronio", 20, "deep", 80),
        ("tiopental-sri", 20, None, 60),
    ]

    for entry_id, weight, selector, expected in tests:
        try:
            actual = calc(by_id[entry_id]["app"], weight, selector)
        except Exception as exc:
            errors.append(f"{entry_id}: error de cálculo: {exc}")
            continue
        if not math.isclose(actual, expected, rel_tol=0, abs_tol=1e-9):
            errors.append(
                f"{entry_id} ({weight} kg): esperado {expected}, obtenido {actual}"
            )

    try:
        calc(by_id["midazolam-sri"]["app"], 20)
        errors.append("midazolam-sri debe permanecer bloqueado por conflicto")
    except ValueError:
        pass

    if errors:
        print("ERROR: registro SRI inválido:\n")
        for error in errors:
            print(f"- {error}")
        return 1

    print(f"OK: {len(entries)} entradas SRI y {len(tests) + 1} comprobaciones.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
