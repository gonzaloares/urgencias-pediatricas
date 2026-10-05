(() => {
  const STORAGE_KEY = "urgencias-pediatricas-patient-context-v1";

  const fmt = (value, digits = 2) => {
    const rounded = Number(Number(value).toFixed(digits));
    return new Intl.NumberFormat("es-ES", {
      maximumFractionDigits: digits,
    }).format(rounded);
  };

  function readContext() {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
    } catch (_) {
      return {};
    }
  }

  function saveContext(weight, years, months) {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ weight, years, months })
      );
    } catch (_) {
      // La calculadora funciona aunque el navegador bloquee sessionStorage.
    }
  }

  function ageInMonths(years, months) {
    const hasYears = Number.isFinite(years);
    const hasMonths = Number.isFinite(months);
    if (!hasYears && !hasMonths) return null;
    return Math.max(0, (years || 0) * 12 + (months || 0));
  }

  function applyLimits(value, entry) {
    let finalValue = value;
    const messages = [];

    if (entry.min_dose && finalValue < entry.min_dose.value) {
      finalValue = entry.min_dose.value;
      messages.push(
        `Se aplica dosis mínima: ${fmt(entry.min_dose.value)} ${entry.min_dose.unit}`
      );
    }

    if (entry.max_dose && finalValue > entry.max_dose.value) {
      finalValue = entry.max_dose.value;
      messages.push(
        `Se aplica dosis máxima: ${fmt(entry.max_dose.value)} ${entry.max_dose.unit}`
      );
    }

    return { value: finalValue, messages };
  }

  function volumeFor(value, entry) {
    if (!entry.concentration) return null;
    const expectedPrefix = entry.dose.output_unit + "/";
    if (!entry.concentration.unit.startsWith(expectedPrefix)) return null;
    return value / entry.concentration.value;
  }

  function tierForWeight(tiers, weight) {
    return tiers.find((tier) => {
      const ltOk = tier.lt === undefined || weight < tier.lt;
      const lteOk = tier.lte === undefined || weight <= tier.lte;
      const gtOk = tier.gt === undefined || weight > tier.gt;
      const gteOk = tier.gte === undefined || weight >= tier.gte;
      return ltOk && lteOk && gtOk && gteOk;
    });
  }

  function splitLabel(divisions) {
    if (divisions === 2) return "Cada 12 h";
    if (divisions === 3) return "Cada 8 h";
    if (divisions === 4) return "Cada 6 h";
    return `${divisions} dosis/día`;
  }

  function calculate(entry, weight) {
    if (!Number.isFinite(weight) || weight <= 0) return null;

    const dose = entry.dose;
    const result = {
      formula: "",
      finalLabel: "",
      volumes: [],
      messages: [],
      details: [],
      numeric: null,
    };

    if (dose.kind === "weight") {
      const raw = weight * dose.value;
      const limited = applyLimits(raw, entry);
      result.numeric = limited.value;
      result.messages.push(...limited.messages);
      result.formula =
        `${fmt(dose.value)} ${dose.unit} × ${fmt(weight, 1)} kg = ${fmt(raw)} ${dose.output_unit}`;
      result.finalLabel = `${fmt(limited.value)} ${dose.output_unit}`;

      const volume = volumeFor(limited.value, entry);
      if (volume !== null) {
        result.volumes.push({
          label: "Volumen",
          value: `${fmt(volume)} mL`,
          note: entry.concentration.label,
        });
      }
      return result;
    }

    if (dose.kind === "volume_per_kg") {
      const raw = weight * dose.value;
      const limited = applyLimits(raw, entry);
      result.numeric = limited.value;
      result.messages.push(...limited.messages);
      result.formula =
        `${fmt(dose.value)} ${dose.unit} × ${fmt(weight, 1)} kg = ${fmt(raw)} ${dose.output_unit}`;
      result.finalLabel = `${fmt(limited.value)} ${dose.output_unit}`;
      return result;
    }

    if (dose.kind === "weight_range") {
      const rawLow = weight * dose.min;
      const rawHigh = weight * dose.max;
      const low = applyLimits(rawLow, entry);
      const high = applyLimits(rawHigh, entry);
      result.numeric = [low.value, high.value];
      result.messages.push(...new Set([...low.messages, ...high.messages]));
      result.formula =
        `${fmt(dose.min)}–${fmt(dose.max)} ${dose.unit} × ${fmt(weight, 1)} kg = ${fmt(rawLow)}–${fmt(rawHigh)} ${dose.output_unit}`;
      result.finalLabel =
        low.value === high.value
          ? `${fmt(low.value)} ${dose.output_unit}`
          : `${fmt(low.value)}–${fmt(high.value)} ${dose.output_unit}`;

      if (entry.concentration) {
        const lowVolume = volumeFor(low.value, entry);
        const highVolume = volumeFor(high.value, entry);
        if (lowVolume !== null && highVolume !== null) {
          result.volumes.push({
            label: "Volumen",
            value:
              lowVolume === highVolume
                ? `${fmt(lowVolume)} mL`
                : `${fmt(lowVolume)}–${fmt(highVolume)} mL`,
            note: entry.concentration.label,
          });
        }
      }
      return result;
    }

    if (dose.kind === "fixed_by_weight") {
      const tier = tierForWeight(dose.tiers, weight);
      if (!tier) throw new Error(`No hay tramo de peso para ${entry.id}`);
      const limited = applyLimits(tier.value, entry);
      result.numeric = limited.value;
      result.messages.push(...limited.messages);
      result.formula = `${tier.label} → ${fmt(tier.value)} ${dose.output_unit}`;
      result.finalLabel = `${fmt(limited.value)} ${dose.output_unit}`;
      return result;
    }

    if (dose.kind === "daily_divided") {
      let daily = weight * dose.value;
      if (entry.max_daily && daily > entry.max_daily.value) {
        daily = entry.max_daily.value;
        result.messages.push(
          `Se aplica máximo diario: ${fmt(entry.max_daily.value)} ${entry.max_daily.unit}`
        );
      }
      result.numeric = daily;
      result.formula =
        `${fmt(dose.value)} ${dose.unit} × ${fmt(weight, 1)} kg = ${fmt(daily)} ${dose.output_unit}/día`;
      result.finalLabel = `${fmt(daily)} ${dose.output_unit}/día`;
      result.details = (dose.divisions || []).map((divisions) => ({
        label: splitLabel(divisions),
        value: `${fmt(daily / divisions)} ${dose.output_unit}/dosis`,
      }));
      return result;
    }

    throw new Error(`Tipo de cálculo no soportado: ${dose.kind}`);
  }

  function ageState(entry, patientAgeMonths) {
    if (!entry.age || !entry.age.min_months) {
      return { required: false, unknown: false, tooYoung: false };
    }

    const required = true;
    const unknown = patientAgeMonths === null;
    if (unknown) return { required, unknown, tooYoung: false };

    const min = entry.age.min_months;
    const tooYoung = entry.age.min_exclusive
      ? patientAgeMonths <= min
      : patientAgeMonths < min;

    return { required, unknown, tooYoung };
  }

  function renderResult(result, entry) {
    if (!result) {
      return '<div class="dose-calculator-empty">Introduce el peso para calcular.</div>';
    }

    const volumes = result.volumes
      .map(
        (item) => `
          <div class="dose-calculator-volume">
            <span>${item.label}</span>
            <strong>${item.value}</strong>
            <small>${item.note || ""}</small>
          </div>
        `
      )
      .join("");

    const details = result.details.length
      ? `<div class="dose-calculator-details">${result.details
          .map(
            (item) =>
              `<div><span>${item.label}</span><strong>${item.value}</strong></div>`
          )
          .join("")}</div>`
      : "";

    const messages = result.messages
      .map((message) => `<div class="dose-calculator-cap">${message}</div>`)
      .join("");

    return `
      <div class="dose-calculator-formula">${result.formula}</div>
      <div class="dose-calculator-final">
        <span>Dosis calculada</span>
        <strong>${result.finalLabel}</strong>
      </div>
      ${details}
      ${volumes}
      ${messages}
    `;
  }

  function renderCard(entry, weight, patientAgeMonths) {
    const age = ageState(entry, patientAgeMonths);
    const weightTooLow =
      Number.isFinite(weight) &&
      entry.min_weight_kg &&
      weight < entry.min_weight_kg;
    const blocked = age.tooYoung || weightTooLow;

    let warnings = "";
    if (age.unknown) {
      warnings +=
        '<div class="dose-calculator-warning">Introduce la edad para comprobar el límite etario de esta pauta.</div>';
    }
    if (age.tooYoung) {
      warnings += `<div class="dose-calculator-danger">Fuera del rango validado: ${entry.age.text}. No se ofrece cálculo.</div>`;
    }
    if (weightTooLow) {
      warnings += `<div class="dose-calculator-danger">Fuera del rango validado: peso mínimo ${fmt(entry.min_weight_kg, 1)} kg. No se ofrece cálculo.</div>`;
    }

    let result = null;
    if (!blocked) {
      try {
        result = calculate(entry, weight);
      } catch (error) {
        console.error(error);
      }
    }

    const notes = (entry.notes || [])
      .map((note) => `<li>${note}</li>`)
      .join("");

    const searchable = [
      entry.category,
      entry.drug,
      entry.indication,
      entry.route,
      entry.reference_text,
    ]
      .join(" ")
      .toLowerCase();

    return `
      <article class="dose-calculator-card" data-search="${searchable}">
        <header>
          <div>
            <h3>${entry.drug}</h3>
            <p>${entry.indication}</p>
          </div>
          <div class="dose-calculator-tags">
            <span>${entry.route}</span>
            ${entry.high_risk ? '<span class="high-risk">Alto riesgo</span>' : ""}
            ${entry.off_label ? '<span class="off-label">Off-label</span>' : ""}
          </div>
        </header>
        <div class="dose-calculator-reference">
          <strong>${entry.reference_text}</strong>
          ${entry.age ? ` · ${entry.age.text}` : ""}
          ${entry.min_weight_kg ? ` · ≥${fmt(entry.min_weight_kg, 1)} kg` : ""}
        </div>
        ${warnings}
        <div class="dose-calculator-output">
          ${blocked ? '<div class="dose-calculator-empty">Cálculo bloqueado por límite de seguridad.</div>' : renderResult(result, entry)}
        </div>
        <div class="dose-calculator-meta">
          <p><strong>Administración:</strong> ${entry.interval}</p>
          ${notes ? `<ul>${notes}</ul>` : ""}
          <p><strong>Fuente interna:</strong> <a href="../${entry.protocol.replace(".md", "/")}">${entry.source_label}</a></p>
        </div>
      </article>
    `;
  }

  function renderGroups(entries, weight, ageMonths) {
    const groups = new Map();
    entries.forEach((entry) => {
      if (!groups.has(entry.category)) groups.set(entry.category, []);
      groups.get(entry.category).push(entry);
    });

    return [...groups.entries()]
      .map(
        ([category, items]) => `
          <section class="dose-calculator-group">
            <h2 class="dose-calculator-category">${category}</h2>
            <div class="dose-calculator-group-cards">
              ${items.map((entry) => renderCard(entry, weight, ageMonths)).join("")}
            </div>
          </section>
        `
      )
      .join("");
  }

  async function initCalculator() {
    const root = document.getElementById("dose-calculator");
    if (!root || root.dataset.initialized === "true") return;
    root.dataset.initialized = "true";

    const weightInput = document.getElementById("dose-weight");
    const yearsInput = document.getElementById("dose-age-years");
    const monthsInput = document.getElementById("dose-age-months");
    const searchInput = document.getElementById("dose-search");
    const status = document.getElementById("dose-calculator-status");
    const results = document.getElementById("dose-calculator-results");

    const saved = readContext();
    if (saved.weight) weightInput.value = saved.weight;
    if (Number.isFinite(saved.years)) yearsInput.value = saved.years;
    if (Number.isFinite(saved.months)) monthsInput.value = saved.months;

    let registry;
    try {
      const registryUrl = new URL(root.dataset.registry, window.location.href);
      const response = await fetch(registryUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      registry = await response.json();
    } catch (error) {
      status.textContent = "No se pudo cargar el registro farmacológico.";
      console.error(error);
      return;
    }

    const render = () => {
      const weight = parseFloat(weightInput.value);
      const years =
        yearsInput.value === "" ? NaN : parseInt(yearsInput.value, 10);
      const months =
        monthsInput.value === "" ? NaN : parseInt(monthsInput.value, 10);
      const ageMonths = ageInMonths(years, months);
      const query = searchInput.value.trim().toLowerCase();

      saveContext(
        Number.isFinite(weight) ? weight : null,
        Number.isFinite(years) ? years : null,
        Number.isFinite(months) ? months : null
      );

      const visible = registry.entries.filter((entry) =>
        [
          entry.category,
          entry.drug,
          entry.indication,
          entry.route,
          entry.reference_text,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query)
      );

      results.innerHTML = renderGroups(visible, weight, ageMonths);
      status.textContent = query
        ? `${visible.length} resultado(s)`
        : `${registry.entries.length} escenarios farmacológicos validados`;
    };

    [weightInput, yearsInput, monthsInput, searchInput].forEach((input) => {
      input.addEventListener("input", render);
    });

    render();
  }

  if (typeof document$ !== "undefined") {
    document$.subscribe(initCalculator);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCalculator);
  } else {
    initCalculator();
  }
})();
