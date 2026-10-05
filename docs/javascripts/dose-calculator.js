(() => {
  const STORAGE_KEY = "urgencias-pediatricas-patient-context-v1";

  const fmt = (value, digits = 2) => {
    const rounded = Number(value.toFixed(digits));
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

  function calculate(entry, weight) {
    if (!Number.isFinite(weight) || weight <= 0) return null;

    const dose = entry.dose;
    let raw;
    let finalValue;
    let capped = false;
    let formula = "";
    let finalLabel = "";
    let volume = null;

    if (dose.kind === "weight") {
      raw = weight * dose.value;
      finalValue = raw;
      if (entry.max_dose && finalValue > entry.max_dose.value) {
        finalValue = entry.max_dose.value;
        capped = true;
      }
      formula = `${fmt(dose.value)} ${dose.unit} × ${fmt(weight, 1)} kg = ${fmt(raw)} ${dose.output_unit}`;
      finalLabel = `${fmt(finalValue)} ${dose.output_unit}`;

      if (
        entry.concentration &&
        entry.concentration.unit.startsWith(dose.output_unit + "/")
      ) {
        volume = finalValue / entry.concentration.value;
      }
    } else if (dose.kind === "volume_per_kg") {
      raw = weight * dose.value;
      finalValue = raw;
      if (entry.max_dose && finalValue > entry.max_dose.value) {
        finalValue = entry.max_dose.value;
        capped = true;
      }
      formula = `${fmt(dose.value)} mL/kg × ${fmt(weight, 1)} kg = ${fmt(raw)} mL`;
      finalLabel = `${fmt(finalValue)} mL`;
    } else {
      throw new Error(`Tipo de cálculo no soportado: ${dose.kind}`);
    }

    return { raw, finalValue, capped, formula, finalLabel, volume };
  }

  function renderCard(entry, weight, patientAgeMonths) {
    const result = calculate(entry, weight);
    const ageRequired = entry.age && entry.age.min_months > 0;
    const ageUnknown = ageRequired && patientAgeMonths === null;
    const ageTooYoung =
      ageRequired &&
      patientAgeMonths !== null &&
      patientAgeMonths < entry.age.min_months;

    let resultHtml = '<div class="dose-calculator-empty">Introduce el peso para calcular.</div>';
    if (result) {
      const capText = result.capped
        ? `<div class="dose-calculator-cap">Se aplica máximo: ${fmt(entry.max_dose.value)} ${entry.max_dose.unit}</div>`
        : "";
      const volumeText = result.volume !== null
        ? `<div class="dose-calculator-volume"><span>Volumen</span><strong>${fmt(result.volume)} mL</strong><small>${entry.concentration.label}</small></div>`
        : "";

      resultHtml = `
        <div class="dose-calculator-formula">${result.formula}</div>
        <div class="dose-calculator-final"><span>Dosis final</span><strong>${result.finalLabel}</strong></div>
        ${volumeText}
        ${capText}
      `;
    }

    let ageHtml = "";
    if (ageUnknown) {
      ageHtml = '<div class="dose-calculator-warning">Introduce la edad para validar el límite etario.</div>';
    } else if (ageTooYoung) {
      ageHtml = `<div class="dose-calculator-danger">Fuera del rango validado en esta calculadora: ${entry.age.text}.</div>`;
    }

    const notes = (entry.notes || [])
      .map((note) => `<li>${note}</li>`)
      .join("");

    return `
      <article class="dose-calculator-card" data-search="${[
        entry.drug,
        entry.indication,
        entry.route
      ].join(" ").toLowerCase()}">
        <header>
          <div>
            <h3>${entry.drug}</h3>
            <p>${entry.indication}</p>
          </div>
          <div class="dose-calculator-tags">
            <span>${entry.route}</span>
            ${entry.off_label ? '<span class="off-label">Off-label</span>' : ""}
          </div>
        </header>
        <div class="dose-calculator-reference">
          <strong>${entry.dose.value} ${entry.dose.unit}</strong>
          ${entry.max_dose ? ` · máximo ${entry.max_dose.value} ${entry.max_dose.unit}` : ""}
          ${entry.age ? ` · ${entry.age.text}` : ""}
        </div>
        ${ageHtml}
        <div class="dose-calculator-output">${resultHtml}</div>
        <div class="dose-calculator-meta">
          <p><strong>Administración:</strong> ${entry.interval}</p>
          ${notes ? `<ul>${notes}</ul>` : ""}
          <p><strong>Fuente interna:</strong> <a href="../${entry.protocol.replace(".md", "/")}">${entry.source_label}</a></p>
        </div>
      </article>
    `;
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
      const years = yearsInput.value === "" ? NaN : parseInt(yearsInput.value, 10);
      const months = monthsInput.value === "" ? NaN : parseInt(monthsInput.value, 10);
      const ageMonths = ageInMonths(years, months);
      const query = searchInput.value.trim().toLowerCase();

      saveContext(
        Number.isFinite(weight) ? weight : null,
        Number.isFinite(years) ? years : null,
        Number.isFinite(months) ? months : null
      );

      const visible = registry.entries.filter((entry) =>
        [entry.drug, entry.indication, entry.route]
          .join(" ")
          .toLowerCase()
          .includes(query)
      );

      results.innerHTML = visible
        .map((entry) => renderCard(entry, weight, ageMonths))
        .join("");

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
