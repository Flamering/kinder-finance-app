# Cobro Excepcional para Alumnos Eventuales — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registrar un alumno eventual y cobrarle en un solo paso desde un botón global, sin adeudos fantasma en el lote mensual y sin perder el registro del cobro.

**Architecture:** Nueva RPC plpgsql `registrar_cobro_eventual` que (alta de alumno `tipo='Eventual'` + llamada a la RPC existente `registrar_pago_eventual`) corre en **una sola transacción**; el front la consume con un modal nuevo «buscar-o-crear» montado en `App.jsx`, reusando el patrón de `onCreated` + comprobante que ya existe. Dos ajustes de lectura en `App.jsx` para que el alumno eventual sea visible (grupo en CxC) y no reciba colegiatura del lote mensual.

**Tech Stack:** React 19 + Vite 8 + Tailwind CSS + lucide-react + react-select (sin framework de tests: solo `eslint` y `vite build`); PostgreSQL 17 + PostgREST 14.11 (`kinder_anon`, schema `kinder`); Caddy en LXC200 sirve `dist/` y `/api` en `http://kinder.home.arpa`.

**Spec:** `docs/superpowers/specs/2026-10-09-cobro-excepcional-eventuales-design.md`

## Global Constraints

- **Idioma:** UI, mensajes de error y mensajes de commit en español; convención conventional commits (`feat(cxc): …`, `docs(spec): …`).
- **Migraciones:** solo en `db/*.sql`, idempotentes (`IF NOT EXISTS`, `DO $$…$$` contra `information_schema`/`pg_constraint`, `CREATE INDEX IF NOT EXISTS`), en orden alfabético. `scripts/` queda **fuera** del runner (`migrar-db.mjs` lee únicamente `DB_DIR=db`).
- **RPCs:** `LANGUAGE plpgsql SECURITY INVOKER`, `OWNER TO kinder_owner`, `GRANT EXECUTE … TO kinder_anon`, y terminar con `NOTIFY pgrst, 'reload schema';`.
- **Sin dependencias nuevas:** `package.json` no se toca.
- **Lint baseline:** `pnpm lint` reporta hoy `✖ 12 problems (10 errors, 2 warnings)` en `generate-icons.js`, `src/App.jsx`, `src/components/PagoModal.jsx`, `src/components/RecordModal.jsx`. No puede empeorar, y debe haber **0 errores** en `src/components/CobroEventualModal.jsx`.
- **Build baseline:** `pnpm build` pasa (✓ 4.93 s).
- **Prohibido `set*` dentro de `useEffect`** (la regla `react-hooks/set-state-in-effect` ya marca errores en `PagoModal` y `RecordModal`): los resets de estado van en los handlers `onClick`.
- **Archivos intocables:** `supabase-schema.sql`, `db/schema.sql`, `db/schema_cxc_tipo.sql`, `db/schema_pagos_comprobantes.sql`, `src/components/EventualPagoModal.jsx`, `src/components/DetalleAlumnoCxC.jsx`.
- **No `git push`.**
- **Sin framework de tests:** la verificación de cada tarea es `pnpm lint` + `pnpm build` + el test SQL (`scripts/verify-cobro-eventual.sql`) + la checklist manual del spec (§8).

## Review Focus

1. **Alumno huérfano si el cobro falla.** Si `registrar_pago_eventual` revienta después del `INSERT` del alumno, no debe quedar fila nueva (spec O4). → *Caso D* en `scripts/verify-cobro-eventual.sql`.
2. **Cobrar a un alumno regular le cambia el `tipo`.** Esperado: permanece `'Regular'` y sigue entrando al lote mensual (spec §4.1). → *Caso B* en el test SQL + *A7* manual.
3. **`filters.tipo` de Finanzas (`Ingreso`/`Gasto`) contamina Alumnos (`Regular`/`Eventual`)** y la lista queda vacía al cambiar de sección. → *A8* manual.
4. **Regresión de lint** por un `useEffect` de reset de filtros o por el componente nuevo. → `pnpm lint` ≤ 12.
5. **Alumno eventual invisible en CxC**: si sus únicas cuentas son eventuales, `sectionData` (App.jsx:458) lo excluye y no forma grupo, dejando su detalle inalcanzable. → *A5* manual.

---

### Task 1: Migración `alumnos.tipo` + RPC `registrar_cobro_eventual`

**Files:**
- Create: `scripts/verify-cobro-eventual.sql` (test; queda fuera del runner)
- Create: `db/schema_alumnos_tipo.sql`

**Interfaces:**
- Consumes: `kinder.registrar_pago_eventual(uuid, text, numeric, date, text, text)` (ya existe, `db/schema_cxc_tipo.sql`).
- Produces (lo usan Tasks 2 y 6): columna `kinder.alumnos.tipo text NOT NULL DEFAULT 'Regular'` con `chk_alumnos_tipo`; RPC

```sql
kinder.registrar_cobro_eventual(
  p_concepto text, p_monto numeric, p_fecha date, p_metodo_pago text,
  p_alumno_id uuid DEFAULT NULL, p_nombre text DEFAULT NULL,
  p_grado text DEFAULT NULL, p_tutor text DEFAULT NULL, p_referencia text DEFAULT NULL
) RETURNS json  -- {"alumno":{…},"cxc":{…},"pago":{…},"finanza":{…}}
```

- [ ] **Step 1: Escribir el test rojo `scripts/verify-cobro-eventual.sql`**

Un solo archivo `BEGIN; … ROLLBACK;` con aserciones en bloques `DO $$…$$` que hacen `RAISE EXCEPTION 'FAIL <caso>: <detalle>'`. Casos y valores exactos:

- **A (DDL):** existe `kinder.alumnos.tipo`, `is_nullable='NO'`, `column_default='''Regular'''`, y existe el constraint `chk_alumnos_tipo`; existen las funciones `registrar_cobro_eventual` y `registrar_pago_eventual`.
- **B (alumno existente):** tomar `SELECT id, nombre FROM kinder.alumnos WHERE eliminado=false AND tipo='Regular' LIMIT 1` y llamar `registrar_cobro_eventual(p_concepto := 'Caso B', p_monto := 100, p_fecha := CURRENT_DATE, p_metodo_pago := 'Efectivo', p_alumno_id := <id>)`. Asercionar que el alumno sigue con `tipo='Regular'` y `estado` intacto; que `cxc.tipo='Eventual'`, `cxc.estado='Pagado'`, `cxc.monto_pagado=100`; `pago.folio LIKE 'COM-%'`; `finanza.categoria='Evento'` y `finanza.monto=100`.
- **C (alta nueva):** llamar con `p_nombre := 'PRUEBA COBRO EVENTUAL'`, `p_grado := 'Kinder A'`, `p_tutor := 'Tutor Prueba'`, `p_concepto := 'Colegiatura eventual'`, `p_monto := 250`. Asercionar `tipo='Eventual'`, `grado='Kinder A'`, `tutor='Tutor Prueba'`, `estado='Activo'`, `monto_colegiatura IS NULL`, y los mismos checks de `cxc`/`pago`/`finanza` del Caso B con `monto=250`.
- **D (atomicidad):** en un bloque `DO` con su propio `EXCEPTION WHEN OTHERS`, llamar con `p_nombre := 'PRUEBA NO DEBE QUEDAR'` y `p_monto := 1234567890123` (desborda `numeric(10,2)` al insertar la CxC, después del `INSERT` del alumno). Capturar el error, y luego asertar `SELECT count(*) FROM kinder.alumnos WHERE nombre='PRUEBA NO DEBE QUEDAR'` = **0**.
- **E (validaciones):** tres llamadas que deben fallar — sin `p_nombre` y sin `p_alumno_id`; `p_monto := 0`; `p_concepto := '  '`. Cada una en bloque con `EXCEPTION` y flag; si no lanza, `RAISE EXCEPTION 'FAIL E: …'`.

- [ ] **Step 2: Ejecutar el test y verificar que FALLA (rojo)**

```bash
ssh -o BatchMode=yes pve 'pct exec 200 -- su postgres -c "psql -v ON_ERROR_STOP=1 -d kinder -f /mnt/homelab/projects/kinder-finance/scripts/verify-cobro-eventual.sql"'
```
Esperado: código de salida ≠ 0 con `FAIL A: …` (la columna `tipo` aún no existe). *(La ruta es válida: LXC200 ve el repo en `/mnt/homelab/projects/kinder-finance` — verificado.)*

- [ ] **Step 3: Escribir `db/schema_alumnos_tipo.sql`**

Contenido, en este orden, todo idempotente:
1. `DO` + `information_schema.columns` → `ALTER TABLE kinder.alumnos ADD COLUMN tipo text NOT NULL DEFAULT 'Regular'`.
2. `DO` + `pg_constraint` (nombre `chk_alumnos_tipo`) → `ALTER TABLE kinder.alumnos ADD CONSTRAINT chk_alumnos_tipo CHECK (tipo IN ('Regular','Eventual'))`.
3. `CREATE INDEX IF NOT EXISTS idx_alumnos_tipo ON kinder.alumnos(tipo);`
4. `CREATE OR REPLACE FUNCTION kinder.registrar_cobro_eventual(…)` con la firma del bloque **Interfaces**, cuyo cuerpo: valida `p_concepto` no vacío, `p_monto > 0`, `p_fecha IS NOT NULL`; si `p_alumno_id IS NULL` exige `p_nombre` e inserta el alumno con `tipo='Eventual'`, `grado = coalesce(nullif(btrim(p_grado),''),'Eventual')`, `tutor = nullif(btrim(coalesce(p_tutor,'')),'')`, `estado='Activo'`, `monto_colegiatura = NULL`; si viene `p_alumno_id` solo verifica `eliminado=false` **sin modificar el alumno**; llama `kinder.registrar_pago_eventual(…)`; devuelve `json_build_object('alumno', to_json(v_alumno), 'cxc', …, 'pago', …, 'finanza', …)` extrayendo esos objetos del JSON que devuelve la función llamada.
5. `ALTER FUNCTION … OWNER TO kinder_owner;`, `GRANT EXECUTE … TO kinder_anon;`, `NOTIFY pgrst, 'reload schema';` y un comentario de cabecera explica el orden alfabético.

- [ ] **Step 4: Verificar orden e idempotencia del runner**

```bash
node scripts/migrar-db.mjs --dry-run   # sin contraseña: no conecta
```
Esperado: `archivos (4): schema.sql, schema_alumnos_tipo.sql, schema_cxc_tipo.sql, schema_pagos_comprobantes.sql` — con `schema_alumnos_tipo.sql` **antes** de `schema_cxc_tipo.sql`.

- [ ] **Step 5: Aplicar la migración y re-aplicarla**

```bash
PGPASSWORD='<la que el usuario indique>' node scripts/migrar-db.mjs
PGPASSWORD='<la que el usuario indique>' node scripts/migrar-db.mjs   # 2ª vez: idempotente
```
Ruta alternativa sin contraseña (verificada): `ssh -o BatchMode=yes pve 'pct exec 200 -- su postgres -c "psql -v ON_ERROR_STOP=1 -d kinder -f /mnt/homelab/projects/kinder-finance/db/schema_alumnos_tipo.sql"'.` Si no hay credenciales disponibles, **preguntar al usuario** en lugar de improvisar.

- [ ] **Step 6: Ejecutar el test y verificar PASS (verde)**

Mismo comando del Step 2. Esperado: salida `0` sin `FAIL`; el script debe imprimir `OK: verificaciones de cobro excepcional` al final.

- [ ] **Step 7: Commit**

```bash
git add db/schema_alumnos_tipo.sql scripts/verify-cobro-eventual.sql
git commit -m "feat(db): alumnos.tipo + RPC registrar_cobro_eventual (cobro atómico)"
```

---

### Task 2: Cliente API `registrarCobroEventual`

**Files:**
- Modify: `src/lib/api.js` (junto a `registrarPagoEventual`, línea 114)

**Interfaces:**
- Consumes: la RPC de la Task 1 (nombre y orden de parámetros idénticos).
- Produces (lo usa la Task 3):

```js
registrarCobroEventual({ alumnoId, nombre, grado, tutor, concepto, monto, fecha, metodoPago, referencia })
// → POST `${API_BASE}/rpc/registrar_cobro_eventual`
// → { alumno, cxc, pago, finanza }
```

- [ ] **Step 1: Implementar la función**

Misma forma que `registrarPagoEventual`: `throwIfNotOk(res)` antes de `res.json()`, y cuerpo JSON con `p_alumno_id`, `p_nombre`, `p_grado`, `p_tutor`, `p_concepto`, `p_monto`, `p_fecha`, `p_metodo_pago`, `p_referencia` — los no aplicables en `null` (`?? null`), no omitidos.

- [ ] **Step 2: Verificar**

```bash
pnpm lint 2>&1 | tail -1
```
Esperado: `✖ 12 problems (10 errors, 2 warnings)` (igual al baseline) y ninguna mención a `src/lib/api.js`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/api.js
git commit -m "feat(api): registrarCobroEventual para el cobro excepcional"
```

---

### Task 3: Modal `CobroEventualModal` + botón global (O1, O4)

**Files:**
- Create: `src/components/CobroEventualModal.jsx`
- Modify: `src/App.jsx` — imports (líneas 2-34), estado (zona de la línea 309), cabecera del panel (línea 905), montaje de modales (zona de la línea 1809)

**Interfaces:**
- Consumes: `registrarCobroEventual` (Task 2), `SelectField`, `ComprobantePreview` y el patrón `onCreated` de `App.jsx:1813`.
- Produces: props del componente — `{ isOpen, onClose, alumnos, onCreated }` donde `onCreated(result)` recibe `{ alumno, cxc, pago, finanza }`.

- [ ] **Step 1: Implementar `src/components/CobroEventualModal.jsx`**

Estructura y clases calcadas de `src/components/EventualPagoModal.jsx` (que no tiene errores de lint). Estado inicial con `useState(freshForm)` y resets solo en handlers (nada de `useEffect` con `set*`). Lógica:

- `esNuevo = alumnoSel && !alumnos.some(a => a.id === alumnoSel)`.
- `SelectField` con `isCreatable`, `options = alumnos.map(a => ({ value: a.id, label: `${a.nombre} (${a.grado})` }))`, `onCreateOption={(v) => setFormData({ ...formData, alumnoSel: v })}` — el fallback de `SelectField:94` renderiza el texto libre.
- Si `esNuevo`: mostrar **Grado** (default `'Eventual'`) y **Tutor** (opcionales).
- Campos: Concepto (prellenado `'Colegiatura eventual'`), Monto, Fecha (hoy), Método (`Transferencia`/`Efectivo`/`Tarjeta`, default `Transferencia`), Referencia (opcional).
- Validación con mensajes: `'Selecciona o escribe el nombre del alumno'`, `'El concepto es obligatorio'`, `'El monto debe ser mayor a 0'`, `'La fecha es obligatoria'`.
- Envío con `loading`; en `catch` → `setError(err.message)` **sin cerrar el modal**; en éxito → `onCreated(result)` y `onClose()`.

- [ ] **Step 2: Montar en `App.jsx`: estado, import e import de la función**

Añadir `const [isCobroEventualOpen, setIsCobroEventualOpen] = useState(false);` en la zona de estados de modales (línea ~309), importar `CobroEventualModal` y `registrarCobroEventual`.

- [ ] **Step 3: Añadir el botón global en la cabecera del panel (línea 905)**

Botón `HandCoins` + texto **Cobro excepcional**, clases similares al botón *Colegiaturas* pero en color de marca (`bg-[#5A7A9A]`), **sin** condición de sección (visible también en `home`), `onClick={() => setIsCobroEventualOpen(true)}`. `HandCoins` existe en la lucide-react instalada (verificado).

- [ ] **Step 4: Montar el modal con su `onCreated`**

```jsx
<CobroEventualModal
  isOpen={isCobroEventualOpen}
  onClose={() => setIsCobroEventualOpen(false)}
  alumnos={data.alumnos}
  onCreated={(result) => { /* ver valores de abajo */ }}
/>
```

El `onCreated` debe: (1) añadir `result.alumno` a `data.alumnos` **solo si no existe** (`prev.alumnos.some(a => a.id === result.alumno.id)`), (2) añadir `result.cxc` a `data.cxc` y `result.finanza` a `data.finanzas`, (3) `setRecargarPagos(n => n + 1)`, (4) `setPreviewPago(result.pago)` y `setPreviewCuentas([result.cxc, ...data.cxc.filter(c => c.alumno_id === result.alumno.id)])` para abrir `ComprobantePreview`.

**Ojo:** el `data.cxc` de este closure es el estado **anterior** al paso (2); por eso la cuenta recién creada se prepone a mano. Copiar literalmente `data.cxc.filter(...)` (como hace hoy `App.jsx:1820`) dejaría el comprobante sin la cuenta que acaba de crearse.

- [ ] **Step 5: Verificar**

```bash
pnpm lint 2>&1 | tail -1     # ≤ 12 problems y 0 errores en CobroEventualModal.jsx
pnpm build                    # ✓ built in …
```

- [ ] **Step 6: Commit**

```bash
git add src/components/CobroEventualModal.jsx src/App.jsx
git commit -m "feat(cobro): botón global Cobro excepcional (alta + cobro en un paso)"
```

---

### Task 4: El alumno eventual sí aparece en CxC (O5)

**Files:**
- Modify: `src/App.jsx` — `getFilteredData` (línea 659), `gruposCxc` (líneas 692-705)

**Interfaces:**
- Consumes: que `data.cxc` incluye las cuentas `tipo='Eventual'` (ya ocurre; solo se ocultan de la vista).
- Decisión clave: el filtrado se aplica **a las cuentas** (que sí tienen `estado`/`concepto`) y **después** se agrupa. Si se filtraran los grupos, `filters.estado` los descartaría a todos (los grupos no tienen `estado`).

- [ ] **Step 1: Parametrizar la base de filtrado**

`getFilteredData()` pasa a `getFilteredData(base = sectionData)`, usando `base` en lugar de `sectionData` en su interior; `const filteredData = getFilteredData();` queda idéntico al actual (la **tabla** no cambia).

- [ ] **Step 2: Construir los grupos desde todas las cuentas**

`gruposCxc` deja de usar `filteredData` y pasa a agrupar el resultado de `getFilteredData(data.cxc || [])`: se **filtran las cuentas** (igual que hoy: búsqueda y `filters`) y **luego** se agrupan por `alumno_id || alumno_nombre || id`, manteniendo `__grupo: true`, `alumno_id`, `alumno_nombre`, `cuentas`. **Eliminar** el bloque de fusión de eventuales de las líneas 699-703 (queda redundante: el grupo ya contiene todas las cuentas del alumno, y la tarjeta y `DetalleAlumnoCxC` ya distinguen `cuentasColegiatura` vs `cuentasEventuales`).

- [ ] **Step 3: Verificar**

```bash
pnpm lint 2>&1 | tail -1     # ≤ 12 problems
pnpm build
```
Manual (tras `pnpm build`, en `http://kinder.home.arpa`): un alumno con solo cuentas eventuales forma tarjeta en CxC con chip de estado y saldo, y al abrirlo `DetalleAlumnoCxC` muestra *Sin cuentas de colegiatura.* más la sección *Pagos eventuales* (spec *A5*).

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "feat(cxc): los alumnos con solo pagos eventuales forman grupo en el listado"
```

---

### Task 5: Excluir eventuales del lote de colegiaturas (O2)

**Files:**
- Modify: `src/App.jsx` — `ColegiaturaModal` (líneas 142-144 y bloque de resumen 208-217)

**Interfaces:**
- Consumes: `alumnos[].tipo` (Task 1).

- [ ] **Step 1: Excluir del filtro y mostrar la nota**

`alumnosElegibles` añade `a.tipo !== 'Eventual'`. Calcular `const excluidos = alumnos.filter(a => a.tipo === 'Eventual').length;` y, si `excluidos > 0`, mostrar bajo el resumen *«N alumnos eventuales excluidos»* con el mismo estilo de las notas existentes (`text-xs text-slate-400`).

- [ ] **Step 2: Verificar**

```bash
pnpm lint 2>&1 | tail -1     # ≤ 12 problems
pnpm build
```
Manual: abrir *Colegiaturas* y comprobar que el alumno eventual del Task 3 **no** está en la tabla, que el contador y el total no lo incluyen, y que aparece la nota (spec *A6*).

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "feat(colegiaturas): excluye alumnos eventuales del lote mensual"
```

---

### Task 6: Visibilidad y conversión del alumno eventual (O3)

**Files:**
- Modify: `src/components/RecordModal.jsx` — `getDefaults` (línea 26) y bloque `section === 'alumnos'` (línea 147)
- Modify: `src/App.jsx` — tarjeta de la lista (líneas 1057-1061), detalle del alumno (línea 1419), modal de filtros (línea 1655), handlers de navegación (líneas 979 y 1602)

**Interfaces:**
- Consumes: `alumnos[].tipo` (Task 1).

- [ ] **Step 1: `RecordModal` — campo Tipo**

`getDefaults('alumnos')` → `{ estado: 'Activo', tipo: 'Regular' }`. Añadir `SelectField` *Tipo* con `Regular` / `Eventual`, `value={formData.tipo}`, después del `SelectField` de *Estado*.

- [ ] **Step 2: Chip en la lista y fila en el detalle**

En la tarjeta de la lista de alumnos, junto al chip de estado (línea 1058), un chip `EVENTUAL` solo cuando `currentSection === 'alumnos' && item.tipo === 'Eventual'`, con estilo de chip existente (`text-[9px] font-bold uppercase rounded border`) y color ámbar (`bg-amber-100 text-amber-700`). En la tarjeta *Información Académica* del detalle, fila `Tipo` con `selectedItem.tipo || 'Regular'`, siguiendo el patrón de la fila *Grado*.

- [ ] **Step 3: Filtro Tipo + reset de filtros al cambiar de sección**

Añadir en el bloque `currentSection === 'alumnos'` del modal de filtros un `select` *Tipo* (Todos / Regular / Eventual) sobre `filters.tipo`, con el mismo markup de *Estado* y *Grado*. Añadir `setFilters({})` en **los dos** `onClick` de navegación (líneas 979 y 1602), junto al `setSearchTerm('')` que ya existe. **No** usar `useEffect` (Global Constraint de lint).

- [ ] **Step 4: Verificar**

```bash
pnpm lint 2>&1 | tail -1     # ≤ 12 problems (ojo: no aparece react-hooks/set-state-in-effect nuevo)
pnpm build
```
Manual: chip visible en la lista; fila `Tipo` en el detalle; filtrar por `Regular` y por `Eventual`; cambiar a *Finanzas* y volver a *Alumnos* sin filtros residuales (spec *A7*, *A8*).

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/components/RecordModal.jsx
git commit -m "feat(alumnos): marca y filtros de tipo Regular/Eventual"
```

---

### Task 7: Verificación integral + checklist de aceptación

**Files:**
- Modify: `docs/superpowers/specs/2026-10-09-cobro-excepcional-eventuales-design.md` (marcar §8)

**Interfaces:**
- Consumes: Tasks 1-6.

- [ ] **Step 1: Batería de verificación**

```bash
node scripts/migrar-db.mjs --dry-run        # 4 archivos, orden correcto
ssh -o BatchMode=yes pve 'pct exec 200 -- su postgres -c "psql -v ON_ERROR_STOP=1 -d kinder -f /mnt/homelab/projects/kinder-finance/scripts/verify-cobro-eventual.sql"'   # OK
pnpm lint 2>&1 | tail -1                    # ≤ 12 problems
pnpm build                                  # ✓ built
```
Cada uno con su salida esperada; si alguno falla, se arregla **antes** de continuar (spec §7).

- [ ] **Step 2: Checklist manual A1-A8 sobre `http://kinder.home.arpa`**

`pnpm build` despliega (Caddy sirve `dist/` del propio repo). Recorrer A1…A8 del spec y anotar evidencia (qué se pulsó, qué se vio) junto a cada casilla.

- [ ] **Step 3: Marcar el spec y commit final**

```bash
git add docs/
git commit -m "docs: checklist de aceptación del cobro excepcional verificada"
```
