# Integración de PedCalc · perfusiones — 5 de octubre de 2026

## Objetivo

Integrar el módulo de perfusiones de PedCalc sin trasladar automáticamente sus diluciones antiguas al proyecto actual.

La aplicación original incluía adrenalina, noradrenalina, dopamina, dobutamina, prostaglandina E1, midazolam, fentanilo y dexmedetomidina mediante jeringas ponderales de 50 mL. En el proyecto actual se conserva la interacción práctica **dosis objetivo → velocidad de bomba**, pero la concentración solo se fija cuando el protocolo vigente la especifica.

## Principio de seguridad

Una perfusión se modela con tres componentes independientes:

1. **dosis o velocidad objetivo**;
2. **concentración de la solución**;
3. **velocidad de bomba en mL/h**.

Si el protocolo exige una concentración institucional, el motor solicita explícitamente esa concentración y no genera una dilución por defecto.

## Perfusiones incorporadas

### Vasoactivos

- Adrenalina en shock frío: inicio 0,05–0,1 µg/kg/min; rango orientativo inicial 0,05–0,3 µg/kg/min.
- Noradrenalina en shock caliente: inicio 0,05–0,1 µg/kg/min. La calculadora no extrapola por encima de ese rango porque el protocolo remite las dosis superiores a manejo intensivo individualizado.
- Adrenalina en bradicardia persistente con pulso: 0,1–2 µg/kg/min.

Para estas perfusiones se requiere una **concentración estandarizada institucional** introducida por el usuario.

### Anafilaxia refractaria

- Adrenalina 0,1–1 µg/kg/min.
- Concentración fijada por el protocolo: **10 µg/mL**, preparada con 1 mg de adrenalina y SSF hasta 100 mL finales.
- Glucagón 5–15 µg/min: concentración institucional.

### Cetoacidosis diabética

- Insulina regular 0,05–0,1 UI/kg/h.
- Preparación fijada por el protocolo: **1 UI/mL** (50 UI hasta 50 mL con SSF 0,9%).
- La calculadora recuerda cebar el sistema y no administrar bolo IV.

### Estatus epiléptico

En estatus refractario:

- midazolam 0,05–0,4 mg/kg/h;
- propofol 5–10 mg/kg/h;
- tiopental 3–5 mg/kg/h.

Además:

- valproato de mantenimiento 1–2 mg/kg/h.

Todas requieren introducir la concentración institucional antes de calcular los mL/h.

## Elementos de PedCalc no migrados todavía

Se mantienen fuera de la calculadora:

- dopamina;
- dobutamina;
- prostaglandina E1;
- fentanilo en perfusión continua;
- dexmedetomidina.

El motivo no es técnico. El repositorio clínico actual no contiene una pauta de perfusión suficientemente explícita para que estas entradas tengan una fuente interna inequívoca.

## Fórmulas utilizadas

Para una pauta en unidades/kg/min:

`mL/h = dosis × peso × 60 / concentración`

Para una pauta en unidades/kg/h:

`mL/h = dosis × peso / concentración`

Para una pauta absoluta en unidades/min:

`mL/h = dosis × 60 / concentración`

El motor bloquea la salida si la dosis está fuera del rango registrado o si falta una concentración institucional obligatoria.

## Casos automáticos de control

Se comprueban, entre otros:

- adrenalina anafilaxia, 20 kg, 0,1 µg/kg/min a 10 µg/mL → 12 mL/h;
- insulina CAD, 20 kg, 0,05 UI/kg/h a 1 UI/mL → 1 mL/h;
- adrenalina shock, 20 kg, 0,05 µg/kg/min a 10 µg/mL → 6 mL/h;
- midazolam, 20 kg, 0,1 mg/kg/h a 1 mg/mL → 2 mL/h;
- propofol, 20 kg, 5 mg/kg/h a 10 mg/mL → 10 mL/h;
- glucagón, 10 µg/min a 100 µg/mL → 6 mL/h.

También se verifica que una dosis fuera del rango registrado sea rechazada.

## Arquitectura

Se añaden:

- `docs/data/infusions.json`;
- `docs/perfusiones.md`;
- `docs/javascripts/infusion-calculator.js`;
- `scripts/check_infusion_registry.py`.

El contexto de peso/edad se comparte con la calculadora de dosis mediante la misma sesión del navegador, y los recursos se incluyen en la PWA para uso offline.
