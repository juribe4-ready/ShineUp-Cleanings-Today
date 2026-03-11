import { z } from 'zod';
import { createEndpoint, Cleanings } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Uploads Drive links to a cleaning record',
  inputSchema: z.object({
    cleaningId: z.string(),
    photoUrls: z.array(z.string()),
  }),
  outputSchema: z.object({
    success: z.boolean(),
  }),
  execute: async ({ input }) => {
    console.log(`[DEBUG] Registrando link de Drive para: ${input.cleaningId}`);

    const cleaning = await Cleanings.findOne({ id: input.cleaningId });
    if (!cleaning) throw new Error('Cleaning not found');

    // Tomamos la primera URL (el enlace que Fillout ya subió a Drive)
    const driveUrl = input.photoUrls[0] || "";

    try {
      await Cleanings.update({
        id: input.cleaningId,
        record: {
          photosVideos: driveUrl ? [{ url: driveUrl, filename: 'Video de Drive' } as any] : []
        },
      });

      console.log(`[EXITO] Enlace de Drive guardado correctamente`);
      return { success: true };

    } catch (error: any) {
      console.error("!!!!!!!! ERROR AL GUARDAR EN DRIVE MEDIA !!!!!!!!", error);
      throw new Error(`Fallo al registrar enlace: ${error.message}`);
    }
  },
});