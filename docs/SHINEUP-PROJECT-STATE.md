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
| `CleaningCard.tsx` | Cleaning card on dashboard (uses `thumbnails.large` for photos) |
| `CalendarView.tsx` | Weekly view |

### Endpoints (`src/endpoints/`)
| File | Description |
|---|---|
| `getCleaning.ts` | Cleaning list filtered by date/user. Photos use `thumbnails.large`. |
| `getCleaningTasks.ts` | Full cleaning detail. All Airtable calls run in parallel (Promise.all). Returns: propertyId, closingMediaType, initialComments, openComments, videoInicial (array), equipment codes. |
| `updateCleaningTime.ts` | Updates: startTime, endTime, status, rating, videoInicialUrls, initialComments→`InitialComments`, openComments→`OpenComments`, incidentComments, inventoryComments |
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
- `InitialComments` in Cleanings = **lookup** from Properties — READ ONLY, cannot be written
- `OpenComments` in Cleanings = plain text field — writable, used for open-stage notes
- `VideoInicial` = Attachment field — must pass `{ url }` objects, not strings
- `EquipmentCode` = plain text field (duplicated from formula field as workaround)
- `Video/Photo` in Properties = drives closing upload button label ("Subir Fotos" / "Subir Videos")

---

## CleaningChecklist - Sections

### DETALLE
- Property name + address, IR button (Maps), Book button
- Scheduled vs real hours table
- Assigned staff, equipment with code, (initialComments removed from here)

### INICIO
**Step 1 - Video inicial**
- Upload multiple video/photo, accumulates in `VideoInicial` attachment field
- On upload: status changes to `Opened`

**Instructions block (compact, below Step 1)**
- *Instrucciones iniciales*: read-only gray box showing `initialComments` (lookup from Properties)
- *Notas de apertura*: textarea connected to `OpenComments`
  - Locked until video uploaded
  - Saves on `onBlur` silently
  - Locked by default on re-entry if video exists, "Modificar" button to unlock

**Step 2 - Rating (stars)**
- 1-3 stars, saves inline on click

**Step 3 - Start cleaning**
- EMPEZAR button → status `In Progress`
- Checklist appears after start

**When Done: grayscale + blocked + pointerEvents none**

### REPORTE
- **Inventario del Cliente** (first): filtered by propertyId, sort: date desc → status → comment
- **Incidentes** (second): filtered by propertyId, sort: date desc → status → name
- Both blocked until In Progress, "+ Nuevo" button, detail modal
- Scroll spy: header tab activates based on scroll position

### CIERRE
- Closing photos/videos (accumulates)
- Upload button label from `Video/Photo` field in Properties:
  - `Photo` → "Subir Fotos" | `Video` → "Subir Videos" | empty → "Subir fotos / videos"
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

## Critical Technical Notes
- **Zite SWC compiler:** No Unicode in JS/JSX comments (em dash, box-drawing chars). Use `-` only.
- **Airtable formula/lookup fields:** Return "No data" in `findOne()`. Workaround: duplicate to plain text field.
- **videoInicial:** Attachment in Airtable → always return as array of URLs, never single string.
- **propertyId:** Extracted from `raw.property[0]` in `getCleaningTasks`, included in return so incident/inventory filters work.
- **context.user.id** = Staff record ID (User Sync: table Staff, email = Email field).
- **Zite logs:** Only visible in Zite workflow run logs, not browser console.
- **Modals:** Must be OUTSIDE the `px-4 pt-5 pb-24` content div, inside the root `min-h-screen` div.
- **Parallel calls:** `getCleaningTasks` runs Staff + Tasks + Equipment + Property all in one `Promise.all`.

---

## Pending / Future
- Push notifications for new assignments
- Admin Timeline dashboard (separate Zite project)
- Landing pages for 5 services (HTML/CSS)
- Incident resolve/close workflow (admin)
