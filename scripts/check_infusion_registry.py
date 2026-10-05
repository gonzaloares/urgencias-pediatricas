#!/usr/bin/env python3
"""Valida el registro y los cálculos de perfusiones de alto riesgo."""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "docs" / "data" / "infusions.json"


def fail(message: str, errors: list[str]) -> None:
    errors.append(message)


def pump(entry: dict, weight: float | None, desired: float, concentration: float) -> float:
    rate = entry["rate"]
    if desired < rate["min"] or desired > rate["max"]:
        raise ValueError("dosis fuera de rango")
    if concentration <= 0:
        raise ValueError("concentración inválida")

    if rate["kind"] == "weight_rate":
        if weight is None or weight <= 0:
            raise ValueError("peso inválido")
        amount = desired * weight
    elif rate["kind"] == "absolute_rate":
        amount = desired
    else:
        raise ValueError("tipo no soportado")

    if rate["time_base"] == "min":
        return amount * 60 / concentration
    if rate["time_base"] == "h":
        return amount / concentration
    raise ValueError("base temporal no soportada")


def main() -> int:
    errors: list[str] = []
    data = json.loads(REGISTRY.read_text(encoding="utf-8"))

    if data.get("schema_version") != 1:
        fail("schema_version debe ser 1", errors)

    entries = data.get("entries", [])
    if len(entries) < 8:
        fail("se esperaban al menos 8 perfusiones", errors)

    ids: set[str] = set()
    required = {
        "id",
        "category",
        "drug",
        "indication",
        "route",
        "rate",
        "concentration",
        "reference_text",
        "protocol",
        "source_label",
    }

    for entry in entries:
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

        rate = entry["rate"]
        if rate.get("kind") not in {"weight_rate", "absolute_rate"}:
            fail(f"{entry['id']}: rate.kind no soportado", errors)
        for key in ("min", "max", "default"):
            if not isinstance(rate.get(key), (int, float)):
                fail(f"{entry['id']}: rate.{key} inválido", errors)
        if rate.get("min", 0) <= 0 or rate.get("max", 0) < rate.get("min", 0):
            fail(f"{entry['id']}: rango inválido", errors)
        if not (rate.get("min", 0) <= rate.get("default", -1) <= rate.get("max", 0)):
            fail(f"{entry['id']}: dosis por defecto fuera de rango", errors)
        if rate.get("time_base") not in {"min", "h"}:
            fail(f"{entry['id']}: base temporal inválida", errors)
        if not rate.get("unit") or not rate.get("amount_unit"):
            fail(f"{entry['id']}: faltan unidades de velocidad", errors)

        concentration = entry["concentration"]
        if concentration.get("mode") not in {"fixed", "institutional"}:
            fail(f"{entry['id']}: concentration.mode inválido", errors)
        if not concentration.get("unit"):
            fail(f"{entry['id']}: falta unidad de concentración", errors)
        if concentration.get("mode") == "fixed":
            if not isinstance(concentration.get("value"), (int, float)) or concentration["value"] <= 0:
                fail(f"{entry['id']}: concentración fija inválida", errors)
            if not concentration.get("preparation"):
                fail(f"{entry['id']}: falta preparación de concentración fija", errors)

    by_id = {entry["id"]: entry for entry in entries}

    tests = [
        ("adrenalina-anafilaxia-refractaria", 20, 0.1, 10, 12),
        ("insulina-cad", 20, 0.05, 1, 1),
        ("adrenalina-shock-frio", 20, 0.05, 10, 6),
        ("noradrenalina-shock-caliente", 20, 0.1, 20, 6),
        ("adrenalina-bradicardia-persistente", 10, 0.1, 10, 6),
        ("midazolam-estatus-refractario", 20, 0.1, 1, 2),
        ("propofol-estatus-refractario", 20, 5, 10, 10),
        ("tiopental-estatus-refractario", 20, 3, 25, 2.4),
        ("valproato-mantenimiento-estatus", 20, 1, 20, 1),
        ("glucagon-anafilaxia-perfusion", None, 10, 100, 6),
    ]

    for infusion_id, weight, desired, concentration, expected in tests:
        entry = by_id.get(infusion_id)
        if not entry:
            fail(f"falta perfusión de prueba {infusion_id}", errors)
            continue
        actual = pump(entry, weight, desired, concentration)
        if not math.isclose(actual, expected, rel_tol=0, abs_tol=1e-9):
            fail(
                f"{infusion_id}: esperado {expected} mL/h, obtenido {actual}",
                errors,
            )

    try:
        pump(by_id["insulina-cad"], 20, 0.2, 1)
        fail("insulina-cad debería rechazar dosis fuera de rango", errors)
    except ValueError:
        pass

    if errors:
        print("ERROR: registro de perfusiones inválido:\n")
        for error in errors:
            print(f"- {error}")
        return 1

    print(
        f"OK: {len(entries)} perfusiones y "
        f"{len(tests) + 1} comprobaciones de seguridad/cálculo."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
