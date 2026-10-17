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
    if len(entries) < 15:
        fail("se esperaban al menos 15 perfusiones", errors)

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
        if concentration.get("mode") not in {"fixed", "institutional", "suggested"}:
            fail(f"{entry['id']}: concentration.mode inválido", errors)
        if not concentration.get("unit"):
            fail(f"{entry['id']}: falta unidad de concentración", errors)
        if concentration.get("mode") == "fixed":
            if not isinstance(concentration.get("value"), (int, float)) or concentration["value"] <= 0:
                fail(f"{entry['id']}: concentración fija inválida", errors)
            if not concentration.get("preparation"):
                fail(f"{entry['id']}: falta preparación de concentración fija", errors)
        if concentration.get("mode") == "suggested":
            if not concentration.get("reference_url") or not concentration.get("reference_note"):
                fail(f"{entry['id']}: falta fuente y contexto de la concentración propuesta", errors)
            if concentration.get("review_status") != "bibliographic_not_hospital_approved":
                fail(f"{entry['id']}: concentración propuesta sin etiqueta de validación", errors)
            bands = concentration.get("suggestions", [])
            if not bands or "max_weight" in bands[-1]:
                fail(f"{entry['id']}: bandas de peso sin cobertura completa", errors)
            previous = 0
            for i, band in enumerate(bands):
                value = band.get("value")
                if not isinstance(value, (int, float)) or not math.isfinite(value) or value <= 0:
                    fail(f"{entry['id']}: concentración sugerida inválida", errors)
                if "max_weight" in band:
                    if i == len(bands)-1 or not isinstance(band["max_weight"], (int, float)) or band["max_weight"] <= previous:
                        fail(f"{entry['id']}: límites de peso no crecientes", errors)
                    else:
                        previous = band["max_weight"]

    by_id = {entry["id"]: entry for entry in entries}

    def suggestion(entry: dict, weight: float) -> float:
        for band in entry["concentration"]["suggestions"]:
            if "max_weight" not in band or weight < band["max_weight"]:
                return band["value"]
        raise ValueError("no existe banda válida")

    reference_examples = [
        ("adrenalina-shock-frio", 3, 20),
        ("adrenalina-shock-frio", 10, 40),
        ("adrenalina-shock-frio", 25, 80),
        ("noradrenalina-shock-caliente", 15, 20),
        ("midazolam-estatus-refractario", 3, 0.5),
        ("midazolam-estatus-refractario", 15, 1),
        ("midazolam-estatus-refractario", 25, 2),
        ("dopamina-soporte-inotropico", 3, 2000),
        ("dopamina-soporte-inotropico", 25, 12000),
        ("dobutamina-disfuncion-miocardica", 15, 5000),
        ("alprostadil-ductus", 3, 5),
        ("fentanilo-sedacion-prolongada", 15, 20),
        ("dexmedetomidina-sedacion-uci", 15, 4),
        ("glucagon-anafilaxia-perfusion", 15, 100),
        ("propofol-estatus-refractario", 15, 10),
        ("tiopental-estatus-refractario", 15, 4),
        ("valproato-mantenimiento-estatus", 15, 3.2),
    ]
    for infusion_id, weight, expected in reference_examples:
        if not math.isclose(suggestion(by_id[infusion_id], weight), expected, abs_tol=1e-9):
            fail(f"{infusion_id}: banda de peso {weight} kg incorrecta", errors)

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
        ("dopamina-soporte-inotropico", 20, 5, 1000, 6),
        ("dobutamina-disfuncion-miocardica", 20, 5, 1000, 6),
        ("alprostadil-ductus", 3, 0.05, 5, 1.8),
        ("fentanilo-sedacion-prolongada", 20, 1, 10, 2),
        ("dexmedetomidina-sedacion-uci", 20, 0.2, 4, 1),
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

    for infusion_id, weight, dose, concentration in [
        ("insulina-cad", 20, 0.2, 1),
        ("dexmedetomidina-sedacion-uci", 20, 1.4, 4),
        ("dopamina-soporte-inotropico", 20, 2, 1000),
        ("alprostadil-ductus", 3, 0.2, 5),
    ]:
        try:
            pump(by_id[infusion_id], weight, dose, concentration)
            fail(f"{infusion_id} debería rechazar dosis fuera de rango", errors)
        except ValueError:
            pass

    # Preparación ponderal de 50 mL: concentración objetivo y ampolla deben
    # expresarse en la misma unidad/volumen, con volumen final real de 50 mL.
    def draw_volume(solution_concentration: float, vial_concentration: float) -> float:
        if solution_concentration <= 0 or vial_concentration <= 0:
            raise ValueError("concentración no válida")
        ampoule_ml = solution_concentration * 50 / vial_concentration
        if ampoule_ml < 0.1 or ampoule_ml > 50:
            raise ValueError("extracción no segura o imposible")
        return ampoule_ml

    if not math.isclose(draw_volume(10, 1000), 0.5, abs_tol=1e-9):
        fail("error de cálculo de jeringa 50 mL", errors)
    if not math.isclose(draw_volume(4, 100), 2, abs_tol=1e-9):
        fail("error de jeringa dexmedetomidina 4 µg/mL", errors)
    for goal, vial in [(1000, 500), (0.01, 500), (0, 100)]:
        try:
            draw_volume(goal, vial)
            fail("debería rechazar preparación inviable o imprecisa", errors)
        except ValueError:
            pass

    expected = {
        "alprostadil-ductus": ("µg/kg/min", True),
        "dexmedetomidina-sedacion-uci": ("µg/kg/h", False),
        "fentanilo-sedacion-prolongada": ("µg/kg/h", False),
        "dobutamina-disfuncion-miocardica": ("µg/kg/min", False),
        "dopamina-soporte-inotropico": ("µg/kg/min", False),
    }
    for infusion_id, (unit, neonatal_only) in expected.items():
        entry = by_id[infusion_id]
        if entry["rate"]["unit"] != unit:
            fail(f"{infusion_id}: unidad inesperada", errors)
        if entry.get("neonatal_only", False) is not neonatal_only:
            fail(f"{infusion_id}: restricción neonatal inesperada", errors)
        if entry["concentration"]["mode"] != "suggested":
            fail(f"{infusion_id}: falta propuesta bibliográfica explícitamente no homologada", errors)
        if not entry.get("source_url"):
            fail(f"{infusion_id}: falta fuente externa explícita", errors)

    if errors:
        print("ERROR: registro de perfusiones inválido:\n")
        for error in errors:
            print(f"- {error}")
        return 1

    print(
        f"OK: {len(entries)} perfusiones y "
        f"{len(tests) + 4 + 5 + 2 + len(expected) * 4 + len(reference_examples)} comprobaciones de seguridad/cálculo."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
