#!/usr/bin/env python3
"""Valida el registro farmacológico de la calculadora y casos de prueba clínicos."""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "docs" / "data" / "drugs.json"
SUPPORTED_KINDS = {
    "weight",
    "volume_per_kg",
    "weight_range",
    "fixed_by_weight",
    "daily_divided",
}


def fail(message: str, errors: list[str]) -> None:
    errors.append(message)


def apply_limits(value: float, entry: dict) -> float:
    minimum = entry.get("min_dose")
    maximum = entry.get("max_dose")
    if minimum:
        value = max(value, float(minimum["value"]))
    if maximum:
        value = min(value, float(maximum["value"]))
    return value


def tier_for_weight(tiers: list[dict], weight: float) -> dict:
    for tier in tiers:
        if "lt" in tier and not weight < tier["lt"]:
            continue
        if "lte" in tier and not weight <= tier["lte"]:
            continue
        if "gt" in tier and not weight > tier["gt"]:
            continue
        if "gte" in tier and not weight >= tier["gte"]:
            continue
        return tier
    raise ValueError("sin tramo de peso")


def calculate(entry: dict, weight: float):
    dose = entry["dose"]
    kind = dose["kind"]

    if kind in {"weight", "volume_per_kg"}:
        return apply_limits(weight * float(dose["value"]), entry)

    if kind == "weight_range":
        low = apply_limits(weight * float(dose["min"]), entry)
        high = apply_limits(weight * float(dose["max"]), entry)
        return (low, high)

    if kind == "fixed_by_weight":
        tier = tier_for_weight(dose["tiers"], weight)
        return apply_limits(float(tier["value"]), entry)

    if kind == "daily_divided":
        daily = weight * float(dose["value"])
        maximum = entry.get("max_daily")
        if maximum:
            daily = min(daily, float(maximum["value"]))
        return {
            "daily": daily,
            "divided": {n: daily / n for n in dose["divisions"]},
        }

    raise ValueError(f"kind no soportado: {kind}")


def close(actual, expected) -> bool:
    if isinstance(expected, tuple):
        return all(
            math.isclose(a, e, rel_tol=0, abs_tol=1e-9)
            for a, e in zip(actual, expected, strict=True)
        )
    return math.isclose(actual, expected, rel_tol=0, abs_tol=1e-9)


def main() -> int:
    errors: list[str] = []
    data = json.loads(REGISTRY.read_text(encoding="utf-8"))

    if data.get("schema_version") != 2:
        fail("schema_version debe ser 2", errors)

    entries = data.get("entries", [])
    if len(entries) < 30:
        fail("fase 2: se esperaban al menos 30 escenarios farmacológicos", errors)

    ids: set[str] = set()
    required = {
        "id",
        "category",
        "drug",
        "indication",
        "route",
        "dose",
        "reference_text",
        "interval",
        "protocol",
        "source_label",
        "off_label",
        "high_risk",
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

        if "<" in entry.get("reference_text", ""):
            fail(f"{entry['id']}: usar texto/entidad segura en vez de '<' crudo", errors)

        dose = entry["dose"]
        kind = dose.get("kind")
        if kind not in SUPPORTED_KINDS:
            fail(f"{entry['id']}: kind no soportado {kind!r}", errors)
            continue

        if not dose.get("output_unit"):
            fail(f"{entry['id']}: falta dose.output_unit", errors)

        if kind in {"weight", "volume_per_kg", "daily_divided"}:
            if not isinstance(dose.get("value"), (int, float)) or dose["value"] <= 0:
                fail(f"{entry['id']}: dose.value debe ser positivo", errors)
            if not dose.get("unit"):
                fail(f"{entry['id']}: falta dose.unit", errors)

        if kind == "weight_range":
            if not isinstance(dose.get("min"), (int, float)) or not isinstance(
                dose.get("max"), (int, float)
            ):
                fail(f"{entry['id']}: rango incompleto", errors)
            elif dose["min"] <= 0 or dose["max"] < dose["min"]:
                fail(f"{entry['id']}: rango inválido", errors)
            if not dose.get("unit"):
                fail(f"{entry['id']}: falta dose.unit", errors)

        if kind == "fixed_by_weight":
            tiers = dose.get("tiers")
            if not isinstance(tiers, list) or not tiers:
                fail(f"{entry['id']}: faltan tramos de peso", errors)
            else:
                for tier in tiers:
                    if not isinstance(tier.get("value"), (int, float)) or tier["value"] <= 0:
                        fail(f"{entry['id']}: valor de tramo inválido", errors)
                    if "<" in tier.get("label", ""):
                        fail(f"{entry['id']}: etiqueta de tramo contiene '<' crudo", errors)

        if kind == "daily_divided":
            divisions = dose.get("divisions")
            if not isinstance(divisions, list) or not divisions:
                fail(f"{entry['id']}: faltan divisiones diarias", errors)
            elif any(not isinstance(n, int) or n < 1 for n in divisions):
                fail(f"{entry['id']}: divisiones diarias inválidas", errors)

        for key in ("min_dose", "max_dose"):
            limit = entry.get(key)
            if limit:
                if not isinstance(limit.get("value"), (int, float)) or limit["value"] <= 0:
                    fail(f"{entry['id']}: {key} inválido", errors)
                if kind != "daily_divided" and limit.get("unit") != dose.get("output_unit"):
                    fail(
                        f"{entry['id']}: {key} y salida usan unidades distintas",
                        errors,
                    )

        age = entry.get("age")
        if age and age.get("min_months", 0) < 0:
            fail(f"{entry['id']}: edad mínima inválida", errors)

        min_weight = entry.get("min_weight_kg")
        if min_weight is not None and min_weight <= 0:
            fail(f"{entry['id']}: peso mínimo inválido", errors)

    by_id = {entry["id"]: entry for entry in entries}

    scalar_tests = [
        ("adrenalina-rcp", 20, 0.2),
        ("adrenalina-anafilaxia", 5, 0.1),
        ("adrenalina-anafilaxia", 80, 0.5),
        ("ondansetron-gea", 18, 2.7),
        ("glucosa10-hipoglucemia", 20, 40),
        ("levetiracetam-estatus", 20, 1000),
        ("levetiracetam-estatus", 100, 4500),
        ("gluconato-calcio-rcp", 60, 20),
        ("glucagon-hipoglucemia", 20, 0.5),
        ("glucagon-hipoglucemia", 30, 1),
        ("ipratropio-asma-nebulizado", 15, 250),
        ("ipratropio-asma-nebulizado", 25, 500),
        ("salbutamol-asma-nebulizado", 40, 5),
        ("flumazenilo", 30, 0.2),
        ("nacl3-htic", 20, 100),
    ]

    range_tests = [
        ("dexametasona-laringitis", 20, (3, 10)),
        ("tranexamico-tce", 60, (900, 1000)),
        ("manitol-htic", 20, (10, 20)),
        ("fentanilo-in-dolor", 20, (20, 40)),
    ]

    for drug_id, weight, expected in scalar_tests + range_tests:
        if drug_id not in by_id:
            fail(f"falta caso de prueba {drug_id}", errors)
            continue
        actual = calculate(by_id[drug_id], weight)
        if not close(actual, expected):
            fail(
                f"{drug_id} ({weight} kg): esperado {expected}, obtenido {actual}",
                errors,
            )

    if "amoxicilina-nac" in by_id:
        amox = calculate(by_id["amoxicilina-nac"], 20)
        if not math.isclose(amox["daily"], 1600, abs_tol=1e-9):
            fail("amoxicilina-nac 20 kg: total diario incorrecto", errors)
        if not math.isclose(amox["divided"][2], 800, abs_tol=1e-9):
            fail("amoxicilina-nac 20 kg: pauta cada 12 h incorrecta", errors)
        if not math.isclose(amox["divided"][3], 1600 / 3, abs_tol=1e-9):
            fail("amoxicilina-nac 20 kg: pauta cada 8 h incorrecta", errors)
    else:
        fail("falta caso de prueba amoxicilina-nac", errors)

    if errors:
        print("ERROR: registro farmacológico inválido:\n")
        for error in errors:
            print(f"- {error}")
        return 1

    total_tests = len(scalar_tests) + len(range_tests) + 3
    print(
        f"OK: {len(by_id)} escenarios farmacológicos y "
        f"{total_tests} comprobaciones de cálculo."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
