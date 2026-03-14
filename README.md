# ShineUP Ops - Estado del Proyecto

## Stack
- **Frontend:** React + TypeScript, Zite (build.fillout.com)
- **Backend:** Airtable (base: ShineUpCleaningJobScheduler `appBwnoxgyIXILe6M`)
- **Auth:** Zite Auth SDK
- **Estilos:** Tailwind + Poppins + mobile-first
- **Colores:** Teal `#00BCD4`, Teal Dark `#0097A7`, Teal Light `#E0F7FA`, Gold `#FFD700`

---

## Archivos

### Componentes (`src/components/`)
| Archivo | Descripcion |
|---|---|
| `App.tsx` | Dashboard principal: lista limpiezas del dia, stats, busqueda, vista semanal |
| `CleaningChecklist.tsx` | Detalle de limpieza: 4 secciones DETALLE / INICIO / REPORTE / CIERRE |
| `CleaningCard.tsx` | Card de limpieza en el dashboard |
| `CalendarView.tsx` | Vista semanal |

### Endpoints (`src/endpoints/`)
| Archivo | Descripcion |
|---|---|
| `getCleaning.ts` | Lista limpiezas filtradas por fecha/usuario |
| `getCleaningTasks.ts` | Detalle completo: tareas, equipo, horarios, propertyId, closingMediaType |
| `updateCleaningTime.ts` | Actualiza startTime, endTime, status, rating, videoInicialUrls |
| `UploadCleaningPhotos.ts` | Sube fotos cierre (acumula, no sobreescribe) |
| `getIncidents.ts` | Incidentes por propiedad (excluye Closed), orden: fecha desc, status, nombre |
| `createIncidents.ts` | Crea incidente con foto, propertyId, cleaningId |
| `getInventory.ts` | Inventario cliente por propiedad (excluye Optimal), orden: fecha desc, status, comment |
| `addInventory.ts` | Crea registro inventario (Low / Out of Stock) |

---

## Tablas Airtable
| Tabla | ID |
|---|---|
| Cleanings | `tblabOdNknnjrYUU1` |
| Incidents | `tbli8QbMBjUuzsCPw` |
| Staff | `tblgHwN1wX6u3ZtNY` |
| Properties | `tbl1iETmcFP460oWN` |
| Equipment | `tblFOJpGUKpCC5hQO` |
| ClientInventory | (habilitada via Zite AI) |

---

## CleaningChecklist - Secciones

### DETALLE
- Nombre propiedad + direccion, boton IR (Maps), boton Book
- Tabla horas programadas vs reales
- Personal asignado, equipamiento con codigo (`EquipmentCode`), instrucciones (`initialComments`)

### INICIO
- Step 1: Subir video/foto inicial (multiple, acumula en campo Attachment `VideoInicial`)
- Step 2: Calificar estado 1-3 estrellas
- Step 3: Boton EMPEZAR LIMPIEZA → status `In Progress`
- Checklist de tareas (aparece al iniciar)
- **Cuando Done: grayscale + bloqueado + pointerEvents none**

### REPORTE
- **Inventario del Cliente** (primero): filtrado por propertyId
- **Incidentes** (segundo): filtrado por propertyId
- Ambos bloqueados hasta iniciar, boton + Nuevo, modal detalle
- Scroll spy: el tab del header se activa segun scroll position

### CIERRE
- Fotos/videos de cierre (acumula)
- Label del boton subir segun campo `Video/Photo` de Properties:
  - `Photo` → "Subir Fotos" | `Video` → "Subir Videos" | vacio → "Subir fotos / videos"
- Boton TERMINAR → status `Done`, vuelve al dashboard
- **Cuando Done: grayscale + bloqueado, boton verde "LIMPIEZA TERMINADA"**

---

## Comportamiento por status
| Status | INICIO | REPORTE | CIERRE |
|---|---|---|---|
| Programmed | Activo (mostrar EMPEZAR) | Bloqueado | Bloqueado |
| In Progress | Activo (en progreso) | Activo | Activo |
| Done | Grayscale bloqueado | Activo solo lectura | Grayscale bloqueado |

---

## Notas tecnicas criticas
- **Zite SWC:** No acepta Unicode en comentarios JS/JSX (em dash, box-drawing). Usar `-` siempre.
- **Airtable formula fields:** Devuelven "No data" en `findOne()`. Workaround: duplicar en campo plain text.
- **videoInicial:** Attachment en Airtable → siempre devolver array de URLs, nunca string solo.
- **propertyId:** Extraido de `raw.property[0]` en `getCleaningTasks`, incluido en return para que filtros funcionen.
- **context.user.id** = Staff record ID (User Sync configurado: tabla Staff, email = Email).
- **Logs Zite:** Solo visibles en Zite workflow run logs, no en browser console.
- **Modales:** Deben estar FUERA del div `px-4 pt-5 pb-24` (content div), dentro del div raiz `min-h-screen`.

---

## Pendiente / Futuro
- Push notifications para nuevas asignaciones
- Dashboard Timeline admin (proyecto Zite separado)
- Landing pages 5 servicios HTML/CSS
- Flujo resolver/cerrar incidentes (admin)
