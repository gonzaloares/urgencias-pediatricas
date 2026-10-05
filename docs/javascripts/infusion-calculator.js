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
      // La herramienta funciona aunque sessionStorage no esté disponible.
    }
  }

  function isWithinRange(value, rate) {
    return Number.isFinite(value) && value >= rate.min && value <= rate.max;
  }

  function pumpCalculation(entry, weight, desired, concentration) {
    const rate = entry.rate;
    if (!isWithinRange(desired, rate)) return null;
    if (!Number.isFinite(concentration) || concentration <= 0) return null;

    let amountPerTime;
    let amountLabel;
    let mlPerHour;

    if (rate.kind === "weight_rate") {
      if (!Number.isFinite(weight) || weight <= 0) return null;
      amountPerTime = desired * weight;

      if (rate.time_base === "min") {
        amountLabel = `${fmt(amountPerTime)} ${rate.amount_unit}/min`;
        mlPerHour = (amountPerTime * 60) / concentration;
      } else {
        amountLabel = `${fmt(amountPerTime)} ${rate.amount_unit}/h`;
        mlPerHour = amountPerTime / concentration;
      }
    } else if (rate.kind === "absolute_rate") {
      amountPerTime = desired;
      if (rate.time_base === "min") {
        amountLabel = `${fmt(amountPerTime)} ${rate.amount_unit}/min`;
        mlPerHour = (amountPerTime * 60) / concentration;
      } else {
        amountLabel = `${fmt(amountPerTime)} ${rate.amount_unit}/h`;
        mlPerHour = amountPerTime / concentration;
      }
    } else {
      throw new Error(`Tipo de perfusión no soportado: ${rate.kind}`);
    }

    return { amountPerTime, amountLabel, mlPerHour };
  }

  function renderCard(entry, weight, index) {
    const fixed = entry.concentration.mode === "fixed";
    const concentrationValue = fixed ? entry.concentration.value : "";
    const concentrationControl = fixed
      ? `
        <div class="infusion-fixed-concentration">
          <span>Concentración</span>
          <strong>${fmt(entry.concentration.value)} ${entry.concentration.unit}</strong>
          <small>${entry.concentration.label || ""}</small>
        </div>
      `
      : `
        <label class="infusion-field">
          <span>Concentración institucional (${entry.concentration.unit})</span>
          <input
            class="infusion-concentration"
            data-index="${index}"
            type="number"
            inputmode="decimal"
            min="0.000001"
            step="any"
            placeholder="Introducir concentración"
          >
        </label>
      `;

    const prep = fixed && entry.concentration.preparation
      ? `<div class="dose-calculator-warning"><strong>Preparación validada:</strong> ${entry.concentration.preparation}</div>`
      : `<div class="dose-calculator-warning"><strong>Concentración local obligatoria:</strong> usa la concentración estandarizada de tu centro; no improvises una dilución.</div>`;

    const notes = (entry.notes || []).map((note) => `<li>${note}</li>`).join("");

    return `
      <article class="dose-calculator-card infusion-card" data-index="${index}">
        <header>
          <div>
            <h3>${entry.drug}</h3>
            <p>${entry.indication}</p>
          </div>
          <div class="dose-calculator-tags">
            <span>${entry.route}</span>
            <span class="high-risk">Alto riesgo</span>
          </div>
        </header>

        <div class="dose-calculator-reference">
          <strong>${entry.reference_text}</strong>
        </div>

        <div class="infusion-controls">
          <label class="infusion-field">
            <span>Dosis objetivo (${entry.rate.unit})</span>
            <input
              class="infusion-dose"
              data-index="${index}"
              type="number"
              inputmode="decimal"
              min="${entry.rate.min}"
              max="${entry.rate.max}"
              step="any"
              value="${entry.rate.default}"
            >
            <small>Rango validado: ${fmt(entry.rate.min)}–${fmt(entry.rate.max)} ${entry.rate.unit}</small>
          </label>
          ${concentrationControl}
        </div>

        ${prep}

        <div class="dose-calculator-output infusion-output" id="infusion-output-${index}">
          <div class="dose-calculator-empty">Introduce el peso y, si procede, la concentración institucional.</div>
        </div>

        <div class="dose-calculator-meta">
          ${notes ? `<ul>${notes}</ul>` : ""}
          <p><strong>Fuente interna:</strong> <a href="../${entry.protocol.replace(".md", "/")}">${entry.source_label}</a></p>
        </div>

        <input type="hidden" class="infusion-fixed-value" value="${concentrationValue}">
      </article>
    `;
  }

  function renderGroups(entries, weight) {
    const groups = new Map();
    entries.forEach((entry) => {
      if (!groups.has(entry.category)) groups.set(entry.category, []);
      groups.get(entry.category).push(entry);
    });

    let index = 0;
    return [...groups.entries()].map(([category, items]) => {
      const cards = items.map((entry) => renderCard(entry, weight, index++)).join("");
      return `
        <section class="dose-calculator-group">
          <h2 class="dose-calculator-category">${category}</h2>
          <div class="dose-calculator-group-cards">${cards}</div>
        </section>
      `;
    }).join("");
  }

  function updateCard(entry, card, weight) {
    const doseInput = card.querySelector(".infusion-dose");
    const desired = parseFloat(doseInput.value);
    const output = card.querySelector(".infusion-output");

    if (!Number.isFinite(desired)) {
      output.innerHTML = '<div class="dose-calculator-empty">Introduce una dosis objetivo.</div>';
      return;
    }

    if (!isWithinRange(desired, entry.rate)) {
      output.innerHTML = `
        <div class="dose-calculator-danger">
          Dosis fuera del rango validado (${fmt(entry.rate.min)}–${fmt(entry.rate.max)} ${entry.rate.unit}). El cálculo se bloquea.
        </div>
      `;
      return;
    }

    if (entry.rate.kind === "weight_rate" && (!Number.isFinite(weight) || weight <= 0)) {
      output.innerHTML = '<div class="dose-calculator-empty">Introduce el peso para calcular la perfusión.</div>';
      return;
    }

    let concentration;
    if (entry.concentration.mode === "fixed") {
      concentration = entry.concentration.value;
    } else {
      const concentrationInput = card.querySelector(".infusion-concentration");
      concentration = parseFloat(concentrationInput.value);
      if (!Number.isFinite(concentration) || concentration <= 0) {
        output.innerHTML = '<div class="dose-calculator-empty">Introduce la concentración institucional para obtener mL/h.</div>';
        return;
      }
    }

    const result = pumpCalculation(entry, weight, desired, concentration);
    if (!result) {
      output.innerHTML = '<div class="dose-calculator-danger">No se puede calcular con los datos introducidos.</div>';
      return;
    }

    const weightFormula = entry.rate.kind === "weight_rate"
      ? `${fmt(desired)} ${entry.rate.unit} × ${fmt(weight, 1)} kg = ${result.amountLabel}`
      : `${fmt(desired)} ${entry.rate.unit}`;

    output.innerHTML = `
      <div class="dose-calculator-formula">${weightFormula}</div>
      <div class="infusion-calculation-line">
        <span>Concentración utilizada</span>
        <strong>${fmt(concentration)} ${entry.concentration.unit}</strong>
      </div>
      <div class="dose-calculator-final">
        <span>Programar bomba</span>
        <strong>${fmt(result.mlPerHour)} mL/h</strong>
      </div>
    `;
  }

  function bindCards(registry, visible, weight) {
    const cards = [...document.querySelectorAll(".infusion-card")];
    cards.forEach((card, index) => {
      const entry = visible[index];
      if (!entry) return;
      const inputs = card.querySelectorAll(".infusion-dose, .infusion-concentration");
      inputs.forEach((input) => {
        input.addEventListener("input", () => {
          const currentWeight = parseFloat(document.getElementById("infusion-weight").value);
          updateCard(entry, card, currentWeight);
        });
      });
      updateCard(entry, card, weight);
    });
  }

  async function initInfusions() {
    const root = document.getElementById("infusion-calculator");
    if (!root || root.dataset.initialized === "true") return;
    root.dataset.initialized = "true";

    const weightInput = document.getElementById("infusion-weight");
    const yearsInput = document.getElementById("infusion-age-years");
    const monthsInput = document.getElementById("infusion-age-months");
    const searchInput = document.getElementById("infusion-search");
    const status = document.getElementById("infusion-status");
    const results = document.getElementById("infusion-results");

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
      status.textContent = "No se pudo cargar el registro de perfusiones.";
      console.error(error);
      return;
    }

    const render = () => {
      const weight = parseFloat(weightInput.value);
      const years = yearsInput.value === "" ? NaN : parseInt(yearsInput.value, 10);
      const months = monthsInput.value === "" ? NaN : parseInt(monthsInput.value, 10);
      const query = searchInput.value.trim().toLowerCase();

      saveContext(
        Number.isFinite(weight) ? weight : null,
        Number.isFinite(years) ? years : null,
        Number.isFinite(months) ? months : null
      );

      const visible = registry.entries.filter((entry) =>
        [entry.category, entry.drug, entry.indication, entry.route, entry.reference_text]
          .join(" ")
          .toLowerCase()
          .includes(query)
      );

      results.innerHTML = renderGroups(visible, weight);
      bindCards(registry, visible, weight);
      status.textContent = query
        ? `${visible.length} resultado(s)`
        : `${registry.entries.length} perfusiones protocolizadas`;
    };

    [weightInput, yearsInput, monthsInput, searchInput].forEach((input) => {
      input.addEventListener("input", render);
    });

    render();
  }

  if (typeof document$ !== "undefined") {
    document$.subscribe(initInfusions);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initInfusions);
  } else {
    initInfusions();
  }
})();
