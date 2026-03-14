import { z } from 'zod';
import { createEndpoint, Cleanings, ChecklistTemplatesTasks, Staff, Equipment, Properties } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Fetches cleaning details including Drive media links',
  inputSchema: z.object({
    cleaningId: z.string(),
  }),
  outputSchema: z.object({
    cleaning: z.object({
      id: z.string(),
      cleaningId: z.string().optional(),
      propertyText: z.string().optional(),
      propertyId: z.string().optional(),
      bookUrl: z.string().optional(),
      cleaningTypeText: z.string().optional(),
      status: z.string().optional(),
      address: z.any().optional(),
      googleMapsUrl: z.string().optional(),
      addressNavigate: z.any().optional(),
      date: z.string().optional(),
      scheduledTime: z.string().optional(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      assignedStaffNames: z.array(z.string()).optional(),
      comments: z.string().optional(),
      incidentComments: z.string().optional(),
      inventoryComments: z.string().optional(),
      videoInicial: z.array(z.string()).optional(),
      photosVideos: z.array(z.any()).optional(),
      rating: z.number().optional(),
      driveMedia: z.string().optional(),
      equipment: z.array(z.object({ text: z.string(), code: z.string() })).optional(),
      initialComments: z.string().optional(),
    }),
    tasks: z.array(z.any()),
  }),
  execute: async ({ input }) => {
    let cleaning: any = null;
    try {
      cleaning = await Cleanings.findOne({ id: input.cleaningId });
    } catch (e) {
      // Zite sometimes throws even when data is returned — ignore and check below
    }
    if (!cleaning) throw new Error('Cleaning not found');

    // Staff names — wrap each findOne to avoid cascade failure
    let assignedStaffNames: string[] = [];
    if (cleaning.assignedStaff) {
      const staffIds = Array.isArray(cleaning.assignedStaff) ? cleaning.assignedStaff : [cleaning.assignedStaff];
      const staffRecords = await Promise.all(
        staffIds.map(async (id: string) => {
          try { return await Staff.findOne({ id }); } catch { return null; }
        })
      );
      assignedStaffNames = staffRecords.filter((s: any) => s?.name).map((s: any) => s!.name!);
    }
    
    // Tasks from checklist template
    const cleaningTypeId = Array.isArray(cleaning.cleaningType) ? cleaning.cleaningType[0] : cleaning.cleaningType;
    let tasks: any[] = [];
    if (cleaningTypeId) {
      const tasksResult = await ChecklistTemplatesTasks.findAll({ filters: { cleaningType: cleaningTypeId } });
      tasks = tasksResult.records.map(task => ({
        id: task.id,
        taskName: task.taskName,
        taskGroup: task.taskGroup,
        order: task.order,
      })).sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    // Equipment — USAR EquipmentIDText
    const raw = cleaning as any;
    const equipmentIds: string[] = Array.isArray(raw['Equipment'] || raw.equipment)
      ? (raw['Equipment'] || raw.equipment)
      : raw['Equipment'] ? [raw['Equipment']] : [];

    let equipment: { text: string; code: string }[] = [];
    if (equipmentIds.length > 0) {
      const equipRecords = await Promise.all(
        equipmentIds.map(async (id: string) => {
          try {
            const rec = await Equipment.findOne({ id }) as any;
            
            const text = rec?.EquipmentText || rec?.equipmentText || 'Sin nombre';
            
            // Intentar en orden: EquipmentCode (campo principal) > otros fallbacks
            const code = 
              rec?.EquipmentCode ||
              rec?.equipmentCode ||
              rec?.['Equipment Code'] ||
              rec?.EquipmentID || 
              rec?.equipmentID || 
              rec?.['Equipment ID'] ||
              rec?.EquipmentIDText || 
              rec?.equipmentIDText ||
              rec?.['Equipment Name'] || 
              rec?.equipmentName || 
              rec?.EquipmentName ||
              rec?.Make || 
              rec?.make ||
              rec?.EquipmentText ||
              rec?.equipmentText ||
              'N/A';
            
            return { text, code };
          } catch {
            return { text: id, code: id };
          }
        })
      );
      equipment = equipRecords.filter(Boolean) as { text: string; code: string }[];
    }

    // Book URL y InitialComments
    let bookUrl = "";
    let initialComments = "";
    const propertyIds: string[] = Array.isArray(raw.property) ? raw.property : (raw.property ? [raw.property] : []);
    if (propertyIds.length > 0) {
      try {
        const prop = await Properties.findOne({ id: propertyIds[0] }) as any;
        bookUrl = prop?.['Book URL'] || prop?.bookUrl || prop?.BookURL || "";
        initialComments = raw.initialComments || raw.InitialComments || prop?.InitialComments || prop?.initialComments || "";
      } catch { /* ignore */ }
    }

    return {
      cleaning: {
        id: cleaning.id,
        cleaningId: cleaning.cleaningId,
        propertyText: cleaning.propertyText,
        propertyId: propertyIds[0] || '',
        bookUrl,
        cleaningTypeText: cleaning.cleaningTypeText,
        status: cleaning.status,
        address: cleaning.address,
        googleMapsUrl: cleaning.googleMapsUrl,
        addressNavigate: cleaning.addressNavigate,
        date: cleaning.date,
        scheduledTime: cleaning.scheduledTime,
        startTime: cleaning.startTime,
        endTime: cleaning.endTime,
        assignedStaffNames,
        comments: raw.Comments || raw.comments || "",
        incidentComments: raw.incidentComments || raw.IncidentComments || "",
        inventoryComments: raw.inventoryComments || raw.InventoryComments || "",
        initialComments,
        videoInicial: Array.isArray(raw.videoInicial)
          ? raw.videoInicial.map((v: any) => v?.thumbnails?.large?.url || v?.url).filter(Boolean)
          : [],
        photosVideos: raw.driveMedia 
          ? [{ url: raw.driveMedia, filename: 'Video de Drive' }, ...(cleaning.photosVideos || [])]
          : (cleaning.photosVideos || []),
        rating: (() => {
          const r = raw.rating || raw.Rating;
          if (!r) return undefined;
          if (typeof r === 'number') return r;
          const s = String(r);
          if (s.includes('⭐⭐⭐') || s.toLowerCase().includes('bueno')) return 3;
          if (s.includes('⭐⭐') || s.toLowerCase().includes('normal')) return 2;
          if (s.includes('⭐') || s.toLowerCase().includes('malo')) return 1;
          return undefined;
        })(),
        driveMedia: raw.driveMedia || "",
        equipment,
      },
      tasks,
    };
  },
});
