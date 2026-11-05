# Sepsis

<nav class="protocol-shortcuts" aria-label="Accesos rápidos del protocolo">
  <a href="#algoritmo">Algoritmo</a>
  <a href="#reconocimiento">Reconocimiento</a>
  <a href="#primera-hora">Primera hora</a>
  <a href="#pruebas">Pruebas</a>
  <a href="#antibiotico">Antibiótico</a>
  <a href="#fluidos">Fluidos</a>
  <a href="#vasoactivos">Vasoactivos</a>
  <a href="#reevaluacion">Reevaluación</a>
  <a href="#destino">Destino</a>
  <a href="#no-hacer">No hacer</a>
  <a href="#bibliografia">Bibliografía</a>
</nav>

<div class="protocol-intro">
  <strong>Sepsis:</strong> disfunción orgánica potencialmente mortal causada por una respuesta desregulada a una infección. <strong>No esperar a que exista hipotensión</strong> para reconocer un shock séptico.
</div>

<a id="algoritmo"></a>
## 1. Algoritmo de actuación en Urgencias (primera hora)

<div class="sepsis-flow" role="group" aria-label="Algoritmo de atención inicial de sepsis pediátrica">
  <div class="sepsis-flow-node sepsis-flow-start">
    <strong class="sepsis-flow-title">SOSPECHA DE SEPSIS</strong>
    <p>Infección posible + alteración de perfusión o disfunción orgánica.</p>
    <p class="sepsis-flow-priority"><strong>Activar código sepsis y pedir ayuda.</strong> No esperar a la hipotensión.</p>
  </div>

  <div class="sepsis-flow-arrow" aria-hidden="true">↓</div>

  <div class="sepsis-flow-node">
    <strong class="sepsis-flow-title">PRIMEROS 5 MIN · Actuar en paralelo</strong>
    <ul>
      <li><strong>ABCDE</strong>, oxígeno según necesidad y monitorización.</li>
      <li><strong>Acceso IV</strong>; si shock y acceso difícil, <strong>IO precoz</strong>.</li>
      <li><strong>Glucemia, gasometría y lactato</strong>; hemocultivo si no retrasa antibiótico.</li>
      <li><strong>Avisar a equipo senior/UCIP</strong> si inestabilidad.</li>
    </ul>
  </div>

  <div class="sepsis-flow-arrow" aria-hidden="true">↓</div>

  <div class="sepsis-flow-decision">
    <strong class="sepsis-flow-title">¿HAY SHOCK O HIPOPERFUSIÓN?</strong>
    <p>Perfusión anormal, pulsos alterados, oliguria o afectación de consciencia, <strong>con o sin hipotensión</strong>.</p>
  </div>

  <div class="sepsis-flow-branches" role="group" aria-label="Tratamiento según presencia de shock">
    <div class="sepsis-flow-node sepsis-flow-shock">
      <strong class="sepsis-flow-title">SÍ · SHOCK SÉPTICO</strong>
      <ul>
        <li><strong>Antibiótico IV inmediato</strong>, idealmente <strong>≤1 h</strong>.</li>
        <li><strong>Cristaloide isotónico 10–20 mL/kg</strong> por bolo; reevaluar tras cada uno.</li>
        <li>Repetir solo si persiste shock y no hay sobrecarga. Hasta <strong>40–60 mL/kg en la primera hora</strong> si existe soporte intensivo; <strong>no es una meta obligatoria</strong>.</li>
        <li><strong>Suspender bolos</strong> si hay mejoría, crepitantes, hepatomegalia progresiva o empeoramiento respiratorio.</li>
        <li><strong>Adrenalina o noradrenalina precoz</strong> si shock persistente o intolerancia a fluidos; no esperar a vía central ni a completar 40 mL/kg.</li>
        <li><strong>UCIP</strong> y control del foco.</li>
      </ul>
      <p class="sepsis-flow-detail"><a href="#fluidos">Fluidos</a> · <a href="#vasoactivos">Vasoactivos</a></p>
    </div>

    <div class="sepsis-flow-node sepsis-flow-no-shock">
      <strong class="sepsis-flow-title">NO · SEPSIS SIN SHOCK</strong>
      <ul>
        <li><strong>Evaluación rápida</strong> del foco y la disfunción orgánica.</li>
        <li>Si se mantiene la sospecha de sepsis bacteriana, <strong>antibiótico IV lo antes posible, idealmente ≤3 h</strong>.</li>
        <li><strong>Sin bolos de reanimación rutinarios</strong> si no existe hipoperfusión.</li>
        <li><strong>Ingreso y vigilancia estrecha</strong>.</li>
        <li>Si aparece shock o empeora la perfusión, <strong>pasar a la rama de shock</strong>.</li>
      </ul>
      <p class="sepsis-flow-detail"><a href="#antibiotico">Antibioterapia</a> · <a href="#destino">Destino</a></p>
    </div>
  </div>

  <div class="sepsis-flow-arrow" aria-hidden="true">↓</div>

  <div class="sepsis-flow-node sepsis-flow-end">
    <strong class="sepsis-flow-title">REEVALUACIÓN CONTINUA</strong>
    <p><strong>FC, TA, relleno capilar, pulsos, consciencia, diuresis, respiración y sobrecarga.</strong> Seguir tendencia del lactato si estaba elevado. Reconsiderar el diagnóstico y escalar soporte si no mejora.</p>
  </div>
</div>

**Precauciones:** los volúmenes indicados presuponen disponibilidad de soporte intensivo y deben individualizarse (especialmente cardiopatía, disfunción miocárdica o riesgo de sobrecarga). La elección entre adrenalina y noradrenalina depende del perfil hemodinámico y la experiencia local; **la guía SSC 2026 no establece superioridad de una sobre otra**. La punción lumbar debe diferirse si existe inestabilidad hemodinámica.

*Adaptado de SEUP 2024 y Surviving Sepsis Campaign pediátrica 2026. Es un esquema operativo; consultar los apartados siguientes para pautas y preparación de fármacos.*

<a id="reconocimiento"></a>
## 2. Reconocimiento

Sospechar sepsis ante infección posible o confirmada + cualquier dato de disfunción orgánica:

- alteración de apariencia o nivel de consciencia;
- dificultad respiratoria/hipoxemia;
- relleno capilar prolongado o muy rápido;
- pulsos débiles o saltones;
- extremidades frías o muy calientes;
- oliguria;
- hipotensión;
- petequias/púrpura;
- lactato elevado o acidosis;
- coagulopatía;
- deterioro renal/hepático.

### Phoenix Sepsis Score

Los criterios actuales integran disfunción **respiratoria, cardiovascular, de coagulación y neurológica**. Una puntuación ≥2 en un paciente con infección identifica sepsis; la disfunción cardiovascular define shock séptico.

<div class="clinical-card clinical-card-danger">
  <strong>El tratamiento no debe retrasarse para completar un score.</strong> Ante sospecha clínica de sepsis con hipoperfusión o disfunción orgánica, iniciar el paquete de estabilización.
</div>

<a id="primera-hora"></a>
## 3. Primera hora

1. TEP + ABCDE.
2. Oxígeno si precisa.
3. Monitorización.
4. Acceso IV; si no se obtiene rápidamente → IO.
5. Hemocultivo si no retrasa tratamiento.
6. Analítica dirigida.
7. **Antibioterapia precoz**: idealmente en **≤1 h si shock** y, si se confirma sospecha de sepsis sin shock tras evaluación rápida, **≤3 h**.
8. Si shock: cristaloide isotónico **10–20 mL/kg por bolo** y reevaluación tras cada uno.
9. Iniciar vasoactivo precoz si shock refractario a fluidos o existen signos de disfunción miocárdica/sobrecarga.
10. Buscar y controlar el foco.

<a id="pruebas"></a>
## 4. Pruebas complementarias

En sepsis moderada-grave:

- hemograma;
- PCR y PCT;
- gasometría;
- lactato;
- glucemia;
- iones;
- función renal/hepática;
- coagulación;
- hemocultivo;
- orina/urocultivo;
- microbiología según foco;
- pruebas de imagen dirigidas.

No retrasar antibiótico para obtener cultivos si existe dificultad técnica.

<a id="antibiotico"></a>
## 5. Antibioterapia empírica

### Niño previamente sano >3 meses, sin foco claro

Opciones habituales:

- **Cefotaxima 50–75 mg/kg IV cada 6–8 h**, o
- **Ceftriaxona 50 mg/kg IV cada 12–24 h**.

### Sospecha de meningitis

- Cefotaxima/ceftriaxona a dosis meníngeas + **vancomicina** según protocolo de meningitis.

### Sospecha de infección invasiva por estreptococo del grupo A

- Penicilina G + **clindamicina**.

### <3 meses

Individualizar según edad y foco; de forma habitual:

- **ampicilina + cefotaxima/ceftriaxona**, con ajuste a edad neonatal y situación clínica.

<div class="clinical-card clinical-card-warning">
  <strong>Adaptación local:</strong> el tratamiento empírico debe ajustarse al foco, edad, antecedentes, colonizaciones previas y antibiograma local. Revisar y desescalar cuando se disponga de microbiología.
</div>

<a id="fluidos"></a>
## 6. Fluidos en shock séptico

<div class="dose-card">
  <strong>Cristaloide isotónico</strong>
  <span><b>10–20 mL/kg por bolo</b>, según estado hemodinámico y tolerancia.</span>
  <span>Reevaluar perfusión y signos de sobrecarga tras cada bolo.</span>
</div>

Puede requerir hasta **40–60 mL/kg durante la primera hora** en un sistema con acceso a UCIP; **no es un volumen objetivo obligatorio** y solo debe continuarse si persiste la hipoperfusión, sin:

- hepatomegalia progresiva;
- crepitantes;
- ritmo de galope;
- empeoramiento respiratorio.

Preferir cristaloides balanceados cuando estén disponibles, especialmente si se requieren volúmenes repetidos.

<a id="vasoactivos"></a>
## 7. Vasoactivos

Iniciar sin esperar vía central si persiste shock pese a fluidos apropiados, aparece intolerancia a fluidos o hay hipoperfusión grave. **No existe un umbral fijo de 40 mL/kg que obligue a retrasar los vasoactivos** (SSC 2026).

### Perfil frío

- extremidades frías;
- pulsos débiles;
- presión de pulso estrecha.

→ **Adrenalina** como primera opción habitual. Inicio **0,05–0,1 µg/kg/min**; titular, rango orientativo inicial **0,05–0,3 µg/kg/min**.

### Perfil caliente

- extremidades calientes;
- pulsos saltones;
- presión de pulso amplia.

→ **Noradrenalina** como primera opción habitual. Inicio **0,05–0,1 µg/kg/min** y titular según perfusión y TA.

<div class="clinical-card clinical-card-danger">
  <strong>Perfusiones vasoactivas:</strong> iniciar por vía periférica/IO si es necesario para no retrasar el tratamiento, usando bomba y <strong>concentración estandarizada del centro</strong>. Realizar doble comprobación de concentración/velocidad y vigilancia frecuente del punto de infusión; trasladar a acceso central cuando sea posible.
</div>

Titular según perfusión y TA; valorar ecografía funcional si disponible y no retrasa tratamiento.

<a id="reevaluacion"></a>
## 8. Reevaluación continua

Tras cada intervención valorar:

- estado mental;
- FC;
- TA;
- pulsos;
- relleno capilar;
- temperatura de extremidades;
- diuresis;
- lactato/tendencia si inicialmente elevado;
- signos de sobrecarga.

### Objetivos prácticos

- mejoría de apariencia y perfusión;
- TA adecuada para edad;
- diuresis recuperada;
- descenso de lactato cuando estaba elevado;
- no aparición de edema pulmonar/hepatomegalia.

<a id="destino"></a>
## 9. Destino

### UCIP

- shock séptico;
- necesidad de vasoactivo;
- ventilación avanzada;
- disfunción multiorgánica;
- deterioro neurológico;
- necesidad de monitorización intensiva.

### Ingreso hospitalario

Todo paciente con sepsis que no cumpla criterios de UCIP requiere ingreso y vigilancia estrecha.

<a id="no-hacer"></a>
## 10. No hacer

- No esperar hipotensión para diagnosticar shock.
- No retrasar antibiótico por obtener cultivos o completar pruebas.
- No administrar bolos repetidos sin reevaluar sobrecarga.
- No retrasar vasoactivos por intentar conseguir una vía central.
- No administrar bicarbonato de rutina en la acidosis metabólica del shock.
- No utilizar únicamente criterios SIRS para decidir gravedad.

<a id="bibliografia"></a>
## 11. Bibliografía

1. Gómez Cortés B. **Sepsis.** Protocolos diagnósticos y terapéuticos en Urgencias de Pediatría. Sociedad Española de Urgencias de Pediatría. 4.ª ed. 2024. [Documento](https://seup.org/wp-content/uploads/2024/04/12_Sepsis_4ed.pdf)
2. Sociedad Española de Urgencias de Pediatría / Sociedad Española de Cuidados Intensivos Pediátricos. **Documento de consenso sobre manejo de sepsis y shock séptico pediátrico.** [Documento](https://seup.org/pdf_public/pub/consenso_sepsis_shock.pdf)

3. Sociedad Española de Urgencias de Pediatría. **Algoritmo de sepsis.** [SEUP](https://seup.org/pdf_public/algoritmos/12_Sepsis.pdf)

4. Society of Critical Care Medicine / European Society of Intensive Care Medicine. **Surviving Sepsis Campaign: International Guidelines for the Management of Sepsis and Septic Shock in Children.** 2026. [Recomendaciones y guía rápida](https://sccm.org/survivingsepsiscampaign/guidelines-and-resources/surviving-sepsis-campaign-pediatric-guidelines)
