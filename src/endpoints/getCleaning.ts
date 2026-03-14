import { z } from 'zod';
import { createEndpoint, ClientInventory, Staff } from 'zite-integrations-backend-sdk';

export default createEndpoint({
  description: 'Add a new client inventory record',
  inputSchema: z.object({
    status: z.enum(['Low', 'Out of Stock']),
    comment: z.string().optional(),
    propertyId: z.string().optional(),
    cleaningId: z.string().optional(),
    photoUrls: z.array(z.string()).optional(),
  }),
  outputSchema: z.object({
    id: z.string(),
    status: z.string(),
    comment: z.string().optional(),
    date: z.string().optional(),
    photoUrls: z.array(z.string()),
    reportedBy: z.string().optional(),
  }),
  execute: async ({ input, context }) => {
    const staffId: string = context?.user?.id || '';

    const record: Record<string, any> = {
      Status: input.status,
    };

    if (input.comment) record.Comment = input.comment;
    if (input.propertyId) record.Property = [input.propertyId];
    if (input.cleaningId) record.Cleanings = [input.cleaningId];
    if (staffId) record['Reported By'] = [staffId];
    if (input.photoUrls?.length) {
      record.Attachments = input.photoUrls.map((url: string) => ({ url }));
    }

    const created = await ClientInventory.create({ record }) as any;

    let reportedByName = '';
    if (staffId) {
      try {
        const staff = await Staff.findOne({ id: staffId }) as any;
        reportedByName = staff?.name || staff?.Name || '';
      } catch {}
    }

    return {
      id: created.id as string,
      status: input.status,
      comment: input.comment || '',
      date: new Date().toISOString(),
      photoUrls: input.photoUrls || [],
      reportedBy: reportedByName,
    };
  },
});
