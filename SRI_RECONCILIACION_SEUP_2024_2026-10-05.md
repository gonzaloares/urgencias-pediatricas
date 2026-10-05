# Reconciliación SRI: Cards SEUP 2024 → protocolo actual → registro de la app

Fecha: 05/10/2026

## Motivo

PedCalc se construyó a partir de las **Cards SEUP de 10/10/2024**, un documento del Grupo de Trabajo de Paciente Crítico diseñado para ofrecer dosis calculadas por peso/edad y reducir errores en emergencias pediátricas.

La integración actual no copia las cifras de forma ciega. Se comparan con:

- el capítulo SEUP 4.ª edición de estabilización del paciente pediátrico grave;
- el protocolo SEUP 4.ª edición de sedoanalgesia;
- fichas técnicas AEMPS cuando aportan restricciones regulatorias relevantes.

## Tabla de reconciliación

| Fármaco | Cards SEUP 2024 | SEUP 4.ª ed. | Decisión para la app |
|---|---|---|---|
| Atropina | 0,02 mg/kg | Uso selectivo; no sistemático | 0,02 mg/kg, mín. 0,1 mg, máx. 0,5 mg; nunca selección automática |
| Fentanilo | 1 µg/kg | 1–2 µg/kg en protocolos de sedoanalgesia/premedicación | 1–2 µg/kg; referencia inicial 1 µg/kg; no obligatorio |
| Midazolam | **0,15 mg/kg** | **0,2–0,3 mg/kg** | **Conflicto abierto: no cálculo automático** |
| Ketamina | 1,5 mg/kg | 1–2 mg/kg | 1–2 mg/kg; valor inicial 1,5 mg/kg; Cards no recomienda ≤3 meses |
| Propofol | 1 mg/kg | 1–4 mg/kg; cautela hemodinámica | 1–4 mg/kg; referencia 1 mg/kg; no selección automática si inestable |
| Etomidato | 0,3 mg/kg; máx. 20 mg; no <6 meses | 0,3 mg/kg; evitar shock séptico | 0,3 mg/kg; máx. 20 mg; ≥6 meses; evitar shock séptico |
| Rocuronio | 1 mg/kg | 0,6–1,2 mg/kg | 0,6–1,2 mg/kg; referencia 1 mg/kg |
| Succinilcolina | 1 mg/kg IV/IO; 4 mg/kg IM; máx. 150 mg | 1–2 mg/kg IV | 1–2 mg/kg IV/IO; referencia 1 mg/kg; máx. 150 mg |
| Sugammadex | 2 mg/kg; 4 mg/kg si bloqueo profundo | No detallado en tabla principal | Mantener 2/4 mg/kg según profundidad; no usar como “reversión inmediata” automática |
| Tiopental | 3 mg/kg; límite 5 mg/kg | Incluido como hipnótico de SRI | 3–5 mg/kg; referencia 3 mg/kg; evitar inestabilidad/broncoespasmo |

## Hallazgo principal

La reconciliación ha detectado una **discordancia interna SEUP para midazolam**. No se resolverá por promedio ni por inferencia. El registro la marca como `conflict_hold` y la futura interfaz de SRI deberá bloquear el cálculo automático de midazolam hasta adoptar una decisión clínica explícita.

## Matices regulatorios incorporados

- Etomidato-Lipuro: evitar en recién nacidos y hasta 6 meses salvo indicación urgente hospitalaria.
- Rocuronio: SEUP lo recomienda en emergencias, pero algunas fichas técnicas españolas describen experiencia limitada/no recomendación específica de inducción rápida pediátrica según presentación; se mostrará esta advertencia.
- Sugammadex: fichas técnicas actualizadas permiten reversión rutinaria pediátrica, con 2 mg/kg cuando reaparece T2 y 4 mg/kg con bloqueo profundo; la reversión inmediata no está investigada en pediatría.

## Arquitectura

Se crea `docs/data/rsi.json` como registro independiente. Todavía no se activa una interfaz automática de SRI: primero queda cerrada la fuente farmacológica y sus conflictos.

Se crea además `docs/procedimientos/secuencia-rapida-intubacion.md` como protocolo clínico base para que el futuro módulo no dependa únicamente de un JSON ni de la aplicación antigua.
