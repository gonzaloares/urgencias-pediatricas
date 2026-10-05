# Calculadora de dosis

<div class="protocol-intro">
  <strong>Calculadora farmacológica integrada.</strong> Realiza aritmética a partir de pautas vinculadas a los protocolos vigentes del proyecto. No selecciona tratamientos ni sustituye la valoración clínica.
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
    <span>Buscar fármaco, indicación o vía</span>
    <input id="dose-search" type="search" placeholder="Adrenalina, asma, estatus, IV…">
  </label>

  <div id="dose-calculator-status" class="dose-calculator-status" aria-live="polite"></div>
  <div id="dose-calculator-results" class="dose-calculator-results"></div>
</div>

## Cómo interpretar los resultados

- La calculadora muestra la **operación completa**, no solo el resultado final.
- Si la pauta admite un **rango**, muestra ambos extremos y aplica el máximo cuando corresponde.
- Si la pauta está expresada en **mg/kg/día**, muestra el total diario y, cuando el protocolo permite varios repartos, las dosis por toma.
- Los límites de **edad o peso** bloquean el cálculo cuando el paciente queda fuera del rango validado.
- Los medicamentos de **alto riesgo** aparecen identificados de forma específica.
- El uso **fuera de ficha técnica** se muestra cuando está documentado en el protocolo.

## Alcance actual

Esta fase incorpora **42 escenarios farmacológicos** procedentes de los protocolos ya revisados del proyecto: fármacos habituales, RCP, anafilaxia, endocrino, toxicología, cardiovascular, convulsiones, respiratorio, analgesia/sedación, HTIC/trauma y digestivo.

Las **perfusiones continuas** ya disponen de su propia calculadora. La **secuencia rápida de intubación** ya tiene registro farmacológico reconciliado y protocolo clínico, pero todavía no se expone como calculadora automática. El **registro de críticos** sigue pendiente. Tampoco se han importado automáticamente fármacos de la aplicación antigua que no tengan aún una pauta vigente y explícita en los protocolos actuales.

<div class="clinical-card clinical-card-warning">
  <strong>Regla de seguridad:</strong> la calculadora no debe ser una segunda fuente de verdad. Cada entrada está vinculada a un protocolo del repositorio y los cambios de dosis deben actualizarse de forma estructurada y pasar los tests automáticos.
</div>
