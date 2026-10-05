# Integración de PedCalc · fase 2 — 5 de octubre de 2026

## Objetivo

Migrar los fármacos habituales y de emergencia de la aplicación PedCalc antigua al sistema actual sin conservar dos fuentes independientes de dosis.

## Criterio de migración

Cada cálculo incluido debe:

1. corresponder a una indicación concreta;
2. existir de forma explícita en un protocolo vigente del repositorio;
3. expresar vía, unidad y máximo cuando proceda;
4. poder representarse sin inferir una pauta no escrita;
5. pasar casos de prueba automáticos.

Cuando la dosis antigua de PedCalc no coincide con el protocolo vigente, prevalece el protocolo actual.

## Cambios de arquitectura

El esquema del registro farmacológico pasa a versión 2 y admite:

- dosis exacta por peso;
- dosis por volumen/kg;
- rangos de dosis por peso;
- tramos de dosis según peso;
- dosis diaria con distintos repartos;
- dosis mínima y máxima;
- límites de edad y peso;
- identificación de uso fuera de ficha técnica;
- identificación de medicación de alto riesgo.

## Escenarios incorporados

Se incorporan 42 escenarios, entre ellos:

- paracetamol, ibuprofeno, amoxicilina, amoxicilina-clavulánico, dexametasona y prednisolona;
- adrenalina, amiodarona, lidocaína, bicarbonato, gluconato cálcico y magnesio en RCP;
- adrenalina IM, dexclorfeniramina y glucagón en anafilaxia;
- glucosa, glucagón e hidrocortisona;
- carbón activado, naloxona y flumazenilo;
- adenosina y atropina;
- levetiracetam, valproato, fenitoína, lacosamida y midazolam;
- salbutamol, ipratropio, adrenalina nebulizada y magnesio en crisis respiratorias;
- fentanilo intranasal, ketamina y metamizol;
- NaCl 3%, manitol y ácido tranexámico;
- ondansetrón en GEA.

## Diferencias relevantes respecto a PedCalc antiguo

No se han heredado automáticamente las dosis antiguas. Entre las diferencias ya conocidas:

- adrenalina en RCP: el proyecto actual utiliza repetición cada 4 min;
- glucosa 10% en hipoglucemia grave: el proyecto actual utiliza 2 mL/kg;
- levetiracetam en estatus: el proyecto actual utiliza 50 mg/kg, máximo 4.500 mg, en 5 min;
- varias dosis dependen de la indicación, por lo que ya no existe una única “dosis del fármaco”.

## Elementos deliberadamente pendientes

No se migran todavía:

- perfusiones continuas;
- SRI como módulo completo;
- cronómetro / registro crítico;
- etomidato, rocuronio, succinilcolina y neostigmina del PedCalc antiguo, porque antes deben quedar respaldados por un protocolo actual explícito del repositorio;
- conversiones a mL basadas únicamente en presentaciones comerciales antiguas si la concentración no está validada en el protocolo actual.

## Tests

El CI comprueba:

- integridad del esquema;
- unicidad de identificadores;
- existencia del protocolo fuente;
- coherencia de unidades;
- tramos de peso;
- rangos;
- reparto de dosis diarias;
- límites;
- casos de prueba con resultados conocidos para fármacos de alto riesgo y habituales.
