#!/usr/bin/env python3
"""Valida el registro farmacológico de la calculadora y casos de prueba básicos."""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "docs" / "data" / "drugs.json"


def fail(message: str, errors: list[str]) -> None:
    errors.append(message)


def calculate(entry: dict, weight: float) -> float:
    dose = entry["dose"]
    if dose["kind"] == "weight":
        value = weight * float(dose["value"])
    elif dose["kind"] == "volume_per_kg":
        value = weight * float(dose["value"])
    else:
        raise ValueError(f"kind no soportado: {dose['kind']}")

    maximum = entry.get("max_dose")
    if maximum:
        value = min(value, float(maximum["value"]))
    return value


def main() -> int:
    errors: list[str] = []
    data = json.loads(REGISTRY.read_text(encoding="utf-8"))

    if data.get("schema_version") != 1:
        fail("schema_version debe ser 1", errors)

    ids: set[str] = set()
    required = {"id", "drug", "indication", "route", "dose", "protocol", "source_label"}

    for entry in data.get("entries", []):
        missing = required - set(entry)
        if missing:
            fail(f"{entry.get('id', '?')}: faltan campos {sorted(missing)}", errors)
            continue

        if entry["id"] in ids:
            fail(f"id duplicado: {entry['id']}", errors)
        ids.add(entry["id"])

        protocol = ROOT / "docs" / entry["protocol"]
        if not protocol.exists():
            fail(f"{entry['id']}: protocolo inexistente {entry['protocol']}", errors)

        dose = entry["dose"]
        if dose.get("kind") not in {"weight", "volume_per_kg"}:
            fail(f"{entry['id']}: kind no soportado", errors)
        if not isinstance(dose.get("value"), (int, float)) or dose["value"] <= 0:
            fail(f"{entry['id']}: dose.value debe ser positivo", errors)
        if not dose.get("unit") or not dose.get("output_unit"):
            fail(f"{entry['id']}: faltan unidades de dosis", errors)

        maximum = entry.get("max_dose")
        if maximum and maximum.get("unit") != dose.get("output_unit"):
            fail(f"{entry['id']}: máximo y salida usan unidades distintas", errors)

    by_id = {entry["id"]: entry for entry in data.get("entries", [])}
    tests = [
        ("adrenalina-rcp", 20, 0.2),
        ("ondansetron-gea", 18, 2.7),
        ("glucosa10-hipoglucemia", 20, 40),
        ("levetiracetam-estatus", 20, 1000),
        ("levetiracetam-estatus", 100, 4500),
    ]

    for drug_id, weight, expected in tests:
        if drug_id not in by_id:
            fail(f"falta caso de prueba {drug_id}", errors)
            continue
        actual = calculate(by_id[drug_id], weight)
        if not math.isclose(actual, expected, rel_tol=0, abs_tol=1e-9):
            fail(
                f"{drug_id} ({weight} kg): esperado {expected}, obtenido {actual}",
                errors,
            )

    if errors:
        print("ERROR: registro farmacológico inválido:\n")
        for error in errors:
            print(f"- {error}")
        return 1

    print(f"OK: {len(by_id)} escenarios farmacológicos y {len(tests)} cálculos de control.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
