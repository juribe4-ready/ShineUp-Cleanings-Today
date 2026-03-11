import { z } from 'zod';
import { createEndpoint, Cleanings, Staff } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'SHINE UP - Get Cleanings for Authenticated User',
  inputSchema: z.object({ 
    date: z.string().optional()
  }),
  outputSchema: z.array(z.any()),
  execute: async ({ input, context }) => {
    // 1. USER SYNC: context.user.id IS the Staff record ID
    const staffId = context?.user?.id;
    console.log(`[getCleanings] 👤 Staff ID (from user sync): ${staffId}`);

    if (!staffId) {
      console.log(`❌ No authenticated user found`);
      return [];
    }

    // Verify staff record exists
    const staff = await Staff.findOne({ id: staffId });
    if (!staff) {
      console.log(`❌ No staff record found for ID: ${staffId}`);
      return [];
    }
    console.log(`✅ Staff found: ${staff.id}`);

    // 3. CALCULAR RANGO DE FECHAS A BUSCAR
    // Columbus, OH (UTC-5)
    const now = new Date();
    const columbusTime = new Date(now.getTime() - (5 * 60 * 60 * 1000));
    const columbusTodayStr = columbusTime.toISOString().split('T')[0];
    const effectiveDate = input.date || columbusTodayStr;

    // For week view: get monday of current week
    const day = columbusTime.getDay();
    const diff = columbusTime.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(new Date(columbusTime).setDate(diff));
    const mondayStr = monday.toISOString().split('T')[0];

    // Start date: if today view use today, if week view use monday
    const startDate = input.date ? effectiveDate : mondayStr;

    console.log(`[getCleanings] effectiveDate: ${effectiveDate} | startDate: ${startDate}`);

    // 4. OBTENER LIMPIEZAS FILTRADAS POR STAFF + FECHA
    // Filter by date >= startDate to skip old records and stay within the 100 limit
    const result = await Cleanings.findAll({
      filters: {
        assignedStaff: { contains: staff.id },
        date: { gte: new Date(startDate) }
      }
    });

    console.log(`[getCleanings] Records after date+staff filter: ${result.records.length}`);

    // 5. FILTRADO FINO POR VISTA
    const filtered = result.records.filter(cleaning => {
      const c = cleaning as any;
      const dateValue = c.date;
      if (!dateValue) return false;
      const taskDateStr = typeof dateValue === 'string'
        ? dateValue.split('T')[0]
        : new Date(dateValue).toISOString().split('T')[0];

      if (input.date) {
        // Vista HOY
        return taskDateStr === effectiveDate;
      }

      // Vista SEMANA (Lunes a Domingo)
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23,59,59,999);
      monday.setHours(0,0,0,0);
      const taskDateObj = new Date(taskDateStr + 'T00:00:00');
      return taskDateObj >= monday && taskDateObj <= sunday;
    });

    console.log(`[getCleanings] After fine filter: ${filtered.length} records`);

    // 6. ORDENAR: Done al final, luego por scheduledTime
    const statusPriority = (s: string) => s === 'Done' ? 1 : 0;
    const sorted = filtered.sort((a: any, b: any) => {
      const priorityDiff = statusPriority(a.status) - statusPriority(b.status);
      if (priorityDiff !== 0) return priorityDiff;
      const timeA = a.scheduledTime ? new Date(a.scheduledTime).getTime() : Infinity;
      const timeB = b.scheduledTime ? new Date(b.scheduledTime).getTime() : Infinity;
      return timeA - timeB;
    });

    // 7. RECOPILAR TODOS LOS IDs DE STAFF ÚNICOS para buscarlos de una vez
    const allStaffIds = new Set<string>();
    sorted.forEach(c => {
      const raw = c as any;
      const ids = raw['Assigned Staff'] || raw.assignedStaff || [];
      if (Array.isArray(ids)) ids.forEach((id: string) => allStaffIds.add(id));
    });

    // Buscar todos los staff en paralelo por ID
    const staffMap: Record<string, string> = {};
    await Promise.all(
      Array.from(allStaffIds).map(async (staffId) => {
        try {
          const staffRecord = await Staff.findOne({ filters: { id: staffId } });
          if (staffRecord) {
            const raw = staffRecord as any;
            // Use Initials field first, then first letter of Name
            staffMap[staffId] = raw.Initials || raw.initials
              || (raw.Name ? raw.Name.charAt(0).toUpperCase() : null)
              || (raw.name ? raw.name.charAt(0).toUpperCase() : '?');
          }
        } catch {
          staffMap[staffId] = '?';
        }
      })
    );

    // 8. MAPEO DE SALIDA
    return sorted.map(c => {
      const raw = c as any;
      const rawFrontView = raw.fldSE8tfvCSz1MpIP || raw.FrontView || raw.frontView;

      // Build staffList from the resolved staffMap
      const assignedIds: string[] = Array.isArray(raw['Assigned Staff'] || raw.assignedStaff)
        ? (raw['Assigned Staff'] || raw.assignedStaff)
        : [];
      const staffList = assignedIds.map(id => staffMap[id] || '?');

      // Equipment — array or string, just count items
      const equipmentRaw = raw['Equipment'] || raw.equipment || [];
      const equipmentCount = Array.isArray(equipmentRaw)
        ? equipmentRaw.length
        : (equipmentRaw ? 1 : 0);

      return {
        id: c.id,
        propertyText: c.propertyText || "Propiedad sin nombre",
        status: c.status || "Pending",
        date: raw.date,
        scheduledTime: c.scheduledTime,
        address: c.address || "Dirección no disponible",
        notes: raw.notes || raw.Notes || "",
        staffList,
        equipmentCount,
        attachments: (Array.isArray(rawFrontView) ? rawFrontView : [rawFrontView])
          .filter(item => item && item.url)
          .map(item => ({ url: item.url }))
      };
    });
  },
});