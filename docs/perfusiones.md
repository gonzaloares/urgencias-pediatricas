# Calculadora de perfusiones

<div class="protocol-intro">
  <strong>Perfusiones de alto riesgo.</strong> La herramienta calcula la velocidad de bomba a partir de la dosis objetivo, el peso y una concentración explícita. No selecciona el fármaco ni sustituye los protocolos, la doble comprobación o las bombas inteligentes.
</div>

<div class="clinical-card clinical-card-danger">
  <strong>Regla de seguridad:</strong> si el protocolo no define una dilución única, la calculadora <strong>no la inventa</strong>. Debes introducir la concentración estandarizada de tu centro antes de obtener los mL/h.
</div>

<div id="infusion-calculator" class="infusion-calculator" data-registry="../data/infusions.json">
  <div class="dose-calculator-patient">
    <label>
      <span>Peso (kg)</span>
      <input id="infusion-weight" type="number" inputmode="decimal" min="0.1" step="0.1" placeholder="Ej. 18">
    </label>
    <label>
      <span>Edad (años)</span>
      <input id="infusion-age-years" type="number" inputmode="numeric" min="0" step="1" placeholder="0">
    </label>
    <label>
      <span>Meses</span>
      <input id="infusion-age-months" type="number" inputmode="numeric" min="0" max="11" step="1" placeholder="0">
    </label>
  </div>

  <label class="dose-calculator-search">
    <span>Buscar perfusión o indicación</span>
    <input id="infusion-search" type="search" placeholder="Adrenalina, CAD, estatus…">
  </label>

  <div id="infusion-status" class="dose-calculator-status" aria-live="polite"></div>
  <div id="infusion-results" class="infusion-results"></div>
</div>

## Qué se ha migrado de PedCalc

La aplicación antigua ya disponía de un módulo de perfusiones con vasoactivos y sedantes, pero utilizaba diluciones ponderales propias para jeringas de 50 mL. En esta integración se conserva la **interacción dosis → bomba**, pero las concentraciones solo se ofrecen cuando están expresamente fijadas en los protocolos actuales.

Se incluyen por ahora: adrenalina y noradrenalina en shock, adrenalina para bradicardia persistente, adrenalina y glucagón en anafilaxia refractaria, insulina en CAD, y las perfusiones de midazolam, propofol, tiopental y valproato del protocolo de estatus epiléptico.

No se migran todavía dopamina, dobutamina, prostaglandina E1, fentanilo continuo ni dexmedetomidina del PedCalc antiguo, porque el repositorio actual no contiene una pauta de perfusión suficientemente explícita para utilizarlas como fuente clínica.

## Lectura del resultado

La tarjeta muestra siempre:

- dosis objetivo introducida;
- cantidad de fármaco que el paciente recibe por minuto u hora;
- concentración utilizada;
- velocidad final de bomba en mL/h;
- rango validado por el protocolo;
- preparación exacta cuando existe una dilución protocolizada.

Si la dosis se sale del rango registrado, **el cálculo queda bloqueado**.
