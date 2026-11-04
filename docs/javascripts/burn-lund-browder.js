/* Calculadora pediátrica Lund-Browder: SCQ de espesor parcial o total.
 * Un porcentaje de cobertura se aplica solo a la superficie del segmento.
 * Tabla de referencia A/B/C: SCCM FCCS Pediatrics, figura Lund-Browder.
 */
(() => {
  "use strict";

  const AGES = [
    ["0", "Menor de 1 año"],
    ["1", "1–4 años"],
    ["5", "5–9 años"],
    ["10", "10–14 años"],
    ["15", "15–17 años"],
    ["adult", "18 años o más"]
  ];
  const AREAS = {
    A: [9.5, 8.5, 6.5, 5.5, 4.5, 3.5],
    B: [2.75, 3.25, 4, 4.25, 4.5, 4.75],
    C: [2.5, 2.5, 2.75, 3, 3.25, 3.5]
  };
  const GROUPS = [
    {
      title: "Cabeza y cuello", zones: [
        ["head-front", "Cabeza anterior", "A"],
        ["head-back", "Cabeza posterior", "A"],
        ["neck-front", "Cuello anterior", 1],
        ["neck-back", "Cuello posterior", 1]
      ]
    },
    {
      title: "Tronco, glúteos y periné", zones: [
        ["trunk-front", "Tronco anterior", 13],
        ["trunk-back", "Tronco posterior", 13],
        ["buttock-right", "Glúteo derecho", 2.5],
        ["buttock-left", "Glúteo izquierdo", 2.5],
        ["perineum", "Genitales/periné", 1]
      ]
    },
    {
      title: "Extremidad superior derecha", zones: [
        ["arm-r-front", "Brazo anterior", 2],
        ["arm-r-back", "Brazo posterior", 2],
        ["forearm-r-front", "Antebrazo anterior", 1.5],
        ["forearm-r-back", "Antebrazo posterior", 1.5],
        ["hand-r-palm", "Mano: palma", 1.25],
        ["hand-r-back", "Mano: dorso", 1.25]
      ]
    },
    {
      title: "Extremidad superior izquierda", zones: [
        ["arm-l-front", "Brazo anterior", 2],
        ["arm-l-back", "Brazo posterior", 2],
        ["forearm-l-front", "Antebrazo anterior", 1.5],
        ["forearm-l-back", "Antebrazo posterior", 1.5],
        ["hand-l-palm", "Mano: palma", 1.25],
        ["hand-l-back", "Mano: dorso", 1.25]
      ]
    },
    {
      title: "Extremidad inferior derecha", zones: [
        ["thigh-r-front", "Muslo anterior", "B"],
        ["thigh-r-back", "Muslo posterior", "B"],
        ["leg-r-front", "Pierna anterior (bajo rodilla)", "C"],
        ["leg-r-back", "Pierna posterior (bajo rodilla)", "C"],
        ["foot-r-top", "Pie: dorso", 1.75],
        ["foot-r-sole", "Pie: planta", 1.75]
      ]
    },
    {
      title: "Extremidad inferior izquierda", zones: [
        ["thigh-l-front", "Muslo anterior", "B"],
        ["thigh-l-back", "Muslo posterior", "B"],
        ["leg-l-front", "Pierna anterior (bajo rodilla)", "C"],
        ["leg-l-back", "Pierna posterior (bajo rodilla)", "C"],
        ["foot-l-top", "Pie: dorso", 1.75],
        ["foot-l-sole", "Pie: planta", 1.75]
      ]
    }
  ];
  const format = (value) => new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);

  function weight(spec, ageIndex) {
    return typeof spec === "number" ? spec : AREAS[spec][ageIndex];
  }

  // Control de integridad: la selección íntegra debe sumar exactamente 100 % a cualquier edad.
  const validChart = AGES.every((_, index) => Math.abs(
    GROUPS.reduce((total, group) =>
      total + group.zones.reduce((subtotal, zone) =>
        subtotal + weight(zone[2], index), 0), 0) - 100
  ) < 0.00001);

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function initialize() {
    const root = document.getElementById("burn-lund-browder");
    if (!root || root.dataset.initialized === "true") return;
    root.dataset.initialized = "true";
    root.replaceChildren();

    if (!validChart) {
      root.append(element("p", "burn-error", "Error de integridad: los porcentajes Lund-Browder no suman 100 %. No utilizar el cálculo."));
      return;
    }

    const top = element("div", "burn-controls");
    const ageLabel = element("label", "", "Tramo de edad");
    ageLabel.htmlFor = "burn-lb-age";
    const ageSelect = element("select", "burn-age");
    ageSelect.id = "burn-lb-age";
    ageSelect.append(new Option("Selecciona la edad…", ""));
    AGES.forEach(([value, name]) => ageSelect.append(new Option(name, value)));
    const clearButton = element("button", "burn-clear", "Limpiar selección");
    clearButton.type = "button";
    top.append(ageLabel, ageSelect, clearButton);

    const result = element("div", "burn-result");
    result.setAttribute("role", "status");
    result.setAttribute("aria-live", "polite");
    const heading = element("div", "burn-result-heading", "Superficie corporal quemada");
    const totalDisplay = element("strong", "burn-result-value", "Selecciona la edad");
    const detailText = element("p", "burn-result-note",
      "Marcar solo quemaduras de espesor parcial o total. No incluir eritema aislado (grado I).");
    const breakdown = element("div", "burn-result-breakdown");
    result.append(heading, totalDisplay, detailText, breakdown);

    const help = element("p", "burn-help",
      "Marca los segmentos afectados. Por defecto se considera quemado todo el segmento; para lesiones parciales, cambia «Extensión del segmento» entre 0 y 100 %. Cada cara anterior/posterior se selecciona por separado.");
    const areaGrid = element("div", "burn-area-grid");
    const records = [];

    GROUPS.forEach((group, groupIndex) => {
      const section = element("fieldset", "burn-group");
      section.append(element("legend", "", group.title));
      const items = element("div", "burn-zones");
      group.zones.forEach(([zoneId, zoneTitle, spec]) => {
        const row = element("div", "burn-zone");
        const choice = element("label", "burn-zone-choice");
        const check = document.createElement("input");
        check.type = "checkbox";
        check.id = "burn-lb-" + zoneId;
        const description = element("span", "burn-zone-name", zoneTitle);
        const baseline = element("span", "burn-zone-weight", "—");
        choice.append(check, description, baseline);

        const details = element("div", "burn-zone-details");
        details.hidden = true;
        const coveredLabel = element("label", "", "Extensión del segmento (%)");
        const input = document.createElement("input");
        input.type = "number";
        input.inputMode = "decimal";
        input.min = "0";
        input.max = "100";
        input.step = "1";
        input.value = "100";
        input.id = "burn-lb-percent-" + zoneId;
        input.setAttribute("aria-label", "Porcentaje de " + zoneTitle + " afectado");
        coveredLabel.htmlFor = input.id;
        details.append(coveredLabel, input, element("span", "burn-zone-part", "de este segmento"));
        row.append(choice, details);
        items.append(row);
        records.push({ groupIndex, spec, check, input, details, row, baseline });
        check.addEventListener("change", () => {
          details.hidden = !check.checked;
          row.classList.toggle("burn-zone-selected", check.checked);
          recalculate();
        });
        input.addEventListener("input", recalculate);
        input.addEventListener("change", () => {
          const value = Number(input.value);
          if (input.value.trim() !== "" && Number.isFinite(value)) {
            input.value = String(Math.max(0, Math.min(100, value)));
          }
          recalculate();
        });
      });
      section.append(items);
      areaGrid.append(section);
    });

    const note = element("p", "burn-caution",
      "Cálculo orientativo de SCQ. Una quemadura profunda o en zona crítica puede requerir derivación incluso con SCQ baja. La selección NO determina por sí sola la gravedad ni prescribe fluidos.");
    root.append(top, result, help, areaGrid, note);

    function recalculate() {
      const selectedAge = AGES.findIndex(([value]) => value === ageSelect.value);
      if (selectedAge < 0) {
        totalDisplay.textContent = "Selecciona la edad";
        detailText.textContent = "Después marca los segmentos quemados.";
        breakdown.replaceChildren();
        records.forEach((item) => { item.baseline.textContent = "—"; });
        return;
      }

      const groupTotals = GROUPS.map(() => 0);
      let selectedCount = 0;
      let invalid = false;
      records.forEach((item) => {
        const full = weight(item.spec, selectedAge);
        item.baseline.textContent = format(full) + " % SCT";
        if (!item.check.checked) return;
        selectedCount += 1;
        const percentageText = item.input.value.trim().replace(",", ".");
        const percentage = Number(percentageText);
        const isInvalid = percentageText === "" || !Number.isFinite(percentage) ||
          percentage < 0 || percentage > 100;
        item.input.setAttribute("aria-invalid", isInvalid ? "true" : "false");
        item.row.classList.toggle("burn-zone-invalid", isInvalid);
        if (isInvalid) { invalid = true; return; }
        groupTotals[item.groupIndex] += full * (percentage / 100);
      });

      if (invalid) {
        totalDisplay.textContent = "Revisar porcentaje";
        detailText.textContent = "Cada extensión de segmento debe tener un valor entre 0 y 100.";
        breakdown.replaceChildren();
        return;
      }

      const sum = groupTotals.reduce((a, b) => a + b, 0);
      if (sum > 100.00001) {
        totalDisplay.textContent = "Error de suma";
        detailText.textContent = "La selección supera el 100 % de superficie corporal. Revisa las áreas.";
        breakdown.replaceChildren();
        return;
      }
      totalDisplay.textContent = format(sum) + " % SCQ";
      detailText.textContent = selectedCount
        ? selectedCount + " segmentos seleccionados. Se contabilizan solo los grados II–IV."
        : "Sin áreas seleccionadas; marca las zonas afectadas.";
      breakdown.replaceChildren();
      groupTotals.forEach((value, index) => {
        if (value <= 0) return;
        const line = element("div", "burn-result-line");
        line.append(element("span", "", GROUPS[index].title),
          element("strong", "", format(value) + " %"));
        breakdown.append(line);
      });
      if (sum >= 10) {
        breakdown.append(element("p", "burn-result-alert",
          "≥10 % SCQ: revisar indicación de consulta inmediata ABA si es espesor parcial y valorar reanimación IV pediátrica y equipo de quemados."));
      }
    }

    ageSelect.addEventListener("change", recalculate);
    clearButton.addEventListener("click", () => {
      records.forEach((item) => {
        item.check.checked = false;
        item.input.value = "100";
        item.input.setAttribute("aria-invalid", "false");
        item.row.classList.remove("burn-zone-selected", "burn-zone-invalid");
        item.details.hidden = true;
      });
      recalculate();
    });
    recalculate();
  }

  if (typeof document$ !== "undefined") {
    document$.subscribe(initialize);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
