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
    const regulatoryBanner = entry.regulatory_note
      ? `<div class="dose-calculator-warning"><strong>Situación regulatoria:</strong> ${entry.regulatory_note}</div>`
      : "";
    const sourceLink = entry.source_url
      ? `<p><strong>Fuente farmacológica:</strong> <a href="${entry.source_url}" target="_blank" rel="noopener noreferrer">Consultar ficha original</a></p>`
      : "";
    const syringeTool = !fixed ? `
      <details class="infusion-syringe">
        <summary>Preparar jeringa de 50 mL · cálculo opcional</summary>
        <p>Solo con una concentración aprobada por tu centro. Comprueba en la ampolla el contenido exacto y el diluyente compatible; el cálculo no valida la mezcla.</p>
        <label class="infusion-field">
          <span>Concentración real de la ampolla (${entry.concentration.unit})</span>
          <input class="infusion-vial-concentration" type="number" inputmode="decimal"
                 min="0.000001" step="any" placeholder="Según etiqueta real">
        </label>
        <div class="infusion-syringe-result" aria-live="polite">Introduce las dos concentraciones para obtener la preparación.</div>
      </details>` : "";

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

        ${regulatoryBanner}
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
        ${syringeTool}

        <div class="dose-calculator-output infusion-output" id="infusion-output-${index}">
          <div class="dose-calculator-empty">Introduce el peso y, si procede, la concentración institucional.</div>
        </div>

        <div class="dose-calculator-meta">
          ${notes ? `<ul>${notes}</ul>` : ""}
          <p><strong>Fuente interna:</strong> <a href="../${entry.protocol.replace(".md", "/")}">${entry.source_label}</a></p>
          ${sourceLink}
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
    const syringeResult = card.querySelector(".infusion-syringe-result");
    if (syringeResult) {
      syringeResult.textContent = "Introduce las dos concentraciones para obtener la preparación.";
    }

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

    if (entry.neonatal_only) {
      const years = document.getElementById("infusion-age-years").value;
      const months = document.getElementById("infusion-age-months").value;
      if (years !== "0" || months !== "0") {
        output.innerHTML = '<div class="dose-calculator-danger">Uso neonatal: indica edad de 0 años y 0 meses (recién nacido). Para otras edades, consultar con el especialista; cálculo bloqueado.</div>';
        return;
      }
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

    if (syringeResult) {
      const ampoule = parseFloat(card.querySelector(".infusion-vial-concentration").value);
      if (Number.isFinite(ampoule) && ampoule > 0) {
        const totalAmount = concentration * 50;
        const ampouleVolume = totalAmount / ampoule;
        if (!Number.isFinite(ampouleVolume) || ampouleVolume > 50) {
          syringeResult.innerHTML = '<strong>Preparación no viable:</strong> el volumen de ampolla supera los 50 mL finales. No preparar así.';
        } else if (ampouleVolume < 0.1) {
          syringeResult.innerHTML = '<strong>Extracción inferior a 0,1 mL:</strong> no mostrar redondeo ni recomendar esta preparación. Consultar dilución intermedia autorizada por Farmacia.';
        } else {
          syringeResult.innerHTML = `
            <strong>Para 50 mL finales:</strong> ${fmt(totalAmount, 3)} ${entry.rate.amount_unit} de fármaco.
            Extraer <strong>${fmt(ampouleVolume, ampouleVolume < 1 ? 3 : 2)} mL</strong> de la ampolla
            y completar con diluyente compatible hasta 50 mL de volumen final.
            <small>Verificar que la concentración y el diluyente están autorizados en tu centro. No añadir 50 mL extra de diluyente.</small>`;
        }
      }
    }

    const equivalence = entry.rate.kind === "weight_rate"
      ? (entry.rate.time_base === "min" ? concentration / (weight * 60) : concentration / weight)
      : (entry.rate.time_base === "min" ? concentration / 60 : concentration);
    const weightFormula = entry.rate.kind === "weight_rate"
      ? `${fmt(desired)} ${entry.rate.unit} × ${fmt(weight, 1)} kg = ${result.amountLabel}`
      : `${fmt(desired)} ${entry.rate.unit}`;

    output.innerHTML = `
      <div class="dose-calculator-formula">${weightFormula}</div>
      <div class="infusion-calculation-line">
        <span>Concentración utilizada</span>
        <strong>${fmt(concentration)} ${entry.concentration.unit}</strong>
      </div>
      <div class="infusion-calculation-line">
        <span>Equivalencia según concentración introducida</span>
        <strong>1 mL/h = ${fmt(equivalence, 4)} ${entry.rate.unit}</strong>
      </div>
      <div class="dose-calculator-final">
        <span>Programar bomba</span>
        <strong>${fmt(result.mlPerHour, result.mlPerHour < 1 ? 3 : 2)} mL/h</strong>
      </div>
    `;
  }

  function bindCards(registry, visible, weight) {
    const cards = [...document.querySelectorAll(".infusion-card")];
    cards.forEach((card, index) => {
      const entry = visible[index];
      if (!entry) return;
      const inputs = card.querySelectorAll(".infusion-dose, .infusion-concentration, .infusion-vial-concentration");
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
    const params = new URLSearchParams(window.location.search);
    const linkedDrug = (params.get("farmaco") || "").trim();
    const linkedSource = (params.get("origen") || "").trim();
    const normalizedDrug = (value) => String(value || "").normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim();
    let contextualMode = Boolean(linkedDrug);
    let allowOtherIndications = false;
    const notice = document.createElement("div");
    notice.className = "dose-calculator-link-notice";
    status.before(notice);

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

    let visible = [];
    if (linkedDrug) searchInput.value = linkedDrug;

    const currentPatient = () => {
      const weight = parseFloat(weightInput.value);
      const years = yearsInput.value === "" ? NaN : parseInt(yearsInput.value, 10);
      const months = monthsInput.value === "" ? NaN : parseInt(monthsInput.value, 10);
      return { weight, years, months };
    };

    const persistPatient = () => {
      const { weight, years, months } = currentPatient();
      saveContext(
        Number.isFinite(weight) ? weight : null,
        Number.isFinite(years) ? years : null,
        Number.isFinite(months) ? months : null
      );
    };

    const refreshCalculations = () => {
      const { weight } = currentPatient();
      const cards = [...document.querySelectorAll(".infusion-card")];
      cards.forEach((card, index) => {
        const entry = visible[index];
        if (entry) updateCard(entry, card, weight);
      });
    };

    const render = () => {
      const { weight } = currentPatient();
      const query = searchInput.value.trim().toLowerCase();
      persistPatient();

      notice.replaceChildren();
      if (contextualMode) {
        const matches = registry.entries.filter((item) =>
          normalizedDrug(item.drug) === normalizedDrug(linkedDrug));
        const sourceMatches = linkedSource
          ? matches.filter((item) => item.protocol === linkedSource)
          : matches;
        if (!matches.length) {
          notice.textContent = "No existe pauta de perfusión registrada para este medicamento.";
          visible = [];
        } else if (linkedSource && !sourceMatches.length && !allowOtherIndications) {
          const message = document.createElement("p");
          message.textContent =
            `No existe pauta de perfusión de ${linkedDrug} validada para este protocolo. ` +
            "No extrapolar las dosis de otras indicaciones.";
          notice.append(message);
          const button = document.createElement("button");
          button.type = "button";
          button.className = "dose-calculator-other-indications";
          button.textContent = "Consultar otras indicaciones (no equivalentes)";
          button.addEventListener("click", () => {
            allowOtherIndications = true;
            render();
          });
          notice.append(button);
          visible = [];
        } else {
          visible = sourceMatches.length ? sourceMatches : matches;
          notice.textContent = sourceMatches.length && linkedSource
            ? `Perfusión vinculada al protocolo: ${linkedDrug}. Confirmar concentración y vía.`
            : `Otras indicaciones de ${linkedDrug}. No extrapolar sin una pauta específica validada.`;
        }
      } else {
        visible = registry.entries.filter((entry) =>
          [entry.category, entry.drug, entry.indication, entry.route, entry.reference_text]
            .join(" ")
            .toLowerCase()
            .includes(query)
        );
      }

      results.innerHTML = renderGroups(visible, weight);
      bindCards(registry, visible, weight);
      status.textContent = contextualMode
        ? `${visible.length} pauta(s) de perfusión para ${linkedDrug}`
        : query
          ? `${visible.length} resultado(s)`
          : `${registry.entries.length} perfusiones protocolizadas`;
    };

    searchInput.addEventListener("input", () => {
      contextualMode = false;
      allowOtherIndications = false;
      render();
    });
    weightInput.addEventListener("input", () => {
      persistPatient();
      refreshCalculations();
    });
    yearsInput.addEventListener("input", () => {
      persistPatient();
      refreshCalculations();
    });
    monthsInput.addEventListener("input", () => {
      persistPatient();
      refreshCalculations();
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
