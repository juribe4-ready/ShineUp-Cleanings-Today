# ShineUP Ops - Project State

## Stack
- **Frontend:** React + TypeScript, Zite (build.fillout.com)
- **Backend:** Airtable (base: ShineUpCleaningJobScheduler `appBwnoxgyIXILe6M`)
- **Auth:** Zite Auth SDK
- **Styles:** Tailwind + Poppins + mobile-first
- **Colors:** Teal `#00BCD4`, Teal Dark `#0097A7`, Teal Light `#E0F7FA`, Gold `#FFD700`

---

## Files

### Components (`src/components/`)
| File | Description |
|---|---|
| `App.tsx` | Dashboard: today's cleanings list, stats, search, weekly view |
| `CleaningChecklist.tsx` | Cleaning detail: 4 sections DETALLE / INICIO / REPORTE / CIERRE |
| `CleaningCard.tsx` | Cleaning card on dashboard (uses `thumbnails.large`) |
| `CalendarView.tsx` | Weekly view |

### Endpoints (`src/endpoints/`)
| File | Description |
|---|---|
| `getCleaning.ts` | Cleaning list filtered by date/user. Photos use `thumbnails.large`. |
| `getCleaningTasks.ts` | Full cleaning detail. All Airtable calls in parallel (Promise.all). Returns: propertyId, closingMediaType, initialComments, openComments, doorCodes, estimatedEndTime, videoInicial (array), equipment codes. |
| `updateCleaningTime.ts` | Updates: startTime, endTime, status, rating, videoInicialUrls, initialComments→`OpenComments`, incidentComments, inventoryComments |
| `UploadCleaningPhotos.ts` | Uploads closing photos (accumulates, no overwrite) |
| `getIncidents.ts` | Incidents by property (excludes Closed). Sort: date desc, status, name. |
| `createIncidents.ts` | Creates incident with photo, propertyId, cleaningId |
| `getInventory.ts` | Client inventory by property (excludes Optimal). Sort: date desc, status, comment. |
| `addInventory.ts` | Creates inventory record (Low / Out of Stock) |

---

## Airtable Tables
| Table | ID |
|---|---|
| Cleanings | `tblabOdNknnjrYUU1` |
| Incidents | `tbli8QbMBjUuzsCPw` |
| Staff | `tblgHwN1wX6u3ZtNY` |
| Properties | `tbl1iETmcFP460oWN` |
| Equipment | `tblFOJpGUKpCC5hQO` |
| ClientInventory | (enabled via Zite AI) |

### Key Airtable field notes
- `InitialComments` in Cleanings = **lookup from Properties** — READ ONLY, never write to it
- `OpenComments` in Cleanings = plain text — writable, used for open-stage notes
- `VideoInicial` = Attachment field — must pass `{ url }` objects, not strings
- `EquipmentCode` = plain text (duplicated from formula field — Zite can't read formula fields)
- `Video/Photo` in Properties = drives closing upload label ("Subir Fotos" / "Subir Videos")
- `DoorCodes` in Properties = access codes shown in DETALLE
- `Labor` in Properties = integer (minutes) used for estimated end time calculation
- `Role` in Staff = text field. Only roles containing "cleaner" (case-insensitive) count toward labor calculation

---

## CleaningChecklist - Sections

### DETALLE
- Property name + address, IR button (Maps), Book button
- Scheduled vs real hours table (estimated end time uses Labor formula)
- Assigned staff
- Equipment with code
- Door codes (DoorCodes from Properties, amber box, monospace font)

### INICIO
**Step 1 - Video inicial**
- Upload multiple video/photo, accumulates in `VideoInicial` attachment field
- On upload: status changes to `Opened`

**Instructions block (compact, below Step 1)**
- *Instrucciones iniciales*: read-only gray box — `initialComments` (lookup from Properties, never editable)
- *Notas de apertura*: textarea → `OpenComments`
  - Locked until video uploaded
  - Saves silently on `onBlur`
  - Locked by default on re-entry, "Modificar" button to unlock

**Step 2 - Rating (stars)**
- 1-3 stars, saves inline on click to Airtable

**Step 3 - Start cleaning**
- EMPEZAR button → status `In Progress`
- Checklist appears after start

**When Done: grayscale + blocked + pointerEvents none**

### REPORTE
- **Inventario del Cliente** (first): filtered by propertyId, sort: date desc, status, comment
- **Incidentes** (second): filtered by propertyId, sort: date desc, status, name
- Both blocked until In Progress, "+ Nuevo" button, detail modal
- Scroll spy: header tab highlights based on scroll position

### CIERRE
- Closing photos/videos (accumulates)
- Upload button label driven by `Video/Photo` field in Properties
- TERMINAR button → status `Done`, returns to dashboard
- **When Done: grayscale + blocked, green "LIMPIEZA TERMINADA" button**

---

## Status Flow
```
Programmed → Opened (on video upload) → In Progress (on Start) → Done (on Finish)
```

| Status | INICIO | REPORTE | CIERRE |
|---|---|---|---|
| Programmed | Active (show START) | Blocked | Blocked |
| Opened | Active (show START) | Blocked | Blocked |
| In Progress | Active (in progress) | Active | Active |
| Done | Grayscale blocked | Active read-only | Grayscale blocked |

---

## Estimated End Time Logic (getCleaningTasks)
```
cleanerCount = staff where Role.toLowerCase().includes('cleaner')
minutesRaw   = Labor / max(cleanerCount, 1)
minutesRounded = ceil(minutesRaw / 15) * 15
adjustment   = rating === 1 ? +30 : rating === 3 ? -30 : 0
totalMinutes = max(minutesRounded + adjustment, 45)
estimatedEndTime = scheduledTime + totalMinutes
```
- Fallback to 90 min if Labor = 0 or no scheduledTime
- Roles that count: "Cleaner", "Cleaner Wknd", "Cleaner en prueba" (anything with "cleaner")
- Roles that don't count: "Manager", "Asistente"

---

## Critical Technical Notes
- **Zite SWC compiler:** No Unicode chars in JS/JSX comments (em dash, box-drawing). Use `-` only.
- **Airtable formula/lookup fields:** Return "No data" in `findOne()`. Duplicate to plain text as workaround.
- **videoInicial:** Always return as array of URLs, never single string.
- **propertyId:** Must be included in `getCleaningTasks` return so incident/inventory filters work.
- **context.user.id** = Staff record ID (User Sync: table Staff, email = Email).
- **Zite logs:** Only in Zite workflow run logs, not browser console.
- **Modals:** Must be OUTSIDE the `px-4 pt-5 pb-24` content div, inside root `min-h-screen` div.
- **Parallel calls:** `getCleaningTasks` runs Staff + Tasks + Equipment + Property in one `Promise.all`.

---

## Pending / Future
- Push notifications for new assignments
- Admin Timeline dashboard (separate Zite project)
- Landing pages for 5 services (HTML/CSS)
- Incident resolve/close workflow (admin)
