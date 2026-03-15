import { z } from 'zod';
import { createEndpoint, Cleanings } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Updates cleaning details including Comments, VideoInicial, Rating',
  inputSchema: z.object({
    cleaningId:   z.string(),
    startTime:    z.string().optional(),
    endTime:      z.string().optional(),
    status:       z.string().optional(),
    comments:          z.string().optional(),
    videoInicialUrls:  z.array(z.string()).optional(),
    rating:            z.number().optional(),
    incidentComments:  z.string().optional(),
    inventoryComments: z.string().optional(),
    initialComments:   z.string().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
  }),
  execute: async ({ input }) => {
    const updateData: any = {};

    if (input.startTime    !== undefined) updateData.startTime    = input.startTime;
    if (input.endTime      !== undefined) updateData.endTime      = input.endTime;
    if (input.status       !== undefined) updateData.status       = input.status;
    if (input.comments          !== undefined) updateData.InitialComments = input.comments;
    if (input.videoInicialUrls  !== undefined) {
      // Airtable attachment format — pass existing attachments to keep them, add new ones
      const existing = await (async () => {
        try {
          const { Cleanings } = await import('zite-integrations-backend-sdk');
          const rec = await Cleanings.findOne({ id: input.cleaningId }) as any;
          return Array.isArray(rec?.videoInicial) ? rec.videoInicial : [];
        } catch { return []; }
      })();
      const newAttachments = input.videoInicialUrls.map(url => ({ url }));
      updateData.VideoInicial = [...existing, ...newAttachments];
    }
    if (input.rating !== undefined) {
      const ratingMap: Record<number, string> = { 1: '⭐ Malo', 2: '⭐⭐ Normal', 3: '⭐⭐⭐ Bueno' };
      updateData.rating = ratingMap[input.rating] || input.rating;
    }
    if (input.incidentComments  !== undefined) updateData.IncidentComments  = input.incidentComments;
    if (input.initialComments   !== undefined) updateData.OpenComments = input.initialComments;
    if (input.inventoryComments !== undefined) updateData.InventoryComments = input.inventoryComments;

    await Cleanings.update({
      id: input.cleaningId,
      record: updateData,
    });

    return { success: true };
  },
});
