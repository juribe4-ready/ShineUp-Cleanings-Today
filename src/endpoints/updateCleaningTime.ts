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
    videoInicial:      z.string().optional(),
    rating:            z.number().optional(),
    incidentComments:  z.string().optional(),
    inventoryComments: z.string().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
  }),
  execute: async ({ input }) => {
    const updateData: any = {};

    if (input.startTime    !== undefined) updateData.startTime    = input.startTime;
    if (input.endTime      !== undefined) updateData.endTime      = input.endTime;
    if (input.status       !== undefined) updateData.status       = input.status;
    if (input.comments          !== undefined) updateData.Comments         = input.comments;
    if (input.videoInicial      !== undefined) updateData.VideoInicial     = input.videoInicial;
    if (input.rating !== undefined) {
      const ratingMap: Record<number, string> = { 1: '⭐ Malo', 2: '⭐⭐ Normal', 3: '⭐⭐⭐ Bueno' };
      updateData.rating = ratingMap[input.rating] || input.rating;
    }
    if (input.incidentComments  !== undefined) updateData.IncidentComments  = input.incidentComments;
    if (input.inventoryComments !== undefined) updateData.InventoryComments = input.inventoryComments;

    await Cleanings.update({
      id: input.cleaningId,
      record: updateData,
    });

    return { success: true };
  },
});
