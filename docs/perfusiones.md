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

## Qué se ha recuperado de PedCalc

Ahora se incluyen **15 escenarios de perfusión**, con los ocho principios activos del módulo antiguo: adrenalina, noradrenalina, dopamina, dobutamina, prostaglandina E1 (alprostadil), midazolam, fentanilo y dexmedetomidina; y, además, glucagón, insulina, propofol, tiopental y valproato en sus indicaciones protocolizadas.

Se ha recuperado el flujo práctico del PedCalc original: **peso → dosis deseada → equivalencia con 1 mL/h → programación de bomba**. En las tarjetas con concentración institucional aparece también «**Preparar jeringa de 50 mL**», un cálculo opcional que muestra el volumen de ampolla a extraer después de introducir dos datos de la preparación real:

1. **Concentración final aprobada** de la perfusión (en la tarjeta).
2. **Concentración de la ampolla** que se tiene físicamente disponible (dentro del desplegable).

Ambas se expresan en **la misma unidad por mL**. El resultado indica la cantidad de medicamento y el volumen de ampolla; debe completarse con un diluyente compatible **hasta 50 mL de volumen final**, nunca añadir 50 mL más.

Se bloquea la preparación si el volumen extraído es **inferior a 0,1 mL** o **superior a 50 mL**; el sistema no redondea arbitrariamente una extracción pequeña como podía ocurrir en la aplicación antigua. No se arrastran las antiguas diluciones ponderales como concentraciones por defecto: han de validarse conforme a las normas actuales del hospital.

Los cinco fármacos que faltaban se han incorporado con las pautas y advertencias revisadas en [Perfusiones continuas · referencia clínica](procedimientos/perfusiones-continuas.md), incluidas la **restricción neonatal** de alprostadil y la **indicación pediátrica fuera de ficha técnica** de dexmedetomidina. Las preparaciones existentes fijadas por protocolo (insulina en CAD y adrenalina en anafilaxia refractaria) no se sustituyen por mezclas alternativas.

## Lectura del resultado

La tarjeta muestra siempre:

- dosis objetivo introducida;
- cantidad de fármaco que el paciente recibe por minuto u hora;
- concentración utilizada;
- velocidad final de bomba en mL/h;
- rango validado por el protocolo;
- preparación exacta cuando existe una dilución protocolizada.

Si la dosis se sale del rango registrado, **el cálculo queda bloqueado**.
