import { z } from 'zod';
import { createEndpoint, Cleanings } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Uploads photo/video URLs to a cleaning record (accumulates, does not overwrite)',
  inputSchema: z.object({
    cleaningId: z.string(),
    photoUrls: z.array(z.string()),
    fileType: z.enum(['initial', 'closing']).optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
  }),
  execute: async ({ input }) => {
    console.log(`[DEBUG] Guardando ${input.photoUrls.length} archivo(s) para: ${input.cleaningId}`);

    const cleaning = await Cleanings.findOne({ id: input.cleaningId }) as any;
    if (!cleaning) throw new Error('Cleaning not found');

    // Get existing photos and accumulate
    const existing: any[] = Array.isArray(cleaning.photosVideos) ? cleaning.photosVideos : [];
    const prefix = input.fileType === 'initial' ? '[INICIAL]' : '[CIERRE]';
    const newEntries = input.photoUrls.map(url => ({ url, filename: `${prefix} archivo` }));
    const combined = [...existing, ...newEntries];

    try {
      await Cleanings.update({
        id: input.cleaningId,
        record: {
          photosVideos: combined as any,
        },
      });

      console.log(`[EXITO] ${combined.length} archivo(s) guardados correctamente`);
      return { success: true };

    } catch (error: any) {
      console.error('ERROR AL GUARDAR FOTOS', error);
      throw new Error(`Fallo al guardar: ${error.message}`);
    }
  },
});
