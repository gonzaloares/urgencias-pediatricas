# Calculadora de perfusiones

<div class="protocol-intro">
  <strong>Perfusiones de alto riesgo.</strong> La herramienta calcula la velocidad de bomba a partir de la dosis objetivo, el peso y una concentración explícita. No selecciona el fármaco ni sustituye los protocolos, la doble comprobación o las bombas inteligentes.
</div>

<div class="clinical-card clinical-card-danger">
  <strong>Seguridad farmacológica:</strong> salvo las preparaciones fijadas por un protocolo concreto, las concentraciones se <strong>precargan como referencias bibliográficas orientativas</strong>, adaptadas al peso cuando existe una pauta publicada. <strong>No han sido aprobadas por Farmacia hospitalaria.</strong> La velocidad de bomba permanece bloqueada hasta confirmar que la concentración introducida coincide con la <strong>preparación real y la prescripción</strong>. Una confirmación en la web no sustituye la doble comprobación independiente ni la validación local.
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

Se ha recuperado el flujo práctico del PedCalc original: **peso → dosis deseada → concentración propuesta → verificación de la preparación real → mL/h**. En 13 escenarios se muestra una **concentración bibliográfica editable precargada** y en los dos escenarios con preparación especificada por el protocolo (adrenalina en anafilaxia e insulina en CAD) se conserva esa concentración fija.

### Concentraciones bibliográficas de referencia (no institucionales)

| Perfusión | Concentración precargada |
|---|---|
| Adrenalina en shock o bradicardia con pulso | Menos de 2 kg: 10 µg/mL; 2 a <5 kg: 20 µg/mL; 5 a <20 kg: 40 µg/mL; desde 20 kg: 80 µg/mL |
| Noradrenalina | Menos de 2 kg: 10 µg/mL (revisión neonatal); desde 2 kg: 20 µg/mL (guía periférica NPPG) |
| Dopamina | Menos de 2 kg: 1.000 µg/mL; 2 a <5 kg: 2.000 µg/mL; 5 a <20 kg: 5.000 µg/mL; desde 20 kg: 12.000 µg/mL |
| Dobutamina | Menos de 2 kg: 1.000 µg/mL; 2 a <5 kg: 2.000 µg/mL; desde 5 kg: 5.000 µg/mL |
| Alprostadil (solo neonatal) | 5 µg/mL |
| Midazolam | Menos de 2 kg: 0,25 mg/mL; 2 a <5 kg: 0,5 mg/mL; 5 a <20 kg: 1 mg/mL; desde 20 kg: 2 mg/mL |
| Fentanilo | Menos de 2 kg: 5 µg/mL (revisión neonatal); 2 a <5 kg: 10 µg/mL; 5 a <20 kg: 20 µg/mL; desde 20 kg: 50 µg/mL |
| Dexmedetomidina | 4 µg/mL (uso pediátrico fuera de ficha técnica) |
| Propofol | 10 mg/mL (emulsión comercial al 1 %; precaución de uso y contraindicaciones pediátricas de ficha técnica) |
| Tiopental | 4 mg/mL (0,4 % para perfusión continua, distinta de la concentración para bolo) |
| Valproato | 3,2 mg/mL (propuesta basada en guía farmacológica de perfusión continua) |
| Glucagón | 100 µg/mL (solo **dilución matemática propuesta**, sin estándar publicado específico para anafilaxia refractaria; requiere validación por Farmacia) |
| Adrenalina en anafilaxia refractaria | 10 µg/mL, concentración **fijada por protocolo** |
| Insulina regular en cetoacidosis | 1 UI/mL, concentración **fijada por protocolo** |

Las bandas representan alternativas de fuentes externas: no deben convertirse en prescripciones ni preparaciones obligatorias. Cada tarjeta enlaza al documento del que procede la recomendación; las preparaciones con peor respaldo se identifican explícitamente. Especialmente en neonatos, los caudales inferiores a **0,5 mL/h** requieren revisión por riesgo de entrega inconsistente.

El desplegable **«Calcular preparación de jeringa»** es una ayuda matemática opcional: muestra la cantidad de fármaco y el volumen a extraer cuando se introduce la **concentración real de la ampolla**, en la misma unidad/mL. Propone 20 mL finales por debajo de 5 kg y 50 mL en los demás pacientes; el volumen definitivo, diluyente, conservación, reconstitución y uso periférico/central deben ser aprobados por el equipo clínico y Farmacia. No añadir 20 o 50 mL *extra* de diluyente. Se bloquean extracciones menores de 0,1 mL o mayores que el volumen final.

Fuentes de referencia: [consenso español de concentraciones pediátricas, EJHP 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11042264/), [estándares NPPG/RCPCH revisados en 2024](https://nppg.org.uk/standardised-infusions/), [NPPG: vasoactivos periféricos pediátricos](https://nppg.org.uk/wp-content/uploads/2023/12/Peripheral-Inotropes-V1.pdf), [AEMPS/CIMA](https://cima.aemps.es/) y [guía INGESA](https://ingesa.sanidad.gob.es/dam/jcr%3A3ac252f9-b538-40b5-a832-f7fdc0f96abc/GuiaFarmacologica_4Edicion.pdf).

Los cinco fármacos que faltaban se han incorporado con las pautas y advertencias revisadas en [Perfusiones continuas · referencia clínica](procedimientos/perfusiones-continuas.md), incluidas la **restricción neonatal** de alprostadil y la **indicación pediátrica fuera de ficha técnica** de dexmedetomidina. Las preparaciones existentes fijadas por protocolo (insulina en CAD y adrenalina en anafilaxia refractaria) no se sustituyen por mezclas alternativas.

## Accesos desde los protocolos

Los medicamentos con una pauta de perfusión registrada disponen de un enlace **↗** desde sus menciones en los protocolos. Si una perfusión está respaldada por el protocolo de origen, se abre directamente en esta calculadora. Si solo hay pautas para otros contextos, se bloquea la visualización automática y se solicita comprobar la indicación antes de consultar otras pautas.

## Lectura del resultado

La tarjeta muestra siempre:

- dosis objetivo introducida;
- cantidad de fármaco que el paciente recibe por minuto u hora;
- concentración utilizada;
- velocidad final de bomba en mL/h;
- rango validado por el protocolo;
- preparación exacta cuando existe una dilución protocolizada;
- verificación explícita de las concentraciones bibliográficas antes de mostrar los mL/h.

Si la dosis se sale del rango registrado, **el cálculo queda bloqueado**.
