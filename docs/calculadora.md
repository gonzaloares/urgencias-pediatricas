# Calculadora de dosis

<div class="protocol-intro">
  <strong>Calculadora en fase inicial.</strong> Realiza aritmética farmacológica a partir de dosis ya validadas en los protocolos del proyecto. No selecciona tratamientos ni sustituye la valoración clínica.
</div>

<div id="dose-calculator" class="dose-calculator" data-registry="../data/drugs.json">
  <div class="dose-calculator-patient">
    <label>
      <span>Peso (kg)</span>
      <input id="dose-weight" type="number" inputmode="decimal" min="0.1" step="0.1" placeholder="Ej. 18">
    </label>
    <label>
      <span>Edad (años)</span>
      <input id="dose-age-years" type="number" inputmode="numeric" min="0" step="1" placeholder="0">
    </label>
    <label>
      <span>Meses</span>
      <input id="dose-age-months" type="number" inputmode="numeric" min="0" max="11" step="1" placeholder="0">
    </label>
  </div>

  <label class="dose-calculator-search">
    <span>Buscar fármaco o indicación</span>
    <input id="dose-search" type="search" placeholder="Adrenalina, hipoglucemia, estatus…">
  </label>

  <div id="dose-calculator-status" class="dose-calculator-status" aria-live="polite"></div>
  <div id="dose-calculator-results" class="dose-calculator-results"></div>
</div>

## Qué incluye esta primera versión

Este primer bloque utiliza un **registro estructurado único** y contiene solo cuatro escenarios ya revisados recientemente: adrenalina en RCP, ondansetrón en GEA, glucosa al 10% en hipoglucemia grave y levetiracetam en estatus epiléptico.

La siguiente fase será ampliar progresivamente el registro y reutilizar el mismo motor dentro de los protocolos, perfusiones y SRI.
