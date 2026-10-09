# Spec: Cobro excepcional para alumnos eventuales

- **Fecha:** 2026-10-09
- **Repo:** `/mnt/homelab/projects/kinder-finance` (rama `master`)
- **Estado:** borrador para revisión del usuario
- **Path de brainstorming:** bounded (los flujos a modificar ya existen y se leyeron antes de diseñar)

---

## 1. Contexto

El flujo actual de cobro es: **registrar alumno → generar CxC de colegiatura (lote mensual) → registrar pago sobre esa CxC**.

Los alumnos eventuales (estadía corta, pago excepcional) encajan mal en ese flujo:

1. Se registran igual que un alumno fijo, sin nada que los diferencie.
2. Para cobrarles hay que llegar al detalle del alumno y pulsar *Nuevo pago eventual*; ese botón solo existe dentro del detalle de un **grupo de CxC**, y un grupo solo existe si el alumno ya tiene una cuenta de colegiatura. En la práctica el camino es: alta → crear CxC → detalle → cobrar (varios pasos).
3. Si el alumno se da de alta con `monto_colegiatura`, el botón mensual *Colegiaturas* lo incluye en el lote y le genera una CxC `Pendiente` que nunca se va a pagar (**adeudo fantasma**).
4. `App.jsx:458` construye `sectionData` de CxC filtrando `tipo !== 'Eventual'`: un alumno cuyas **únicas** cuentas son eventuales **no forma grupo en el listado de CxC**, por lo que su detalle es inalcanzable desde la UI y sus pagos no se pueden revisar ahí.

### Qué ya existe y NO se toca

- `db/schema_cxc_tipo.sql`: columna `cxc.tipo ('Colegiatura','Eventual')` y RPC
  `kinder.registrar_pago_eventual(p_alumno_id, p_concepto, p_monto, p_fecha, p_metodo_pago, p_referencia)`,
  que crea la CxC eventual y la paga en **una sola transacción** (pago con folio + finanza categoría `'Evento'`).
- `src/components/EventualPagoModal.jsx` y el botón *Nuevo pago eventual* dentro del detalle del alumno.
- `ComprobantePreview`, corte diario y `finanzas` (el ingreso ya queda registrado hoy).

## 2. Objetivos

- **O1** — Registrar un alumno y cobrarle en **un solo paso**, desde un botón global accesible en cualquier sección.
- **O2** — Un alumno eventual **nunca** recibe CxC de colegiatura del lote mensual.
- **O3** — El alumno eventual es identificable en listado, detalle y filtros, y puede convertirse en regular.
- **O4** — No perder el registro: alumno + CxC + pago (folio) + finanza quedan ligados **atómicamente** (todo o nada).
- **O5** — Un alumno con solo cuentas eventuales **sí aparece** como grupo en el listado de CxC y su detalle es navegable.

### No objetivos (YAGNI)

- No se modifica `registrar_pago_eventual` ni el botón *Nuevo pago eventual* existente.
- No se migra `supabase-schema.sql` (legacy; el schema vivo es `db/`).
- No se añade framework de tests, autenticación, reportes ni bajas masivas de eventuales.
- No se convierte a ningún alumno existente en eventual.

## 3. Modelo de datos

Archivo nuevo **`db/schema_alumnos_tipo.sql`** — idempotente, compatible con el runner `scripts/migrar-db.mjs` (aplica en orden alfabético: `schema.sql` < `schema_alumnos_tipo.sql` < `schema_cxc_tipo.sql`).

1. `ALTER TABLE kinder.alumnos ADD COLUMN tipo text NOT NULL DEFAULT 'Regular'`, protegido con `DO $$ ... IF NOT EXISTS (information_schema ... schema='kinder', table='alumnos', column='tipo')`.
2. `CHECK (tipo IN ('Regular','Eventual'))` con nombre de constraint **`chk_alumnos_tipo`**, protegido consultando `pg_constraint`.
3. `CREATE INDEX IF NOT EXISTS idx_alumnos_tipo ON kinder.alumnos(tipo)`.
4. Las filas existentes (71 alumnos al momento de escribir este spec) quedan `'Regular'` por el DEFAULT.
5. Los alumnos eventuales se dan de alta con `monto_colegiatura = NULL` (refuerzo de O2; no es lo único que la garantiza).

## 4. API

### 4.1 RPC nueva `kinder.registrar_cobro_eventual`

Una sola transacción. Todos los parámetros con DEFAULT van al **final** de la lista (los posicionales obligatorios primero), de modo que PostgREST pueda invocarla con notación nombrada omitiendo los opcionales.

```sql
kinder.registrar_cobro_eventual(
  p_concepto   text,
  p_monto      numeric,
  p_fecha      date,
  p_metodo_pago text,
  p_alumno_id  uuid   DEFAULT NULL,
  p_nombre     text   DEFAULT NULL,
  p_grado      text   DEFAULT NULL,
  p_tutor      text   DEFAULT NULL,
  p_referencia text   DEFAULT NULL
) RETURNS json
```

**Comportamiento:**

| Caso | Regla |
|---|---|
| Validación | `p_concepto` no vacío, `p_monto > 0`, `p_fecha` no nula → si falla, `RAISE EXCEPTION` con mensaje claro. |
| `p_alumno_id IS NULL` (alta nueva) | Exige `p_nombre` no vacío. Inserta alumno con `tipo='Eventual'`, `grado = coalesce(nullif(btrim(p_grado),''),'Eventual')`, `tutor = nullif(btrim(...),'')`, `estado='Activo'`, `monto_colegiatura=NULL`, `fecha_inscripcion=DEFAULT`. |
| `p_alumno_id` presente | **No modifica ningún campo del alumno** (en particular no su `tipo`): solo valida que exista y que `eliminado=false`. |
| Cobro | Llama a `kinder.registrar_pago_eventual(...)` → CxC `tipo='Eventual'` con `estado='Pagado'`, pago con folio `COM-YYYY-NNNNN`, finanza `tipo='Ingreso'`, `categoria='Evento'`. |
| Retorno | JSON **plano**: `{"alumno": {...}, "cxc": {...}, "pago": {...}, "finanza": {...}}`. |
| Permisos | `OWNER TO kinder_owner`, `GRANT EXECUTE ... TO kinder_anon`, termina con `NOTIFY pgrst, 'reload schema';` (PostgREST 14.11 cachea el esquema). |

**¿Por qué una RPC nueva y no dos `fetch` desde el front?** Porque con dos llamadas, si falla el cobro queda un alumno dado de alta sin registro de pago — exactamente el problema que se quiere eliminar (O4).

### 4.2 Cliente

Nueva función en `src/lib/api.js`, misma forma que `registrarPagoEventual` (línea 114):

```js
registrarCobroEventual({ alumnoId, nombre, grado, tutor, concepto, monto, fecha, metodoPago, referencia })
  → POST ${API_BASE}/rpc/registrar_cobro_eventual
  → devuelve { alumno, cxc, pago, finanza }
```

Los campos no aplicables se envían como `null`.

## 5. Interfaz de usuario

### 5.1 `src/components/CobroEventualModal.jsx` (nuevo)

Props: `{ isOpen, onClose, alumnos, onCreated }`. Estructura y estilos calcados de `EventualPagoModal.jsx` (que no tiene errores de lint).

Campos:

| Campo | Control | Comportamiento |
|---|---|---|
| **Alumno** | `SelectField` con `isCreatable`, `options = alumnos.map(a => ({ value: a.id, label: `${a.nombre} (${a.grado})` }))` | **Buscar-o-crear.** Si el valor coincide con un `id` → alumno existente (solo datos de pago). Si el usuario crea una opción → el valor queda como texto libre (el fallback de `SelectField:94` lo renderiza) y se despliegan **Grado** (opcional, default `Eventual`) y **Tutor** (opcional). |
| Concepto | `input` | Obligatorio. Prellenado con `'Colegiatura eventual'`, editable. |
| Monto | `input type=number step=0.01` | Obligatorio, > 0. |
| Fecha | `input type=date` | Obligatorio, default hoy. |
| Método de pago | `SelectField` | `Transferencia` (default) / `Efectivo` / `Tarjeta` — mismos valores que ya acepta `finanzas.metodo_pago`. |
| Referencia | `input` | Opcional. |

`esNuevo = alumnoSel && !alumnos.some(a => a.id === alumnoSel)` — solo un `id` reconoce a un existente, un nombre tipeado siempre crea alumno nuevo.

Errores: validación en cliente con mensajes en español; error de la RPC se muestra en el modal con `setError` y **el modal no se cierra** (permite reintentar).

### 5.2 Botón global

En la cabecera del panel (`App.jsx:905`, junto al botón *Colegiaturas*), botón **Cobro excepcional** con icono `HandCoins` de lucide-react (verificado: existe en la versión instalada), visible en **todas** las secciones, incluida `home`. Abre `CobroEventualModal`.

### 5.3 `onCreated`

Reutiliza el patrón de `App.jsx:1813`:

- `data.alumnos`: añadir `result.alumno` **solo si no existe** (dedupe por `id`) — es un alumno nuevo solo cuando se envió sin `alumnoId`.
- `data.cxc`: añadir `result.cxc`; `data.finanzas`: añadir `result.finanza`.
- `setRecargarPagos(n => n+1)`, `setPreviewPago(result.pago)` y `setPreviewCuentas` con las cuentas del alumno → abre `ComprobantePreview`.

### 5.4 O2 — Exclusión del lote de colegiaturas

`ColegiaturaModal` (`App.jsx:142`): el filtro `alumnosElegibles` pasa a exigir `a.tipo !== 'Eventual'` además de lo actual. Cuando haya eventuales excluidos, muestra la nota *"N alumnos eventuales excluidos"*. El lote corre 100% del lado cliente (`createBulkRecords`), por lo que no se necesita nada server-side.

### 5.5 O5 — El alumno eventual sí aparece en CxC

`gruposCxc` (`App.jsx:692`) se construye hoy desde `filteredData` (que excluye eventuales) y luego *fusiona* eventuales en grupos ya existentes. El cambio: **la fuente de agrupación pasa a ser todas las cuentas del alumno** (incluidas las eventuales), aplicando la misma búsqueda y filtros que hoy. Con eso:

- un alumno con solo cobros eventuales forma grupo y su detalle (`DetalleAlumnoCxC`) es navegable — ya tiene estados vacíos para "Sin cuentas de colegiatura." (`DetalleAlumnoCxC.jsx:482`);
- el bloque de fusión de eventuales (`App.jsx:699-703`) queda redundante y se elimina;
- **la tabla** (`CRUDTable`, `App.jsx:1334`) **no cambia**: sigue mostrando `filteredData` sin cuentas eventuales individuales.

### 5.6 O3 — Visibilidad y conversión

- **Lista de alumnos** (`App.jsx:1057-1061`): chip `EVENTUAL` junto al chip de estado, cuando `item.tipo === 'Eventual'`.
- **Detalle del alumno** (`App.jsx:1419`, tarjeta *Información Académica*): fila `Tipo` con `selectedItem.tipo || 'Regular'`.
- **`RecordModal`** (alumnos): nuevo `SelectField` con `Regular` / `Eventual`; `getDefaults('alumnos')` pasa a `{ estado: 'Activo', tipo: 'Regular' }`. Permite convertir un eventual que se quedó fijo.
- **Filtro** (`App.jsx:1655`): `select` *Tipo* (Todos / Regular / Eventual) sobre `filters.tipo`, mismo patrón que *Estado* y *Grado*.
- **Corrección asociada:** `setFilters({})` se añade a los dos handlers de navegación de sección (`App.jsx:979` y `App.jsx:1602`) para que `filters.tipo` (que en Finanzas significa `Ingreso`/`Gasto`) no se filtre al cambiar de sección. Hoy `searchTerm` sí se limpia y `filters` no. Se hace en el `onClick`, **no** en un `useEffect`, para no introducir el error `react-hooks/set-state-in-effect` que ya castiga a `PagoModal` y `RecordModal`.

## 6. Manejo de errores

- Validación en el modal: alumno requerido (existente o nombre nuevo), concepto no vacío, monto > 0, fecha presente.
- Error de la RPC → mensaje en el modal, sin cerrarlo, sin tocar el estado global.
- Falla a mitad de camino → la transacción de la RPC revierte todo: no quedan alumnos huérfanos ni CxC sin pagar (O4).
- Homónimos: dos alumnos con el mismo nombre son opciones distintas (el `value` es el `id`); un nombre tipeado crea alumno nuevo, y eso es intencional y documentado.

## 7. Verificación

El repo **no tiene framework de tests** (solo `eslint` + `vite build`; `@playwright/test` está en devDependencies pero no hay config ni specs). Por eso la verificación es:

1. **Test SQL** nuevo `scripts/verify-cobro-eventual.sql` (fuera de `db/` para que el runner no lo aplique): `BEGIN ... ROLLBACK` con aserciones vía `DO $$ ... RAISE EXCEPTION 'FAIL ...'`, que cubre la RPC completa. **Rojo** antes de aplicar la migración, **verde** después.
2. `pnpm lint` — **no puede empeorar del baseline**: `✖ 12 problems (10 errors, 2 warnings)` hoy, todos en archivos preexistentes (`generate-icons.js`, `App.jsx`, `PagoModal.jsx`, `RecordModal.jsx`). Además, 0 errores en `src/components/CobroEventualModal.jsx`.
3. `pnpm build` — baseline ✓ (4.93s).
4. **Checklist manual** sobre `http://kinder.home.arpa` (Caddy en LXC200 sirve `/mnt/homelab/projects/kinder-finance/dist` con `/api` → PostgREST `127.0.0.1:3001`, mismo origen, por lo que **`pnpm build` basta para desplegar**; verificado leyendo `/etc/caddy/Caddyfile`).

Aplicar la migración: `PGPASSWORD=... node scripts/migrar-db.mjs` (o `--dry-run` primero). El `.pgpass` local solo cubre las BD `postgres` y `homelab`, no `kinder`; ruta alternativa verificada sin contraseña: `ssh -o BatchMode=yes pve "pct exec 200 -- bash -lc \"su - postgres -c \\\"psql -d kinder ...\\\"\""`.

## 8. Criterios de aceptación

- [x] A1. ✅ 2026-10-09: `--dry-run` lista los 4 archivos en orden; aplicado 2x via pct exec sin error. `db/schema_alumnos_tipo.sql` aplica con `migrar-db.mjs` en orden alfabético y es re-ejecutable sin error.
- [x] A2. ✅ 2026-10-09: EXIT 0 + `OK: verificaciones de cobro excepcional` (casos A-E, incl. atomicidad con ROLLBACK). `scripts/verify-cobro-eventual.sql` pasa todas las aserciones (cobro a alumno nuevo, cobro a alumno existente sin tocar su `tipo`, rechazos de validación, estado de CxC/pago/finanza).
- [x] A3. ✅ 2026-10-09: `12 problems (10 errors, 2 warnings)` = baseline exacto, 0 en archivos nuevos; build OK ~4s. `pnpm lint` ≤ 12 problemas; `pnpm build` OK.
- [x] A4. ✅ 2026-10-09: Playwright headless: alta + $50 -> comprobante COM-2026-00320, saldo $0.00; E2E API con folios COM-2026-00318/319. Desde cualquier sección, un clic en **Cobro excepcional** + nombre nuevo + monto ⇒ alumno `Eventual` creado, CxC `Eventual` `Pagada`, pago con folio, finanza `Ingreso/Evento` y comprobante visible.
- [x] A5. ✅ 2026-10-09: Playwright: chip en lista, fila Tipo en detalle, grupo en CxC con solo su cuenta eventual y seccion Pagos eventuales. Ese alumno aparece con chip `EVENTUAL` en la lista, en el detalle con fila `Tipo`, y **forma grupo en CxC** con su detalle navegable.
- [x] A6. ✅ 2026-10-09: Playwright: nota "4 alumnos eventuales excluidos"; el alumno de prueba NO esta en la tabla del lote. El botón *Colegiaturas* muestra la nota de excluidos y **no** genera CxC para ese alumno.
- [x] A7. ✅ 2026-10-09: Playwright: Regular + monto $2300 -> SI aparece en el lote. (Con monto NULL sigue excluido aunque sea Regular: correcto.) Editar el alumno y ponerlo en `Regular` lo habilita para el lote mensual.
- [x] A8. ✅ 2026-10-09: Playwright: filtro Tipo Todos/Regular/Eventual; setFilters({}) en ambos onClick, sin useEffect. El filtro *Tipo* funciona en Alumnos y no contamina al cambiar de sección.

## 9. Decisiones asumidas (corregir si no encajan)

- Concepto por defecto **`'Colegiatura eventual'`** y grado por defecto **`'Eventual'`** — textos editables, si prefieres otro (p. ej. "Día suelto") es un cambio de una línea.
- El botón vive en la cabecera del panel lateral, junto a *Colegiaturas*, y es visible en todas las secciones.
- Cobrar a un alumno **regular existente** desde este modal no altera su `tipo` ni su `monto_colegiatura`.
- Las cuentas eventuales siguen sin listarse individualmente en la tabla de CxC (siguen visibles en el detalle del grupo).

## 10. Archivos afectados

| Acción | Archivo |
|---|---|
| Crear | `db/schema_alumnos_tipo.sql` |
| Crear | `scripts/verify-cobro-eventual.sql` |
| Crear | `src/components/CobroEventualModal.jsx` |
| Modificar | `src/lib/api.js` (+`registrarCobroEventual`) |
| Modificar | `src/App.jsx` (botón, montaje, `gruposCxc`, `ColegiaturaModal`, chip, detalle, filtro, reset de filtros) |
| Modificar | `src/components/RecordModal.jsx` (campo `Tipo`) |
| Crear | `docs/superpowers/specs/…` y `docs/superpowers/plans/…` |
