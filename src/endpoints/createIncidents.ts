import { z } from 'zod';
import { createEndpoint, Incidents, Staff } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Create a new incident in the Incidents table',
  inputSchema: z.object({
    name: z.string(),
    comment: z.string().optional(),
    propertyId: z.string().optional(),
    cleaningId: z.string().optional(),
    photoUrls: z.array(z.string()).optional(),
  }),
  outputSchema: z.object({
    id: z.string(),
    name: z.string(),
    status: z.string(),
    creationDate: z.string().optional(),
    comment: z.string().optional(),
    photoUrls: z.array(z.string()),
    reportedBy: z.string().optional(),
  }),
  execute: async ({ input, context }) => {
    const staffId = context?.user?.id;

    const record: any = {
      Name: input.name,
      Status: 'Reported',
    };

    if (input.comment) record.Comment = input.comment;
    if (input.propertyId) record.Property = [input.propertyId];
    if (input.cleaningId) record['Cleaning ID'] = [input.cleaningId];
    if (staffId) record['Reported By'] = [staffId];
    if (input.photoUrls?.length) {
      record.Photos = input.photoUrls.map(url => ({ url }));
    }

    const created = await Incidents.create({ record }) as any;

    // Resolve staff name for immediate display
    let reportedByName = '';
    if (staffId) {
      try {
        const staff = await Staff.findOne({ id: staffId }) as any;
        reportedByName = staff?.name || staff?.Name || '';
      } catch {}
    }

    const photos: string[] = [];
    const rawPhotos = created.photos || created.Photos || input.photoUrls || [];
    if (Array.isArray(rawPhotos)) {
      rawPhotos.forEach((p: any) => {
        const url = typeof p === 'string' ? p : (p?.url || p?.thumbnails?.large?.url);
        if (url) photos.push(url);
      });
    }

    return {
      id: created.id,
      name: created.name || created.Name || input.name,
      status: 'Reported',
      creationDate: new Date().toISOString(),
      comment: input.comment || '',
      photoUrls: photos,
      reportedBy: reportedByName,
    };
  },
});
