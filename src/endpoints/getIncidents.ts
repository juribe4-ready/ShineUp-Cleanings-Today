import { z } from 'zod';
import { createEndpoint, Incidents, Staff } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Get open incidents for a specific property (excludes Closed)',
  inputSchema: z.object({
    propertyId: z.string().optional(),
  }),
  outputSchema: z.array(z.object({
    id: z.string(),
    name: z.string(),
    status: z.string(),
    creationDate: z.string().optional(),
    comment: z.string().optional(),
    photoUrls: z.array(z.string()),
    reportedBy: z.string().optional(),
  })),
  execute: async ({ input }) => {
    const raw = await Incidents.findAll({}) as any;
    const records = raw.records || [];

    const filtered = records.filter((inc: any) => {
      const status = inc.status || inc.Status || 'Reported';
      if (status === 'Closed') return false;
      if (input.propertyId) {
        const props: string[] = Array.isArray(inc.property)
          ? inc.property
          : inc.Property ? [inc.Property] : [];
        if (!props.includes(input.propertyId)) return false;
      }
      return true;
    });

    // Collect all unique staff IDs to resolve names in one pass
    const staffIds = new Set<string>();
    filtered.forEach((inc: any) => {
      const ids = Array.isArray(inc.reportedBy) ? inc.reportedBy : (inc['Reported By'] ? [inc['Reported By']] : []);
      ids.forEach((id: string) => staffIds.add(id));
    });

    const staffMap: Record<string, string> = {};
    await Promise.all(Array.from(staffIds).map(async (id) => {
      try {
        const s = await Staff.findOne({ id }) as any;
        staffMap[id] = s?.name || s?.Name || id;
      } catch { staffMap[id] = id; }
    }));

    return filtered.map((inc: any) => {
      const photos: string[] = [];
      const rawPhotos = inc.photos || inc.Photos || [];
      if (Array.isArray(rawPhotos)) {
        rawPhotos.forEach((p: any) => {
          const url = p?.url || p?.thumbnails?.large?.url;
          if (url) photos.push(url);
        });
      }

      const reportedByIds: string[] = Array.isArray(inc.reportedBy)
        ? inc.reportedBy
        : inc['Reported By'] ? [inc['Reported By']] : [];
      const reportedByName = reportedByIds.map(id => staffMap[id] || id).join(', ');

      const commentVal = inc.comment || inc.Comment || inc.comments || inc.Comments ||
        Object.entries(inc).find(([k, v]) => 
          typeof v === 'string' && 
          (v as string).length > 3 && 
          !k.startsWith('rec') && 
          k !== 'name' && k !== 'status' && k !== 'creationDate' &&
          k !== 'id' && k !== 'recordID' &&
          k !== 'fld81j7b92LxC494L' &&
          !(v as string).startsWith('INC-') &&
          !(v as string).startsWith('CLN-') &&
          !(v as string).startsWith('rec')
        )?.[1] as string || '';
      console.log('[INC FULL]', JSON.stringify(inc));
      return {
        id: inc.id,
        name: inc.name || inc.Name || 'Sin nombre',
        status: inc.status || inc.Status || 'Reported',
        creationDate: inc.creationDate || inc['Creation Date'] || inc.createdTime || '',
        comment: commentVal,
        photoUrls: photos,
        reportedBy: reportedByName || '',
      };
    });
  },
});
