import { z } from 'zod';
import { createEndpoint, ClientInventory, Staff } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Get client inventory records excluding Optimal, filtered by property',
  inputSchema: z.object({
    propertyId: z.string().optional(),
  }),
  outputSchema: z.array(z.object({
    id: z.string(),
    status: z.string(),
    comment: z.string().optional(),
    date: z.string().optional(),
    photoUrls: z.array(z.string()),
    reportedBy: z.string().optional(),
  })),
  execute: async ({ input }) => {
    const raw = await ClientInventory.findAll({}) as any;
    const records: any[] = raw.records || [];

    const filtered = records.filter((rec: any) => {
      const status: string = rec.status || rec.Status || '';
      if (status === 'Optimal') return false;
      if (input.propertyId) {
        const props: string[] = Array.isArray(rec.property) ? rec.property
          : rec.Property ? [rec.Property] : [];
        if (!props.includes(input.propertyId)) return false;
      }
      return true;
    });

    const staffIds = new Set<string>();
    filtered.forEach((rec: any) => {
      const ids: string[] = Array.isArray(rec.reportedBy) ? rec.reportedBy
        : rec['Reported By'] ? [rec['Reported By']] : [];
      ids.forEach(id => staffIds.add(id));
    });

    const staffMap: Record<string, string> = {};
    await Promise.all(Array.from(staffIds).map(async (id) => {
      try {
        const s = await Staff.findOne({ id }) as any;
        staffMap[id] = s?.name || s?.Name || id;
      } catch { staffMap[id] = id; }
    }));

    return filtered.map((rec: any) => {
      const photos: string[] = [];
      const rawPhotos: any[] = Array.isArray(rec.attachments) ? rec.attachments
        : Array.isArray(rec.Attachments) ? rec.Attachments : [];
      rawPhotos.forEach((p: any) => {
        const url: string = p?.url || p?.thumbnails?.large?.url || '';
        if (url) photos.push(url);
      });

      const reportedByIds: string[] = Array.isArray(rec.reportedBy) ? rec.reportedBy
        : rec['Reported By'] ? [rec['Reported By']] : [];
      const reportedByName = reportedByIds.map(id => staffMap[id] || id).join(', ');

      return {
        id: rec.id as string,
        status: (rec.status || rec.Status || '') as string,
        comment: (rec.comment || rec.Comment || '') as string,
        date: (rec.date || rec.Date || rec.createdTime || '') as string,
        photoUrls: photos,
        reportedBy: reportedByName,
      };
    }).sort((a, b) => {
      // 1. Fecha desc
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      if (dateB !== dateA) return dateB - dateA;
      // 2. Status
      const statusOrder: Record<string, number> = { 'Out of Stock': 0, 'Low': 1, 'Optimal': 2 };
      const sA = statusOrder[a.status] ?? 99;
      const sB = statusOrder[b.status] ?? 99;
      if (sA !== sB) return sA - sB;
      // 3. Comment
      return (a.comment || '').localeCompare(b.comment || '');
    });
  },
});
